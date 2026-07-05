import { Player } from './Player.js';
import { Game } from './Game.js';
import { LANGUAGES, CATEGORIES } from '../data/words.js';

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  isPublic: false,
  wordMode: 'normal',       // 'normal' | 'hidden' | 'combination'
  language: 'en',
  categories: [],           // [] => all categories
  customWords: [],
  useCustomOnly: false,
};

const WORD_MODES = ['normal', 'hidden', 'combination'];
const MAX_CUSTOM_WORDS = 200;

const AUTO_START_SECONDS = 3;

export class Room {
  constructor(id, io, settings = {}) {
    this.id = id;
    this.io = io;
    this.players = new Map();
    this.hostId = null;
    this.state = 'lobby';
    this.settings = Room.sanitizeSettings(settings);
    this.strokes = [];
    this.lastRoundStrokes = [];   // snapshot of the previous turn's drawing (for replay)
    this.lastRoundWord = null;
    this.votekicks = new Map();    // targetId -> Set(voterId)

    this.autoStartTimer = null;
    this.autoStartSeconds = 0;

    this.game = new Game(this, {
      toRoom: (event, payload) => this.io.to(this.id).emit(event, payload),
      toPlayer: (playerId, event, payload) => this.io.to(playerId).emit(event, payload),
    });
  }

