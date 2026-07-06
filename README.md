# Skribbl.io Clone

A real-time multiplayer drawing and guessing game inspired by Skribbl.io. Players can create or join rooms, take turns drawing a selected word, guess through chat, and earn points based on correct and fast guesses.

The application is built using React, Node.js, Express, and Socket.IO. The backend manages all room state, game logic, timers, scoring, and real-time communication.

---

## Features

### Room and Lobby

* Create private rooms with room code and invite link
* Join rooms using room code
* Join public rooms through automatic matchmaking
* Host can configure private room settings
* Live player list in lobby
* Host can start the game manually

### Gameplay

* Turn-based drawing and guessing system
* Drawer selects one word from multiple options
* Real-time canvas synchronization using Socket.IO
* Time-based scoring system
* Live scoreboard and final leaderboard
* Hints reveal letters over time
* Game ends with winner announcement

### Drawing Tools

* Brush tool
* Multiple colors
* Multiple brush sizes
* Eraser
* Undo last stroke
* Clear canvas

### Chat and Guessing

* Players can send guesses through chat
* Correct guesses are detected automatically
* Near-correct guesses show close-guess feedback
* Drawer cannot guess while drawing
* Correct guess notifications are shown to all players

---

## Tech Stack

| Layer        | Technology                    |
| ------------ | ----------------------------- |
| Frontend     | React 18, Vite                |
| Styling      | CSS                           |
| Canvas       | HTML5 Canvas API              |
| Backend      | Node.js, Express.js           |
| Realtime     | Socket.IO                     |
| Data Storage | In-memory room and game state |
| Word Data    | Local JSON/JS word list       |

---

## Project Structure

```bash
Project/
├── client/                       # Frontend React application
│   ├── src/
│   │   ├── App.jsx               # Main app and screen routing
│   │   ├── socket.js             # Socket.IO client setup
│   │   ├── styles.css            # Global styles
│   │   └── components/
│   │       ├── Home.jsx          # Home screen, create/join room
│   │       ├── Lobby.jsx         # Lobby screen and player list
│   │       ├── Game.jsx          # Main game screen
│   │       ├── Canvas.jsx        # Drawing canvas logic
│   │       ├── Toolbar.jsx       # Drawing tools
│   │       ├── PlayerList.jsx    # Scoreboard/player list
│   │       └── Chat.jsx          # Chat and guessing panel
│   ├── package.json
│   └── vite.config.js
│
└── server/                       # Backend Node.js application
    ├── src/             
    │   ├── server.js             # Express and Socket.IO setup
    │   ├── game/
    │   │   ├── GameManager.js    # Manages rooms and matchmaking
    │   │   ├── Room.js           # Room state and settings
    │   │   ├── Game.js           # Game rounds, turns, scoring, hints
    │   │   └── Player.js         # Player state and score
    │   ├── socket/
    │   │   └── SocketHandler.js  # Socket event handling
    │   ├── controllers/
    │   │   └── RoomController.js # REST API controllers
    │   ├── routes/
    │   │   └── roomRoutes.js     # Room and health routes
    │   └── data/
    │       └── words.js          # Word categories and random word helper
    └── package.json
```

---

## How to Start the Project Locally

### Prerequisites

Make sure you have the following installed:

```bash
node -v
npm -v
```

Recommended Node.js version:

```bash
Node.js >= 18
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/Prashant1b/Skribbl-Clone.git
cd <Skribbl Clone>
```

---

## Step 2: Start the Backend Server

Open one terminal and run:

```bash
cd server
npm install
npm run dev
```

Or for normal start:

```bash
npm start
```

The backend will run on:

```bash
http://localhost:4000
```

---

## Step 3: Start the Frontend Client

Open another terminal and run:

```bash
cd client
npm install
npm run dev
```

The frontend will run on:

```bash
http://localhost:5173
```

Open this URL in your browser.

To test multiplayer functionality, open the same URL in two different browser tabs or two different devices.

---

## Environment Variables

### Server Environment

Create a `.env` file inside the `server` folder:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### Client Environment

Create a `.env` file inside the `client` folder:

```env
VITE_SERVER_URL=http://localhost:4000
```

For production, replace these URLs with your deployed frontend and backend URLs.

---

## Basic Flow of the Application

1. User enters their name.
2. User creates a private room or joins an existing room.
3. Players wait in the lobby.
4. Host starts the game.
5. One player becomes the drawer.
6. Drawer selects a word.
7. Other players guess the word through chat.
8. Correct guessers get points.
9. Turns rotate between players.
10. After all rounds finish, the final leaderboard is shown.

---

## Architecture Overview

The frontend only handles UI rendering and user actions. The backend is responsible for all important game logic.

