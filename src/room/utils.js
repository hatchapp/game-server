/**
 * Given an object, creates a new object such that includes
 * every key of the old object, with their values as the key themselves
 * @param obj
 * @returns {{}}
 */
function mapObjectKeysToValues(obj){
	return Object.keys(obj).reduce((acc, key) => { acc[key] = key; return acc; }, {});
}

function pickRandom(arr){
	return arr[Math.floor(Math.random() * arr.length)];
}

function cleanAnswerText(title){
	return title.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g, '').toLowerCase();
}

function getTitles(answer){
	const { title: { primary, original, localized } } = answer;

	return [
		primary,
		original,
		...Object.keys(localized)
			.map(key => [localized[key]['original'], localized[key]['adjusted']])
			.reduce((acc, titles) => acc.concat(titles), [])
			.filter(x => x)
	].map(cleanAnswerText);
}

module.exports = {
	mapObjectKeysToValues,
	pickRandom,
	cleanAnswerText,
	getTitles,
};