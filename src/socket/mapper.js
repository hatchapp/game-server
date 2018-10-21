const { Subject, Observable, merge, NEVER, of } = require('rxjs');
const { filter, map, mergeMap, withLatestFrom } = require('rxjs/operators');
const { EVENTS } = require('./constants');
const { ActionTypes } = require('../room/constants');
const roomActions = require('../room/actions');
const { streamSwitchCase } = require('./utils');

function createEventToActionMapper({ id, name, status, createdAt }){
	return {
		// register and unregister can be thought of as connect/disconnect
		'register': () => roomActions.createSocketUserConnected(id, name, status, createdAt),
		'unregister': () => roomActions.createSocketUserDisconnected(id),
		[EVENTS.SAY]: ({ say, date }) => roomActions.createSocketUserSay(id, say, date),
		[EVENTS.PICK_ANSWER]: ({ category, date }) => roomActions.createSocketUserPickAnswer(id, category, date),
	};
}

function formatRoomState(room){
	const {
		id, state, round, roundState: { teller }, users, online,
		leaderboard, foundRight, createdAt,
		lastRoundStartedAt, lastRoundEndedAt
	} = room;

	return {
		id, state, round, teller, createdAt, lastRoundStartedAt, lastRoundEndedAt,
		users, online, leaderboard, foundRight
	};
}

function getTeller(state){
	return state.getIn(['roundState', 'teller']);
}

function createChooseCategoryEvent(state){
	const categories = state.getIn(['pickState', 'categories']).valueSeq().toArray();

	return { event: EVENTS.CHOOSE_CATEGORY, data: { categories } };
}

function createTellAnswerEvent(state){
	return {
		event: EVENTS.TELL_ANSWER,
		data: state.getIn(['roundState', 'answer'])
	};
}

function createActionToEmitMapper({ id }){
	return {
		// simple example of emitting socket events on game actions
		[ActionTypes.USER_CONNECTED]: (data, state) => {
			const { user } = data;

			if(user.get('id') !== id){
				return { event: EVENTS.ANOTHER_USER_CONNECTED, data };
			}else{
				const isTeller = getTeller(state) === id;
				const gameState = state.get('state');

				const connectedEvent = {
					event: EVENTS.ROOM_CONNECTED,
					data: { room: formatRoomState(state.toJS()) }
				};

				if(!isTeller) return connectedEvent;

				if(gameState === GameState.ROUND_PICK_ANSWER){
					return [connectedEvent, createChooseCategoryEvent(state)];
				}else if(gameState === GameState.ROUND_IN_PROGRESS){
					return [connectedEvent, createTellAnswerEvent(state)];
				}else{
					return connectedEvent;
				}
			}
		},
		// say messages should be broadcast to all users
		[ActionTypes.SOCKET_USER_SAY]: ({ userId, message, time }, state) => {
			if(state.getIn(['roundState', 'teller']) !== userId)
				return NEVER;

			return {
				event: EVENTS.TELL,
				data: { userId, time, tell: message },
			};
		},
		[ActionTypes.WRONG_ANSWER_FOUND]: ({ userId, message, time }) => ({
			event: EVENTS.ANSWER,
			data: { userId, time, answer: message }
		}),
		[ActionTypes.USER_HATCH_PERCENTAGE]: ({ userId, hatchPercentage }) => ({
			event: EVENTS.HATCH_STATUS,
			data: { userId, hatchPercentage },
		}),
		[ActionTypes.USER_DISCONNECTED]: ({ userId }) => ({
			event: EVENTS.USER_DISCONNECTED,
			data: { userId }
		}),
		[ActionTypes.ROUND_START_SUCCESS]: (_, state) => {
			const teller = getTeller(state);

			return [
				{ event: EVENTS.ROUND_START },
				...(teller === id ? [createChooseCategoryEvent(state)] : [])
			];
		},
		[ActionTypes.ROUND_IN_PROGRESS_SUCCESS]: (_, state) => {
			if(id !== state.getIn(['roundState', 'teller']))
				return NEVER;

			return createTellAnswerEvent(state);
		},
		[ActionTypes.ROUND_END_SUCCESS]: (_, state) => ({
			event: EVENTS.ROUND_END,
			data: { answer: state.getIn(['roundState', 'answer']) }
		}),
		[ActionTypes.LEADERBOARD_UPDATE]: (_, state) => ({
			event: EVENTS.LEADERBOARD_UPDATE,
			data: { leaderboard: state.get('leaderboard').toJS() },
		}),
		[ActionTypes.RIGHT_ANSWER_FOUND]: ({ userId }) => ({
			event: EVENTS.RIGHT_ANSWER,
			data: { userId }
		}),
	};
}

