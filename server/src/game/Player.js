const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🦁', '🐯', '🐨', '🐰', '🐝', '🦉'];

export class Player {
  constructor(id, name, opts = {}) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.roundScore = 0;
    this.isHost = false;
    this.hasGuessed = false;
    this.isDrawing = false;
    this.connected = true;
    this.isSpectator = Boolean(opts.isSpectator);
    this.avatar = AVATARS.includes(opts.avatar) ? opts.avatar : Player.avatarFromId(id);
    this.color = Player.colorFromId(id);
  }

  static colorFromId(id) {
    const palette = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#fd79a8', '#00b894',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  static avatarFromId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 17 + id.charCodeAt(i)) >>> 0;
    return AVATARS[hash % AVATARS.length];
  }

  resetRound() {
    this.hasGuessed = false;
    this.isDrawing = false;
    this.roundScore = 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      roundScore: this.roundScore,
      isHost: this.isHost,
      hasGuessed: this.hasGuessed,
      isDrawing: this.isDrawing,
      connected: this.connected,
      isSpectator: this.isSpectator,
      avatar: this.avatar,
      color: this.color,
    };
  }
}

export const AVATAR_OPTIONS = AVATARS;
