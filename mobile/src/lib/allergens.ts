import { MenuItem } from '../types';

/**
 * Allergen + diet filtering across the three menu-data vocabularies:
 *
 *  - OpenMensa (uni mensas): German free-text notes, e.g. "Weizen",
 *    "Milch/Laktose", plus meat markers like "Schwein".
 *  - Hungry Elk (PDF): UPPERCASE letter codes per its printed legend,
 *    e.g. AW gluten-wheat, B milk, F eggs, E molluscs, M sulphites.
 *  - Max-Planck-Haus (HTML): lowercase letter(+digit) codes per its legend,
 *    e.g. a1 wheat, g milk, c eggs, n molluscs, l sulphites.
 *
 * Tokens are classified by shape; dishes with NO data always pass ("apply
 * only where the information exists").
 */

export type Diet = 'none' | 'vegetarian' | 'vegan';

export type AllergenKey =
  | 'gluten'
  | 'milk'
  | 'eggs'
  | 'soy'
  | 'celery'
  | 'mustard'
  | 'fish'
  | 'crustaceans'
  | 'nuts'
  | 'peanuts'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export interface DietProfile {
  diet: Diet;
  excludedAllergens: AllergenKey[];
}

interface Matcher {
  label: string;
  /** case-insensitive substrings matched against German free-text tokens */
  words: string[];
  /** Hungry Elk UPPERCASE code, per its legend */
  elk: RegExp | null;
  /** Max-Planck-Haus lowercase code, per its legend */
  mph: RegExp | null;
}

export const ALLERGENS: Record<AllergenKey, Matcher> = {
  gluten: {
    label: 'Gluten',
    words: ['gluten', 'weizen', 'roggen', 'gerste', 'hafer', 'dinkel'],
    elk: /^A[A-Z]?$/,
    mph: /^a\d?$/,
  },
  milk: { label: 'Milk / lactose', words: ['milch', 'laktose'], elk: /^B$/, mph: /^g$/ },
  eggs: { label: 'Eggs', words: ['eier'], elk: /^F$/, mph: /^c$/ },
  soy: { label: 'Soy', words: ['soja'], elk: /^I$/, mph: /^f$/ },
  celery: { label: 'Celery', words: ['sellerie'], elk: /^J$/, mph: /^i$/ },
  mustard: { label: 'Mustard', words: ['senf'], elk: /^G$/, mph: /^j$/ },
  fish: { label: 'Fish', words: ['fisch'], elk: /^D$/, mph: /^d$/ },
  crustaceans: {
    label: 'Crustaceans',
    words: ['krebstiere', 'krustentiere'],
    elk: /^C$/,
    mph: /^b$/,
  },
  nuts: {
    label: 'Tree nuts',
    words: [
      'schalenfrüchte',
      'mandel',
      'walnuss',
      'walnüsse',
      'haselnuss',
      'haselnüsse',
      'cashew',
      'pistazie',
      'pekannuss',
      'paranuss',
      'macadamia',
    ],
    elk: /^K[A-Z]{0,2}$/,
    mph: /^h\d?$/,
  },
  peanuts: { label: 'Peanuts', words: ['erdnuss', 'erdnüsse'], elk: /^L$/, mph: /^e$/ },
  sesame: { label: 'Sesame', words: ['sesam'], elk: /^H$/, mph: /^k$/ },
  sulphites: {
    label: 'Sulphites',
    words: ['schwefeldioxid', 'sulfit'],
    elk: /^M$/,
    mph: /^l$/,
  },
  lupin: { label: 'Lupin', words: ['lupine'], elk: /^N$/, mph: /^m$/ },
  molluscs: { label: 'Molluscs', words: ['weichtiere'], elk: /^E$/, mph: /^n$/ },
};

export const ALLERGEN_KEYS = Object.keys(ALLERGENS) as AllergenKey[];

/**
 * Meat/fish evidence in dish names, categories, and OpenMensa notes
 * (German + English + common menu Italian). Label checks ("vegan",
 * "vegetarisch") run first and win, so e.g. "Vegetarischer Döner" is safe.
 */
