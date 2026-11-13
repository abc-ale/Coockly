// app/index.tsx
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function IndexScreen() {
  const { token, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)/home' : '/login'} />;
}