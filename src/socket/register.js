const emitToActionCreator = require('./mappers/emitToAction');
const actionToEmitCreator = require('./mappers/actionToEmit');
const { registerCreator } = require('redux-rxjs-socket.io');

module.exports = (auth) => {
	const emitMapper = emitToActionCreator(auth);
	const actionMapper = actionToEmitCreator(auth);

	return registerCreator(emitMapper, actionMapper);
};
