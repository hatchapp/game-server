const { mapObjectKeysToValues } = require('../utils');

module.exports = {
	ActionTypes: {
		SOCKET_USER_CONNECTED: 1,
		SOCKET_USER_SAY: 2,
		SOCKET_USER_DISCONNECTED: 3,
		ROOM_INIT_WITH_ID: 4,
		USER_CONNECTED: 5,
	},
	GameState: {
		IDLE: 0,
		ROUND_IN_PROGRESS: 1,
		ROUND_FINISHED: 2,
	},
};

module.exports.ActionTypes = mapObjectKeysToValues(module.exports.ActionTypes);
