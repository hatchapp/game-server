const { mapObjectKeysToValues } = require('../utils');

module.exports = {
	ActionTypes: {
		SOCKET_USER_CONNECTED: 1,
		SOCKET_USER_SAY: 2,
		SOCKET_USER_DISCONNECTED: 3,
	},
};

module.exports.ActionTypes = mapObjectKeysToValues(module.exports.ActionTypes);
