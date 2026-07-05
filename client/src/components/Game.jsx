import { useRef, useState } from 'react';
import { socket } from '../socket.js';
import DrawingCanvas from './Canvas.jsx';
import Toolbar from './Toolbar.jsx';
import PlayerList from './PlayerList.jsx';
import Chat from './Chat.jsx';

export default function Game({ roomId, players, selfId, isHost, game, messages, initialStrokes, onLeave, onBackToLobby }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState('pen');

  const isDrawer = game.drawerId === selfId;
  const canDraw = isDrawer && game.phase === 'drawing';
  const canGuess = !isDrawer && game.phase === 'drawing';

  const drawer = players.find((p) => p.id === game.drawerId);

  const chooseWord = (word) => socket.emit('choose_word', { word });

  return (
    <div className="game">
      <header className="game-header">
        <div className="hdr-left">
          <button className="btn ghost sm" onClick={onLeave}>Leave</button>
          <span className="round-pill">Round {game.round}/{game.totalRounds}</span>
        </div>

        <div className="hdr-center">
          <WordDisplay game={game} isDrawer={isDrawer} />
        </div>

        <div className="hdr-right">
          <Timer timeLeft={game.timeLeft} total={game.drawTime} />
        </div>
      </header>

      <div className="game-body">
        <aside className="left-col">
          <PlayerList players={players} drawerId={game.drawerId} selfId={selfId} />
        </aside>

        <main className="center-col">
          <div className="canvas-area">
            <DrawingCanvas
              ref={canvasRef}
              canDraw={canDraw}
              color={color}
              brushSize={brushSize}
              tool={tool}
              initialStrokes={initialStrokes}
            />

            {game.phase === 'choosing' && (
              <ChoosingOverlay
                isDrawer={isDrawer}
                drawerName={drawer?.name}
                wordOptions={game.wordOptions}
                onChoose={chooseWord}
              />
            )}
            {game.phase === 'roundEnd' && game.turnResult && (
              <RoundEndOverlay result={game.turnResult} players={players} />
            )}
            {game.phase === 'gameOver' && game.gameOver && (
              <GameOverOverlay data={game.gameOver} isHost={isHost} onBackToLobby={onBackToLobby} onLeave={onLeave} />
            )}
          </div>

          {canDraw && (
            <Toolbar
              color={color} setColor={setColor}
              brushSize={brushSize} setBrushSize={setBrushSize}
              tool={tool} setTool={setTool}
              onUndo={() => canvasRef.current?.undo()}
              onClear={() => canvasRef.current?.clear()}
            />
          )}
        </main>

        <aside className="right-col">
          <Chat
            messages={messages}
            canGuess={canGuess}
            placeholder={isDrawer ? "You're drawing — you can chat here" : undefined}
          />
        </aside>
      </div>
    </div>
  );
}

function Timer({ timeLeft, total }) {
  const pct = total ? Math.max(0, (timeLeft / total) * 100) : 0;
  const low = timeLeft <= 10;
  return (
    <div className={`timer ${low ? 'low' : ''}`}>
      <svg viewBox="0 0 36 36" className="timer-ring">
        <path className="ring-bg" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
        <path className="ring-fg" style={{ strokeDasharray: `${pct} 100` }}
          d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
      </svg>
      <span className="timer-num">{Math.max(0, timeLeft)}</span>
    </div>
  );
}

function WordDisplay({ game, isDrawer }) {
  if (game.phase === 'choosing') {
    return <div className="word-display muted">Choosing a word…</div>;
  }
  if (game.phase === 'drawing') {
    if (isDrawer && game.myWord) {
      return <div className="word-display">Draw: <b>{game.myWord}</b></div>;
    }
    const pattern = game.wordPattern || '';
    return (
      <div className="word-display">
        <span className="word-pattern">
          {pattern.split('').map((ch, i) => (
            <span key={i} className={ch === ' ' ? 'space' : 'letter'}>{ch === ' ' ? '  ' : ch}</span>
          ))}
        </span>
        <span className="word-count">{game.wordLength} letters</span>
      </div>
    );
  }
  return <div className="word-display muted">&nbsp;</div>;
}

function ChoosingOverlay({ isDrawer, drawerName, wordOptions, onChoose }) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        {isDrawer ? (
          <>
            <h3>Choose a word to draw</h3>
            <div className="word-choices">
              {(wordOptions || []).map((w) => (
                <button key={w} className="btn primary word-choice" onClick={() => onChoose(w)}>{w}</button>
              ))}
            </div>
          </>
        ) : (
          <h3><b>{drawerName || 'The drawer'}</b> is choosing a word…</h3>
        )}
      </div>
    </div>
  );
}

function RoundEndOverlay({ result, players }) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const scores = [...(result.scores || [])].sort((a, b) => b.roundScore - a.roundScore);
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h3>
          {result.word
            ? <>The word was <span className="reveal-word">{result.word}</span></>
            : 'Turn skipped'}
        </h3>
        <ul className="round-scores">
          {scores.map((s) => (
            <li key={s.id}>
              <span className="avatar sm" style={{ background: byId[s.id]?.color }}>{s.name[0]?.toUpperCase()}</span>
              <span className="pname">{s.name}</span>
              <span className={`delta ${s.roundScore > 0 ? 'pos' : ''}`}>
                {s.roundScore > 0 ? `+${s.roundScore}` : '+0'}
              </span>
            </li>
          ))}
        </ul>
        <p className="next-note">Next turn starting…</p>
      </div>
    </div>
  );
}

function GameOverOverlay({ data, isHost, onBackToLobby, onLeave }) {
  const { winner, leaderboard = [] } = data;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="overlay">
      <div className="overlay-card game-over">
        <h2>🎉 Game Over</h2>
        {winner && <p className="winner">Winner: <b>{winner.name}</b> with {winner.score} pts!</p>}
        <ol className="leaderboard">
          {leaderboard.map((p, i) => (
            <li key={p.id}>
              <span className="medal">{medals[i] || `#${i + 1}`}</span>
              <span className="avatar sm" style={{ background: p.color }}>{p.name[0]?.toUpperCase()}</span>
              <span className="pname">{p.name}</span>
              <span className="pts">{p.score}</span>
            </li>
          ))}
        </ol>
        <div className="over-actions">
          {isHost && <button className="btn primary" onClick={onBackToLobby}>Back to Lobby</button>}
          <button className="btn" onClick={onLeave}>Leave</button>
        </div>
      </div>
    </div>
  );
}
