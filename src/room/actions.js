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

function createRoundStartRequest(){
	return { type: ActionTypes.ROUND_START_REQUEST };
}

function createRoundStartSuccess(answer, teller){
	return { type: ActionTypes.ROUND_START_SUCCESS, payload: { answer, teller } };
}

function createRoundStartFailed(){
	return { type: ActionTypes.ROUND_START_FAILED };
}

function createHaveEnoughPlayers(){
	return { type: ActionTypes.HAVE_ENOUGH_PLAYERS };
}

function createRoundEndRequest(){
	return { type: ActionTypes.ROUND_END_REQUEST };
}

function createRoundEndSuccess(){
	return { type: ActionTypes.ROUND_END_SUCCESS };
}

function createRoundEndFailed(){
	return { type: ActionTypes.ROUND_END_FAILED };
}

function createUserDisconnected(userId){
	return { type: ActionTypes.USER_DISCONNECTED, payload: { userId } };
}

function createRoundEndStateWaitCompleted(){
	return { type: ActionTypes.ROUND_END_STATE_WAIT_COMPLETED };
}

module.exports = {
	createSocketUserConnected,
	createSocketUserSay,
	createSocketUserDisconnected,
	createRoomInitWithId,
	createUserConnected,
	createRoundStartRequest,
	createRoundStartSuccess,
	createRoundStartFailed,
	createHaveEnoughPlayers,
	createRoundEndRequest,
	createRoundEndSuccess,
	createRoundEndFailed,
	createUserDisconnected,
	createRoundEndStateWaitCompleted,
};