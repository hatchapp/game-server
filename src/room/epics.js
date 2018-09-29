const { Map } = require('immutable');
const { from, merge, NEVER, of, throwError } = require('rxjs');
const { catchError, delay, distinct, filter, map, mergeMap, switchMap, takeUntil, withLatestFrom } = require('rxjs/operators');
const { combineEpics, ofType } = require('redux-observable');
const actions = require('./actions');
const { ActionTypes, GameState, Symbols } = require('./constants');
const { CategoryTypes } = require('../answers/constants');
const { cleanAnswerText, pickRandom } = require('./utils');

function createUser(id, hatchLimit) {
	return Map({
		id,
		name: `user#${Math.floor(Math.random() * 1000000)}`,
		createdAt: Date.now(),
		hatch: hatchLimit,
	});
}

function pickCategoriesToSelectFrom(MovieDatabase){
	return from(Promise.all([
		MovieDatabase.getRandomCategories(2, CategoryTypes.GENRE),
		MovieDatabase.getRandomCategories(1, CategoryTypes.DIRECTOR),
	]).then(arr => arr.reduce((acc, a) => acc.concat(a), [])));
}

function createNewRoundActionStream(state, MovieDatabase){
	const category$ = pickCategoriesToSelectFrom(MovieDatabase);

	return category$.pipe(
		map((categories) => {
			return actions.createRoundStartSuccess(
				categories.reduce((acc, category) => acc.set(category.id, category), Map({})),
				pickRandom(state.get('users').keySeq().toArray())
			);
		}),
	);
}

function pickAnswer(categoryId, MovieDatabase){
	return from(MovieDatabase.getRandomAnswerForCategory(categoryId)).pipe(map(Map));
}

function createRoundInProgressActionStream(state, MovieDatabase){
	const categoryId = state.getIn(['pickState', 'picked']);
	const answer$ = pickAnswer(categoryId, MovieDatabase);

	return answer$.pipe(
		map((answer) => actions.createRoundInProgressSuccess(answer)),
	);
}

function createUserRightAnswerAddPointsAction(user){
	const points = user.get('hatch');

	return actions.createAddUserLeaderboardPoints(user.get('id'), Math.max(points, 0));
}

function checkForgive(message, title){
	return message === title;
}

function checkAnswer(message, titles){
	message = cleanAnswerText(message);
	return titles.some((title) => checkForgive(message, title));
}

