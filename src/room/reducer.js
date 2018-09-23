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
	}
	return state;
};