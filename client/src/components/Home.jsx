import { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { LANGUAGES, CATEGORIES, WORD_MODES } from '../constants.js';

export default function Home({ onJoined }) {
  const [name, setName] = useState(() => localStorage.getItem('skribbl_name') || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2,
    wordMode: 'normal', language: 'en', categories: [], customWords: [], useCustomOnly: false,
  });
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    if (r) setCode(r.toUpperCase());
  }, []);

  const remember = () => {
    localStorage.setItem('skribbl_name', name.trim());
  };

  const guardName = () => {
    if (!name.trim()) { setError('Please enter a name first.'); return false; }
    return true;
  };

  const buildSettings = () => ({
    ...settings,
    customWords: customText.split(',').map((w) => w.trim()).filter(Boolean),
  });

  const create = () => {
    if (!guardName()) return;
    remember(); setBusy(true); setError('');
    socket.emit('create_room', { playerName: name.trim(), settings: buildSettings() }, (res) => {
      setBusy(false);
      if (res?.ok) onJoined(res, name.trim());
      else setError(res?.error || 'Could not create room.');
    });
  };

  const join = (asSpectator = false) => {
    if (!guardName()) return;
    const target = code.trim().toUpperCase();
    if (!target) { setError('Enter a room code.'); return; }
    remember(); setBusy(true); setError('');
    socket.emit('join_room', { roomId: target, playerName: name.trim(), asSpectator }, (res) => {
      setBusy(false);
      if (res?.ok) onJoined(res, name.trim());
      else setError(res?.error || 'Could not join room.');
    });
  };

  const joinPublic = () => {
    if (!guardName()) return;
    remember(); setBusy(true); setError('');
    socket.emit('join_public', { playerName: name.trim() }, (res) => {
      setBusy(false);
      if (res?.ok) onJoined(res, name.trim());
      else setError(res?.error || 'No public room available.');
    });
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  const toggleCategory = (c) => setSettings((s) => ({
    ...s,
    categories: s.categories.includes(c) ? s.categories.filter((x) => x !== c) : [...s.categories, c],
  }));

  return (
    <div className="home">
      <div className="home-card">
        <h1 className="logo">✏️ Skribbl<span>Clone</span></h1>
        <p className="tagline">Draw, guess, and outscore your friends in real time.</p>

        <input
          className="text-input big"
          placeholder="Enter your name"
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="join-row">
          <input
            className="text-input"
            placeholder="ROOM CODE"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
          <button className="btn" disabled={busy} onClick={() => join(false)}>Join</button>
        </div>
        <button className="link-btn spectate-link" disabled={busy} onClick={() => join(true)}>
          👁 Join as spectator
        </button>

        <div className="divider"><span>or</span></div>

        <button className="btn primary block" disabled={busy} onClick={create}>
          Create Private Room
        </button>
        <button className="btn block" disabled={busy} onClick={joinPublic}>
          Join a Public Room
        </button>

        {showSettings && (
          <div className="settings-grid">
            <Setting label="Max players" value={settings.maxPlayers} min={2} max={20}
              onChange={(v) => set('maxPlayers', v)} />
            <Setting label="Rounds" value={settings.rounds} min={2} max={10}
              onChange={(v) => set('rounds', v)} />
            <Setting label="Draw time (s)" value={settings.drawTime} min={15} max={240} step={5}
              onChange={(v) => set('drawTime', v)} />
            <Setting label="Word choices" value={settings.wordCount} min={1} max={5}
              onChange={(v) => set('wordCount', v)} />
            <Setting label="Hints" value={settings.hints} min={0} max={5}
              onChange={(v) => set('hints', v)} />

            <label className="select-row">
              <span>Word mode</span>
              <select value={settings.wordMode} onChange={(e) => set('wordMode', e.target.value)}>
                {WORD_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>

            <label className="select-row">
              <span>Language</span>
              <select value={settings.language} onChange={(e) => set('language', e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>

            <div className="cat-block">
              <span className="cat-label">Categories {settings.categories.length === 0 ? '(all)' : ''}</span>
              <div className="cat-chips">
                {CATEGORIES.map((c) => (
                  <button key={c}
                    className={`cat-chip ${settings.categories.includes(c) ? 'on' : ''}`}
                    onClick={() => toggleCategory(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="custom-block">
              <span className="cat-label">Custom words (comma-separated)</span>
              <textarea
                className="text-input custom-words"
                rows={2}
                placeholder="e.g. inside joke, my dog, pizza time"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <label className="checkbox">
                <input type="checkbox" checked={settings.useCustomOnly}
                  onChange={(e) => set('useCustomOnly', e.target.checked)} />
                Use only my custom words
              </label>
            </div>

            <p className="settings-note">These apply to your private room only. Public games use fixed settings.</p>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
      </div>
    </div>
  );
}

function Setting({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="setting">
      <span>{label}</span>
      <div className="setting-control">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <b>{value}</b>
      </div>
    </label>
  );
}
