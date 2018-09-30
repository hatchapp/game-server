const redis = require('redis');
const { promisify } = require('util');

function getSaveKey(prefix, id){
	return `${prefix}#${id}`;
}

module.exports = function({ url, config: { ROOM_SAVE_PREFIX = 'room' } = {} } = {}){
	const client = redis.createClient(url);
	const set = promisify(client.set).bind(client);
	const get = promisify(client.get).bind(client);
	const del = promisify(client.del).bind(client);
	const ping = promisify(client.ping).bind(client);

	function setRoom(id, state){
		return set(
			getSaveKey(ROOM_SAVE_PREFIX, id),
			JSON.stringify(state)
		);
	}

	async function getRoom(id){
		const stateString = await get(getSaveKey(ROOM_SAVE_PREFIX, id));

		return JSON.parse(stateString);
	}

	function delRoom(id){
		return del(getSaveKey(ROOM_SAVE_PREFIX, id));
	}

	return { setRoom, delRoom, getRoom, ping };
};