const { Map } = require('immutable');
const { ActionTypes, GameState } = require('./constants');
const INITIAL_STATE = Map({
	id: null,
	state: GameState.IDLE,
	round: 0,
	roundState: {
		answer: null,
		teller: null,
	},
	users: Map({}),
	leaderboard: Map({}),
	createdAt: null,
	lastRoundStartedAt: null,
	lastRoundEndedAt: null,
});

module.exports = function(state = INITIAL_STATE, action){
	switch(action.type){
		case ActionTypes.ROOM_INIT_WITH_ID: {
			const { id, createdAt } = action.payload;
			return state.merge({ id, createdAt });
		}
		case ActionTypes.USER_CONNECTED: {
			const { user } = action.payload;

			return state
				.setIn(['users', user.id], user)
				.setIn(['leaderboard', user.id], 0);
		}
		case ActionTypes.ROUND_START_SUCCESS: {
			const { answer, teller } = action.payload;

			return state.merge({
				state: GameState.ROUND_IN_PROGRESS,
				round: state.get('round') + 1,
				roundState: Map({ answer, teller }),
				lastRoundStartedAt: Date.now()
			});
		}
		case ActionTypes.ROUND_END_SUCCESS: {
			return state.merge({
				state: GameState.ROUND_FINISHED,
			});
		}
		case ActionTypes.ROUND_END_STATE_WAIT_COMPLETED: {
			return state.merge({ state: GameState.IDLE });
		}
		case ActionTypes.USER_DISCONNECTED: {
			const { userId } = action.payload;

			return state
				.removeIn(['users', userId])
				.removeIn(['leaderboard', userId]);
		}
	}
	return state;
};