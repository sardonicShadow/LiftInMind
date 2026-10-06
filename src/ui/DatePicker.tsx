import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, dayOfMonth, monthDates, monthKey, monthLabel, previousMonth, shortDate, today, WEEKDAY_SHORT, weekdayIndex } from '@/lib/dates';

import { Button, IconButton, Row, T } from './components';
import { colors, fonts, MAX_WIDTH } from './theme';

function nextMonth(key: string): string {
  return monthKey(addDays(`${key}-28`, 7));
}

/** Monday-first grid of the month, padded with nulls so each row is a full week. */
function monthGrid(key: string): (string | null)[] {
  const days = monthDates(key);
  const lead = weekdayIndex(days[0]);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Bottom sheet with a month calendar. Days that already have a workout get a
 * dot so it's easy to see where a missed session fits.
 */
export function DatePicker({
  visible,
  value,
  title = 'Workout date',
  marked,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  title?: string;
  marked?: (iso: string) => boolean;
  onClose: () => void;
  onPick: (iso: string) => void;
}) {
  const [month, setMonth] = useState(monthKey(value));
  const todayISO = today();

  useEffect(() => {
    if (visible) setMonth(monthKey(value));
  }, [visible, value]);

  const pick = (iso: string) => {
    onPick(iso);
    onClose();
  };

  const cells = monthGrid(month);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* A sibling behind the sheet, not a wrapper, so screen readers can still reach the calendar. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close date picker" />
        <View style={styles.sheetWrap}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.grabber} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="display" style={{ fontSize: 30 }}>
                {title}
              </T>
              <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 10 }}>
                <T color={colors.muted} style={{ fontFamily: fonts.semibold }}>
                  Cancel
                </T>
              </Pressable>
            </Row>

            <Row style={{ justifyContent: 'space-between' }}>
              <IconButton icon="back" label="Previous month" size={36} onPress={() => setMonth(previousMonth(month))} />
              <T variant="h3">{monthLabel(month)}</T>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <IconButton icon="back" label="Next month" size={36} onPress={() => setMonth(nextMonth(month))} />
              </View>
            </Row>

            <View style={styles.grid}>
              {WEEKDAY_SHORT.map((d) => (
                <View key={d} style={styles.cell}>
                  <T variant="small" style={{ fontSize: 12 }}>
                    {d.slice(0, 2)}
                  </T>
                </View>
              ))}
              {cells.map((iso, k) => {
                if (!iso) return <View key={`pad-${k}`} style={styles.cell} />;
                const sel = iso === value;
                const isToday = iso === todayISO;
                const dot = marked?.(iso);
                return (
                  <View key={iso} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${shortDate(iso)}${dot ? ', has a workout' : ''}${isToday ? ', today' : ''}`}
                      accessibilityState={{ selected: sel }}
                      onPress={() => pick(iso)}
                      style={({ pressed }) => [
                        styles.day,
                        isToday && !sel && styles.dayToday,
                        sel && styles.daySel,
                        pressed && { opacity: 0.7 },
                      ]}>
                      <T variant="num" style={{ fontSize: 18, lineHeight: 22 }} color={sel ? colors.accentInk : colors.text}>
                        {String(dayOfMonth(iso))}
                      </T>
                      <View style={[styles.dot, dot ? { backgroundColor: sel ? colors.accentInk : colors.accent } : null]} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Button title="Today" variant="secondary" size="medium" disabled={value === todayISO} onPress={() => pick(todayISO)} />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surface3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  day: { width: 44, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayToday: { borderWidth: 1, borderColor: colors.accentLine },
  daySel: { backgroundColor: colors.accent },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
});
