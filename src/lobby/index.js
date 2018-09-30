const { Subject } = require('rxjs');
const roomCreator = require('../room/index');

module.exports = function(){
	const games = {};
	const createRoom$ = new Subject();
	const deleteRoom$ = new Subject();

	function hasGame(id){
		return id in games;
	}

	function getRoom(id){
		return games[id];
	}

	function setRoom(id, room){
		games[id] = room;
	}

	function createRoom(id, dependencies){
		const initialState = undefined;
		const room = roomCreator(id, dependencies, initialState);
		createRoom$.next(room);
		return room;
	}

	async function getOrCreateRoom(id, dependencies){
		// if the room exists, just return it
		if(hasGame(id)) return getRoom(id);

		const room = createRoom(id, dependencies);
		setRoom(id, room);
		return room;
	}

	async function deleteRoom(id){
		if(!hasGame(id))
			throw new Error('cannot delete a room that does not exist');

		delete games[id];
		deleteRoom$.next(id);
		return true;
	}

	return {
		getOrCreateRoom,
		deleteRoom,
		createRoom$,
		deleteRoom$,
	};
};
