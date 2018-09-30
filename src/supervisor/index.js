const { merge, Observable, of, from } = require('rxjs');
const { delay, filter, map, mergeMap, takeUntil, switchMap, withLatestFrom } = require('rxjs/operators');
const { ofType } = require('redux-observable');
const actions = require('../room/actions');
const { ActionTypes } = require('../room/constants');

module.exports = function(lobby, { DELAY_BEFORE_REMOVE_ROOM = 10000 } = {}){

	function register(gameAction$, gameState$, dispatch, { id: roomId }){
		return new Observable(() => {
			const roomEmptied$ = gameAction$.pipe(
				ofType(ActionTypes.USER_DISCONNECTED),
				withLatestFrom(gameState$),
				filter(([_, state]) => state.get('online').size === 0),
				switchMap(() => of(null).pipe(
					delay(DELAY_BEFORE_REMOVE_ROOM),
					takeUntil(gameAction$.pipe(ofType(ActionTypes.USER_CONNECTED))),
				)),
			);

			const action$ = merge(roomEmptied$).pipe(
				map(() => actions.createDeleteRoomRequest())
			);

			const remove$ = gameAction$.pipe(
				ofType(ActionTypes.DELETE_ROOM_FINISHED),
				mergeMap(() => from(lobby.deleteRoom(roomId)))
			);

			const actionSub = action$.subscribe(dispatch);
			const removeSub = remove$.subscribe(() => null);

			return function unsubscribe() {
				actionSub.unsubscribe();
				removeSub.unsubscribe();
			};
		});
	}

	return { register };
};