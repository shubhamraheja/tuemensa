import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AllergenKey, Diet, DietProfile } from '../lib/allergens';

interface ProfileState extends DietProfile {
  setDiet: (diet: Diet) => void;
  toggleAllergen: (key: AllergenKey) => void;
}

/** Dietary profile — set once, persisted, applied wherever menu data exists. */
export const useProfileStore = create<ProfileState>()(
  persist(
    set => ({
      diet: 'none',
      excludedAllergens: [],
      setDiet: diet => set({ diet }),
      toggleAllergen: key =>
        set(state => ({
          excludedAllergens: state.excludedAllergens.includes(key)
            ? state.excludedAllergens.filter(k => k !== key)
            : [...state.excludedAllergens, key],
        })),
    }),
    {
      name: 'tuemensa-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ diet: state.diet, excludedAllergens: state.excludedAllergens }),
    },
  ),
);
