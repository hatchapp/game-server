const { from, merge, NEVER, of, throwError } = require('rxjs');
const { catchError, delay, filter, map, mergeMap, switchMap, takeUntil, withLatestFrom } = require('rxjs/operators');
const { combineEpics, ofType } = require('redux-observable');
const actions = require('./actions');
const { ActionTypes, Answers, GameState } = require('./constants');

function createUser(id, hatchLimit) {
	return {
		id,
		name: `user#${Math.floor(Math.random() * 1000000)}`,
		createdAt: Date.now(),
		hatch: hatchLimit,
	};
}

function pickTeller(users){
	return users[Math.floor(Math.random() * users.length)];
}

function pickAnswer(){
	return Answers[Math.floor(Math.random() * Answers.length)];
}

function createNewRoundAction(state){
	return actions.createRoundStartSuccess(
		pickAnswer(),
		pickTeller(state.get('users').keySeq().toArray())
	);
}

module.exports = function({
      id,
	  gameConfig: {
      	  HATCH_LIMIT = 20,
		  ROUND_PLAY_TIME = 90000,
		  ROUND_RESTART_TIME = 5000,
		  NOT_ENOUGH_PLAYERS_ROUND_END_TIMEOUT = 5000,
		  ENOUGH_PLAYER_COUNT = 2,
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
					return of(createNewRoundAction(state));
				}),
				catchError((err) => of(actions.createRoundStartFailed()))
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
			))
		);

		return merge(gameEnd$, notEnoughPlayers$).pipe(
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
					if(state.get('state') !== GameState.ROUND_IN_PROGRESS)
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
	);
};