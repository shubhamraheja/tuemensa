import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveApiUrl } from '../lib/api';
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
  photoUrl?: string | null;
}

/** Thumbnail that prefers a restaurant photo and falls back to the initial letter. */
export default function GradientThumb({ name, seed, height = 88, photoUrl }: Props) {
  const resolvedPhotoUrl = resolveApiUrl(photoUrl);
  const [showPhoto, setShowPhoto] = useState(Boolean(resolvedPhotoUrl));

  useEffect(() => {
    setShowPhoto(Boolean(resolvedPhotoUrl));
  }, [resolvedPhotoUrl]);

  if (resolvedPhotoUrl && showPhoto) {
    return (
      <Image
        source={{ uri: resolvedPhotoUrl }}
        style={[styles.thumb, styles.photo, { height }]}
        resizeMode="cover"
        onError={() => setShowPhoto(false)}
      />
    );
  }

  const tone = TONES[Math.abs(seed) % TONES.length];
  const letter = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <View style={[styles.thumb, { backgroundColor: tone.bg, height }]}> 
      <View style={styles.overlay} />
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
  photo: {
    width: '100%',
    backgroundColor: '#F4EEE5',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  letter: {
    fontSize: 34,
    fontFamily: fonts.semibold,
    zIndex: 1,
  },
});