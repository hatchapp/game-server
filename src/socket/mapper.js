const { Observable } = require('rxjs');
const { map, filter } = require('rxjs/operators');
const { EVENTS } = require('./constants');
const { ActionTypes } = require('../room/constants');
const { createUserConnected } = require('../room/actions');

function createEventToActionMapper({ id }){
	return {
		'register': () => createUserConnected(id),
		'disconnect': () => null,
		[EVENTS.SAY]: ({ say, date }) => null,
	};
}

function createActionToEmitMapper({ id }){
	return {
		// simple example of emitting socket events on game actions
		[ActionTypes.USER_CONNECTED]: ({ userId }, state) => (
			userId !== id ? { event: EVENTS.ANOTHER_USER_CONNECTED, data: { userId } } : null
		)
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
		map((action) => actionToEmitMapper[action.type](action.payload)),
		filter(x => x)
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
			const action$ = createActionStream(socket, eventToActionMapper);
			const emit$ = createEmitStream(gameAction$, gameState$, actionToEmitMapper);

			// send each action created by the socket events to the game store
			const actionSub = action$.subscribe(action => gameDispatch(action));
			// send each emit created by the game store to socket
			const emitSub = emit$.subscribe(({ event, data }) => socket.emit(event, data));

			// if there is a register action, send it
			const registerAction = eventToActionMapper['register']();
			if(registerAction) gameDispatch(registerAction);

			return function unsubscribe(){
				// send disconnect action if there is a definition for it, the room is left
				const disconnectAction = eventToActionMapper['disconnect']();
				if(disconnectAction) gameDispatch(disconnectAction);
				// stop listening to all events/actions
				emitSub.unsubscribe();
				actionSub.unsubscribe();
			}
		});
	}

	return { register };
};