import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { T } from '@/ui/components';
import { CatalogFilters, ExerciseRow, useCatalogFilter, useExerciseSubtitle } from '@/ui/ExercisePicker';
import { colors, MAX_WIDTH } from '@/ui/theme';

export default function ExercisesScreen() {
  const f = useCatalogFilter();
  const subtitle = useExerciseSubtitle();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        data={f.results}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <>
            <T variant="display" style={{ marginBottom: 16 }}>
              Exercises
            </T>
            <CatalogFilters f={f} />
            <T variant="label" style={{ marginTop: 14 }}>{`${f.results.length} exercises`}</T>
          </>
        }
        renderItem={({ item }) => (
          <ExerciseRow exercise={item} subtitle={subtitle(item)} trailing="chevron" onPress={() => router.push(`/exercise/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}
