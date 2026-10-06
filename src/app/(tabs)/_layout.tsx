import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/icons';
import { colors, fonts, MAX_WIDTH } from '@/ui/theme';

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton({ icon, label, isFocused, ...props }, ref) {
  const color = isFocused ? colors.accent : colors.faint;
  return (
    <Pressable ref={ref} {...props} accessibilityRole="tab" accessibilityLabel={label} style={styles.tab}>
      <Icon name={icon} color={color} />
      <Text style={[styles.label, { color, fontFamily: isFocused ? fonts.semibold : fonts.medium }]}>{label}</Text>
    </Pressable>
  );
});

/** The tab bar: a full-width strip whose buttons stay within the content width. */
function Bar({ children, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View {...props} style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <Bar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="calendar" label="Week" />
          </TabTrigger>
          <TabTrigger name="workouts" href="/workouts" asChild>
            <TabButton icon="dumbbell" label="Workouts" />
          </TabTrigger>
          <TabTrigger name="exercises" href="/exercises" asChild>
            <TabButton icon="search" label="Exercises" />
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton icon="chart" label="Progress" />
          </TabTrigger>
        </Bar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.tabBg, borderTopWidth: 1, borderTopColor: '#22252A', paddingTop: 8 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  label: { fontSize: 12 },
});
