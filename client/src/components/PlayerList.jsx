export default function PlayerList({ players, drawerId, selfId }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="panel player-scores">
      <h3>Scoreboard</h3>
      <ul>
        {ranked.map((p, i) => (
          <li key={p.id} className={`score-row ${p.hasGuessed ? 'guessed' : ''}`}>
            <span className="rank">#{i + 1}</span>
            <span className="avatar sm" style={{ background: p.color }}>{p.name[0]?.toUpperCase()}</span>
            <span className="info">
              <span className="pname">
                {p.name}{p.id === selfId ? ' (you)' : ''}
              </span>
              <span className="pts">{p.score} pts</span>
            </span>
            <span className="badges">
              {p.id === drawerId && <span title="Drawing">✏️</span>}
              {p.hasGuessed && p.id !== drawerId && <span title="Guessed it">✓</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
