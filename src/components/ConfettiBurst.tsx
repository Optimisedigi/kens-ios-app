import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface ConfettiBurstProps {
  /** Toggle the burst. Flipping false→true replays the animation. */
  play: boolean;
  /** Confetti colors (defaults to the habit palette). */
  colors?: string[];
}

const DEFAULT_COLORS = ['#34D399', '#818CF8', '#FBBF24', '#F472B6', '#38BDF8', '#A3E635'];

const PIECE_COUNT = 28;

interface PieceConfig {
  startX: number; // 0-1 fraction of width
  dx: number; // horizontal drift, px
  delay: number; // ms
  duration: number; // ms
  rotations: number;
  size: number;
  color: string;
}

/**
 * Lightweight one-shot confetti rain rendered with Reanimated. Pieces fall
 * from the top with horizontal drift, rotation, and fade-out. Purely
 * decorative and non-interactive (`pointerEvents none`) so it overlays the
 * milestone modal without blocking taps.
 */
export function ConfettiBurst({ play, colors = DEFAULT_COLORS }: ConfettiBurstProps) {
  const { width, height } = useWindowDimensions();

  // Build a stable randomized config once per mount.
  const pieces = React.useMemo<PieceConfig[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        startX: Math.random(),
        dx: (Math.random() - 0.5) * 160,
        delay: Math.random() * 250,
        duration: 1400 + Math.random() * 900,
        rotations: 1 + Math.random() * 3,
        size: 7 + Math.random() * 6,
        color: colors[i % colors.length] ?? DEFAULT_COLORS[0],
      })),
    [colors],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} config={p} play={play} width={width} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  config,
  play,
  width,
  height,
}: {
  config: PieceConfig;
  play: boolean;
  width: number;
  height: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (play) {
      progress.value = 0;
      progress.value = withDelay(
        config.delay,
        withTiming(1, { duration: config.duration, easing: Easing.out(Easing.quad) }),
      );
    } else {
      progress.value = 0;
    }
  }, [play, progress, config.delay, config.duration]);

  const style = useAnimatedStyle(() => {
    const translateY = progress.value * (height + 40) - 20;
    const translateX = progress.value * config.dx;
    const rotate = progress.value * 360 * config.rotations;
    // Fade out over the last third of the fall.
    const opacity = progress.value < 0.7 ? 1 : 1 - (progress.value - 0.7) / 0.3;
    return {
      transform: [{ translateY }, { translateX }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: config.startX * (width - config.size),
          width: config.size,
          height: config.size * 1.4,
          borderRadius: 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}
