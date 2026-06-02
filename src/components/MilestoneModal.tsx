import React, { useEffect, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Habit } from '../types/habit';
import { Milestone } from '../utils/milestones';
import { ConfettiBurst } from './ConfettiBurst';

interface MilestoneModalProps {
  visible: boolean;
  habit: Habit | null;
  milestone: Milestone | null;
  onClose: () => void;
}

interface Presentation {
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  hero: { type: 'number'; value: string; unit: string } | { type: 'icon'; glyph: string };
  stats: { value: string; label: string }[];
  primaryLabel: string;
}

/** Gold for records, indigo for goals, habit color for streaks. */
function buildPresentation(habit: Habit, milestone: Milestone): Presentation {
  if (milestone.kind === 'goal') {
    const flawless = milestone.missed === 0;
    return {
      accent: '#818CF8',
      eyebrow: 'Goal complete',
      title: flawless ? 'Challenge crushed! 🎯' : 'Goal complete! 🎯',
      body: flawless
        ? `You finished ${habit.name} with zero misses. Flawless.`
        : `You finished ${habit.name}. Done is done — keep the momentum.`,
      hero: { type: 'icon', glyph: habit.emoji || '🎯' },
      stats: [
        { value: `${milestone.done}/${milestone.expected}`, label: 'Done' },
        { value: `${milestone.missed}`, label: 'Missed' },
      ],
      primaryLabel: 'Done',
    };
  }

  if (milestone.kind === 'personalBest') {
    const beat = milestone.streak > milestone.previousBest;
    return {
      accent: '#FBBF24',
      eyebrow: 'New personal best',
      title: beat ? 'Record broken! 🏆' : 'Back to your best! 🏆',
      body: beat
        ? `${milestone.streak} days beats your old best of ${milestone.previousBest}. Uncharted territory.`
        : `You've climbed back to your ${milestone.previousBest}-day record. Now push past it.`,
      hero: { type: 'number', value: `${milestone.streak}`, unit: 'DAY STREAK' },
      stats: [
        { value: `${milestone.streak}`, label: 'Current' },
        { value: `${milestone.previousBest}`, label: 'Old best' },
      ],
      primaryLabel: 'Keep going',
    };
  }

  // streak threshold
  const headline: Record<number, { title: string; body: string }> = {
    7: {
      title: 'One week strong 💪',
      body: 'and you never missed twice. This is how habits stick.',
    },
    14: { title: 'Two weeks in! 🔥', body: 'Fourteen days steady. The routine is becoming you.' },
    30: {
      title: 'A full month! 🌟',
      body: 'Thirty days. This is no longer a habit — it’s who you are.',
    },
    100: { title: '100 days! 🏆', body: 'Triple digits. Genuinely elite consistency.' },
  };
  const h = headline[milestone.days] ?? {
    title: `${milestone.days}-day streak!`,
    body: 'Keep the chain alive.',
  };
  return {
    accent: habit.color,
    eyebrow: 'Milestone unlocked',
    title: h.title,
    body: `${milestone.days} days ${h.body}`,
    hero: { type: 'number', value: `${milestone.streak}`, unit: 'DAY STREAK' },
    stats: [
      { value: `${milestone.streak}`, label: 'Current' },
      { value: `${milestone.longest}`, label: 'Best' },
      { value: `${milestone.rate}%`, label: 'Rate' },
    ],
    primaryLabel: 'Keep going',
  };
}

/**
 * Celebration popup shown when a habit crosses a streak threshold, reclaims a
 * personal best, or finishes a finite goal. Fires a success haptic + confetti
 * on appear. Visual language mirrors HabitCompletedModal (dimmed backdrop,
 * centered card) so it feels native to the app.
 */
export function MilestoneModal({ visible, habit, milestone, onClose }: MilestoneModalProps) {
  const { colors } = useTheme();

  const presentation = useMemo(
    () => (habit && milestone ? buildPresentation(habit, milestone) : null),
    [habit, milestone],
  );

  // Success haptic the moment the celebration appears.
  useEffect(() => {
    if (visible && presentation) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, presentation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          paddingHorizontal: 24,
        },
        sheet: {
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingHorizontal: 24,
          paddingTop: 30,
          paddingBottom: 22,
          alignItems: 'center',
        },
        ring: {
          width: 132,
          height: 132,
          borderRadius: 66,
          borderWidth: 3,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        },
        heroNumber: {
          fontSize: 52,
          fontWeight: '800',
          letterSpacing: -2,
          lineHeight: 56,
        },
        heroUnit: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textSecondary,
          textAlign: 'center',
          letterSpacing: 0.5,
        },
        heroIcon: {
          fontSize: 50,
        },
        eyebrow: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 8,
        },
        title: {
          fontSize: 24,
          fontWeight: '800',
          color: colors.textPrimary,
          letterSpacing: -0.5,
          textAlign: 'center',
          marginBottom: 8,
        },
        body: {
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 20,
          paddingHorizontal: 6,
        },
        statsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 22,
        },
        stat: {
          paddingHorizontal: 18,
          alignItems: 'center',
        },
        statDivider: {
          width: 1,
          height: 28,
          backgroundColor: colors.separator,
        },
        statValue: {
          fontSize: 18,
          fontWeight: '800',
          color: colors.textPrimary,
        },
        statLabel: {
          fontSize: 10,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        primaryBtn: {
          width: '100%',
          backgroundColor: colors.accent,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
        },
        primaryText: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '700',
        },
        shareBtn: {
          paddingVertical: 12,
          marginTop: 4,
        },
        shareText: {
          color: colors.textMuted,
          fontSize: 14,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  if (!habit || !milestone || !presentation) return null;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${presentation.title.replace(/\s*[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').trim()} — ${habit.name} on Never Miss Twice 🎯`,
      });
    } catch {
      // User dismissed the share sheet or it failed; nothing to do.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.ring, { borderColor: presentation.accent }]}>
            {presentation.hero.type === 'number' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.heroNumber, { color: presentation.accent }]}>
                  {presentation.hero.value}
                </Text>
                <Text style={styles.heroUnit}>{presentation.hero.unit}</Text>
              </View>
            ) : (
              <Text style={styles.heroIcon}>{presentation.hero.glyph}</Text>
            )}
          </View>

          <Text style={[styles.eyebrow, { color: presentation.accent }]}>
            {presentation.eyebrow}
          </Text>
          <Text style={styles.title}>{presentation.title}</Text>
          <Text style={styles.body}>{presentation.body}</Text>

          <View style={styles.statsRow}>
            {presentation.stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <Pressable style={styles.primaryBtn} onPress={handleClose}>
            <Text style={styles.primaryText}>{presentation.primaryLabel}</Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </Pressable>
      </Pressable>
      {/* Confetti overlays everything (last child = top of stack); its
         pointerEvents="none" keeps the buttons underneath tappable. */}
      <ConfettiBurst
        play={visible}
        colors={[presentation.accent, ...['#34D399', '#818CF8', '#FBBF24', '#F472B6', '#38BDF8']]}
      />
    </Modal>
  );
}
