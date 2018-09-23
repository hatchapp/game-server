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

function createRoomInitWithId(id, createdAt){
	return { type: ActionTypes.ROOM_INIT_WITH_ID, payload: { id, createdAt } };
}

function createUserConnected(user){
	return { type: ActionTypes.USER_CONNECTED, payload: { user } };
}

module.exports = {
	createSocketUserConnected,
	createSocketUserSay,
	createSocketUserDisconnected,
	createRoomInitWithId,
	createUserConnected,
};