const MEAT_WORDS =
  /schwein|pork|rind|beef|manzo|kalb|veal|lamm|lamb|\bwild\b|hirsch|\breh\b|geflügel|gefluegel|hähnchen|haehnchen|hühn|huhn|hendl|pollo|chicken|pute|truthahn|turkey|\bente|entenbrust|\bgans|gänse|gaense|duck|speck|bacon|schinken|\bham\b|prosciutto|\bparma\b|salami|wurst|sausage|chorizo|nduja|gyros|kebab|döner|doener|leberkäse|leberkaese|hackfleisch|\bhack\b|bolognese|fleisch|\bmeat\b|fisch|\bfish\b|lachs|salmon|thunfisch|tuna|garnele|prawn|shrimp|krabben|muschel|meeresfrücht|anchovi|sardelle|pollock|seelachs/;

const MPH_TOKEN = /^[a-z]\d?$/;
const ELK_TOKEN = /^[A-Z][A-Z]{0,2}\d?$/;

function tokenMatches(key: AllergenKey, token: string): boolean {
  const matcher = ALLERGENS[key];
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (MPH_TOKEN.test(trimmed)) return matcher.mph?.test(trimmed) ?? false;
  if (ELK_TOKEN.test(trimmed)) return matcher.elk?.test(trimmed) ?? false;
  const lower = trimmed.toLowerCase();
  return matcher.words.some(word => lower.includes(word));
}

/** Tokens from allergens[], plus (defensively) code groups still embedded in the name. */
export function collectTokens(item: MenuItem): string[] {
  const tokens = [...(item.allergens ?? [])];
  const embedded = item.name.match(/\(([^)]{1,40})\)/g) ?? [];
  for (const group of embedded) {
    for (const raw of group.slice(1, -1).split(/[,/]/)) {
      const token = raw.trim();
      if (MPH_TOKEN.test(token) || ELK_TOKEN.test(token)) tokens.push(token);
    }
  }
  return tokens;
}

function anyTokenMatches(keys: AllergenKey[], tokens: string[]): boolean {
  return keys.some(key => tokens.some(token => tokenMatches(key, token)));
}

/**
 * Diet + allergen check. Data-absent items pass; category labels are trusted
 * ("vegan" in the category wins over allergen-token evidence for the diet).
 */
export function itemPassesProfile(item: MenuItem, profile: DietProfile): boolean {
  const tokens = collectTokens(item);
  // Name + category carry the diet signal (crucial for Hungry Elk, whose
  // categories are food styles and whose only labels live in dish names).
  const label = `${item.name} ${item.category ?? ''}`.toLowerCase();
  const veganByLabel = label.includes('vegan');
  const veggieByLabel =
    veganByLabel ||
    label.includes('veggie') ||
    label.includes('vegetarisch') ||
    label.includes('vegetarian');

  if (profile.diet !== 'none') {
    // HARD evidence = allergen data. It always wins — a dish listing the milk
    // allergen is never vegan, even under a "vegan / veggie" combined label
    // (Max-Planck-Haus shares one category for both).
    const hardAnimalFlesh = anyTokenMatches(['fish', 'crustaceans', 'molluscs'], tokens);
    const hardAnimalProduct = hardAnimalFlesh || anyTokenMatches(['milk', 'eggs'], tokens);
    // SOFT evidence = meat words in names/notes. Labels beat this one
    // ("Vegane Currywurst" is vegan despite "wurst").
    const softMeatEvidence =
      MEAT_WORDS.test(label) ||
      tokens.some(token => {
        const lower = token.toLowerCase();
        return !MPH_TOKEN.test(token) && !ELK_TOKEN.test(token) && MEAT_WORDS.test(lower);
      });

    if (profile.diet === 'vegetarian') {
      if (hardAnimalFlesh) return false;
      if (!veggieByLabel && softMeatEvidence) return false;
    } else {
      if (hardAnimalProduct) return false;
      if (!veganByLabel && softMeatEvidence) return false;
    }
  }

  if (profile.excludedAllergens.length > 0) {
    if (anyTokenMatches(profile.excludedAllergens, tokens)) return false;
  }
  return true;
}

/** Split a menu into items that pass the profile and the count that didn't. */
export function filterMenu(
  items: MenuItem[],
  profile: DietProfile,
): { visible: MenuItem[]; hidden: number } {
  if (profile.diet === 'none' && profile.excludedAllergens.length === 0) {
    return { visible: items, hidden: 0 };
  }
  const visible = items.filter(item => itemPassesProfile(item, profile));
  return { visible, hidden: items.length - visible.length };
}

/** Human-readable chip text for a raw allergen token. */
export function prettifyToken(token: string): string {
  for (const key of ALLERGEN_KEYS) {
    if (tokenMatches(key, token)) return ALLERGENS[key].label;
  }
  return token;
}
