import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OpenStatus } from '../lib/hours';
import { palette } from '../theme/theme';

const COLORS: Record<OpenStatus['state'], string> = {
  open: palette.open,
  closed: palette.closed,
  unknown: palette.unknown,
};

/** Tiny colored dot — the row-level open/closed signal. */
export default function OpenDot({ state, size = 8 }: { state: OpenStatus['state']; size?: number }) {
  return (
    <View
      accessibilityLabel={state === 'unknown' ? 'Hours unknown' : state}
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS[state] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
