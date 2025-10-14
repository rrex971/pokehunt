export const POKEMON_TYPE_COLORS: Record<string, string> = {
  bug: '7C8D1C',
  dark: '3C2D23',
  dragon: '6955CC',
  electric: 'E79404',
  fairy: 'F3ADF3',
  fighting: '682010',
  fire: 'C92200',
  flying: '5F75D4',
  ghost: '4F50A0',
  grass: '3C9B07',
  ground: 'B59539',
  ice: '70D5F7',
  normal: '7A7771',
  poison: '6F2971',
  psychic: 'DA3468',
  rock: 'A1883E',
  steel: '5E5E74',
  water: '126CC8',
};

// darken a hex color by a factor (0..1). Returns hex string without '#'
export function darkenHex(hex: string, factor = 0.2): string {
  // strip leading # if present
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.floor(r * (1 - factor)));
  g = Math.max(0, Math.floor(g * (1 - factor)));
  b = Math.max(0, Math.floor(b * (1 - factor)));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getTypeColor(type: string) {
  const key = (type || '').toLowerCase();
  return POKEMON_TYPE_COLORS[key] || '7A7771';
}
