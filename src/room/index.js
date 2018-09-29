const { NEVER } = require('rxjs');
const { createStore, applyMiddleware } = require('redux');
const { createEpicMiddleware, combineEpics } = require('redux-observable');
const roomEpicCreator = require('./epics');
const rootReducer = require('./reducer');

module.exports = function(id, { MovieDatabaseCreator }, initialState){
	const result = {};
	const MovieDatabase = MovieDatabaseCreator.create();

	function stealMiddleware(action$, state$){
		Object.assign(result, { action$, state$ });
		return NEVER;
	}

	const roomEpic = roomEpicCreator({ id, MovieDatabase });
	const epicMiddleware = createEpicMiddleware();
	const rootEpic = combineEpics(roomEpic, stealMiddleware);
	const store = createStore(
		rootReducer,
		initialState,
		applyMiddleware(epicMiddleware),
	);

	epicMiddleware.run(rootEpic);

	return Object.assign(result, { dispatch: store.dispatch });
};