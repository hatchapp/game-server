const { ActionTypes } = require('./constants');

function createUserConnected(userId){
	return { type: ActionTypes.USER_CONNECTED, payload: { userId } };
}

module.exports = {
	createUserConnected,
};