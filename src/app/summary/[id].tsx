import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { shortDate } from '@/lib/dates';
import { bestSet, compareSet, e1rm, entryVolume, exerciseHistory, finishedSessions, sessionVolume, workingSetCount, workingSets } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { formatVolume, formatWeight } from '@/lib/units';
import { Button, Card, Row, Screen, T } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { colors, fonts } from '@/ui/theme';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, exerciseById, updateSession, deleteSession } = useStore();
  const session = data.sessions.find((s) => s.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!session) {
    return (
      <Screen>
        <T variant="h2">Workout not found</T>
        <Button title="Back to week" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const unit = data.unit;
  const total = sessionVolume(session);
  const done = finishedSessions(data.sessions);
  // Compare with the last session of the same workout (or the same name for one-offs).
  const prior = done
    .filter((s) => s.id !== session.id && (s.date < session.date || (s.date === session.date && s.startedAt < session.startedAt)))
    .filter((s) => (session.templateId ? s.templateId === session.templateId : s.name === session.name))
    .pop();
  const priorVolume = prior ? sessionVolume(prior) : 0;
  const change = priorVolume > 0 ? ((total - priorVolume) / priorVolume) * 100 : null;
  const minutes = session.finishedAt ? Math.round((session.finishedAt - session.startedAt) / 60000) : null;

  const rows = session.entries
    .map((e) => {
      const ex = exerciseById(e.exerciseId);
      const history = exerciseHistory(data.sessions, e.exerciseId);
      const at = history.findIndex((h) => h.session.id === session.id);
      const before = at > 0 ? history[at - 1] : null;
      const sets = workingSets(e.sets);
      const best = bestSet(sets);
      const priorBest = history.slice(0, Math.max(at, 0)).reduce<number>((m, h) => Math.max(m, e1rm(h.best)), 0);
      return {
        id: e.exerciseId,
        name: ex?.name ?? e.exerciseId,
        volume: entryVolume(e),
        trend: before && best ? compareSet(best, before.best) : null,
        beat: !!before && entryVolume(e) > before.volume,
        newBest: best && at > 0 && e1rm(best) > priorBest ? best : null,
      };
    })
    .filter((r) => r.volume > 0)
    .sort((a, b) => b.volume - a.volume);

  const maxVol = Math.max(1, ...rows.map((r) => r.volume));
  const bests = rows.filter((r) => r.newBest);
  const beatCount = rows.filter((r) => r.trend === 'up').length;

  return (
    <Screen contentStyle={{ paddingTop: 24 }}>
      <View style={{ gap: 4 }}>
        <T variant="label" color={colors.accent}>
          Workout complete
        </T>
        <T variant="display">{session.name}</T>
        <T variant="small">{`${shortDate(session.date)}${minutes != null ? ` · ${minutes} min` : ''}${session.deload ? ' · Deload' : ''}`}</T>
      </View>

      <Card>
        <T variant="small">Total weight lifted · working sets</T>
        <Row gap={6} style={{ alignItems: 'flex-end' }}>
          <T variant="bignum">{formatVolume(total, unit).split(' ')[0]}</T>
          <T variant="num" color={colors.muted} style={{ fontSize: 26, paddingBottom: 6 }}>
            {unit}
          </T>
        </Row>
        {change != null ? (
          <T color={change >= 0 ? colors.accent : colors.warn} style={{ fontFamily: fonts.semibold, fontSize: 14 }}>
            {`${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% vs last ${session.name} (${formatVolume(priorVolume, unit)})`}
          </T>
        ) : (
          <T variant="small">First time doing this workout</T>
        )}
        <View style={{ height: 1, backgroundColor: colors.line, marginTop: 4 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T variant="num">{String(workingSetCount(session))}</T>
            <T variant="small" style={{ fontSize: 12 }}>
              working sets
            </T>
          </View>
          <View>
            <T variant="num">{String(bests.length)}</T>
            <T variant="small" style={{ fontSize: 12 }}>
              new bests
            </T>
          </View>
          <View>
            <T variant="num">{`${beatCount} of ${rows.length}`}</T>
            <T variant="small" style={{ fontSize: 12 }}>
              beat last time
            </T>
          </View>
        </Row>
      </Card>

      <View style={{ gap: 4 }}>
        <T variant="label">Volume by exercise</T>
        {rows.map((r) => (
          <View key={r.id} style={{ gap: 6, paddingVertical: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }} numberOfLines={1}>
                {r.name}
              </T>
              <T>
                {formatVolume(r.volume, unit)}{' '}
                <T color={r.trend === 'up' ? colors.accent : r.trend === 'down' ? colors.warn : colors.faint}>
                  {r.trend === 'up' ? '▲' : r.trend === 'down' ? '▼' : r.trend === 'same' ? '=' : ''}
                </T>
              </T>
            </Row>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2 }}>
              <View
                style={{
                  width: `${(r.volume / maxVol) * 100}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: r.trend === 'up' ? colors.accent : '#5C6168',
                }}
              />
            </View>
          </View>
        ))}
        <T variant="small" style={{ fontSize: 12 }}>
          ▲ best set beat last time · = matched · ▼ below last time
        </T>
      </View>

      {bests.length ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentLine, padding: 16 }}>
          <Icon name="trophy" color={colors.accent} />
          <T style={{ flex: 1, fontSize: 14 }}>
            {'New bests: '}
            <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>
              {bests.map((b) => `${b.name} ${formatWeight(b.newBest!.weight, unit)} × ${b.newBest!.reps}`).join(', ')}
            </T>
          </T>
        </Card>
      ) : null}

      <View style={{ gap: 6 }}>
        <T variant="label">Note</T>
        <TextInput
          accessibilityLabel="Workout note"
          placeholder="How did it feel?"
          placeholderTextColor={colors.dim}
          multiline
          defaultValue={session.note}
          onChangeText={(note) => updateSession(session.id, (s) => ({ ...s, note }))}
          style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.surface2, color: colors.text, padding: 12, fontFamily: fonts.regular, fontSize: 15 }}
        />
      </View>

      <Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Button
        title={confirmDelete ? 'Tap again to delete this workout' : 'Delete workout'}
        variant={confirmDelete ? 'danger' : 'outline'}
        size="small"
        style={{ alignSelf: 'center' }}
        onPress={() => {
          if (!confirmDelete) return setConfirmDelete(true);
          deleteSession(session.id);
          router.replace('/');
        }}
      />
    </Screen>
  );
}
