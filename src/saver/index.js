const redis = require('redis');
const { from } = require('rxjs');
const { mergeMap, withLatestFrom } = require('rxjs/operators');
const { promisify } = require('util');
const { ActionTypes } = require('../room/constants');
const { ofType } = require('redux-observable');

function getSaveKey(prefix, roomMeta){
	return `${prefix}#${roomMeta.id}`;
}

module.exports = function({ url, config: { ROOM_SAVE_PREFIX = 'room' } = {} }  = {}){
	const client = redis.createClient(url);
	const setToRedis = promisify(client.set).bind(client);
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
			mergeMap(([_, state]) =>
				from(
					setToRedis(
						getSaveKey(ROOM_SAVE_PREFIX, meta),
						JSON.stringify(state),
					)
				)
			),
		);
	}

	return { register };
};