const { Symbols: { SOCKET_REGISTER, SOCKET_UNREGISTER } } = require('redux-rxjs-socket.io');
const { EVENTS } = require('../constants');
const roomActions = require('../../room/actions');

module.exports = ({ id, name, status, createdAt }) => ({
	// register and unregister can be thought of as connect/disconnect
	[SOCKET_REGISTER]: () => roomActions.createSocketUserConnected(id, name, status, createdAt),
	[SOCKET_UNREGISTER]: () => roomActions.createSocketUserDisconnected(id),
	[EVENTS.SAY]: ({ say, date }) => roomActions.createSocketUserSay(id, say, date),
	[EVENTS.PICK_ANSWER]: ({ category, date }) => roomActions.createSocketUserPickAnswer(id, category, date),
});
