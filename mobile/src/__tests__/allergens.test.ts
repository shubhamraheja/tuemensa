import { filterMenu, itemPassesProfile, prettifyToken } from '../lib/allergens';
import { MenuItem } from '../types';

const NO_PROFILE = { diet: 'none' as const, excludedAllergens: [] };

// One fixture per scraper vocabulary.
const openMensaVegan: MenuItem = {
  name: 'Koshari Reisgericht',
  category: 'Tagesmenü vegan',
  allergens: ['Weizen', 'Sellerie', 'Senf'],
};
const openMensaPork: MenuItem = {
  name: 'Samgyeopsal-Schweinebauch',
  category: 'Tagesmenü',
  allergens: ['Schwein', 'Soja', 'Weizen', 'Milch/Laktose'],
};
const elkBowl: MenuItem = {
  name: 'High Protein Bowl',
  category: 'SALATBOWL',
  allergens: ['AW', 'B', 'F', 'I'],
};
const elkShrimp: MenuItem = {
  name: 'Spanische Bowl mit Garnelen',
  category: 'SALATBOWL',
  allergens: ['C'],
};
const mphVegan: MenuItem = {
  name: 'Vegan curry',
  category: 'Main Course vegan / veggie',
  allergens: ['f', 'i', 'a1'],
};
const mphMeat: MenuItem = {
  name: 'Grilled sausage',
  category: 'Main Course Meat / Fish',
  allergens: ['i'],
};
const noData: MenuItem = { name: 'Mystery dish', allergens: [] };

describe('allergen exclusion across vocabularies', () => {
  it('matches German words (OpenMensa)', () => {
    const profile = { diet: 'none' as const, excludedAllergens: ['gluten' as const] };
    expect(itemPassesProfile(openMensaVegan, profile)).toBe(false); // Weizen
    expect(itemPassesProfile(elkShrimp, profile)).toBe(true);
  });

  it('matches Elk uppercase codes', () => {
    const milkFree = { diet: 'none' as const, excludedAllergens: ['milk' as const] };
    expect(itemPassesProfile(elkBowl, milkFree)).toBe(false); // B
    const crustFree = { diet: 'none' as const, excludedAllergens: ['crustaceans' as const] };
    expect(itemPassesProfile(elkShrimp, crustFree)).toBe(false); // C
  });

  it('matches MPH lowercase codes', () => {
    const soyFree = { diet: 'none' as const, excludedAllergens: ['soy' as const] };
    expect(itemPassesProfile(mphVegan, soyFree)).toBe(false); // f
    const glutenFree = { diet: 'none' as const, excludedAllergens: ['gluten' as const] };
    expect(itemPassesProfile(mphVegan, glutenFree)).toBe(false); // a1
  });

  it('distinguishes Elk E (molluscs) from peanuts', () => {
    const withE: MenuItem = { name: 'Muscheln', allergens: ['E'] };
    expect(
      itemPassesProfile(withE, { diet: 'none', excludedAllergens: ['peanuts'] }),
    ).toBe(true);
    expect(
      itemPassesProfile(withE, { diet: 'none', excludedAllergens: ['molluscs'] }),
    ).toBe(false);
  });

  it('lets items without data pass', () => {
    expect(
      itemPassesProfile(noData, { diet: 'vegan', excludedAllergens: ['gluten', 'milk'] }),
    ).toBe(true);
  });
});

