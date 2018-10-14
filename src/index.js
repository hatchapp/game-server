const { fromEvent, from, of, merge, NEVER, throwError } = require('rxjs');
const { catchError, debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, takeUntil } = require('rxjs/operators');
const bunyan = require('bunyan');
const config = require('./config');
const logger = bunyan.createLogger({ name: config.name });
const { EVENTS } = require('./socket/constants');
const { getAuth, getRoomId } = require('./socket/utils');
const socketMapper = require('./socket/mapper');
const Answers = require('./answers/index')(config.answers);
const resolvers = require('./resolvers/index');
const createSaveMapper = require('./saver/index');
const hashring = require('swim-hashring');
const createSupervisorMapper = require('./supervisor/index');

function getRoomDeleted$(deleteRoom$, roomId){
	return deleteRoom$.pipe(
		filter(deletedRoomId => deletedRoomId === roomId),
	);
}

// resolve base peers by the arguments in the process arguments
async function resolveWithLocal(){
	const resolver = resolvers.local({ argv: process.argv });
	return resolver.resolve();
}

// resolve by using the docker api, requires binding of docker socket
async function resolveWithDocker(){
	const resolver = resolvers.docker({
		port: config.hashring.port,
		image: config.docker.image,
		network: config.docker.network
	});

	return resolver.resolve();
}

/**
 * Wait for given ring to successfully emit *up* before *error* event.
 * @param ring
 * @returns {Promise<*>}
 */
function waitForHashring(ring){
	return new Promise((resolve, reject) => {
		ring.on('up', resolve);
		ring.on('error', reject);
	});
}

function handleRingMove(ring, lobby){
	const move$ = fromEvent(ring, 'move');
	const stop$ = merge(
		fromEvent(ring, 'error'),
	);

	return move$.pipe(
		debounceTime(config.hashring.moveDebounce),
		mergeMap(() => {
			return from(lobby.getActiveRoomIds()).pipe(
				filter((roomId) => !ring.allocatedToMe(roomId)),
				mergeMap((roomId) =>
					of(lobby.deleteRoom(roomId, { deleteFromPersistence: false })).pipe(
						map(() => {
							logger.info({ roomId }, 'deleted room');
						}),
						catchError((err) => {
							logger.error(err, `an error happened when deleting room with id of '${roomId}'`);
							return NEVER;
						})
					)
				),
			);
		}),
		takeUntil(stop$),
	).subscribe(() => null);
}

function handleErrors(ring, io, server){
	merge(
		...[ring, io, server]
			.map((part) => fromEvent(part, 'error'))
	).subscribe(() => {
		process.exit(-1);
	});
}

async function main(){
	// pick the strategy to choose swim base finding strategy
	const resolverToUse = process.argv.length > 2 && process.argv[2].trim() === 'local' ? resolveWithLocal : resolveWithDocker;
	// find the base peers
	const base = await resolverToUse();
	// create the hashring with the configuration
	const ring = hashring({
		port: config.hashring.port,
		base,
		meta: { socketServerPort: config.socket.port },
	});

	logger.info({ hashring: { port: config.hashring.port, base } }, 'trying to connect to hashring');
	// wait for the hashring to successfully initialize
	await waitForHashring(ring);
	logger.info({ hashring: { port: config.hashring.port, base } }, 'connected to hashring');
	// create the socket server
	const { socket$, listen, io, server } = require('./socket/index')(config.socket.port);
	// create the movie answer backend
	const MovieDatabaseCreator = await Answers.connect();
	// create a persist backend with redis
	const persist = require('./redis')(config.redis);
	// check connection to persist backend is okay
	await persist.ping();
	// create a lobby instance with the persist layer
	const lobby = require('./lobby/index')(persist, (roomId) => ring.allocatedToMe(roomId));
	// create a mapper for saving room state
	const saveMapper = createSaveMapper(persist);
	// create supervisor mapper for removing room when its not necessary anymore
	const supervisorMapper = createSupervisorMapper(lobby);
	// get a handle of room create/delete actions in the lobby
	const { createRoom$, deleteRoom$ } = lobby;

	// make sure we remove rooms from the lobby when we are no longer handling them
	handleRingMove(ring, lobby);

	// handle errors that may happen on the critical parts of the system
	handleErrors(ring, io, server);

	// for each room created, add a room state saver
	const saver$ = createRoom$.pipe(
		mergeMap((room) => of(null).pipe(
			mergeMap(() => {
				const { action$, state$, dispatch, meta } = room;
				return saveMapper.register(action$, state$, dispatch, meta).pipe(
					takeUntil(getRoomDeleted$(deleteRoom$, room.meta.id))
				);
			}),
		))
	);

	const supervisor$ = createRoom$.pipe(
		mergeMap((room) => of(null).pipe(
			mergeMap(() => {
				const { action$, state$, dispatch, meta } = room;
				return supervisorMapper.register(action$, state$, dispatch, meta).pipe(
					takeUntil(getRoomDeleted$(deleteRoom$, room.meta.id))
				);
			}),
		))
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
						const roomDeletedError$ = roomDeleted$.pipe(
							mergeMap(() => throwError(new Error('room deleted'))),
						);

						const registered$ = from(
							lobby.getOrCreateRoom(roomId, { MovieDatabaseCreator })
						).pipe(
							mergeMap(function(room){
								const { action$, state$, dispatch } = room;
								return mapper.register(action$, state$, dispatch).pipe(
									takeUntil(roomDeleted$)
								);
							}),
						);

						return merge(
							roomDeletedError$,
							registered$
						).pipe(
							takeUntil(disconnect$)
						);
					}),
					catchError((err) => {
						logger.error(err, 'an error happened in socket room changing');
						socket.disconnect();
						return NEVER;
					})
				);
			}),
			catchError((err) => {
				logger.error(err, 'an error occurred when creating socket room mapping');
				socket.disconnect();
				return NEVER;
			})
		))
	);

	merge(
		saver$,
		supervisor$,
		service$
	).subscribe(() => null);
	await listen();
	logger.info({ socket: { port: config.socket.port } }, 'started socket server');
}

main().catch((err) => {
	logger.error(err, 'main loop error');
	process.exit(-1);
});
