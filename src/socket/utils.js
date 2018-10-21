const { Observable, from, of, NEVER } = require('rxjs');
const { verify } = require('jsonwebtoken');

function getAuth(socket, secret){
	return verify(socket.handshake.query.token, secret);
}

function getRoomId(socket){
	return socket.handshake.query.roomId || 'default';
}

function streamSwitchCase(switchMap, key, ...args){
	const mapper = switchMap[key];
	if(!mapper) return NEVER;

	const result = mapper.apply(this, args);

	if(Array.isArray(result)){
		return from(result);
	}else if(result instanceof Observable){
		return result;
	}

	return of(result);
}

module.exports = {
	getAuth,
	getRoomId,
	streamSwitchCase,
};