```bash
React Client
   |
   | Socket.IO Events
   |
Node.js + Express + Socket.IO Server
   |
   |-- GameManager
   |-- Room
   |-- Game
   |-- Player
```

### Backend Responsibilities

* Create and manage rooms
* Manage public and private room logic
* Store connected players
* Handle socket events
* Control game phases
* Manage timers
* Select words
* Check guesses
* Calculate scores
* Broadcast updates to clients

### Frontend Responsibilities

* Render home, lobby, and game screens
* Capture drawing input from canvas
* Send drawing strokes to backend
* Display received drawing strokes
* Send guesses and chat messages
* Display scoreboard, timer, hints, and game results

---

## Important WebSocket Events

### Client to Server

| Event             | Purpose                      |
| ----------------- | ---------------------------- |
| `create_room`     | Create a private room        |
| `join_room`       | Join a room using room code  |
| `join_public`     | Join public matchmaking room |
| `update_settings` | Update private room settings |
| `start_game`      | Start private game           |
| `choose_word`     | Drawer selects word          |
| `draw`            | Send drawing stroke data     |
| `canvas_clear`    | Clear canvas                 |
| `draw_undo`       | Undo last stroke             |
| `guess`           | Send guess or chat message   |
| `leave_room`      | Leave current room           |

### Server to Client

| Event              | Purpose                         |
| ------------------ | ------------------------------- |
| `player_joined`    | Update lobby when player joins  |
| `player_left`      | Update lobby when player leaves |
| `settings_updated` | Broadcast updated room settings |
| `round_start`      | Start new round or turn         |
| `word_options`     | Send word options to drawer     |
| `your_word`        | Send selected word to drawer    |
| `turn_started`     | Start drawing phase             |
| `timer`            | Send countdown timer            |
| `hint`             | Reveal word pattern hint        |
| `guess_correct`    | Notify correct guess            |
| `chat_message`     | Broadcast chat message          |
| `turn_ended`       | End current turn                |
| `game_over`        | Show final leaderboard          |
| `error_message`    | Show error message              |

---

## REST API Endpoints

| Method | Endpoint            | Description                |
| ------ | ------------------- | -------------------------- |
| GET    | `/health`           | Check backend health       |
| GET    | `/api/rooms/:id`    | Get room information       |
| GET    | `/api/public-rooms` | Get available public rooms |

---

## Game Logic

### Scoring

Players get points when they guess the word correctly. Points are calculated based on how much time is left.

```bash
score = 50 + 350 * (timeLeft / drawTime)
```

The faster a player guesses, the higher the score.

The drawer also receives points based on how many players guessed correctly.

---

## Canvas Drawing Logic

The canvas sends drawing data as normalized coordinates between `0` and `1`.

This helps drawings stay consistent across different screen sizes.

Each drawing stroke contains:

```js
{
  strokeId,
  x0,
  y0,
  x1,
  y1,
  color,
  size,
  erase
}
```

The backend stores and broadcasts these strokes to all players in the same room.

---

## Public vs Private Rooms

| Feature           | Private Room        | Public Room            |
| ----------------- | ------------------- | ---------------------- |
| Created by        | Host                | Automatic matchmaking  |
| Room code         | Yes                 | No/manual not required |
| Invite link       | Yes                 | No                     |
| Settings editable | Yes                 | No                     |
| Start game        | Host starts         | Auto-start             |
| Best for          | Friends/custom game | Quick play             |

---

## Deployment Notes

This project uses Socket.IO, so the backend should be deployed on a platform that supports persistent WebSocket connections.

Recommended deployment options:

### Backend

* Render
* Railway
* VPS
* AWS EC2

### Frontend

* Vercel
* Netlify
* Render Static Site

### Production Environment Variables

Frontend:

```env
VITE_SERVER_URL=https://skribbl-clone-oam0.onrender.com
```

Backend:

```env
PORT=4000
CLIENT_ORIGIN=https://skribblclone.vercel.app/
```

After deployment, update this section:

```bash
Live URL: https://skribblclone.vercel.app/
Backend URL:https://skribbl-clone-oam0.onrender.com
```

---

## Requirements Completed

* Create private room
* Join room using code or link
* Public room matchmaking
* Lobby with player list
* Host-controlled game start
* Turn-based drawing
* Word selection
* Real-time drawing sync
* Guess checking
* Scoring system
* Leaderboard
* Timer
* Hints
* Chat system
* Drawing tools
* Undo and clear canvas
* Public and private room logic
* Object-oriented backend structure

---

## Future Improvements

* User authentication
* Persistent database storage
* Custom word list
* Kick or ban player option
* Spectator mode
* Replay system
* Multiple language support
* Mobile UI improvements

