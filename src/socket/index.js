const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { Subject } = require('rxjs');
/**
 * Creates a socket and http server that listens for new connections
 * and emits sockets
 * @param port
 */
module.exports = function(port){
	const app = express();
	const server = http.Server(app);
	const io = socketio(server);
	const socket$ = new Subject();

	server.listen(port, () => {
		// emit server listening event
	});

	io.on('connection', async function (socket) {
		socket$.next(socket);
	});

	[server, io].forEach(target => {
		target.on('error', (err) => socket$.error(err));
		target.on('close', () => socket$.complete());
	});

	return socket$;
};


