import { pickWords } from '../data/words.js';

const GUESS_MIN = 50;
const GUESS_MAX = 400;

export class Game {
  constructor(room, emitters) {
    this.room = room;
    this.settings = room.settings;

    this.toRoom = emitters.toRoom;
    this.toPlayer = emitters.toPlayer;

    this.phase = 'lobby';
    this.round = 0;
    this.turnOrder = [];
    this.turnIndex = -1;
    this.drawerId = null;

    this.currentWord = null;
    this.wordOptions = [];
    this.usedWords = new Set();
    this.revealed = [];
    this.correctGuessers = [];

    this.timeLeft = 0;
    this.tickInterval = null;
    this.chooseTimeout = null;
    this.turnEndTimeout = null;
  }

  get hidden() {
    return this.settings.wordMode === 'hidden';
  }

  start() {
    this.round = 0;
    this.turnIndex = -1;
    this.usedWords.clear();
    for (const p of this.room.players.values()) p.score = 0;
    this.nextTurn();
  }

  nextTurn() {
    this.clearTimers();

    const ids = this.room.activePlayers().map((p) => p.id);
    if (ids.length < 2) {
      this.phase = 'lobby';
      this.room.state = 'lobby';
      this.toRoom('game_aborted', { reason: 'Not enough players' });
      return;
    }

    const isNewRound = this.turnIndex === -1 || this.turnIndex >= this.turnOrder.length - 1;
    if (isNewRound) {
      if (this.round >= this.settings.rounds) return this.endGame();
      this.round += 1;
      this.turnOrder = ids;
      this.turnIndex = 0;
    } else {
      this.turnIndex += 1;
    }

    while (this.turnIndex < this.turnOrder.length && !this._isActive(this.turnOrder[this.turnIndex])) {
      this.turnIndex += 1;
    }
    if (this.turnIndex >= this.turnOrder.length) return this.nextTurn();

    this.beginChoosing();
  }

  _isActive(id) {
    const p = this.room.players.get(id);
    return Boolean(p && !p.isSpectator);
  }

  beginChoosing() {
    this.phase = 'choosing';
    this.drawerId = this.turnOrder[this.turnIndex];
    this.currentWord = null;
    this.revealed = [];
    this.correctGuessers = [];
    this.room.strokes = [];

    for (const p of this.room.players.values()) {
      p.resetRound();
      p.isDrawing = p.id === this.drawerId;
    }

    this.wordOptions = pickWords(this.settings.wordCount, {
      exclude: this.usedWords,
      language: this.settings.language,
      categories: this.settings.categories,
      customWords: this.settings.customWords,
      useCustomOnly: this.settings.useCustomOnly,
      mode: this.settings.wordMode,
    });

    this.toRoom('round_start', {
      round: this.round,
      totalRounds: this.settings.rounds,
      drawerId: this.drawerId,
      drawTime: this.settings.drawTime,
      players: this.room.playersJSON(),
    });

    this.toPlayer(this.drawerId, 'word_options', { words: this.wordOptions });

    this.chooseTimeout = setTimeout(() => {
      if (this.phase === 'choosing') {
        const auto = this.wordOptions[Math.floor(Math.random() * this.wordOptions.length)];
        this.chooseWord(this.drawerId, auto);
      }
    }, 15000);
  }

  chooseWord(playerId, word) {
    if (this.phase !== 'choosing' || playerId !== this.drawerId) return;
    if (!this.wordOptions.includes(word)) return;

    clearTimeout(this.chooseTimeout);
    this.currentWord = word;
    this.usedWords.add(word);
    this.phase = 'drawing';
    this.timeLeft = this.settings.drawTime;

    this._planHints();

    this.toRoom('turn_started', {
      drawerId: this.drawerId,
      drawTime: this.settings.drawTime,
      wordLength: this.hidden ? 0 : word.length,
      wordPattern: this.hidden ? null : this._maskedWord(),
      hidden: this.hidden,
    });
    this.toPlayer(this.drawerId, 'your_word', { word });

    this._startTimer();
  }

  handleGuess(playerId, rawText) {
    const player = this.room.players.get(playerId);
    if (!player) return { type: 'ignore' };

    const text = (rawText || '').trim();
    if (!text) return { type: 'ignore' };

    const isGuessingPhase = this.phase === 'drawing';
    const isDrawer = playerId === this.drawerId;

    // Drawer, spectators, and players who already solved cannot score — their
    // messages are chat, restricted during drawing so they can't reveal the word.
    if (isDrawer || player.isSpectator || player.hasGuessed) {
      return { type: 'chat', text, restricted: isGuessingPhase };
    }
    if (!isGuessingPhase) {
      return { type: 'chat', text, restricted: false };
    }

    const normalized = this._normalize(text);
    const answer = this._normalize(this.currentWord);

    if (normalized === answer) {
      this._awardCorrectGuess(player);
      return { type: 'correct', player };
    }

    if (this._isClose(normalized, answer)) {
      return { type: 'close', text };
    }

    return { type: 'chat', text };
  }

