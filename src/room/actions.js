const { ActionTypes, Symbols } = require('./constants');

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

function createRoundStartSuccess(categories, teller){
	return { type: ActionTypes.ROUND_START_SUCCESS, payload: { categories, teller } };
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

function createRightAnswerFound(userId){
	return { type: ActionTypes.RIGHT_ANSWER_FOUND, payload: { userId } };
}

function createLeaderboardUpdate(){
	return { type: ActionTypes.LEADERBOARD_UPDATE };
}

function createAddUserLeaderboardPoints(userId, points){
	return { type: ActionTypes.ADD_USER_LEADERBOARD_POINTS, payload: { userId, points } };
}

function createWrongAnswerFound(userId, message, time){
	return { type: ActionTypes.WRONG_ANSWER_FOUND, payload: { userId, message, time } };
}

function createUserHatchPercentage(userId, hatchPercentage){
	return { type: ActionTypes.USER_HATCH_PERCENTAGE, payload: { userId, hatchPercentage } };
}

function createRefreshUsersHatch(hatch){
	return { type: ActionTypes.REFRESH_USERS_HATCH, payload: { hatch } };
}

function createSocketUserPickAnswer(userId, categoryId, time){
	return { type: ActionTypes.SOCKET_USER_PICK_ANSWER, payload: { userId, categoryId, time } };
}

function createAutomaticTellerPickAnswerRequest(categoryId){
	return { type: ActionTypes.AUTOMATIC_TELLER_PICK_ANSWER_REQUEST, payload: { userId: Symbols.SYSTEM, time: Date.now(), categoryId } };
}

function createTellerPickAnswerSuccess(userId, categoryId, time){
	return { type: ActionTypes.TELLER_PICK_ANSWER_SUCCESS, payload: { userId, categoryId, time } };
}

function createTellerPickAnswerFailed(userId){
	return { type: ActionTypes.TELLER_PICK_ANSWER_FAILED, payload: { userId } };
}

function createRoundInProgressRequest(){
	return { type: ActionTypes.ROUND_IN_PROGRESS_REQUEST };
}

function createRoundInProgressSuccess(answer){
	return { type: ActionTypes.ROUND_IN_PROGRESS_SUCCESS, payload: { answer } };
}

function createRoundInProgressFailed(){
	return { type: ActionTypes.ROUND_IN_PROGRESS_FAILED };
}

function createResumeGameFromInitialState(){
	return { type: ActionTypes.RESUME_GAME_FROM_INITIAL_STATE };
}

function createTellerLeftGame(){
	return { type: ActionTypes.TELLER_LEFT_GAME };
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
	createRightAnswerFound,
	createLeaderboardUpdate,
	createAddUserLeaderboardPoints,
	createWrongAnswerFound,
	createUserHatchPercentage,
	createRefreshUsersHatch,
	createSocketUserPickAnswer,
	createAutomaticTellerPickAnswerRequest,
	createTellerPickAnswerSuccess,
	createTellerPickAnswerFailed,
	createRoundInProgressRequest,
	createRoundInProgressSuccess,
	createRoundInProgressFailed,
	createResumeGameFromInitialState,
	createTellerLeftGame,
};