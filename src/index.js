const { fromEvent, from, of, NEVER } = require('rxjs');
const { catchError, distinctUntilChanged, mergeMap, startWith, switchMap, takeUntil } = require('rxjs/operators');
const bunyan = require('bunyan');
const config = require('./config');
const logger = bunyan.createLogger({ name: config.name });
const { EVENTS } = require('./socket/constants');
const socket$ = require('./socket/index')(config.port);
const { getAuth, getRoomId } = require('./socket/utils');
const socketMapper = require('./socket/mapper');
const lobby = require('./lobby/index')();
const Answers = require('./answers/index')(config.answers);

async function main(){
	const MovieDatabaseCreator = await Answers.connect();

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
						return from(lobby.getOrCreateRoom(roomId, { MovieDatabaseCreator })).pipe(
							mergeMap(({ action$, state$, dispatch }) => mapper.register(action$, state$, dispatch)),
							takeUntil(disconnect$)
						);
					}),
					catchError((err) => {
						logger.error(err, 'an error happened in socket room changing');
						return NEVER;
					})
				);
			}),
			catchError((err) => {
				logger.error(err, 'an error occured when creating socket room mapping');
				socket.close();
				return NEVER;
			})
		))
	);

	service$.subscribe(() => null);
}

main().catch((err) => console.log('err', err));