  _awardCorrectGuess(player) {
    player.hasGuessed = true;
    this.correctGuessers.push(player.id);

    const ratio = Math.max(0, this.timeLeft / this.settings.drawTime);
    const points = Math.round(GUESS_MIN + (GUESS_MAX - GUESS_MIN) * ratio);
    player.roundScore += points;
    player.score += points;

    const guessers = this.room.activePlayers().filter((p) => p.id !== this.drawerId);
    const allGuessed = guessers.length > 0 && guessers.every((p) => p.hasGuessed);
    if (allGuessed) this.endTurn('all_guessed');
  }

  _awardDrawer() {
    const drawer = this.room.players.get(this.drawerId);
    if (!drawer) return;
    const solvers = this.correctGuessers
      .map((id) => this.room.players.get(id))
      .filter(Boolean);
    if (solvers.length === 0) return;
    const avg = Math.round(solvers.reduce((sum, p) => sum + p.roundScore, 0) / solvers.length);
    drawer.roundScore += avg;
    drawer.score += avg;
  }

  endTurn(reason = 'time_up') {
    if (this.phase === 'roundEnd' || this.phase === 'gameOver') return;
    this.clearTimers();
    this.phase = 'roundEnd';

    if (this.currentWord && reason !== 'drawer_left') this._awardDrawer();

    // Snapshot the drawing so players can replay the last round.
    if (this.room.strokes.length) {
      this.room.lastRoundStrokes = this.room.strokes.slice();
      this.room.lastRoundWord = this.currentWord;
    }

    this.toRoom('turn_ended', {
      reason,
      word: this.currentWord,
      players: this.room.playersJSON(),
      hasReplay: this.room.lastRoundStrokes.length > 0,
      scores: this.room.playersJSON()
        .map((p) => ({ id: p.id, name: p.name, roundScore: p.roundScore, score: p.score }))
        .sort((a, b) => b.score - a.score),
    });

    this.turnEndTimeout = setTimeout(() => {
      this.turnEndTimeout = null;
      this.nextTurn();
    }, 5000);
  }

  endGame() {
    this.clearTimers();
    this.phase = 'gameOver';
    this.room.state = 'ended';

    const leaderboard = this.room.playersJSON()
      .filter((p) => !p.isSpectator)
      .sort((a, b) => b.score - a.score);
    const winner = leaderboard[0] || null;

    this.toRoom('game_over', { winner, leaderboard });
  }

  _startTimer() {
    this.tickInterval = setInterval(() => {
      this.timeLeft -= 1;
      this._maybeRevealHint();
      this.toRoom('timer', { timeLeft: this.timeLeft });
      if (this.timeLeft <= 0) this.endTurn('time_up');
    }, 1000);
  }

  _planHints() {
    if (this.hidden) { this._hintThresholds = []; return; }
    const count = Math.min(this.settings.hints, this.currentWord.replace(/\s/g, '').length - 1);
    this._hintCount = Math.max(0, count);
    const thresholds = new Set();
    for (let i = 1; i <= this._hintCount; i++) {
      const frac = (this._hintCount - i + 1) / (this._hintCount + 1);
      thresholds.add(Math.max(1, Math.floor(this.settings.drawTime * frac)));
    }
    this._hintThresholds = [...thresholds].sort((a, b) => b - a);
  }

  _maybeRevealHint() {
    if (!this._hintThresholds || this._hintThresholds.length === 0) return;
    if (this.timeLeft === this._hintThresholds[0]) {
      this._hintThresholds.shift();
      this._revealRandomLetter();
      this.toRoom('hint', { wordPattern: this._maskedWord() });
    }
  }

  _revealRandomLetter() {
    const candidates = [];
    for (let i = 0; i < this.currentWord.length; i++) {
      if (this.currentWord[i] === ' ') continue;
      if (!this.revealed.includes(i)) candidates.push(i);
    }
    if (candidates.length <= 1) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.revealed.push(pick);
  }

  _maskedWord() {
    return this.currentWord
      .split('')
      .map((ch, i) => (ch === ' ' ? ' ' : this.revealed.includes(i) ? ch : '_'))
      .join('');
  }

  _normalize(s) {
    return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  _isClose(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a === b) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else { i++; j++; }
    }
    edits += (a.length - i) + (b.length - j);
    return edits <= 1;
  }

  clearTimers() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.chooseTimeout) clearTimeout(this.chooseTimeout);
    if (this.turnEndTimeout) clearTimeout(this.turnEndTimeout);
    this.tickInterval = null;
    this.chooseTimeout = null;
    this.turnEndTimeout = null;
  }

  snapshot(forPlayerId) {
    const isDrawer = forPlayerId === this.drawerId;
    const showWord = this.currentWord && !this.hidden;
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.settings.rounds,
      drawerId: this.drawerId,
      timeLeft: this.timeLeft,
      hidden: this.hidden,
      wordPattern: showWord ? this._maskedWord() : null,
      wordLength: showWord ? this.currentWord.length : 0,
      word: isDrawer ? this.currentWord : undefined,
    };
  }
}
