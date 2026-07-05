export class RoomController {
  constructor(manager) {
    this.manager = manager;
    this.health = this.health.bind(this);
    this.getRoom = this.getRoom.bind(this);
    this.listPublicRooms = this.listPublicRooms.bind(this);
  }

  health(_req, res) {
    res.json({ ok: true, rooms: this.manager.rooms.size });
  }

  getRoom(req, res) {
    const room = this.manager.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room.publicInfo());
  }

  listPublicRooms(_req, res) {
    res.json({ rooms: this.manager.listPublicRooms() });
  }
}
