// Word banks by language → category. Add more languages by adding a key here.
export const WORDS = {
  en: {
    animals: [
      'dog', 'cat', 'elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo',
      'octopus', 'butterfly', 'crocodile', 'squirrel', 'hedgehog', 'flamingo',
      'rhinoceros', 'jellyfish', 'chameleon', 'peacock', 'walrus', 'panda', 'koala',
    ],
    food: [
      'pizza', 'hamburger', 'sushi', 'pancake', 'popcorn', 'spaghetti', 'donut',
      'watermelon', 'pineapple', 'sandwich', 'cupcake', 'strawberry', 'broccoli',
      'ice cream', 'hotdog', 'avocado', 'pretzel', 'cheese', 'waffle', 'lollipop',
    ],
    objects: [
      'umbrella', 'telescope', 'guitar', 'backpack', 'scissors', 'lighthouse',
      'hourglass', 'anchor', 'compass', 'ladder', 'toaster', 'camera', 'trophy',
      'battery', 'magnet', 'key', 'wallet', 'candle', 'mirror', 'clock',
    ],
    nature: [
      'mountain', 'volcano', 'rainbow', 'waterfall', 'tornado', 'cactus',
      'mushroom', 'snowflake', 'island', 'forest', 'lightning', 'sunflower',
      'iceberg', 'desert', 'river', 'cloud', 'moon', 'star', 'tree', 'flower',
    ],
    activities: [
      'swimming', 'dancing', 'fishing', 'painting', 'climbing', 'sleeping',
      'running', 'cooking', 'singing', 'skateboarding', 'juggling', 'surfing',
      'skiing', 'reading', 'camping', 'boxing', 'bowling', 'gardening', 'diving', 'jumping',
    ],
    vehicles: [
      'airplane', 'submarine', 'helicopter', 'bicycle', 'rocket', 'tractor',
      'motorcycle', 'sailboat', 'ambulance', 'skateboard', 'train', 'bus',
      'scooter', 'canoe', 'tank', 'truck', 'car', 'ship', 'jet', 'wagon',
    ],
  },

  es: {
    animals: [
      'perro', 'gato', 'elefante', 'jirafa', 'pingüino', 'delfín', 'canguro',
      'pulpo', 'mariposa', 'cocodrilo', 'ardilla', 'flamenco', 'panda', 'koala',
    ],
    food: [
      'pizza', 'hamburguesa', 'sushi', 'panqueque', 'palomitas', 'espagueti',
      'sandía', 'piña', 'bocadillo', 'fresa', 'brócoli', 'helado', 'queso', 'aguacate',
    ],
    objects: [
      'paraguas', 'telescopio', 'guitarra', 'mochila', 'tijeras', 'faro',
      'brújula', 'escalera', 'cámara', 'trofeo', 'imán', 'llave', 'espejo', 'reloj',
    ],
    nature: [
      'montaña', 'volcán', 'arcoíris', 'cascada', 'tornado', 'cactus',
      'seta', 'isla', 'bosque', 'relámpago', 'girasol', 'desierto', 'río', 'luna',
    ],
    activities: [
      'nadar', 'bailar', 'pescar', 'pintar', 'escalar', 'dormir',
      'correr', 'cocinar', 'cantar', 'leer', 'acampar', 'boxear', 'saltar', 'bucear',
    ],
    vehicles: [
      'avión', 'submarino', 'helicóptero', 'bicicleta', 'cohete', 'tractor',
      'motocicleta', 'velero', 'ambulancia', 'tren', 'autobús', 'camión', 'coche', 'barco',
    ],
  },

  de: {
    animals: [
      'Hund', 'Katze', 'Elefant', 'Giraffe', 'Pinguin', 'Delfin', 'Känguru',
      'Krake', 'Schmetterling', 'Krokodil', 'Eichhörnchen', 'Igel', 'Panda', 'Koala',
    ],
    food: [
      'Pizza', 'Hamburger', 'Sushi', 'Pfannkuchen', 'Popcorn', 'Spaghetti',
      'Wassermelone', 'Ananas', 'Erdbeere', 'Brokkoli', 'Eis', 'Käse', 'Waffel', 'Brezel',
    ],
    objects: [
      'Regenschirm', 'Teleskop', 'Gitarre', 'Rucksack', 'Schere', 'Leuchtturm',
      'Kompass', 'Leiter', 'Kamera', 'Pokal', 'Magnet', 'Schlüssel', 'Spiegel', 'Uhr',
    ],
    nature: [
      'Berg', 'Vulkan', 'Regenbogen', 'Wasserfall', 'Tornado', 'Kaktus',
      'Pilz', 'Insel', 'Wald', 'Blitz', 'Sonnenblume', 'Wüste', 'Fluss', 'Mond',
    ],
    activities: [
      'Schwimmen', 'Tanzen', 'Angeln', 'Malen', 'Klettern', 'Schlafen',
      'Laufen', 'Kochen', 'Singen', 'Lesen', 'Camping', 'Boxen', 'Springen', 'Tauchen',
    ],
    vehicles: [
      'Flugzeug', 'U-Boot', 'Hubschrauber', 'Fahrrad', 'Rakete', 'Traktor',
      'Motorrad', 'Segelboot', 'Krankenwagen', 'Zug', 'Bus', 'Lastwagen', 'Auto', 'Schiff',
    ],
  },
};

export const LANGUAGES = Object.keys(WORDS);
export const CATEGORIES = Object.keys(WORDS.en);

export function getLanguageBank(language) {
  return WORDS[language] || WORDS.en;
}

// Build a flat pool of words honoring language, category filter, and custom words.
function buildPool(opts = {}) {
  const {
    language = 'en',
    categories = null,      // null / [] => all categories
    customWords = [],
    useCustomOnly = false,
  } = opts;

  const clean = (arr) => arr.map((w) => String(w).trim()).filter(Boolean);

  if (useCustomOnly && customWords.length) {
    return [...new Set(clean(customWords))];
  }

  const bank = getLanguageBank(language);
  const cats = Array.isArray(categories) && categories.length
    ? categories.filter((c) => bank[c])
    : Object.keys(bank);

  const pool = [];
  for (const c of cats) pool.push(...bank[c]);
  pool.push(...clean(customWords)); // custom words are added on top of the bank
  return [...new Set(pool)];
}

function sample(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

// Returns `count` word options for the drawer to choose from.
// mode 'combination' joins two words into one prompt (e.g. "moon guitar").
export function pickWords(count, opts = {}) {
  const { exclude = new Set(), mode = 'normal' } = opts;
  let pool = buildPool(opts).filter((w) => !exclude.has(w));
  if (pool.length === 0) pool = buildPool({ ...opts, useCustomOnly: false, categories: null });

  if (mode === 'combination') {
    const options = [];
    let guard = 0;
    while (options.length < count && guard++ < count * 20) {
      const pair = sample(pool, 2);
      if (pair.length < 2) break;
      const combo = pair.join(' ');
      if (!options.includes(combo) && !exclude.has(combo)) options.push(combo);
    }
    if (options.length) return options;
  }

  return sample(pool, Math.min(count, pool.length));
}

// Backwards-compatible helper (English, all categories).
export function getRandomWords(count, exclude = new Set()) {
  return pickWords(count, { exclude, language: 'en' });
}

export const ALL_WORDS = Object.values(WORDS.en).flat();
