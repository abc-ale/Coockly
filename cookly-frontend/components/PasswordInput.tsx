// components/PasswordInput.tsx
import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

/**
 * Campo de contraseña con ojito para mostrar/ocultar.
 * Se usa igual que un TextInput normal (placeholder, value, onChangeText, style...).
 */
export default function PasswordInput({ style, ...props }: TextInputProps) {
  const [visible, setVisible] = useState(false);

  // El margen inferior se pasa al contenedor para que el ojo quede centrado en el campo.
  const { marginBottom, ...estiloCampo } = StyleSheet.flatten(style) ?? {};

  return (
    <View style={{ marginBottom }}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        {...props}
        secureTextEntry={!visible}
        style={[estiloCampo, styles.conOjo]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={styles.ojo}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  conOjo: { paddingRight: 48 },
  ojo: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});