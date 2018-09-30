const path = require('path');

module.exports = {
	name: 'emoji-app-backend',
	port: process.env.LISTEN_PORT || 8081,
	answers: {
		database_file: process.env.MOVIE_DATABASE_FILE || path.join(__dirname, '../data/sample.json'),
	},
	redis: {
		url: process.env.REDIS_URL || 'redis://localhost:6379',
	}
};