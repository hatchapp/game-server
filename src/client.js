const bunyan = require('bunyan');
const socketio = require('socket.io-client');
const { EVENTS } = require('./constants');
const logger = bunyan.createLogger({ name: 'socket-client' });
const config = require('./config');
const settings = JSON.parse(process.argv[2] || '{}');
const readline = require('readline');
const { roomId, userId } = settings || {};
const socket = socketio(`http://localhost:${config.port}`, {
	query: { roomId, userId },
	transports: ['websocket']
});

['connect', ...Object.keys(EVENTS).map((key) => EVENTS[key])].forEach((event) => {
	socket.on(event, function(){
		logger.info({ event, args: [...arguments] }, 'event happened');
	});
});

const interface = readline.createInterface(process.stdin);

interface.on('line', (line) => {
	const answerData = { answer: line, date: Date.now() };
	logger.info({ data: answerData }, 'answer sent');
	socket.emit(EVENTS.ANSWER, answerData);
});

interface.on('close', () => logger.info('closed'));
