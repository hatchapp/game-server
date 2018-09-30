const { fromEvent, from, of, merge, NEVER, throwError } = require('rxjs');
const { catchError, distinctUntilChanged, filter, mergeMap, startWith, switchMap, takeUntil } = require('rxjs/operators');
const bunyan = require('bunyan');
const config = require('./config');
const logger = bunyan.createLogger({ name: config.name });
const { EVENTS } = require('./socket/constants');
const { getAuth, getRoomId } = require('./socket/utils');
const socketMapper = require('./socket/mapper');
const Answers = require('./answers/index')(config.answers);
const createSaveMapper = require('./saver/index');

function getRoomDeleted$(deleteRoom$, roomId){
	return deleteRoom$.pipe(
		filter(deletedRoomId => deletedRoomId === roomId),
		mergeMap(() => throwError(new Error('room deleted'))),
	);
}

async function main(){
	// create the socket server
	const { socket$, listen } = require('./socket/index')(config.port);
	// create the movie answer backend
	const MovieDatabaseCreator = await Answers.connect();
	// create a persist backend with redis
	const persist = require('./redis')(config.redis);
	// check connection to persist backend is okay
	await persist.ping();
	// create a mapper for saving room state
	const saveMapper = createSaveMapper(persist);
	// create a lobby instance with the persist layer
	const lobby = require('./lobby/index')(persist);
	// get a handle of room create/delete actions in the lobby
	const { createRoom$, deleteRoom$ } = lobby;

	// for each room created, add a room state saver
	const saver$ = createRoom$.pipe(
		mergeMap((room) => {
			const { action$, state$, dispatch, meta } = room;
			return saveMapper.register(action$, state$, dispatch, meta);
		}),
	);

	// connect each socket to an appropriate game room
	const service$ = socket$.pipe(
		mergeMap((socket) => of(null).pipe(
			mergeMap(() => {
				const auth = getAuth(socket);
				const roomId = getRoomId(socket);
				logger.info({ auth, roomId }, 'got socket');
				const mapper = socketMapper(socket, auth);
				const changeMap$ = fromEvent(socket, EVENTS.ROOM_CHANGE);
				const disconnect$ = fromEvent(socket, 'disconnect');

				return changeMap$.pipe(
					startWith(roomId),
					distinctUntilChanged(),
					// for each room change event, re-register to the room/game
					switchMap((roomId) => {
						const roomDeleted$ = getRoomDeleted$(deleteRoom$, roomId);

						const registered$ = from(
							lobby.getOrCreateRoom(roomId, { MovieDatabaseCreator })
						).pipe(
							mergeMap(function(room){
								const { action$, state$, dispatch } = room;
								return mapper.register(action$, state$, dispatch)
							}),
						);

						return merge(roomDeleted$, registered$).pipe(
							takeUntil(disconnect$),
						);
					}),
					catchError((err) => {
						logger.error(err, 'an error happened in socket room changing');
						socket.close();
						return NEVER;
					})
				);
			}),
			catchError((err) => {
				logger.error(err, 'an error occurred when creating socket room mapping');
				socket.close();
				return NEVER;
			})
		))
	);

	merge(
		saver$,
		service$
	).subscribe(() => null);
	await listen();
}

main().catch((err) => console.log('err', err));
