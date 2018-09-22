const GAME_STATE = {
	IDLE: 0,
	ROUND_IN_PROGRESS: 1,
	ROUND_FINISHED: 2,
};

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
		createdAt: Date.now()
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

const app = require('express')();
const config = require('./config');
const server = require('http').Server(app);
const io = require('socket.io')(server);

io.set('transports', ['websocket']);
server.listen(config.port, () => console.log(`Listening on ${config.port}`));

io.on('connection', async function (socket) {
	const { roomId, userId } = socket.handshake.query;
	const room = await getOrCreateRoom(roomId);
	const user = await createAndAddUserToRoom(room, socket.id);

	socket.join(roomId);

	socket.emit('connected', { room, user });

	socket.on('answer', ({ answer }) => {
		if(room.state === GAME_STATE.ROUND_IN_PROGRESS && user.id !== room.roundState.teller){
			socket.broadcast.emit({ user, answer, date: Date.now()  });
		}
	});

	socket.on('tell', () => {

	});


	socket.on('disconnect', () => {
		removeUserFromRoom(room, user);
		io.to(roomId).emit();
	});
});
