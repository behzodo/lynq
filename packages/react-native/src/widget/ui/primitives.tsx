import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useWidget } from "../context";

/** The full-width action at the bottom of a form. */
export function PrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const { theme } = useWidget();
  const isOff = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isOff}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: theme.accent,
          borderRadius: theme.radius,
          opacity: isOff ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.accentForeground} size="small" />
      ) : (
        <Text style={[styles.primaryLabel, { color: theme.accentForeground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** A tappable card, used for the menu and for list rows. */
export function CardButton({
  children,
  disabled,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { theme } = useWidget();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderRadius: theme.radius,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Labelled text input with its validation message. */
export function Field({
  autoCapitalize = "sentences",
  error,
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words";
  error?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const { theme } = useWidget();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
        {label}
      </Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== "none"}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: theme.background,
            borderColor: error ? theme.destructive : theme.border,
            borderRadius: theme.radius - 4,
            color: theme.foreground,
          },
        ]}
        value={value}
      />
      {error ? (
        <Text style={[styles.error, { color: theme.destructive }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Category picker. A row of chips rather than a dropdown - five options fit,
 * and a native picker on Android is a heavier thing than this needs to be.
 */
export function ChipGroup<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  value: T;
}) {
  const { theme } = useWidget();

  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? theme.accent : theme.muted,
                borderColor: isActive ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: isActive ? theme.accentForeground : theme.foreground },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Centred message for empty lists and dead ends. */
export function CenteredNotice({
  glyph,
  message,
}: {
  glyph?: string;
  message: string;
}) {
  const { theme } = useWidget();

  return (
    <View style={styles.notice}>
      {glyph ? (
        <Text style={[styles.noticeGlyph, { color: theme.mutedForeground }]}>
          {glyph}
        </Text>
      ) : null}
      <Text style={[styles.noticeText, { color: theme.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  error: {
    fontSize: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  notice: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    padding: 24,
  },
  noticeGlyph: {
    fontSize: 30,
  },
  noticeText: {
    fontSize: 14,
    textAlign: "center",
  },
});
