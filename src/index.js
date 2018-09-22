const { GAME_STATE, HATCH_LIMIT, EVENTS, ANSWERS } = require('./constants');

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
		leaderboard: {},
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

function pickTeller(room){
	return room.users[Math.floor(Math.random() * room.users.length)];
}

function pickAnswer(){
	return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

function addLeaderboardPoints(room, user, points){
	if(!(user.id in room.leaderboard)){
		room.leaderboard[user.id] = 0;
	}

	room.leaderboard[user.id] += points;
	return room.leaderboard;
}

async function processLeaderboardAddPoints(room, user, points){
	const leaderboard = addLeaderboardPoints(room, user, points);
	io.to(room.roomId).emit(EVENTS.LEADERBOARD_UPDATE, leaderboard);
	return leaderboard;
}

function setRoundStart(room, teller, answer){
	room.state = GAME_STATE.ROUND_IN_PROGRESS;
	room.round += 1;
	room.roundState = {
		answer,
		teller: teller.id
	};
}

async function processRoundStart(room, userToTell, answerToTell){
	setRoundStart(room, userToTell, answerToTell);
	// TODO: format the answer etc. from this general response so the other users wont get the answer
	io.to(room.roomId).emit(EVENTS.ROUND_START, { room, teller: userToTell });
	io.to(userToTell.id).emit(EVENTS.TELL_ANSWER, { answer: answerToTell });
}

async function processUserJoinEvent(room, user){
	if(room.state === GAME_STATE.IDLE && room.users.length === 2){
		const userToTell = pickTeller(room);
		const answerToTell = pickAnswer();

		await processRoundStart(room, userToTell, answerToTell);
		await processLeaderboardAddPoints(room, userToTell, 5);
		return { new: true };
	}
	return { new: false };
}

async function processUserDisconnectEvent(room, user){
	if(room.state === GAME_STATE.ROUND_IN_PROGRESS){

		if(room.users.length === 0){
			// remove the game
			return {};
		}else if(room.users.length === 1){
			// pause the round
			return {};
		}
	}
	return {};
}

function setRoomRoundFinished(room){
	room.state = GAME_STATE.ROUND_FINISHED;
	room.roundState = { answer: null, teller: null };
	return room;
}

async function processRoundFinished(room){
	room = setRoomRoundFinished(room);
	io.to(room.roomId).emit(EVENTS.ROUND_END, {});
}

async function processRightAnswerEvent(room, winner){
	await processRoundFinished(room);
	await processLeaderboardAddPoints(room, winner, Math.max(winner.hatch, 0));
}

function decreaseHatch(user){
	user.hatch = Math.max(user.hatch - 1, 0);
	return user;
}

function calculateHatchPercentage(hatch){
	return (HATCH_LIMIT - hatch) * (100 / HATCH_LIMIT);
}

async function processHatchDecreaseEvent(room, user){
	const oldHatch = user.hatch;
	user = decreaseHatch(user);

	if(user.hatch !== oldHatch){
		io.to(room.roomId).emit(EVENTS.HATCH_STATUS, { user, hatchPercentage: calculateHatchPercentage(user.hatch) });
	}

	return user;
}

async function processUserAnswerEvent(room, user, answer){
	const userSocket = io.sockets.connected[user.id];

	if(room.state === GAME_STATE.ROUND_IN_PROGRESS && user.id !== room.roundState.teller){
		userSocket.broadcast.to(room.roomId).emit(EVENTS.ANSWER, { user, answer, date: Date.now() });
		if(answer.toLowerCase() === room.roundState.answer.toLowerCase()){
			await processRightAnswerEvent(room, user);
		}else{
			await processHatchDecreaseEvent(room, user);
		}
	}
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
	const { roomId } = socket.handshake.query;
	const room = await getOrCreateRoom(roomId);
	const user = await createAndAddUserToRoom(room, socket.id);

	socket.join(roomId);

	logger.info({ room: roomId, user }, 'user connected');
	socket.emit(EVENTS.CONNECTED, { room, user });
	socket.broadcast.to(roomId).emit(EVENTS.ANOTHER_USER_CONNECTED, { room, user });

	socket.on(EVENTS.ANSWER, async ({ answer }) => {
		logger.info({ id: socket.id, answer }, 'got answer from');
		await processUserAnswerEvent(room, user, answer);
	});

	socket.on('disconnect', async () => {
		await userDisconnectFromRoom(room, user);
		await processUserDisconnectEvent(room, user);
	});

	await processUserJoinEvent(room, user);
});
