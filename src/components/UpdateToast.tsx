import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useAutoUpdate } from '../hooks/useAutoUpdate';

/**
 * Subtle top-of-screen toast that appears once a new EAS Update has been
 * downloaded. Slides in, sits for 1.8s, slides out, then reloads the JS
 * bundle in place — no force-quit needed.
 */
export function UpdateToast() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'absolute',
          left: 16,
          right: 16,
          zIndex: 9999,
        },
        toast: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        iconCircle: {
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: colors.completed,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconText: {
          color: colors.background,
          fontSize: 14,
          fontWeight: '700',
        },
        textCol: {
          flex: 1,
        },
        title: {
          color: colors.textPrimary,
          fontWeight: '600',
          fontSize: 13,
        },
        subtitle: {
          color: colors.textMuted,
          fontSize: 11,
          marginTop: 1,
        },
      }),
    [colors],
  );

  const { updateReady, applyUpdate } = useAutoUpdate();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!updateReady) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        applyUpdate();
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [updateReady, opacity, translateY, applyUpdate]);

  if (!updateReady) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          top: insets.top + (Platform.OS === 'ios' ? 6 : 12),
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toast}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>App updated</Text>
          <Text style={styles.subtitle}>Refreshing to the latest version…</Text>
        </View>
      </View>
    </Animated.View>
  );
}