  static sanitizeSettings(s = {}) {
    const clamp = (v, min, max, def) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
    };
    const cleanCustom = Array.isArray(s.customWords)
      ? [...new Set(s.customWords.map((w) => String(w).trim().slice(0, 32)).filter(Boolean))].slice(0, MAX_CUSTOM_WORDS)
      : DEFAULT_SETTINGS.customWords;
    const categories = Array.isArray(s.categories)
      ? s.categories.filter((c) => CATEGORIES.includes(c))
      : DEFAULT_SETTINGS.categories;
    return {
      maxPlayers: clamp(s.maxPlayers, 2, 20, DEFAULT_SETTINGS.maxPlayers),
      rounds: clamp(s.rounds, 2, 10, DEFAULT_SETTINGS.rounds),
      drawTime: clamp(s.drawTime, 15, 240, DEFAULT_SETTINGS.drawTime),
      wordCount: clamp(s.wordCount, 1, 5, DEFAULT_SETTINGS.wordCount),
      hints: clamp(s.hints, 0, 5, DEFAULT_SETTINGS.hints),
      isPublic: Boolean(s.isPublic),
      wordMode: WORD_MODES.includes(s.wordMode) ? s.wordMode : DEFAULT_SETTINGS.wordMode,
      language: LANGUAGES.includes(s.language) ? s.language : DEFAULT_SETTINGS.language,
      categories,
      customWords: cleanCustom,
      useCustomOnly: Boolean(s.useCustomOnly),
    };
  }

  updateSettings(s) {
    if (this.state !== 'lobby') return;
    // Public (matchmaking) rooms use fixed default settings — like skribbl.io,
    // only private rooms can be customized by the host.
    if (this.settings.isPublic) return;
    // isPublic is chosen at creation and cannot be toggled afterwards.
    const { isPublic, ...rest } = s || {};
    this.settings = Room.sanitizeSettings({ ...this.settings, ...rest });
    this.game.settings = this.settings;
  }

  addPlayer(id, name, opts = {}) {
    const player = new Player(id, this._uniqueName(name), opts);
    // A spectator joining a live game stays a spectator; if the room is still in the
    // lobby there is no game to spectate, so treat them as a normal player.
    if (player.isSpectator && this.state === 'lobby') player.isSpectator = false;
    this.players.set(id, player);
    if (!player.isSpectator && !this.hostId) {
      player.isHost = true;
      this.hostId = id;
    }
    return player;
  }

  removePlayer(id) {
    const wasHost = id === this.hostId;
    const wasDrawer = this.game.drawerId === id;
    this.players.delete(id);
    this._clearVotesInvolving(id);

    if (wasHost && this.players.size > 0) {
      const next = this.activePlayers()[0] || null;
      if (next) {
        next.isHost = true;
        this.hostId = next.id;
      } else {
        this.hostId = null;
      }
    }

    if (this.activePlayers().length < 2) this.cancelAutoStart();

    if (wasDrawer && this.state === 'playing' && this.game.phase !== 'roundEnd') {
      this.strokes = [];
      this.game.endTurn('drawer_left');
    }
    return { wasHost, wasDrawer };
  }

  // --- Moderation ---------------------------------------------------------
  kick(byId, targetId) {
    if (byId !== this.hostId) return { ok: false, error: 'Only the host can kick.' };
    if (targetId === this.hostId) return { ok: false, error: 'Host cannot be kicked.' };
    if (!this.players.has(targetId)) return { ok: false, error: 'Player not found.' };
    return { ok: true };
  }

  voteKick(voterId, targetId) {
    if (voterId === targetId) return { ok: false, error: "You can't votekick yourself." };
    if (targetId === this.hostId) return { ok: false, error: 'Host cannot be votekicked.' };
    const voter = this.players.get(voterId);
    const target = this.players.get(targetId);
    if (!voter || voter.isSpectator) return { ok: false, error: 'Spectators cannot vote.' };
    if (!target) return { ok: false, error: 'Player not found.' };

    if (!this.votekicks.has(targetId)) this.votekicks.set(targetId, new Set());
    const votes = this.votekicks.get(targetId);
    votes.add(voterId);

    const voters = this.activePlayers().filter((p) => p.id !== targetId).length;
    const needed = Math.max(2, Math.ceil(voters / 2));
    const passed = votes.size >= needed;
    if (passed) this.votekicks.delete(targetId);
    return { ok: true, votes: votes.size, needed, passed, targetName: target.name };
  }

  _clearVotesInvolving(id) {
    this.votekicks.delete(id);
    for (const votes of this.votekicks.values()) votes.delete(id);
  }

  // --- Turn / lifecycle ---------------------------------------------------
  activePlayers() {
    return [...this.players.values()].filter((p) => !p.isSpectator);
  }

  startGame(byId) {
    if (byId !== this.hostId) return { ok: false, error: 'Only the host can start the game.' };
    if (this.activePlayers().length < 2) return { ok: false, error: 'Need at least 2 players to start.' };
    if (this.state === 'playing') return { ok: false, error: 'Game already in progress.' };
    this.cancelAutoStart();
    this._begin();
    return { ok: true };
  }

  _begin() {
    this.state = 'playing';
    this.strokes = [];
    this.game.start();
  }

  maybeAutoStart() {
    if (!this.settings.isPublic) return;
    if (this.state !== 'lobby') return;
    if (this.activePlayers().length < 2) return;
    if (this.autoStartTimer) return;

    this.autoStartSeconds = AUTO_START_SECONDS;
    this.io.to(this.id).emit('lobby_countdown', { seconds: this.autoStartSeconds });

    this.autoStartTimer = setInterval(() => {
      if (this.state !== 'lobby' || this.activePlayers().length < 2) {
        this.cancelAutoStart();
        return;
      }
      this.autoStartSeconds -= 1;
      if (this.autoStartSeconds <= 0) {
        this.cancelAutoStart();
        this._begin();
        return;
      }
      this.io.to(this.id).emit('lobby_countdown', { seconds: this.autoStartSeconds });
    }, 1000);
  }

  cancelAutoStart() {
    if (this.autoStartTimer) clearInterval(this.autoStartTimer);
    this.autoStartTimer = null;
    this.autoStartSeconds = 0;
  }

  isFull() {
    return this.activePlayers().length >= this.settings.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  playersJSON() {
    return [...this.players.values()].map((p) => p.toJSON());
  }

  publicInfo() {
    return {
      id: this.id,
      players: this.activePlayers().length,
      maxPlayers: this.settings.maxPlayers,
      rounds: this.settings.rounds,
      state: this.state,
      isPublic: this.settings.isPublic,
    };
  }

  _uniqueName(name) {
    let base = (name || 'Player').toString().trim().slice(0, 16) || 'Player';
    const existing = new Set([...this.players.values()].map((p) => p.name));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  }
}
