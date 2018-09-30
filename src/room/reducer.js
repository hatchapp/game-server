const { Map } = require('immutable');
const { ActionTypes, GameState } = require('./constants');
const { getTitles } = require('./utils');

const INITIAL_STATE = Map({
	id: null,
	state: GameState.IDLE,
	round: 0,
	roundState: Map({
		answer: null,
		titles: null,
		teller: null,
	}),
	pickState: Map({
		categories: null,
		picked: null,
	}),
	users: Map({}),
	leaderboard: Map({}),
	foundRight: Map({}),
	online: Map({}),
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
				.setIn(['online', user.get('id')], Date.now())
				.setIn(['leaderboard', user.get('id')], 0);
		}
		case ActionTypes.ROUND_START_SUCCESS: {
			const { categories, teller } = action.payload;

			return state.merge({
				state: GameState.ROUND_PICK_ANSWER,
				round: state.get('round') + 1,
				roundState: Map({ teller, answer: null, titles: null }),
				pickState: Map({ categories, picked: null }),
				foundRight: Map({}),
				lastRoundStartedAt: Date.now(),
			});
		}
		case ActionTypes.TELLER_PICK_ANSWER_SUCCESS: {
			const { categoryId } = action.payload;

			return state
				.update('pickState', (pickState) => pickState.set('picked', categoryId));
		}
		case ActionTypes.ROUND_IN_PROGRESS_SUCCESS: {
			const { answer } = action.payload;

			return state
				.set('state', GameState.ROUND_IN_PROGRESS)
				.update('roundState', (roundState) => roundState.set('answer', answer).set('titles', getTitles(answer.toJS())));
		}
		case ActionTypes.ROUND_END_SUCCESS: {
			return state.merge({
				state: GameState.ROUND_FINISHED,
				lastRoundEndedAt: Date.now(),
			});
		}
		case ActionTypes.ROUND_END_STATE_WAIT_COMPLETED: {
			return state.merge({ state: GameState.IDLE });
		}
		case ActionTypes.USER_DISCONNECTED: {
			const { userId } = action.payload;

			return state.removeIn(['online', userId]);
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