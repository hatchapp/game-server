const { mapObjectKeysToValues } = require('../utils');

module.exports = {
	ActionTypes: {
		USER_CONNECTED: 1,
	},
};

module.exports.ActionTypes = mapObjectKeysToValues(module.exports.ActionTypes);
