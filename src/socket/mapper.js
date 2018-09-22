const { Observable } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const { EVENTS } = require('./constants');
const { ActionTypes } = require('../game/constants');

function createEventToActionMapper({ id }){
	return {
		[EVENTS.SAY]: ({ say, date }) => ({}),
	};
}

function createActionToEmitMapper({ id }){
	return {
		[ActionTypes.X]: ({ type, payload }, state) => ({})
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
 * @param eventToActionMapper
 * @returns {Observable<*>}
 */
function createActionStream(socket, eventToActionMapper){
	return new Observable((action$) => {
		const eventListeners = Object.keys(eventToActionMapper).reduce((listeners, event) => {
			function listener(){
				socket.on(event, (data) => {
					// map and stream the socket event as an Redux action
					const action = eventToActionMapper[event](data);
					if(action) action$.next(action);
				});
			}

			// add the listener function to socket event as a listener
			socket.on(event, listener);
			listeners[event] = listener;
			return listeners;
		}, {});

		return createUnregisterFunction(socket, eventListeners, action$);
	});
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
		map((action) => actionToEmitMapper[action.type]()),
		filter(x => x)
	);
}

module.exports = function(socket){
	const { id } = socket;
	const config = { id };
	const eventToActionMapper = createEventToActionMapper(config);
	const actionToEmitMapper = createActionToEmitMapper(config);
	/**
	 * Given game action/state streams, and dispatch function
	 * Connects the user socket to the game. You can use unsubscribe
	 * method used to break this connection between the game and the socket
	 * @param gameAction$
	 * @param gameState$
	 * @param gameDispatch
	 * @returns {{unsubscribe: Function}}
	 */
	function register(gameAction$, gameState$, gameDispatch){
		const action$ = createActionStream(socket, eventToActionMapper);
		const emit$ = createEmitStream(gameAction$, gameState$, actionToEmitMapper);

		// send each action created by the socket events to the game store
		const actionSub = action$.subscribe(action => gameDispatch(action));
		// send each emit created by the game store to socket
		const emitSub = emit$.subscribe(({ event, data }) => socket.emit(event, data));

		// stop listening to all events/actions
		function unsubscribe(){
			emitSub.unsubscribe();
			actionSub.unsubscribe();
		}

		return { unsubscribe };
	}

	return { register };
};