function getAuth(socket){
	return { id: socket.id };
}

function getRoomId(socket){
	return socket.handshake.query.roomId || 'default';
}

module.exports = {
	getAuth,
	getRoomId,
};