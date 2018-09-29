const fs = require('fs');
const { CategoryTypes } = require('./constants');
const { getRandomFromArray, mapById } = require('./utils');

function formatCategoryForUser(category) {
	const result = Object.assign({}, category);

	delete result["answers"];
	return result;
}

function formatAnswerForUser(answer, categories){
	return Object.assign({}, answer, {
		categories: answer.categories.map(cid => formatCategoryForUser(categories[cid]))
	});
}

class MovieDatabase{
	constructor(database){
		this.categories = database.categories;
		this.answers = database.answers;
		this.categoryTypeToCategories = database.categoryTypeMap;
	}

	async getRandomCategories(count, type = CategoryTypes.GENRE){
		const from = this.categoryTypeToCategories[type] || [];
		count = Math.min(from.length, Math.max(count, 1));

		return getRandomFromArray(from, count).map(cid => formatCategoryForUser(this.categories[cid]));
	}

	async getRandomAnswersForCategory(category_id, count){
		const { answers } = this.categories[category_id];
		count = Math.min(answers.length, Math.max(count, 1));

		return getRandomFromArray(answers, count).map(aid => formatAnswerForUser(this.answers[aid], this.categories));
	}

	async getRandomAnswerForCategory(category_id){
		const { answers } = this.categories[category_id];
		const answerId = answers[Math.floor(Math.random() * answers.length)];
		const answer = this.answers[answerId];

		return formatAnswerForUser(answer, this.categories);
	}
}

function createMoviesDatabase(database, params = null){
	return new MovieDatabase(database);
}

// add helper fields to the database
function parseDatabase(database){
	const categoryTypeMap = database.categories.reduce((acc, category) => {
		if(!(category.type in acc)){
			acc[category.type] = [];
		}

		acc[category.type].push(category.id);
		return acc;
	}, {});

	return {
		categoryTypeMap,
		answers: mapById(database.answers),
		categories: mapById(database.categories),
	};
}

module.exports = function(answersConfig = {}){
	const { database_file } = answersConfig;


	async function connect(){
		const database = parseDatabase(JSON.parse(fs.readFileSync(database_file)));

		return {
			create: () => createMoviesDatabase(database),
		};
	}

	return {
		connect,
	};
};