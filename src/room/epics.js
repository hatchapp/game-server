const { NEVER } = require('rxjs');
const { combineEpics } = require('redux-observable');

module.exports = function(){
	function log(action$, state$){
		action$.subscribe((action) => console.log(JSON.stringify({ action, time: Date.now() })));
		state$.subscribe((state) => console.log(JSON.stringify({ state, time: Date.now() })));

		return NEVER;
	}

	return combineEpics(log);
};