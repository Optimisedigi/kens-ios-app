import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useNewBuildCheck } from '../hooks/useNewBuildCheck';

/**
 * Top-of-screen banner that appears when a newer TestFlight build is
 * available (driven by `useNewBuildCheck`). Tapping the body opens
 * TestFlight; tapping × dismisses for this version. When the manifest
 * marks the upgrade as mandatory, the dismiss button hides so the user
 * has no way around the prompt without upgrading.
 *
 * Distinct from `UpdateToast`: that one announces a JS-bundle OTA update
 * and auto-reloads. This one points the user out to TestFlight for a
 * native upgrade and does nothing on its own.
 */
export function NewBuildBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateAvailable, forceUpdate, latestVersion, openTestFlight, dismiss } =
    useNewBuildCheck();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'absolute',
          left: 12,
          right: 12,
          zIndex: 9998, // sits just under UpdateToast's 9999
        },
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.accent,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: 8,
        },
        iconCircle: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconText: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '700',
        },
        body: {
          flex: 1,
        },
        title: {
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
        },
        subtitle: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 1,
        },
        cta: {
          color: colors.accent,
          fontSize: 13,
          fontWeight: '700',
          marginTop: 4,
        },
        closeButton: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.inputBackground,
        },
        closeText: {
          color: colors.textMuted,
          fontSize: 18,
          lineHeight: 18,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    if (!updateAvailable) return;
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
  }, [updateAvailable, opacity, translateY]);

  if (!updateAvailable) return null;

  const handleOpen = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    openTestFlight();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismiss();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top + 6,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>↑</Text>
        </View>
        <Pressable
          onPress={handleOpen}
          style={styles.body}
          accessibilityRole="button"
          accessibilityLabel="Open TestFlight to update"
        >
          <Text style={styles.title}>
            {forceUpdate ? 'Update required' : 'New version available'}
          </Text>
          <Text style={styles.subtitle}>
            {latestVersion
              ? `Version ${latestVersion} is ready in TestFlight.`
              : 'A newer build is ready in TestFlight.'}
          </Text>
          <Text style={styles.cta}>Open TestFlight →</Text>
        </Pressable>
        {!forceUpdate && (
          <Pressable
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityLabel="Dismiss update banner"
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
