import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, PressableProps } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
};

export default function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        !isOutline && !isGhost && styles.primary,
        pressed && !disabled && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.5 },
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isGhost ? colors.primary : colors.white} />
      ) : (
        <Text
          style={[
            styles.label,
            (isOutline || isGhost) && { color: colors.primary },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    ...typography.h3,
    color: colors.white,
  },
});