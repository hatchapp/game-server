const { GAME_STATE, HATCH_LIMIT, EVENTS } = require('./constants');

function createRoom(roomId){
	return {
		roomId,
		state: GAME_STATE.IDLE,
		round: 0,
		roundState: {
			answer: null,
			teller: null,
		},
		users: [],
		createdAt: Date.now()
	};
}

const games = {};
async function getOrCreateRoom(roomId){
	if(!(roomId in games))
		games[roomId] = createRoom(roomId);

	return games[roomId];
}

function createUser(id) {
	return {
		id,
		name: `user#${Math.floor(Math.random() * 1000000)}`,
		createdAt: Date.now(),
		hatch: HATCH_LIMIT,
	};
}

function addUserToRoom(room, user){
	return Object.assign(
		room,
		{ users: room.users.filter(x => x.id !== user.id).concat(user) },
	);
}

function removeUserFromRoom(room, user){
	return Object.assign(
		room,
		{ users: room.users.filter(x => x.id !== user.id) }
	);
}

async function createAndAddUserToRoom(room, id){
	const user = createUser(id);

	addUserToRoom(room, user);
	return user;
}

async function userDisconnectFromRoom(room, user){
	removeUserFromRoom(room, user);
	io.to(room.roomId).emit(EVENTS.USER_DISCONNECTED, { room, user });
}

const bunyan = require('bunyan');
const app = require('express')();
const config = require('./config');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const logger = bunyan.createLogger({ name: config.name });

io.set('transports', ['websocket']);
server.listen(config.port, () => logger.info({ port: config.port }, 'listening'));

io.on('connection', async function (socket) {
	const { roomId, userId } = socket.handshake.query;
	const room = await getOrCreateRoom(roomId);
	const user = await createAndAddUserToRoom(room, socket.id);

	socket.join(roomId);

	logger.info({ user }, 'user connected');
	socket.emit(EVENTS.CONNECTED, { room, user });
	socket.broadcast.to(roomId).emit(EVENTS.ANOTHER_USER_CONNECTED, { room, user });

	socket.on(EVENTS.ANSWER, async ({ answer }) => {
		logger.info({ id: socket.id, answer }, 'Got answer from');
		//if(room.state === GAME_STATE.ROUND_IN_PROGRESS && user.id !== room.roundState.teller){
			socket.broadcast.to(roomId).emit(EVENTS.ANSWER, { user, answer, date: Date.now()  });
		//}
	});

	socket.on('disconnect', async () => {
		await userDisconnectFromRoom(room, user);
	});
});
