const { EVENTS } = require('../constants');
const { ActionTypes, GameState } = require('../../room/constants');

function formatRoomState(room){
	const {
		id, state, round, roundState: { teller }, users, online,
		leaderboard, foundRight, createdAt,
		lastRoundStartedAt, lastRoundEndedAt
	} = room;

	return {
		id, state, round, teller, createdAt, lastRoundStartedAt, lastRoundEndedAt,
		users, online, leaderboard, foundRight
	};
}

function getTeller(state){
	return state.getIn(['roundState', 'teller']);
}

function createChooseCategoryEvent(state){
	const categories = state.getIn(['pickState', 'categories']).valueSeq().toArray();

	return { event: EVENTS.CHOOSE_CATEGORY, data: { categories } };
}

function createTellAnswerEvent(state){
	return {
		event: EVENTS.TELL_ANSWER,
		data: state.getIn(['roundState', 'answer'])
	};
}

module.exports = ({ id }) => ({
	// simple example of emitting socket events on game actions
	[ActionTypes.USER_CONNECTED]: (data, state) => {
		const { user } = data;

		if(user.get('id') !== id){
			return { event: EVENTS.ANOTHER_USER_CONNECTED, data };
		}else{
			const isTeller = getTeller(state) === id;
			const gameState = state.get('state');

			const connectedEvent = {
				event: EVENTS.ROOM_CONNECTED,
				data: { room: formatRoomState(state.toJS()) }
			};

			if(!isTeller) return connectedEvent;

			if(gameState === GameState.ROUND_PICK_ANSWER){
				return [connectedEvent, createChooseCategoryEvent(state)];
			}else if(gameState === GameState.ROUND_IN_PROGRESS){
				return [connectedEvent, createTellAnswerEvent(state)];
			}else{
				return connectedEvent;
			}
		}
	},
	// say messages should be broadcast to all users
	[ActionTypes.SOCKET_USER_SAY]: ({ userId, message, time }, state) => {
		if(state.getIn(['roundState', 'teller']) !== userId)
			return NEVER;

		return {
			event: EVENTS.TELL,
			data: { userId, time, tell: message },
		};
	},
	[ActionTypes.WRONG_ANSWER_FOUND]: ({ userId, message, time }) => ({
		event: EVENTS.ANSWER,
		data: { userId, time, answer: message }
	}),
	[ActionTypes.USER_HATCH_PERCENTAGE]: ({ userId, hatchPercentage }) => ({
		event: EVENTS.HATCH_STATUS,
		data: { userId, hatchPercentage },
	}),
	[ActionTypes.USER_DISCONNECTED]: ({ userId }) => ({
		event: EVENTS.USER_DISCONNECTED,
		data: { userId }
	}),
	[ActionTypes.ROUND_START_SUCCESS]: (_, state) => {
		const teller = getTeller(state);

		return [
			{ event: EVENTS.ROUND_START },
			...(teller === id ? [createChooseCategoryEvent(state)] : [])
		];
	},
	[ActionTypes.ROUND_IN_PROGRESS_SUCCESS]: (_, state) => {
		if(id !== state.getIn(['roundState', 'teller']))
			return [];

		return createTellAnswerEvent(state);
	},
	[ActionTypes.ROUND_END_SUCCESS]: (_, state) => ({
		event: EVENTS.ROUND_END,
		data: { answer: state.getIn(['roundState', 'answer']) }
	}),
	[ActionTypes.LEADERBOARD_UPDATE]: (_, state) => ({
		event: EVENTS.LEADERBOARD_UPDATE,
		data: { leaderboard: state.get('leaderboard').toJS() },
	}),
	[ActionTypes.RIGHT_ANSWER_FOUND]: ({ userId }) => ({
		event: EVENTS.RIGHT_ANSWER,
		data: { userId }
	}),
});
