module.exports = {
	name: 'emoji-app-backend',
	game: {
		round: {
			restart: 5000,
		},
	},
	port: process.env.LISTEN_PORT || 8080
};