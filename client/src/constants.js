// Kept in sync with the server (Player.js AVATARS, words.js LANGUAGES/CATEGORIES,
// Room.js WORD_MODES).
export const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🦁', '🐯', '🐨', '🐰', '🐝', '🦉'];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

export const CATEGORIES = ['animals', 'food', 'objects', 'nature', 'activities', 'vehicles'];

export const WORD_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'hidden', label: 'Hidden (no blanks)' },
  { value: 'combination', label: 'Combination (2 words)' },
];
