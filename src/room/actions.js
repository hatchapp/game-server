const { ActionTypes } = require('./constants');

function createSocketUserConnected(userId){
	return { type: ActionTypes.SOCKET_USER_CONNECTED, payload: { userId } };
}

function createSocketUserSay(userId, message, time){
	return { type: ActionTypes.SOCKET_USER_SAY, payload: { userId, message, time } };
}

function createSocketUserDisconnected(userId){
	return { type: ActionTypes.SOCKET_USER_DISCONNECTED, payload: { userId } };
}

module.exports = {
	createSocketUserConnected,
	createSocketUserSay,
	createSocketUserDisconnected,
};