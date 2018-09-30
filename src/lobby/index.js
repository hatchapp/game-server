const { fromJS, Map } = require('immutable');
const { Subject } = require('rxjs');
const roomCreator = require('../room/index');
const { createResumeGameFromInitialState } = require('../room/actions');

function cleanRoomState(savedState){
	return fromJS(Object.assign(
		{},
		savedState,
		{
			online: Map({}),
		}
	));
}

module.exports = function(persist){
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

	async function createRoom(id, dependencies){
		const savedState = await persist.getRoom(id).catch(() => null);
		let room;

		if(savedState !== null){
			const initialState = cleanRoomState(savedState);
			room = roomCreator(id, dependencies, initialState);
			room.dispatch(createResumeGameFromInitialState());
		}else{
			room = roomCreator(id, dependencies, undefined);
		}

		createRoom$.next(room);
		return room;
	}

	async function getOrCreateRoom(id, dependencies){
		// if the room exists, just return it
		if(hasGame(id)) return getRoom(id);

		const room = await createRoom(id, dependencies);
		setRoom(id, room);
		return room;
	}

	async function deleteRoom(id){
		if(!hasGame(id))
			throw new Error('cannot delete a room that does not exist');

		await persist.delRoom(id);
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
