import { Room } from './Room.js';

export class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  createRoom(settings) {
    const id = this._generateCode();
    const room = new Room(id, this.io, settings);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id) {
    return this.rooms.get((id || '').toUpperCase());
  }

  removeRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      room.game.clearTimers();
      room.cancelAutoStart();
    }
    this.rooms.delete(id);
  }

  cleanupIfEmpty(id) {
    const room = this.rooms.get(id);
    if (room && room.isEmpty()) this.removeRoom(id);
  }

  findPublicRoom() {
    // Like skribbl.io: drop the player straight into a live public game if there is
    // one with room to spare. Only fall back to a waiting lobby (or a fresh room) when
    // no game is in progress, so players never sit idle when there's action to join.
    let lobby = null;
    for (const room of this.rooms.values()) {
      if (!room.settings.isPublic || room.isFull()) continue;
      if (room.state === 'playing') return room;
      if (room.state === 'lobby' && !lobby) lobby = room;
    }
    return lobby || this.createRoom({ isPublic: true });
  }

  listPublicRooms() {
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && !r.isEmpty())
      .map((r) => r.publicInfo());
  }

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }
}
