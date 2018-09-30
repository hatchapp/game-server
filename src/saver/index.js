const { from } = require('rxjs');
const { mergeMap, withLatestFrom } = require('rxjs/operators');
const { ActionTypes } = require('../room/constants');
const { ofType } = require('redux-observable');

module.exports = function(persist){
	const actionsToSave = [
		ActionTypes.ROUND_START_SUCCESS,
		ActionTypes.ROUND_END_SUCCESS,
		ActionTypes.LEADERBOARD_UPDATE,
		ActionTypes.USER_CONNECTED,
		ActionTypes.USER_DISCONNECTED,
	];

	function register(gameAction$, gameState$, _, meta){
		return gameAction$.pipe(
			ofType(...actionsToSave),
			withLatestFrom(gameState$),
			mergeMap(([_, state]) => from(persist.setRoom(meta.id, state))),
		);
	}

	return { register };
};