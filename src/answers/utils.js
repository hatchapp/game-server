function getRandomFromArray(from, count){
	const set = new Set();
	const result = [];

	while(set.size < count){
		const rand = Math.floor(Math.random() * from.length);

		if(!set.has(rand)){
			result.push(from[rand]);
			set.add(rand);
		}
	}

	return result;
}

function mapById(arr, idGetter = (o) => o.id){
	return arr.reduce((acc, o) => {
		const id = idGetter(o);
		acc[id] = o;
		return acc;
	}, {});
}

module.exports = {
	getRandomFromArray,
	mapById,
};