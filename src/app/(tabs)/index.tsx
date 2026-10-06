import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { addDays, dayOfMonth, mondayOf, monthKey, monthLabel, previousMonth, shortDate, today, weekDates, weekdayShort } from '@/lib/dates';
import { finishedSessions, planDay, previousPerformance, sessionVolume } from '@/lib/logic';
import { useStore } from '@/lib/store';
import type { WorkoutTemplate } from '@/lib/types';
import { formatVolume, formatWeight } from '@/lib/units';
import { Button, Card, Chip, Divider, EmptyState, IconButton, Row, Screen, T } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { colors, fonts } from '@/ui/theme';
import { useToday } from '@/ui/useToday';

function Ring({ done, total }: { done: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(done / total, 1) : 0;
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={r} fill="none" stroke={colors.surface3} strokeWidth={5} />
      <Circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        stroke={colors.accent}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 22 22)"
      />
    </Svg>
  );
}

export default function WeekScreen() {
  const store = useStore();
  const { data, activePlan, activeSession, exerciseById } = store;
  const todayISO = useToday();
  // The day and week follow today until the user picks something else.
  const [pickedDay, setSelected] = useState<string | null>(null);
  const [pickedWeek, setWeekStart] = useState<string | null>(null);
  const selected = pickedDay ?? todayISO;
  const weekStart = pickedWeek ?? mondayOf(todayISO);
  // When the day rolls over (say the app sat open overnight), go back to today
  // so a new workout isn't logged on yesterday by accident.
  useEffect(() => {
    setSelected(null);
    setWeekStart(null);
  }, [todayISO]);
  const dates = weekDates(weekStart);

  const finished = useMemo(() => finishedSessions(data.sessions), [data.sessions]);
  const sessionsOn = (d: string) => finished.filter((s) => s.date === d);
  const templateById = (id: string | null) => data.templates.find((t) => t.id === id) ?? null;

  const planned = dates.filter((d) => activePlan && planDay(activePlan, d)?.templateId).length;
  const doneCount = dates.filter((d) => sessionsOn(d).length > 0).length;
  const weekNo = activePlan ? planDay(activePlan, weekStart)?.week : undefined;

  const weekVolume = finished.filter((s) => s.date >= weekStart && s.date <= dates[6]).reduce((v, s) => v + sessionVolume(s), 0);
  // For the current week, compare with the same days of last week so a half-done week isn't "down".
  const prevStart = addDays(weekStart, -7);
  const prevEnd = weekStart === mondayOf(todayISO) ? addDays(todayISO, -7) : addDays(weekStart, -1);
  const lastWeekVolume = finished
    .filter((s) => s.date >= prevStart && s.date <= prevEnd)
    .reduce((v, s) => v + sessionVolume(s), 0);
  const change = lastWeekVolume > 0 ? Math.round(((weekVolume - lastWeekVolume) / lastWeekVolume) * 100) : null;

  const selDay = activePlan ? planDay(activePlan, selected) : null;
  const selTemplate = templateById(selDay?.templateId ?? null);
  const selDone = sessionsOn(selected);
  // The day's planned workout, until it has been logged.
  const selPlanned = selTemplate && !selDone.some((s) => s.templateId === selTemplate.id) ? selTemplate : null;
  const selLabel = selected === todayISO ? 'Today' : shortDate(selected);
  // A workout logged now for the selected day goes after anything already logged that day.
  const selPoint = { date: selected, startedAt: Infinity };

  // Next planned workout after the selected day.
  let next: { date: string; template: WorkoutTemplate } | null = null;
  if (activePlan) {
    for (let i = 1; i <= 14 && !next; i++) {
      const d = addDays(selected, i);
      const t = templateById(planDay(activePlan, d)?.templateId ?? null);
      if (t) next = { date: d, template: t };
    }
  }

  const lastMonth = previousMonth(monthKey(todayISO));
  const showReportBanner = dayOfMonth(todayISO) <= 7 && finished.some((s) => monthKey(s.date) === lastMonth);

  const start = (templateId: string | null) => {
    store.startSession(templateId, pickedDay ?? today());
    router.push('/session');
  };

  const isEmpty = data.templates.length === 0 && data.sessions.length === 0;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <T variant="small" style={{ fontFamily: fonts.medium }}>
            {activePlan
              ? weekNo
                ? `Week ${weekNo} of ${activePlan.weeks} · ${activePlan.name}`
                : activePlan.name
              : 'No active plan'}
          </T>
          <T variant="display">{weekStart === mondayOf(todayISO) ? 'This week' : `Week of ${shortDate(weekStart).slice(4)}`}</T>
        </View>
        {planned > 0 ? (
          <Row gap={10}>
            <Ring done={doneCount} total={planned} />
            <View>
              <T variant="num" style={{ fontSize: 20 }}>{`${doneCount} / ${planned}`}</T>
              <T variant="small" style={{ fontSize: 12 }}>
                sessions
              </T>
            </View>
          </Row>
        ) : null}
      </Row>

      {showReportBanner ? (
        <Pressable onPress={() => router.push(`/report/${lastMonth}`)} accessibilityRole="link">
          <Card style={{ backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentLine, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="trophy" color={colors.accent} />
            <View style={{ flex: 1 }}>
              <T variant="h3">{`Your ${monthLabel(lastMonth).split(' ')[0]} report is ready`}</T>
              <T variant="small">See which lifts progressed last month</T>
            </View>
            <Icon name="chevron" color={colors.muted} size={20} />
          </Card>
        </Pressable>
      ) : null}

      {isEmpty ? (
        <EmptyState
          title="Start here"
          body="Build your first workout from the exercise catalog, or load a sample Push Pull Legs plan with eight weeks of history to see how tracking and reports work.">
          <Button title="Load sample plan and history" size="medium" onPress={store.loadSample} />
          <Button title="Build a workout" size="medium" variant="secondary" onPress={() => router.push('/workout/new')} />
        </EmptyState>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="back" label="Previous week" size={36} onPress={() => setWeekStart(addDays(weekStart, -7))} />
        <T variant="small">{`${shortDate(dates[0]).slice(4)} to ${shortDate(dates[6]).slice(4)}`}</T>
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <IconButton icon="back" label="Next week" size={36} onPress={() => setWeekStart(addDays(weekStart, 7))} />
        </View>
      </Row>

      <View style={styles.days}>
        {dates.map((d) => {
          const isSel = d === selected;
          const done = sessionsOn(d).length > 0;
          const pd = activePlan ? planDay(activePlan, d) : null;
          const rest = !!pd && !pd.templateId;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${shortDate(d)}${done ? ', done' : rest ? ', rest day' : ''}`}
              onPress={() => setSelected(d)}
              style={[styles.day, isSel && styles.daySel, d === todayISO && !isSel && styles.dayToday]}>
              <T variant="small" color={isSel ? colors.accentInk : colors.muted} style={{ fontSize: 12, fontFamily: isSel ? fonts.semibold : fonts.regular }}>
                {weekdayShort(d)}
              </T>
              <T variant="num" color={isSel ? colors.accentInk : rest ? colors.muted : colors.text} style={{ fontSize: 20 }}>
                {String(dayOfMonth(d))}
              </T>
              {done ? (
                <View style={[styles.doneDot, isSel && { backgroundColor: colors.accentInk }]}>
                  <Icon name="check" size={12} color={isSel ? colors.accent : colors.accentInk} strokeWidth={3} />
                </View>
              ) : rest ? (
                <T variant="small" color={isSel ? colors.accentInk : colors.dim} style={{ fontSize: 11, height: 16 }}>
                  Rest
                </T>
              ) : pd?.templateId ? (
                <View style={[styles.plannedDot, isSel && { backgroundColor: colors.accentInk }]} />
              ) : (
                <View style={{ height: 16 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {activeSession ? (
        <Card style={{ borderWidth: 2, borderColor: colors.accent }}>
          <T variant="label" color={colors.accent}>
            {activeSession.date === todayISO ? 'In progress' : `In progress · ${shortDate(activeSession.date)}`}
          </T>
          <T variant="h2">{activeSession.name}</T>
          <Button title="Resume workout" icon="play" onPress={() => router.push('/session')} />
        </Card>
      ) : (
        <>
          {selDone.map((s) => (
            <Card key={s.id}>
              <T variant="label" color={colors.accent}>
                {`Done · ${shortDate(s.date)}`}
              </T>
              <T variant="h2">{s.name}</T>
              <T variant="small">{`${formatVolume(sessionVolume(s), data.unit)} lifted · ${s.entries.length} exercise${s.entries.length === 1 ? '' : 's'}`}</T>
              <Button title="View summary" size="medium" variant="secondary" onPress={() => router.push(`/summary/${s.id}`)} />
            </Card>
          ))}

          {selPlanned ? (
            <Card>
              <View style={{ gap: 4 }}>
                <T variant="label" color={colors.accent}>
                  {selLabel}
                  {selDay?.deload ? ' · Deload week' : ''}
                </T>
                <T variant="h2" style={{ fontSize: 30, lineHeight: 34 }}>
                  {selPlanned.name}
                </T>
                <T variant="small">{`${selPlanned.exercises.length} exercises · ${selPlanned.exercises.reduce((n, e) => n + e.sets, 0)} sets`}</T>
              </View>
              <View>
                {selPlanned.exercises.slice(0, 3).map((te) => {
                  const prev = previousPerformance(data.sessions, te.exerciseId, undefined, { before: selPoint });
                  return (
                    <View key={te.exerciseId}>
                      <Divider />
                      <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
                        <T style={{ flex: 1 }} numberOfLines={1}>
                          {exerciseById(te.exerciseId)?.name ?? te.exerciseId}
                        </T>
                        <T variant="small" style={{ fontSize: 14 }}>
                          {prev ? `Last ${formatWeight(prev.sets[0].weight, data.unit)} × ${prev.sets.map((x) => x.reps).join(' · ')}` : 'First time'}
                        </T>
                      </Row>
                    </View>
                  );
                })}
                {selPlanned.exercises.length > 3 ? (
                  <>
                    <Divider />
                    <T variant="small" style={{ paddingTop: 10 }}>{`+ ${selPlanned.exercises.length - 3} more`}</T>
                  </>
                ) : null}
              </View>
              <Button title={selected === todayISO ? 'Start workout' : 'Log this workout'} icon="play" onPress={() => start(selPlanned.id)} />
            </Card>
          ) : null}

          {!isEmpty ? (
            <Card>
              {selPlanned || selDone.length > 0 ? (
                <T variant="label">{selDone.length > 0 ? 'Log another workout' : 'Or log a different workout'}</T>
              ) : (
                <>
                  <T variant="label">{selLabel}</T>
                  <T variant="h2">{selDay ? 'Rest day' : 'Nothing planned'}</T>
                  <T variant="small">{selected === todayISO ? 'Start one of your workouts anyway:' : 'Log a workout for this day:'}</T>
                </>
              )}
              <Row style={{ flexWrap: 'wrap' }}>
                {data.templates
                  .filter((t) => t.id !== selPlanned?.id && t.exercises.length > 0)
                  .map((t) => (
                    <Chip key={t.id} label={t.name} onPress={() => start(t.id)} />
                  ))}
                <Chip label="Empty workout" onPress={() => start(null)} />
              </Row>
            </Card>
          ) : null}
        </>
      )}

      {!isEmpty ? (
        <View style={styles.stats}>
          <Card style={styles.stat}>
            <T variant="small">Volume this week</T>
            <T variant="num" style={{ fontSize: 28, lineHeight: 32 }}>
              {formatVolume(weekVolume, data.unit)}
            </T>
            {change != null ? (
              <T variant="small" color={change >= 0 ? colors.accent : colors.warn} style={{ fontFamily: fonts.semibold }}>
                {`${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs same point last week`}
              </T>
            ) : (
              <T variant="small">Working sets only</T>
            )}
          </Card>
          <Card style={styles.stat}>
            <T variant="small">{next ? `Next · ${shortDate(next.date)}` : 'Next'}</T>
            <T variant="num" style={{ fontSize: 28, lineHeight: 32 }} numberOfLines={1}>
              {next ? next.template.name : 'None planned'}
            </T>
            {next ? <T variant="small">{`${next.template.exercises.length} exercises`}</T> : null}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.surface },
  daySel: { backgroundColor: colors.accent },
  dayToday: { borderWidth: 1, borderColor: colors.accentLine },
  doneDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  plannedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dim, marginVertical: 5 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, gap: 4, borderRadius: 16 },
});
