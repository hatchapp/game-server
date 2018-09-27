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
	foundRight: Map({}),
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
				.setIn(['users', user.get('id')], user)
				.setIn(['leaderboard', user.get('id')], 0);
		}
		case ActionTypes.ROUND_START_SUCCESS: {
			const { answer, teller } = action.payload;

			return state.merge({
				state: GameState.ROUND_IN_PROGRESS,
				round: state.get('round') + 1,
				roundState: Map({ answer, teller }),
				foundRight: Map({}),
				lastRoundStartedAt: Date.now(),
			});
		}
		case ActionTypes.ROUND_END_SUCCESS: {
			return state.merge({
				state: GameState.ROUND_FINISHED,
				roundState: Map({ answer: null, teller: null }),
				lastRoundEndedAt: Date.now(),
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
		case ActionTypes.RIGHT_ANSWER_FOUND: {
			const { userId } = action.payload;

			return state.setIn(['foundRight', userId], Map({ time: Date.now() }));
		}
		case ActionTypes.ADD_USER_LEADERBOARD_POINTS: {
			const { userId, points } = action.payload;
			const oldPoints = state.getIn(['leaderboard', userId]) || 0;

			return state.setIn(['leaderboard', userId], oldPoints + points);
		}
		case ActionTypes.WRONG_ANSWER_FOUND: {
			const { userId } = action.payload;
			const oldHatch = state.getIn(['users', userId, 'hatch']) || 0;

			return state.setIn(['users', userId, 'hatch'], Math.max(oldHatch - 1, 0));
		}
		case ActionTypes.REFRESH_USERS_HATCH: {
			const { hatch } = action.payload;

			return state.update('users', users => users.map(user => user.set('hatch', hatch)));
		}
	}
	return state;
};