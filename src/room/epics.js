const { of, NEVER } = require('rxjs');
const { map } = require('rxjs/operators');
const { combineEpics, ofType } = require('redux-observable');
const actions = require('./actions');
const { ActionTypes } = require('./constants');

function createUser(id, hatchLimit) {
	return {
		id,
		name: `user#${Math.floor(Math.random() * 1000000)}`,
		createdAt: Date.now(),
		hatch: hatchLimit,
	};
}

module.exports = function({ id, gameConfig: { HATCH_LIMIT = 20 } = {} }){
	function log(action$, state$){
		action$.subscribe((action) => console.log(JSON.stringify({ action, time: Date.now() })));
		state$.subscribe((state) => console.log(JSON.stringify({ state, time: Date.now() })));

		return NEVER;
	}

	// init the game
	function init(){
		return of(actions.createRoomInitWithId(id, Date.now()));
	}

	// when a socket user is connected, create a user, emit user connected action
	function userConnected(action$){
		return action$.pipe(
			ofType(ActionTypes.SOCKET_USER_CONNECTED),
			map(({ payload: { userId } }) => {
				const user = createUser(userId, HATCH_LIMIT);

				return actions.createUserConnected(user);
			})
		);
	}

	return combineEpics(
		log,
		init,
		userConnected,
	);
};