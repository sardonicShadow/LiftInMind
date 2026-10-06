import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { shortDate, today } from '@/lib/dates';
import { planDay, planEndDate } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { Badge, Button, Card, EmptyState, Row, Screen, T } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { colors } from '@/ui/theme';

export default function WorkoutsScreen() {
  const store = useStore();
  const { data, exerciseById, activePlan, activeSession } = store;
  const todayISO = today();

  const start = (templateId: string) => {
    store.startSession(templateId);
    router.push('/session');
  };

  return (
    <Screen>
      <T variant="display">Workouts</T>

      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label">Plans</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/plan/new')}>
          <T color={colors.accent}>+ New plan</T>
        </Pressable>
      </Row>
      {data.plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          body="A plan puts your workouts on a weekly calendar for a set number of weeks, with optional deload weeks."
        />
      ) : (
        data.plans.map((p) => {
          const day = planDay(p, todayISO);
          const active = p.id === activePlan?.id;
          return (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/plan/${p.id}`)}>
              <Card style={active ? { borderWidth: 2, borderColor: colors.accent } : null}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="h2" style={{ flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </T>
                  {active ? <Badge label="Active" tone="good" /> : null}
                </Row>
                <T variant="small">
                  {`${p.weeks} weeks · ${shortDate(p.startDate).slice(4)} to ${shortDate(planEndDate(p)).slice(4)}`}
                  {day ? ` · week ${day.week}` : ''}
                  {` · ${p.progression === 'double' ? 'Double progression' : 'Linear progression'}`}
                </T>
                <Row gap={6}>
                  {p.days.map((d, k) => (
                    <View
                      key={k}
                      style={{
                        flex: 1,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: d ? colors.surface2 : 'transparent',
                        borderWidth: d ? 0 : 1,
                        borderColor: colors.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <T variant="small" style={{ fontSize: 11 }} color={d ? colors.text : colors.dim} numberOfLines={1}>
                        {d ? (data.templates.find((t) => t.id === d)?.name.split(' ')[0] ?? '?') : 'Rest'}
                      </T>
                    </View>
                  ))}
                </Row>
              </Card>
            </Pressable>
          );
        })
      )}

      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <T variant="label">Workouts</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/workout/new')}>
          <T color={colors.accent}>+ New workout</T>
        </Pressable>
      </Row>
      {data.templates.length === 0 ? (
        <EmptyState title="No workouts yet" body="Build a workout by picking exercises from the catalog and setting sets and rep ranges.">
          <Button title="Build a workout" size="medium" onPress={() => router.push('/workout/new')} />
        </EmptyState>
      ) : (
        data.templates.map((t) => (
          <Card key={t.id} style={{ gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/workout/${t.id}`)} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="h2">{t.name}</T>
                <Icon name="chevron" size={18} color={colors.dim} />
              </Row>
              <T variant="small" numberOfLines={2}>
                {t.exercises.map((e) => exerciseById(e.exerciseId)?.name ?? e.exerciseId).join(' · ') || 'No exercises'}
              </T>
            </Pressable>
            <Button
              title={activeSession ? 'Workout in progress' : 'Start now'}
              icon="play"
              size="medium"
              variant="secondary"
              disabled={!!activeSession || t.exercises.length === 0}
              onPress={() => start(t.id)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
