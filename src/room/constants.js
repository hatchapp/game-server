const { mapObjectKeysToValues } = require('../utils');

module.exports = {
	ActionTypes: {
		SOCKET_USER_CONNECTED: 1,
		SOCKET_USER_SAY: 2,
		SOCKET_USER_DISCONNECTED: 3,
		ROOM_INIT_WITH_ID: 4,
		USER_CONNECTED: 5,
		ROUND_START_REQUEST: 6,
		ROUND_START_SUCCESS: 7,
		ROUND_START_FAILED: 8,
		ROUND_END_REQUEST: 9,
		ROUND_END_SUCCESS: 10,
		ROUND_END_FAILED: 11,
		USER_DISCONNECTED: 12,
		HAVE_ENOUGH_PLAYERS: 13,
		ROUND_END_STATE_WAIT_COMPLETED: 14,
	},
	GameState: {
		IDLE: 0,
		ROUND_IN_PROGRESS: 1,
		ROUND_FINISHED: 2,
	},
	Answers: ['geyik', 'kuzuların sessizliği', 'yerli malı', 'yahşi batı'],
};

module.exports.ActionTypes = mapObjectKeysToValues(module.exports.ActionTypes);
