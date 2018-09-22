module.exports = {
	GAME_STATE: {
		IDLE: 0,
		ROUND_IN_PROGRESS: 1,
		ROUND_FINISHED: 2,
	},
	HATCH_LIMIT: 10,
	EVENTS: {
		CONNECTED: 'connected',
		HATCH_STATUS: 'hatch',
		ANSWER: 'answer',
		TELL_ANSWER: 'tell_answer',
		RIGHT_ANSWER: 'right_answer',
		ROUND_START: 'round_start',
		ROUND_END: 'round_end',
		USER_DISCONNECTED: 'user_disconnect',
		ANOTHER_USER_CONNECTED: 'another_user_connected',
		LEADERBOARD_UPDATE: 'leaderboard_update',
	},
	ANSWERS: ['geyik', 'kuzuların sessizliği', 'yerli malı', 'yahşi batı'],
};