const { fromEvent, from } = require('rxjs');
const { catchError, distinctUntilChanged, mergeMap, startWith, switchMap } = require('rxjs/operators');
const bunyan = require('bunyan');
const config = require('./config');
const logger = bunyan.createLogger({ name: config.name });
const { EVENTS } = require('./socket/constants');
const socket$ = require('./socket/index')(config.port);
const { getAuth, getRoomId } = require('./socket/util');
const socketMapper = require('./socket/mapper');
const lobby = require('./lobby/index')();

const service$ = socket$.pipe(
	mergeMap((socket) => {
		const auth = getAuth(socket);
		const roomId = getRoomId(socket);
		logger.info({ auth, roomId }, 'got socket');
		const mapper = socketMapper(socket, auth);
		const changeMap$ = fromEvent(socket, EVENTS.ROOM_CHANGE);

		return changeMap$.pipe(
			startWith(roomId),
			distinctUntilChanged(),
			// for each room change event, re-register to the room/game
			switchMap((roomId) => {
				return from(lobby.getOrCreateRoom(roomId)).pipe(
					mergeMap(({ action$, state$, dispatch }) => mapper.register(action$, state$, dispatch))
				);
			}),
			catchError((err) => logger.error(err, 'an error happened in socket mapping'))
		);
	}),
);

service$.subscribe(() => null);
