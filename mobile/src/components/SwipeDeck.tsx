import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts, palette, radii, spacing } from '../theme/theme';

export type SwipeDirection = 'like' | 'skip';

interface SwipeDeckProps<Card> {
  cards: Card[];
  /** Index of the card currently on top (controlled by the parent). */
  index: number;
  renderCard: (card: Card) => React.ReactNode;
  onSwipe: (card: Card, direction: SwipeDirection) => void;
}

const SWIPE_THRESHOLD_FRACTION = 0.35;
const FLING_VELOCITY = 800;

/** Custom Tinder-style deck — top-3 stack, rotation, LIKE/SKIP tint, haptics. */
export default function SwipeDeck<Card>({
  cards,
  index,
  renderCard,
  onSwipe,
}: SwipeDeckProps<Card>) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Guards against duplicated gesture events (double onEnd / repeated animation
  // callbacks): `animatingOut` blocks re-entry while a card flies off, and
  // `committed` ensures each card is handed to onSwipe exactly once. It re-arms
  // when the next touch begins (a new gesture means a new top card).
  const animatingOut = useSharedValue(false);
  const committed = useSharedValue(false);
  // Bumps whenever a card leaves so shared values reset in one frame with the re-render.
  const [, setGeneration] = useState(0);

  const commit = (direction: SwipeDirection) => {
    if (committed.value) return; // duplicate fire — ignore
    committed.value = true;
    const card = cards[index];
    if (card !== undefined) {
      void Haptics.selectionAsync();
      onSwipe(card, direction);
    }
    translateX.value = 0;
    translateY.value = 0;
    animatingOut.value = false;
    setGeneration(generation => generation + 1);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      if (!animatingOut.value) committed.value = false;
    })
    .onUpdate(event => {
      if (animatingOut.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.4;
    })
    .onEnd(event => {
      if (animatingOut.value) return;
      const past =
        Math.abs(event.translationX) > width * SWIPE_THRESHOLD_FRACTION ||
        Math.abs(event.velocityX) > FLING_VELOCITY;
      if (past) {
        animatingOut.value = true;
        const direction: SwipeDirection = event.translationX > 0 ? 'like' : 'skip';
        translateX.value = withTiming(
          Math.sign(event.translationX || event.velocityX) * width * 1.4,
          { duration: 180 },
          () => runOnJS(commit)(direction),
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-width, width], [-12, 12])}deg` },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, width * 0.25], [0, 1], 'clamp'),
  }));
  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width * 0.25, 0], [1, 0], 'clamp'),
  }));

  const stack = cards.slice(index, index + 3);

  return (
    <View style={styles.host}>
      {stack
        .map((card, stackIndex) => {
          const isTop = stackIndex === 0;
          const depth = stackIndex; // 0 = top
          const content = (
            <View style={styles.cardFill}>{renderCard(card)}</View>
          );
          if (!isTop) {
            return (
              <View
                key={index + stackIndex}
                style={[
                  styles.cardHolder,
                  {
                    transform: [
                      { scale: 1 - depth * 0.045 },
                      { translateY: depth * 14 },
                    ],
                    zIndex: -depth,
                  },
                ]}
                pointerEvents="none"
              >
                {content}
              </View>
            );
          }
          return (
            <GestureDetector key={index + stackIndex} gesture={pan}>
              <Animated.View style={[styles.cardHolder, styles.top, topStyle]}>
                {content}
                <Animated.View style={[styles.badge, styles.like, likeStyle]}>
                  <Text style={styles.badgeText}>YUM</Text>
                </Animated.View>
                <Animated.View style={[styles.badge, styles.skip, skipStyle]}>
                  <Text style={styles.badgeText}>NAH</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          );
        })
        .reverse()}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  cardHolder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardFill: {
    flex: 1,
  },
  top: {
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 3,
  },
  like: {
    left: spacing.xl,
    borderColor: palette.like,
    transform: [{ rotate: '-12deg' }],
  },
  skip: {
    right: spacing.xl,
    borderColor: palette.skip,
    transform: [{ rotate: '12deg' }],
  },
  badgeText: {
    fontSize: 22,
    fontFamily: fonts.semibold,
    color: palette.ink,
  },
});
