/**
 * Given an object, creates a new object such that includes
 * every key of the old object, with their values as the key themselves
 * @param obj
 * @returns {{}}
 */
function mapObjectKeysToValues(obj){
	return Object.keys(obj).reduce((acc, key) => { acc[key] = key; return acc; }, {});
}

module.exports = {
	mapObjectKeysToValues,
};