module.exports = function({
      id,
	  MovieDatabase,
	  gameConfig: {
      	  HATCH_LIMIT = 20,
		  ROUND_PLAY_TIME = 90000,
		  ROUND_RESTART_TIME = 5000,
		  NOT_ENOUGH_PLAYERS_ROUND_END_TIMEOUT = 5000,
		  ENOUGH_PLAYER_COUNT = 2,
		  ROUND_PLAY_TIME_AFTER_FIRST_USER_WON = 10000,
		  USER_ANSWER_PICK_TIME = 3000,
      } = {}
} = {}){
	function log(action$, state$){
		action$.subscribe((action) => console.log(JSON.stringify({ action, time: Date.now() })));
		state$.subscribe((state) => console.log(JSON.stringify({ state, time: Date.now() })));

		return NEVER;
	}

	// init the game
	function init(){
		return of(actions.createRoomInitWithId(id, Date.now()));
	}

	function haveEnoughPlayers(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.SOCKET_USER_CONNECTED),
			withLatestFrom(state$),
			filter(([_, state]) => state.get('users').size === ENOUGH_PLAYER_COUNT),
			map(() => actions.createHaveEnoughPlayers())
		);
	}

	// when a socket user is connected, create a user, emit user connected action
	function userConnected(action$){
		return action$.pipe(
			ofType(ActionTypes.SOCKET_USER_CONNECTED),
			map(({ payload: { userId } }) => {
				const user = createUser(userId, HATCH_LIMIT);

				return actions.createUserConnected(user);
			})
		);
	}

	// when a socket  user is disconnected from the server
	function userDisconnected(action$){
		return action$.pipe(
			ofType(ActionTypes.SOCKET_USER_DISCONNECTED),
			map(({ payload: { userId} }) => actions.createUserDisconnected(userId))
		);
	}

	// send round start request when there are enough players and the game state is idle
	function roundStartWhenUsersJoin(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.HAVE_ENOUGH_PLAYERS),
			withLatestFrom(state$),
			// if there are enough users, and the game state is idle
			filter(([_, state]) => state.get('state') === GameState.IDLE),
			map(() => actions.createRoundStartRequest())
		);
	}

	// start the round if we can, when the
	function roundStart(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_START_REQUEST),
			withLatestFrom(state$),
			mergeMap((result) => of(result).pipe(
				mergeMap(([_, state]) => {
					if(state.get('state') !== GameState.IDLE)
						return throwError(new Error('can not start a round when the game is not idle'));
					if(state.get('users').size <= 1)
						return throwError(new Error('you need at least one person to start a game'));
					return createNewRoundActionStream(state, MovieDatabase);
				}),
				catchError((err) => of(actions.createRoundStartFailed()))
			))
		);
	}

	function tellerPickAnswer(action$, state$){
		return action$.pipe(
			ofType(
				ActionTypes.SOCKET_USER_PICK_ANSWER,
				ActionTypes.AUTOMATIC_TELLER_PICK_ANSWER_REQUEST,
			),
			withLatestFrom(state$),
			mergeMap((result) => of(result).pipe(
				mergeMap(([{ payload: { userId, categoryId, time } }, state]) => {
					if(state.get('state') !== GameState.ROUND_PICK_ANSWER)
						return throwError(new Error('can not pick answer when the game state is not answer pick state'));
					if(userId !== Symbols.SYSTEM && state.getIn(['roundState', 'teller']) !== userId)
						return throwError(new Error('can not pick answer if you are not the teller'));
					if(!state.hasIn(['pickState', 'categories', categoryId]))
						return throwError(new Error('can not pick an category that is not an option for you'));
					return of(actions.createTellerPickAnswerSuccess(userId, categoryId, time));
				}),
				catchError((err) => of(actions.createTellerPickAnswerFailed(result.payload.id)))
			))
		);
	}

	// automatically select answer category if the user does not select in given time
	function autoSelectAnswer(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_START_SUCCESS),
			withLatestFrom(state$),
			switchMap((result) => {
				return of(result).pipe(
					delay(USER_ANSWER_PICK_TIME),
					takeUntil(action$.ofType(ActionTypes.TELLER_PICK_ANSWER_SUCCESS)),
					map(([_, state]) => {
						const categoryId = pickRandom(state.getIn(['pickState', 'categories']).keySeq().toArray());

						return actions.createAutomaticTellerPickAnswerRequest(categoryId);
					})
				);
			})
		);
	}

	function roundInProgressRequest(action$){
		return action$.pipe(
			ofType(ActionTypes.TELLER_PICK_ANSWER_SUCCESS),
			map(() => actions.createRoundInProgressRequest())
		);
	}

	function roundInProgress(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_IN_PROGRESS_REQUEST),
			withLatestFrom(state$),
			mergeMap((result) => of(result).pipe(
				mergeMap(([_, state]) => {
					if(state.get('state') !== GameState.ROUND_PICK_ANSWER)
						return throwError(new Error('can not start a round when the game is not in pick answer state'));
					if(state.get('users').size <= 1)
						return throwError(new Error('you need at least one person to go in progress'));
					return createRoundInProgressActionStream(state, MovieDatabase);
				}),
				catchError((err) => of(actions.createRoundInProgressFailed()))
			))
		);
	}

	// stop the round when there are not enough players to play, or round time is finished
	function roundEndRequest(action$, state$){
		const gameEnd$ = action$.pipe(
			ofType(ActionTypes.ROUND_START_SUCCESS),
			// we need to end the round after enough time has passed
			switchMap(() => of(null).pipe(
				// wait game end time
				delay(ROUND_PLAY_TIME),
				// cancel if a new round starts
				takeUntil(action$.pipe(ofType(ActionTypes.ROUND_END_SUCCESS))),
			)),
		);
		const notEnoughPlayers$ = action$.pipe(
			ofType(ActionTypes.USER_DISCONNECTED),
			withLatestFrom(state$),
			// if the user drops to 1, we need to send round end request,
			filter(([_, state]) => state.get('users').size === 1),
			switchMap(() => of(null).pipe(
				// give some chance because the room may get new connections
				delay(NOT_ENOUGH_PLAYERS_ROUND_END_TIMEOUT),
				// if we got enough time before the delay, cancel
				takeUntil(action$.pipe(ofType(ActionTypes.HAVE_ENOUGH_PLAYERS))),
				// cancel if a new round starts
				takeUntil(action$.pipe(ofType(ActionTypes.ROUND_END_SUCCESS))),
			))
		);
		const userWonRound$ = action$.pipe(
			ofType(ActionTypes.RIGHT_ANSWER_FOUND),
			distinct(null, action$.pipe(ofType(ActionTypes.ROUND_END_SUCCESS))),
			switchMap(() => of(null).pipe(
				// give some time to other users
				delay(ROUND_PLAY_TIME_AFTER_FIRST_USER_WON),
				// cancel if a new round starts
				takeUntil(action$.pipe(ofType(ActionTypes.ROUND_END_SUCCESS))),
			))
		);

		return merge(gameEnd$, notEnoughPlayers$, userWonRound$).pipe(
			map(() => actions.createRoundEndRequest())
		);
	}

	// end the round when the round end request comes
	function roundEnd(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_END_REQUEST),
			withLatestFrom(state$),
			mergeMap((result) => of(result).pipe(
				mergeMap(([_, state]) => {
					if(!([GameState.ROUND_PICK_ANSWER, GameState.ROUND_IN_PROGRESS].includes(state.get('state'))))
						return throwError(new Error('can not end a round when the game is not round in progress state'));
					return of(actions.createRoundEndSuccess());
				}),
				catchError((err) => of(actions.createRoundEndFailed()))
			))
		);
	}

	// try to start a new round after the game ends
	function restartRoundAfterRoundEnd(action$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_END_SUCCESS),
			delay(ROUND_RESTART_TIME),
			mergeMap(() => from([
				actions.createRoundEndStateWaitCompleted(),
				actions.createRoundStartRequest()
			]))
		);
	}

	function leaderboardUpdate(action$){
		return action$.pipe(
			ofType(
				ActionTypes.ROUND_START_SUCCESS,
				ActionTypes.ROUND_END_SUCCESS,
				ActionTypes.ADD_USER_LEADERBOARD_POINTS
			),
			map(() => actions.createLeaderboardUpdate())
		);
	}

	function hatchPercentageUser(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.WRONG_ANSWER_FOUND),
			withLatestFrom(state$),
			map(([{ payload: { userId } }, state]) => {
				const user = state.getIn(['users', userId]);
				const percentage = (100 / HATCH_LIMIT) * (HATCH_LIMIT - (user.get('hatch') || 0));

				return actions.createUserHatchPercentage(userId, percentage);
			})
		);
	}

	function refreshHatch(action$){
		return action$.pipe(
			ofType(ActionTypes.ROUND_START_SUCCESS),
			map(() => actions.createRefreshUsersHatch(HATCH_LIMIT))
		);
	}

	// when the user answer correctly or wrong, create appropriate actions
	function handleAnswer(action$, state$){
		return action$.pipe(
			ofType(ActionTypes.SOCKET_USER_SAY),
			withLatestFrom(state$),
			mergeMap((result) => of(result).pipe(
				mergeMap(([{ payload: { userId, message, time } }, state]) => {
					if(
						state.get('state') !== GameState.ROUND_IN_PROGRESS
						|| userId === state.getIn(['roundState', 'teller'])
						|| state.hasIn(['foundRight', userId])
					){
						return NEVER;
					}

					const user = state.getIn(['users', userId]);

					if(checkAnswer(message, state.getIn(['roundState', 'titles']))){
						return from([
							createUserRightAnswerAddPointsAction(user),
							actions.createRightAnswerFound(userId)
						]);
					}else{
						return from([
							actions.createWrongAnswerFound(userId, message, time)
						]);
					}
				}),
				catchError(() => { return NEVER; })
			))
		);
	}

	return combineEpics(
		log,
		init,
		userConnected,
		roundStartWhenUsersJoin,
		roundStart,
		restartRoundAfterRoundEnd,
		roundEndRequest,
		roundEnd,
		haveEnoughPlayers,
		userDisconnected,
		leaderboardUpdate,
		hatchPercentageUser,
		refreshHatch,
		handleAnswer,
		tellerPickAnswer,
		autoSelectAnswer,
		roundInProgressRequest,
		roundInProgress,
	);
};