describe('diet evidence from dish names (Hungry Elk has no category/notes signal)', () => {
  const VEGGIE = { diet: 'vegetarian' as const, excludedAllergens: [] };
  const VEGAN = { diet: 'vegan' as const, excludedAllergens: [] };
  const dish = (name: string, allergens: string[] = []): MenuItem => ({
    name,
    category: 'STREET FOOD',
    allergens,
  });

  it('meaty names fail vegetarian even without meat allergen codes', () => {
    expect(itemPassesProfile(dish('Pulled Chicken Burger', ['AW', 'B', 'F']), VEGGIE)).toBe(false);
    expect(itemPassesProfile(dish('Jägerschnitzel vom Schweinerücken'), VEGGIE)).toBe(false);
    expect(itemPassesProfile(dish('Tagliata di Manzo'), VEGGIE)).toBe(false);
    expect(itemPassesProfile(dish('Ofenfrischer Leberkäse'), VEGGIE)).toBe(false);
    expect(itemPassesProfile(dish('Fischstäbchen-Wrap'), VEGGIE)).toBe(false);
    expect(itemPassesProfile(dish('Juicy turkey gyros with tzatziki'), VEGGIE)).toBe(false);
  });

  it('vegan/vegetarian labels in the name win over meat words', () => {
    expect(itemPassesProfile(dish('Vegetarischer Döner'), VEGGIE)).toBe(true);
    expect(itemPassesProfile(dish('Vegane Paella'), VEGAN)).toBe(true);
    expect(itemPassesProfile(dish('Veganes Bananensplit'), VEGAN)).toBe(true);
    // vegetarian label is not a vegan claim — meat word still disqualifies vegan
    expect(itemPassesProfile(dish('Vegetarischer Döner'), VEGAN)).toBe(false);
  });

  it('does not false-positive on harmless names', () => {
    expect(itemPassesProfile(dish('Chili sin carne mit Kidneybohnen'), VEGGIE)).toBe(true);
    expect(itemPassesProfile(dish('Polenta mit Parmesan'), VEGGIE)).toBe(true);
    expect(itemPassesProfile(dish('Paneer Butter Marsala'), VEGGIE)).toBe(true);
  });

  it('allergen data always beats labels (MPH "vegan / veggie" shared category)', () => {
    const cheeseHashbrowns: MenuItem = {
      name: 'Hashbrowns gratinated with mountain cheese',
      category: 'Main Course vegan / veggie',
      allergens: ['g'], // milk
    };
    expect(itemPassesProfile(cheeseHashbrowns, VEGAN)).toBe(false);
    expect(itemPassesProfile(cheeseHashbrowns, VEGGIE)).toBe(true);

    const scrambledEggs: MenuItem = {
      name: 'Scrambled eggs with creamed spinach',
      category: 'Main Course vegan / veggie',
      allergens: ['g', 'c', 'i'],
    };
    expect(itemPassesProfile(scrambledEggs, VEGAN)).toBe(false);
    expect(itemPassesProfile(scrambledEggs, VEGGIE)).toBe(true);
  });

  it('labels still beat soft name evidence (plant-based classics)', () => {
    expect(itemPassesProfile(dish('Vegane Currywurst mit Pommes'), VEGAN)).toBe(true);
    expect(itemPassesProfile(dish('Veganes Schnitzel'), VEGAN)).toBe(true);
  });
});

describe('diet logic', () => {
  it('vegan category label wins', () => {
    expect(itemPassesProfile(openMensaVegan, { diet: 'vegan', excludedAllergens: [] })).toBe(true);
    expect(itemPassesProfile(mphVegan, { diet: 'vegan', excludedAllergens: [] })).toBe(true);
  });

  it('meat markers fail vegetarian', () => {
    expect(
      itemPassesProfile(openMensaPork, { diet: 'vegetarian', excludedAllergens: [] }),
    ).toBe(false);
    expect(itemPassesProfile(mphMeat, { diet: 'vegetarian', excludedAllergens: [] })).toBe(false);
  });

  it('milk/egg evidence fails vegan but not vegetarian', () => {
    expect(itemPassesProfile(elkBowl, { diet: 'vegetarian', excludedAllergens: [] })).toBe(true);
    expect(itemPassesProfile(elkBowl, { diet: 'vegan', excludedAllergens: [] })).toBe(false);
  });

  it('crustaceans fail vegetarian', () => {
    expect(itemPassesProfile(elkShrimp, { diet: 'vegetarian', excludedAllergens: [] })).toBe(
      false,
    );
  });
});

describe('filterMenu', () => {
  it('short-circuits with an empty profile', () => {
    const items = [openMensaVegan, openMensaPork];
    expect(filterMenu(items, NO_PROFILE)).toEqual({ visible: items, hidden: 0 });
  });

  it('reports hidden count', () => {
    const { visible, hidden } = filterMenu([openMensaVegan, openMensaPork, noData], {
      diet: 'vegetarian',
      excludedAllergens: [],
    });
    expect(visible).toHaveLength(2);
    expect(hidden).toBe(1);
  });
});

describe('prettifyToken', () => {
  it('maps codes and words to labels', () => {
    expect(prettifyToken('AW')).toBe('Gluten');
    expect(prettifyToken('a1')).toBe('Gluten');
    expect(prettifyToken('Milch/Laktose')).toBe('Milk / lactose');
    expect(prettifyToken('Farbstoff')).toBe('Farbstoff'); // unmapped additive stays raw
  });
});
