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

module.exports = function(persist, allocatedToMe){
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
		if(!allocatedToMe(id)) throw new Error(`this lobby cannot create a room with an id of '${id}'`);
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
		if(!allocatedToMe(id)) throw new Error(`this lobby cannot have a room with an id of '${id}'`);
		// if the room exists, just return it
		if(hasGame(id)) return getRoom(id);

		const room = await createRoom(id, dependencies);
		setRoom(id, room);
		return room;
	}

	async function deleteRoom(id, { deleteFromPersistence = true } = {}){
		if(!hasGame(id))
			throw new Error('cannot delete a room that does not exist');

		if(deleteFromPersistence)
			await persist.delRoom(id);

		delete games[id];
		deleteRoom$.next(id);
		return true;
	}

	function getActiveRoomIds(){
		return Object.keys(games);
	}

	return {
		getOrCreateRoom,
		deleteRoom,
		getActiveRoomIds,
		createRoom$,
		deleteRoom$,
	};
};
