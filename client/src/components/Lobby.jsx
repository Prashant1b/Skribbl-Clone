import { useState } from 'react';
import { socket } from '../socket.js';
import { LANGUAGES, CATEGORIES, WORD_MODES } from '../constants.js';

export default function Lobby({ roomId, players, settings, isHost, selfId, hostId, isSpectator, countdown, onLeave }) {
  const [copied, setCopied] = useState('');

  const inviteLink = `${window.location.origin}?room=${roomId}`;
  const isPublic = !!settings?.isPublic;
  const canEdit = isHost && !isPublic;

  const active = players.filter((p) => !p.isSpectator);
  const spectators = players.filter((p) => p.isSpectator);

  const copy = (value, label) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const setSetting = (k, v) => {
    if (!canEdit) return;
    socket.emit('update_settings', { [k]: v });
  };
  const toggleCategory = (c) => {
    if (!canEdit) return;
    const cats = settings.categories || [];
    setSetting('categories', cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c]);
  };
  const kick = (id) => socket.emit('kick_player', { playerId: id });
  const votekick = (id) => socket.emit('votekick', { playerId: id });

  const start = () => socket.emit('start_game');
  const canStart = active.length >= 2;

  const renderStartArea = () => {
    if (isSpectator) return <p className="waiting">You're spectating — waiting for the game…</p>;
    if (isPublic) {
      if (active.length < 2) return <p className="waiting">Waiting for more players to join…</p>;
      return (
        <p className="waiting">
          {countdown != null ? `Game starts in ${countdown}…` : 'Game starting…'}
        </p>
      );
    }
    if (isHost) {
      return (
        <button className="btn primary block start-btn" disabled={!canStart} onClick={start}>
          {canStart ? 'Start Game' : 'Waiting for players…'}
        </button>
      );
    }
    return <p className="waiting">Waiting for the host to start…</p>;
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <button className="btn ghost" onClick={onLeave}>← Leave</button>
        <h2>{isPublic ? 'Public Lobby' : 'Lobby'}</h2>
        {!isPublic && (
          <div className="room-code">
            Room <b>{roomId}</b>
            <button className="chip" onClick={() => copy(roomId, 'code')}>
              {copied === 'code' ? '✓ Copied' : 'Copy code'}
            </button>
            <button className="chip" onClick={() => copy(inviteLink, 'link')}>
              {copied === 'link' ? '✓ Copied' : 'Copy invite link'}
            </button>
          </div>
        )}
      </div>

      <div className="lobby-body">
        <section className="panel players-panel">
          <h3>Players ({active.length})</h3>
          <ul className="player-list">
            {active.map((p) => (
              <li key={p.id} className="player-row">
                <span className="avatar" style={{ background: p.color }}>{p.avatar || p.name[0]?.toUpperCase()}</span>
                <span className="pname">{p.name}{p.id === selfId ? ' (you)' : ''}</span>
                {p.isHost && !isPublic && <span className="tag host">Host</span>}
                {!isPublic && p.id !== selfId && p.id !== hostId && (
                  isHost
                    ? <button className="mini-btn danger" onClick={() => kick(p.id)}>Kick</button>
                    : (!isSpectator && <button className="mini-btn" onClick={() => votekick(p.id)}>Votekick</button>)
                )}
              </li>
            ))}
          </ul>

          {spectators.length > 0 && (
            <>
              <h3 className="spectator-head">Spectators ({spectators.length})</h3>
              <ul className="player-list">
                {spectators.map((p) => (
                  <li key={p.id} className="player-row spectator">
                    <span className="avatar" style={{ background: p.color }}>{p.avatar || '👁'}</span>
                    <span className="pname">{p.name}{p.id === selfId ? ' (you)' : ''}</span>
                    <span className="tag">👁 Spectator</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel settings-panel">
          <h3>
            Settings
            {isPublic
              ? <span className="settings-hint">Fixed for public games</span>
              : !isHost && <span className="settings-hint">Host controls</span>}
          </h3>
          {settings && (isPublic
            ? <SettingsSummary settings={settings} />
            : <div className="settings-grid">
                <Row label="Max players" value={settings.maxPlayers} min={2} max={20}
                  disabled={!canEdit} onChange={(v) => setSetting('maxPlayers', v)} />
                <Row label="Rounds" value={settings.rounds} min={2} max={10}
                  disabled={!canEdit} onChange={(v) => setSetting('rounds', v)} />
                <Row label="Draw time" value={settings.drawTime} min={15} max={240} step={5} suffix="s"
                  disabled={!canEdit} onChange={(v) => setSetting('drawTime', v)} />
                <Row label="Word choices" value={settings.wordCount} min={1} max={5}
                  disabled={!canEdit} onChange={(v) => setSetting('wordCount', v)} />
                <Row label="Hints" value={settings.hints} min={0} max={5}
                  disabled={!canEdit} onChange={(v) => setSetting('hints', v)} />

                <label className="select-row">
                  <span>Word mode</span>
                  <select value={settings.wordMode || 'normal'} disabled={!canEdit}
                    onChange={(e) => setSetting('wordMode', e.target.value)}>
                    {WORD_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="select-row">
                  <span>Language</span>
                  <select value={settings.language || 'en'} disabled={!canEdit}
                    onChange={(e) => setSetting('language', e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </label>

                <div className="cat-block">
                  <span className="cat-label">Categories {(settings.categories?.length || 0) === 0 ? '(all)' : ''}</span>
                  <div className="cat-chips">
                    {CATEGORIES.map((c) => (
                      <button key={c} disabled={!canEdit}
                        className={`cat-chip ${settings.categories?.includes(c) ? 'on' : ''}`}
                        onClick={() => toggleCategory(c)}>{c}</button>
                    ))}
                  </div>
                </div>

                {(settings.customWords?.length > 0) && (
                  <p className="settings-note">
                    {settings.useCustomOnly ? 'Using only ' : 'Plus '}{settings.customWords.length} custom word(s).
                  </p>
                )}
              </div>
          )}

          {renderStartArea()}
        </section>
      </div>
    </div>
  );
}

function SettingsSummary({ settings }) {
  const wordMode = WORD_MODES.find((m) => m.value === (settings.wordMode || 'normal'))?.label || 'Normal';
  const language = LANGUAGES.find((l) => l.value === (settings.language || 'en'))?.label || 'English';
  const cats = settings.categories || [];

  const items = [
    { label: 'Rounds', value: settings.rounds },
    { label: 'Draw time', value: `${settings.drawTime}s` },
    { label: 'Max players', value: settings.maxPlayers },
    { label: 'Word choices', value: settings.wordCount },
    { label: 'Hints', value: settings.hints },
    { label: 'Word mode', value: wordMode },
    { label: 'Language', value: language },
  ];

  return (
    <div className="settings-summary">
      <dl className="summary-grid">
        {items.map((it) => (
          <div key={it.label} className="summary-item">
            <dt>{it.label}</dt>
            <dd>{it.value}</dd>
          </div>
        ))}
      </dl>
      <div className="summary-cats">
        <span className="cat-label">Categories {cats.length === 0 ? '(all)' : ''}</span>
        <div className="cat-chips">
          {CATEGORIES.map((c) => (
            <span key={c} className={`cat-chip static ${cats.length === 0 || cats.includes(c) ? 'on' : ''}`}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, min, max, step = 1, suffix = '', disabled, onChange }) {
  const options = [];
  for (let v = min; v <= max; v += step) options.push(v);
  return (
    <label className="select-row">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((v) => <option key={v} value={v}>{v}{suffix}</option>)}
      </select>
    </label>
  );
}
