import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../theme/theme';

/** Warm pastel pairs picked deterministically per place id. */
const TONES: { bg: string; fg: string }[] = [
  { bg: '#FDEBDB', fg: '#D95F1A' },
  { bg: '#FBE3CE', fg: '#C25415' },
  { bg: '#F7E8D4', fg: '#A8621F' },
  { bg: '#FCE7DF', fg: '#C64F2A' },
  { bg: '#F5EBDC', fg: '#8F6B2E' },
  { bg: '#FDE6E0', fg: '#B9503C' },
];

interface Props {
  name: string;
  seed: number;
  height?: number;
}

/** Image-less thumbnail: the place's initial on a warm tone. */
export default function GradientThumb({ name, seed, height = 88 }: Props) {
  const tone = TONES[Math.abs(seed) % TONES.length];
  const letter = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <View style={[styles.thumb, { backgroundColor: tone.bg, height }]}>
      <Text style={[styles.letter, { color: tone.fg }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 34,
    fontFamily: fonts.semibold,
  },
});