/**
 * Given a socket, some event listeners that listen to it to create an action$,
 * removes all registered listeners from the socket and completes the action$.
 * @param socket
 * @param eventListeners
 * @param action$
 * @returns {Function}
 */
function createUnregisterFunction(socket, eventListeners, action$){
	return function unregister(){
		// remove each listener from the socket events
		Object.keys(eventListeners).forEach((event) => {
			const listenerFunc = eventListeners[event];
			socket.removeListener(event, listenerFunc);
		});
		// finish the action stream
		action$.complete();
	};
}

/**
 * Given a socket and object of socket event keys and action creator functions
 *  Generates an action stream and a way to unsubscribe to it
 * @param socket
 * @param outsideEvent$
 * @param gameState$
 * @param eventToActionMapper
 * @returns {Observable<*>}
 */
function createActionStream(socket, outsideEvent$, gameState$, eventToActionMapper){
	const event$ = new Observable((event$) => {
		const eventListeners = Object.keys(eventToActionMapper).reduce((listeners, event) => {
			function listener(data){
				event$.next({ event, data });
			}

			// add the listener function to socket event as a listener
			socket.on(event, listener);
			listeners[event] = listener;
			return listeners;
		}, {});

		return createUnregisterFunction(socket, eventListeners, event$);
	});

	const events = Object.keys(eventToActionMapper);

	return merge(event$, outsideEvent$).pipe(
		filter(({ event }) => events.includes(event)),
		withLatestFrom(gameState$),
		mergeMap(([{ event, data }, state]) => streamSwitchCase(eventToActionMapper, event, data, state)),
	);
}

/**
 *
 * @param gameAction$
 * @param gameState$
 * @param actionToEmitMapper
 * @returns {Observable<*>}
 */
function createEmitStream(gameAction$, gameState$, actionToEmitMapper){
	const actionTypes = Object.keys(actionToEmitMapper);

	return gameAction$.pipe(
		filter(({ type }) => actionTypes.includes(type)),
		withLatestFrom(gameState$),
		mergeMap(([{ type, payload }, state]) => streamSwitchCase(actionToEmitMapper, type, payload, state)),
	);
}

module.exports = function(socket, auth){
	const eventToActionMapper = createEventToActionMapper(auth);
	const actionToEmitMapper = createActionToEmitMapper(auth);
	/**
	 * Given game action/state streams, and dispatch function
	 * Connects the user socket to the game. You can use unsubscribe
	 * method used to break this connection between the game and the socket
	 * @param gameAction$
	 * @param gameState$
	 * @param gameDispatch
	 * @returns {Observable<*>}
	 */
	function register(gameAction$, gameState$, gameDispatch){
		return new Observable(() => {
			const outsideEvent$ = new Subject();
			const action$ = createActionStream(socket, outsideEvent$, gameState$, eventToActionMapper);
			const emit$ = createEmitStream(gameAction$, gameState$, actionToEmitMapper);

			// send each action created by the socket events to the game store
			const actionSub = action$.subscribe(action => gameDispatch(action));
			// send each emit created by the game store to socket
			const emitSub = emit$.subscribe(({ event, data }) => socket.emit(event, data));

			// emit register event
			outsideEvent$.next({ event: 'register' });

			return function unsubscribe(){
				// emit unregister action
				// TODO: maybe not call unregister if the room is deleted???
				outsideEvent$.next({ event: 'unregister' });
				outsideEvent$.complete();

				// stop listening to all events/actions
				emitSub.unsubscribe();
				actionSub.unsubscribe();
			}
		});
	}

	return { register };
};