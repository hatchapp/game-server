const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { Observable } = require('rxjs');
const { publishReplay, refCount } = require('rxjs/operators');

/**
 * Creates a socket and http server that listens for new connections
 * and emits sockets
 * @param port
 */
module.exports = function createSocketServer(port) {
	return new Observable((socket$) => {
		const app = express();
		const server = http.Server(app);
		const io = socketio(server);

		io.on('connection', async function (socket) {
			socket$.next(socket);
		});

		[server, io].forEach(target => {
			target.on('error', (err) => socket$.error(err));
			target.on('close', () => socket$.complete());
		});

		server.listen(port);

		return function unsubscribe() {
			server.close();
			io.close();
		};
	}).pipe(
		publishReplay(1),
		refCount(),
	);
};
