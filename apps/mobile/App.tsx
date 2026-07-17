import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppSupabase from '@wordbase/shared/AppSupabase';
import { SupabaseProvider } from '@wordbase/shared/context/SupabaseContext';
import { AnnouncementProvider } from '@wordbase/shared/context/AnnouncementContext';
import { getPlatform, setPlatform } from '@wordbase/shared/platform';
import { setPrimitives, PrimitiveThemeProvider } from '@wordbase/shared/primitives';
import { rnPrimitives } from './src/primitives';
import { mobilePlatform } from './src/platform-expo';

setPlatform(mobilePlatform);
setPrimitives(rnPrimitives);

export default function App() {
  return (
    <SafeAreaProvider>
      <PrimitiveThemeProvider theme="glass">
        <SupabaseProvider>
          <AnnouncementProvider>
            <AppSupabase />
          </AnnouncementProvider>
        </SupabaseProvider>
      </PrimitiveThemeProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}