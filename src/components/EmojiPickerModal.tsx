import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";

interface EmojiPickerModalProps {
  visible: boolean;
  currentEmoji: string;
  onClose: () => void;
  /** Called with the chosen emoji (single grapheme). */
  onSelect: (emoji: string) => void;
}

/**
 * Tiny modal that lets the user type any emoji using their system keyboard.
 * The TextInput is `maxLength={2}` to comfortably fit a single grapheme
 * (some emojis are surrogate pairs); we extract the first grapheme via
 * `Array.from(str)[0]` and commit it. Helper text reminds the user to switch
 * the keyboard to the emoji panel — most iOS users have an Emoji key already.
 */
export function EmojiPickerModal({
  visible,
  currentEmoji,
  onClose,
  onSelect,
}: EmojiPickerModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
        },
        center: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
        },
        sheet: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        title: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          marginBottom: 6,
        },
        helper: {
          color: colors.textMuted,
          fontSize: 12,
          textAlign: "center",
          marginBottom: 14,
        },
        inputRow: {
          alignItems: "center",
          marginBottom: 14,
        },
        input: {
          width: 96,
          height: 96,
          borderRadius: 16,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          textAlign: "center",
          fontSize: 56,
          color: colors.textPrimary,
          paddingVertical: 0,
        },
        actions: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 8,
        },
        btn: {
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 10,
        },
        btnGhost: {
          backgroundColor: colors.inputBackground,
        },
        btnGhostText: {
          color: colors.textSecondary,
          fontSize: 14,
          fontWeight: "600",
        },
      }),
    [colors]
  );

  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(currentEmoji);

  // Re-seed and refocus on open so the keyboard pops up reliably.
  useEffect(() => {
    if (visible) {
      setDraft(currentEmoji);
      // Slight delay lets the modal mount before we focus.
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [visible, currentEmoji]);

  const handleChange = (text: string) => {
    if (text.length === 0) {
      setDraft("");
      return;
    }
    // Take the first grapheme from whatever the user typed. Array.from
    // splits by code point — covers most emojis including surrogate pairs.
    // ZWJ sequences (e.g. 👨‍🌾) collapse to their first base codepoint,
    // which is still a valid emoji and acceptable for a v1.
    const first = Array.from(text)[0] ?? "";
    if (!first) return;
    setDraft(first);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(first);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.center}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.title}>Pick an emoji</Text>
            <Text style={styles.helper}>
              Tap the 😀 / globe key on your keyboard to switch to emoji.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={draft}
                onChangeText={handleChange}
                maxLength={2}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Emoji input"
              />
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
