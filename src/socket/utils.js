const { verify } = require('jsonwebtoken');

function getAuth(socket, secret){
	return verify(socket.handshake.query.token, secret);
}

function getRoomId(socket){
	return socket.handshake.query.roomId || 'default';
}

module.exports = {
	getAuth,
	getRoomId,
};
