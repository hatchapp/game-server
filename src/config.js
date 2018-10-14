const path = require('path');

module.exports = {
	name: 'emoji-app-game-server',
	answers: {
		database_file: process.env.MOVIE_DATABASE_FILE || path.join(__dirname, '../data/sample.json'),
	},
	redis: {
		url: process.env.REDIS_URL || 'redis://localhost:6379',
	},
	hashring: {
		port: process.env.HASHRING_PORT || 7373,
		moveDebounce: 100,
	},
	docker: {
		image: process.env.DOCKER_IMAGE_NAME || 'deployment_game-server',
		network: process.env.DOCKER_HASHRING_NETWORK_NAME || 'deployment_hashring-network'
	},
	socket: {
		port: process.env.SOCKET_PORT || 8080,
	},
};