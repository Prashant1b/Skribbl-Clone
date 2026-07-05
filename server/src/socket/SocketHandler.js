export class SocketHandler {
  constructor(io, socket, manager) {
    this.io = io;
    this.socket = socket;
    this.manager = manager;
    this.roomId = null;
  }

  register() {
    const s = this.socket;
    s.on('create_room', (p, cb) => this.onCreateRoom(p, cb));
    s.on('join_room', (p, cb) => this.onJoinRoom(p, cb));
    s.on('join_public', (p, cb) => this.onJoinPublic(p, cb));
    s.on('update_settings', (p) => this.onUpdateSettings(p));
    s.on('start_game', () => this.onStartGame());
    s.on('return_to_lobby', () => this.onReturnToLobby());
    s.on('choose_word', (p) => this.onChooseWord(p));

    s.on('kick_player', (p) => this.onKick(p));
    s.on('votekick', (p) => this.onVoteKick(p));
    s.on('request_replay', () => this.onRequestReplay());

    s.on('draw', (p) => this.onDraw(p));
    s.on('canvas_clear', () => this.onCanvasClear());
    s.on('draw_undo', (p) => this.onUndo(p));

    s.on('guess', (p) => this.onGuess(p));

    s.on('leave_room', () => this.onLeave());
    s.on('disconnect', () => this.onLeave());
  }

  onCreateRoom({ playerName, settings, avatar } = {}, cb) {
    // "Create Private Room" is always private — like skribbl.io, only matchmaking
    // (join_public) creates public rooms, and those use fixed default settings.
    const room = this.manager.createRoom({ ...(settings || {}), isPublic: false });
    this._enter(room, playerName, { avatar });
    this._ack(cb, { ok: true, roomId: room.id, ...this._selfPayload(room) });
  }

  onJoinRoom({ roomId, playerName, avatar, asSpectator } = {}, cb) {
    const room = this.manager.getRoom(roomId);
    if (!room) return this._ack(cb, { ok: false, error: 'Room not found.' });
    if (!asSpectator && room.isFull()) return this._ack(cb, { ok: false, error: 'Room is full.' });
    this._enter(room, playerName, { avatar, isSpectator: asSpectator });
    this._ack(cb, { ok: true, roomId: room.id, ...this._selfPayload(room) });
  }

  onJoinPublic({ playerName, avatar } = {}, cb) {
    const room = this.manager.findPublicRoom();
    this._enter(room, playerName, { avatar });
    this._ack(cb, { ok: true, roomId: room.id, ...this._selfPayload(room) });
  }

  _enter(room, playerName, opts = {}) {
    this.onLeave();
    const player = room.addPlayer(this.socket.id, playerName, opts);
    this.roomId = room.id;
    this.socket.join(room.id);

    this.socket.to(room.id).emit('player_joined', {
      player: player.toJSON(),
      players: room.playersJSON(),
    });

    room.maybeAutoStart();
  }

  _selfPayload(room) {
    return {
      selfId: this.socket.id,
      hostId: room.hostId,
      settings: room.settings,
      players: room.playersJSON(),
      state: room.state,
      game: room.state === 'playing' ? room.game.snapshot(this.socket.id) : null,
      strokes: room.state === 'playing' ? room.strokes : [],
    };
  }

  onUpdateSettings(settings) {
    const room = this._room();
    if (!room || this.socket.id !== room.hostId) return;
    room.updateSettings(settings || {});
    this.io.to(room.id).emit('settings_updated', { settings: room.settings });
  }

  onStartGame() {
    const room = this._room();
    if (!room) return;
    const result = room.startGame(this.socket.id);
    if (!result.ok) this.socket.emit('error_message', { message: result.error });
  }

  onKick({ playerId } = {}) {
    const room = this._room();
    if (!room) return;
    const res = room.kick(this.socket.id, playerId);
    if (!res.ok) return this.socket.emit('error_message', { message: res.error });
    this._removeAndNotify(room, playerId, 'You were kicked by the host.', 'was kicked');
  }

  onVoteKick({ playerId } = {}) {
    const room = this._room();
    if (!room) return;
    const res = room.voteKick(this.socket.id, playerId);
    if (!res.ok) return this.socket.emit('error_message', { message: res.error });
    if (res.passed) {
      this._removeAndNotify(room, playerId, 'You were votekicked.', 'was votekicked out');
    } else {
      this.io.to(room.id).emit('chat_message', {
        system: true,
        text: `Votekick for ${res.targetName}: ${res.votes}/${res.needed} votes`,
      });
    }
  }

  _removeAndNotify(room, playerId, reasonToTarget, verb) {
    const target = room.players.get(playerId);
    if (!target) return;
    const name = target.name;

    room.removePlayer(playerId);
    this.io.to(playerId).emit('kicked', { reason: reasonToTarget });
    const sock = this.io.sockets.sockets.get(playerId);
    if (sock) sock.leave(room.id);

    this.io.to(room.id).emit('player_left', {
      playerId,
      players: room.playersJSON(),
      hostId: room.hostId,
    });
    this.io.to(room.id).emit('chat_message', { system: true, text: `${name} ${verb}.` });

    if (room.state === 'playing' && room.activePlayers().length < 2) {
      room.state = 'lobby';
      room.game.clearTimers();
      room.game.phase = 'lobby';
      this.io.to(room.id).emit('game_aborted', { reason: 'Not enough players' });
    }

    this.manager.cleanupIfEmpty(room.id);
  }

  onRequestReplay() {
    const room = this._room();
    if (!room) return;
    this.socket.emit('replay_data', {
      strokes: room.lastRoundStrokes || [],
      word: room.lastRoundWord || null,
    });
  }

  onReturnToLobby() {
    const room = this._room();
    if (!room || this.socket.id !== room.hostId) return;
    if (room.state !== 'ended') return;
    room.game.clearTimers();
    room.game.phase = 'lobby';
    room.state = 'lobby';
    room.strokes = [];
    this.io.to(room.id).emit('return_to_lobby', {
      settings: room.settings,
      players: room.playersJSON(),
      hostId: room.hostId,
    });
    room.maybeAutoStart();
  }

  onChooseWord({ word } = {}) {
    const room = this._room();
    if (!room) return;
    room.strokes = [];
    room.game.chooseWord(this.socket.id, word);
  }

  onDraw(stroke) {
    const room = this._room();
    if (!room || room.game.drawerId !== this.socket.id) return;
    if (room.game.phase !== 'drawing') return;
    room.strokes.push(stroke);
    this.socket.to(room.id).emit('draw', stroke);
  }

  onCanvasClear() {
    const room = this._room();
    if (!room || room.game.drawerId !== this.socket.id) return;
    room.strokes = [];
    this.io.to(room.id).emit('canvas_clear');
  }

  onUndo({ strokeId } = {}) {
    const room = this._room();
    if (!room || room.game.drawerId !== this.socket.id) return;
    room.strokes = room.strokes.filter((s) => s.strokeId !== strokeId);
    this.io.to(room.id).emit('draw_undo', { strokeId });
  }

  onGuess({ text } = {}) {
    const room = this._room();
    if (!room) return;
    const player = room.players.get(this.socket.id);
    if (!player) return;

    const result = room.game.handleGuess(this.socket.id, text);

    switch (result.type) {
      case 'correct':
        this.io.to(room.id).emit('guess_correct', {
          playerId: player.id,
          playerName: player.name,
          players: room.playersJSON(),
        });
        break;
      case 'close':
        this.socket.emit('chat_message', {
          system: true,
          variant: 'close',
          text: `'${result.text}' is close!`,
        });
        break;
      case 'chat': {
        const msg = {
          playerId: player.id,
          playerName: player.name,
          text: result.text,
          color: player.color,
        };
        if (result.restricted) {
          const recipients = new Set([room.game.drawerId, ...room.game.correctGuessers]);
          recipients.add(this.socket.id);
          for (const id of recipients) {
            this.io.to(id).emit('chat_message', { ...msg, restricted: true });
          }
        } else {
          this.io.to(room.id).emit('chat_message', msg);
        }
        break;
      }
      default:
        break;
    }
  }

  onLeave() {
    const room = this._room();
    if (!room) return;
    room.removePlayer(this.socket.id);
    this.socket.leave(room.id);

    this.io.to(room.id).emit('player_left', {
      playerId: this.socket.id,
      players: room.playersJSON(),
      hostId: room.hostId,
    });

    if (room.state === 'playing' && room.activePlayers().length < 2) {
      room.state = 'lobby';
      room.game.clearTimers();
      room.game.phase = 'lobby';
      this.io.to(room.id).emit('game_aborted', { reason: 'Not enough players' });
    }

    this.manager.cleanupIfEmpty(room.id);
    this.roomId = null;
  }

  _room() {
    return this.roomId ? this.manager.getRoom(this.roomId) : null;
  }

  _ack(cb, payload) {
    if (typeof cb === 'function') cb(payload);
  }
}
