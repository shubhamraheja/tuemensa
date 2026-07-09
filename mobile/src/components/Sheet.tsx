import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { palette, radii, spacing } from '../theme/theme';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Fraction of the screen height the sheet may occupy. */
  maxHeightFraction?: number;
}

const DRAG_DISMISS_DISTANCE = 110;
const DRAG_DISMISS_VELOCITY = 0.9;

/**
 * Minimal controlled bottom sheet: backdrop fade + slide-up, and a draggable
 * handle zone (pull down to dismiss). Interface-compatible with a fancier
 * implementation if we swap one in later.
 */
export default function Sheet({ open, onClose, children, maxHeightFraction = 0.85 }: SheetProps) {
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  // Kept in state (not refs) so render-time reads satisfy react-hooks/refs.
  const [progress] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));

  // Render-phase adjustment (not an effect) so the sheet mounts before animating in.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      dragY.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, progress, dragY]);

  // Pull-down on the handle zone: follow the finger, dismiss past the threshold.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) dragY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > DRAG_DISMISS_DISTANCE || gesture.vy > DRAG_DISMISS_VELOCITY) {
            onClose();
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [dragY, onClose],
  );

  if (!mounted) return null;

  const slideY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.host} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * maxHeightFraction,
              transform: [{ translateY: Animated.add(slideY, dragY) }],
            },
          ]}
        >
          <View
            style={styles.dragZone}
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="Drag down to close"
          >
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
  },
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  dragZone: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.border,
  },
});
