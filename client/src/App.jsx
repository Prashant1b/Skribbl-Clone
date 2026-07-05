import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from './socket.js';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';

const initialGame = {
  phase: 'lobby',
  round: 0,
  totalRounds: 0,
  drawerId: null,
  drawTime: 0,
  timeLeft: 0,
  wordPattern: null,
  wordLength: 0,
  myWord: null,
  wordOptions: null,
  turnResult: null,
  gameOver: null,
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [connected, setConnected] = useState(socket.connected);
  const [selfId, setSelfId] = useState(socket.id);

  const [roomId, setRoomId] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [players, setPlayers] = useState([]);
  const [game, setGame] = useState(initialGame);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);

  const [initialStrokes, setInitialStrokes] = useState([]);
  const nameRef = useRef('');

  const patchGame = useCallback((patch) => setGame((g) => ({ ...g, ...patch })), []);
  const addMessage = useCallback((m) => setMessages((prev) => [...prev.slice(-200), m]), []);

  useEffect(() => {
    const onConnect = () => { setConnected(true); setSelfId(socket.id); };
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    const onPlayerJoined = ({ player, players }) => {
      setPlayers(players);
      addMessage({ system: true, text: `${player.name} joined the room` });
    };
    const onPlayerLeft = ({ players, hostId }) => {
      setPlayers(players);
      if (hostId) setHostId(hostId);
    };
    const onSettingsUpdated = ({ settings }) => setSettings(settings);
    const onLobbyCountdown = ({ seconds }) => setCountdown(seconds);

    const onRoundStart = ({ round, totalRounds, drawerId, drawTime, players }) => {
      setPlayers(players);
      setInitialStrokes([]);
      setCountdown(null);
      patchGame({
        phase: 'choosing', round, totalRounds, drawerId, drawTime,
        timeLeft: drawTime, wordPattern: null, wordLength: 0,
        myWord: null, wordOptions: null, turnResult: null, gameOver: null,
      });
      setScreen('game');
      const drawer = players.find((p) => p.id === drawerId);
      addMessage({ system: true, text: `Round ${round} — ${drawer?.name || 'Someone'} is choosing a word` });
    };
    const onWordOptions = ({ words }) => patchGame({ wordOptions: words });
    const onYourWord = ({ word }) => patchGame({ myWord: word });

    const onTurnStarted = ({ drawerId, drawTime, wordLength, wordPattern }) => {
      patchGame({ phase: 'drawing', drawerId, drawTime, timeLeft: drawTime, wordLength, wordPattern, wordOptions: null });
    };
    const onTimer = ({ timeLeft }) => patchGame({ timeLeft });
    const onHint = ({ wordPattern }) => patchGame({ wordPattern });

    const onGuessCorrect = ({ playerId, playerName, players }) => {
      setPlayers(players);
      addMessage({ system: true, variant: 'correct', text: `${playerName} guessed the word!` });
    };
    const onChatMessage = (m) => addMessage(m);

    const onTurnEnded = ({ word, scores, players }) => {
      setPlayers(players);
      patchGame({ phase: 'roundEnd', turnResult: { word, scores } });
      if (word) addMessage({ system: true, text: `The word was: ${word}` });
    };
    const onGameOver = ({ winner, leaderboard }) => {
      patchGame({ phase: 'gameOver', gameOver: { winner, leaderboard } });
    };
    const onReturnToLobby = ({ settings, players, hostId }) => {
      setSettings(settings);
      setPlayers(players);
      if (hostId) setHostId(hostId);
      setGame(initialGame);
      setScreen('lobby');
    };
    const onGameAborted = ({ reason }) => {
      addMessage({ system: true, text: `Game stopped: ${reason}` });
      patchGame({ ...initialGame });
      setCountdown(null);
      setScreen('lobby');
    };
    const onErrorMessage = ({ message }) => setError(message);
    const onKicked = ({ reason }) => {
      setError(reason || 'You were removed from the room.');
      setScreen('home');
      setRoomId(null);
      setPlayers([]);
      setGame(initialGame);
      setMessages([]);
      setCountdown(null);
    };

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('settings_updated', onSettingsUpdated);
    socket.on('lobby_countdown', onLobbyCountdown);
    socket.on('round_start', onRoundStart);
    socket.on('word_options', onWordOptions);
    socket.on('your_word', onYourWord);
    socket.on('turn_started', onTurnStarted);
    socket.on('timer', onTimer);
    socket.on('hint', onHint);
    socket.on('guess_correct', onGuessCorrect);
    socket.on('chat_message', onChatMessage);
    socket.on('turn_ended', onTurnEnded);
    socket.on('game_over', onGameOver);
    socket.on('return_to_lobby', onReturnToLobby);
    socket.on('game_aborted', onGameAborted);
    socket.on('error_message', onErrorMessage);
    socket.on('kicked', onKicked);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('settings_updated', onSettingsUpdated);
      socket.off('lobby_countdown', onLobbyCountdown);
      socket.off('round_start', onRoundStart);
      socket.off('word_options', onWordOptions);
      socket.off('your_word', onYourWord);
      socket.off('turn_started', onTurnStarted);
      socket.off('timer', onTimer);
      socket.off('hint', onHint);
      socket.off('guess_correct', onGuessCorrect);
      socket.off('chat_message', onChatMessage);
      socket.off('turn_ended', onTurnEnded);
      socket.off('game_over', onGameOver);
      socket.off('return_to_lobby', onReturnToLobby);
      socket.off('game_aborted', onGameAborted);
      socket.off('error_message', onErrorMessage);
      socket.off('kicked', onKicked);
    };
  }, [patchGame, addMessage]);

  const applyRoomPayload = (res, name) => {
    nameRef.current = name;
    setRoomId(res.roomId);
    setHostId(res.hostId);
    setSettings(res.settings);
    setPlayers(res.players);
    setSelfId(res.selfId);
    setMessages([]);
    setError('');
    setCountdown(null);
    if (res.state === 'playing' && res.game) {
      setInitialStrokes(res.strokes || []);
      patchGame({
        phase: res.game.phase,
        round: res.game.round,
        totalRounds: res.game.totalRounds,
        drawerId: res.game.drawerId,
        timeLeft: res.game.timeLeft,
        wordPattern: res.game.wordPattern,
        wordLength: res.game.wordLength,
        myWord: res.game.word || null,
      });
      setScreen('game');
    } else {
      setGame(initialGame);
      setScreen('lobby');
    }
  };

  const handleLeave = () => {
    socket.emit('leave_room');
    setScreen('home');
    setRoomId(null);
    setPlayers([]);
    setGame(initialGame);
    setMessages([]);
    setCountdown(null);
  };

  const isHost = selfId && selfId === hostId;
  const isSpectator = players.find((p) => p.id === selfId)?.isSpectator || false;

  return (
    <div className="app">
      {!connected && <div className="conn-banner">Connecting to server…</div>}
      {error && (
        <div className="toast" onClick={() => setError('')}>
          {error} <span className="toast-close">×</span>
        </div>
      )}

      {screen === 'home' && (
        <Home onJoined={applyRoomPayload} />
      )}

      {screen === 'lobby' && (
        <Lobby
          roomId={roomId}
          players={players}
          settings={settings}
          isHost={isHost}
          selfId={selfId}
          countdown={countdown}
          onLeave={handleLeave}
        />
      )}

      {screen === 'game' && (
        <Game
          roomId={roomId}
          players={players}
          selfId={selfId}
          isHost={isHost}
          game={game}
          messages={messages}
          initialStrokes={initialStrokes}
          onLeave={handleLeave}
          onBackToLobby={() => socket.emit('return_to_lobby')}
        />
      )}
    </div>
  );
}
