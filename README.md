# game-server
The game server for the Hatch the game. 

## Connection
Game server runs a *socket.io* server, that accepts connections with `roomId` and `token` query parameters.

- `roomId` any room that the user wants to connects to, currently, the user can join any room he wants, this is a utf-8 string
- `token` a valid jwt token, created with the rest api auth service.

## Events Documentation
Game server outgoing and incoming events are documented here.

### Actions that can be sent
Below are events that can be sent to the game server by the connection you create to it.

- `say` is used to guess or describe an emoji. If you are the teller, this event will send emojis, if you are a guesser, this event will send a guess. Fields: *say = string*, *date = number*
- `pick_answer` is used for selecting which question you will tell, when you are the teller, and the game send you a `choose_category` event. Fields: *category = number*, *date =Number*

### Acitons that the game server will send to you
Below are the actions that you will receive, for the room that you are connected to.

- `room_connected` event will be sent to you, when you connect to a room sucessfully. Returning you the state of the room. *Return Type = RoomState*
- `another_user_connected` event will be sent to you, when another user connects to the room you are currently in. *Return Type = User*
- `choose_category` if you are the teller for the round, you will receive this when the round starts, giving you an array of categories that you can pick from. If you don't pick anything, the game room will automatically assign one category to you. *Return Type = { categories = number[] }*
- `tell_answer` sent to you in a round where you are the teller, and you need to start telling an answer by sending emojis. e.g. this event tells you, which movie you are telling. *Return Type = Answer*
- `tell` the event that is sent, when the teller send emojis. *Return Type = { userId: UserId, time: timestamp, tell: string }*
- `answer` this event is sent when someone guesses wrong. *Return Type = { userId: UserId, time: timestamp, answer: string }*
- `hatch` this is event is sent when someones hatch status changes. *Return Type = { userId: UserId, hatchPercentage: number }*
- `user_disconnected` this event is sent when someone leaves the room. *Return Type = { userId: UserId }*
- `round_start` this event is sent when the round starts. and players can start guessing
- `round_end` is sent when the round ends.
- `right_answer` is sent when someone guesses the answer right. *Return Type = { userId: UserId }*
- `leaderboard_update` is sent when the leaderboard changes. *Return Type = Map<UserId, number>*

### Types
```
GameState = Enum {
    IDLE = 0
    ROUND_PICK_ANSWER = 1
    ROUND_IN_PROGRESS = 2
    ROUND_FINISHED = 3
}

RegisterStatus = Enum {
    UNREGISTERD = 1
    REGISTERD = 1
}

UserId = string

Category = {
    id = number
    type = number
    name = {
        en = string
        tr = string
    }
}

Answer = {
    id = number
    director = string
    rating = number
    minutes = number
    votes = number
    index = number
    year = number
    title = {
        primary = string
        original = string
        localized: {
            tr = {
                original = string,
                adjusted = string
            }
        }
    }
    categories = Category[]

User = {
    id = UserId
    name = string
    status = RegisterStatus
    hatch = number // hatch status of the user, e.g. how much guessing rights he has left
}

RoomState = {
    id = number,
    state = GameState
    round = number
    teller = UserId // who is the teller atm
    createdAt = timestamp
    lastRoundStartedAt = timestamp
    lastRoundEndedAt = timestamp
    users = Map<UserId, User> // list of user and their info
    online = Map<UserId, timestamp> // map of online users and their login time
    leaderboard = Map<UserId, number> // user and their score
    foundRight = Map<UserId, { time = number }> // users who found the answer right for the given round, and the time they found it right
}

```

