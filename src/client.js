const socketio = require('socket.io-client');
const config = require('./config');
const settings = JSON.parse(process.argv[2] || '{}');
const { roomId, userId } = settings || {};
const socket = socketio(`http://localhost:${config.port}`, { query: { roomId, userId }, transports: ['websocket'] });

['connect', 'connection', 'connected', 'news'].forEach((event) => {
	socket.on(event, function(){
		console.log('Event happened:', event, 'args:', arguments);
	});
});

