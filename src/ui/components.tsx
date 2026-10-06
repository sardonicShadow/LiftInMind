import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icons';
import { colors, fonts, MAX_WIDTH, webInputFocus } from './theme';

/* ---------- Layout ---------- */

export function Screen({
  children,
  footer,
  header,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.column}>
        {header}
        {body}
        {footer}
      </View>
    </SafeAreaView>
  );
}

/** Top bar for pushed screens: back button, centred title, optional action. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <IconButton
        icon="back"
        label="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={styles.headerTitle}>
        <T variant="h3" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Text ---------- */

type Variant = 'display' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'num' | 'bignum';

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.condBold, fontSize: 34, lineHeight: 38, color: colors.text },
  h2: { fontFamily: fonts.condBold, fontSize: 26, lineHeight: 30, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.muted },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.faint,
  },
  num: { fontFamily: fonts.cond, fontSize: 22, lineHeight: 26, color: colors.text, fontVariant: ['tabular-nums'] },
  bignum: { fontFamily: fonts.condBold, fontSize: 52, lineHeight: 56, color: colors.text, fontVariant: ['tabular-nums'] },
};

export function T({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[variantStyle[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

/* ---------- Controls ---------- */

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  size = 'large',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surface2 : 'transparent';
  const fg = variant === 'primary' ? colors.accentInk : variant === 'danger' ? colors.warn : variant === 'outline' ? colors.muted : colors.text;
  const height = size === 'large' ? 56 : size === 'medium' ? 48 : 36;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: bg,
          borderRadius: size === 'small' ? 18 : 16,
          paddingHorizontal: size === 'small' ? 14 : 18,
          borderWidth: variant === 'outline' || variant === 'danger' ? 1 : 0,
          borderColor: variant === 'danger' ? colors.warnSoft : colors.line,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={size === 'small' ? 16 : 18} color={fg} strokeWidth={2.2} /> : null}
      <Text
        style={{
          color: fg,
          fontFamily: size === 'large' ? fonts.condBold : fonts.semibold,
          fontSize: size === 'large' ? 22 : 15,
          letterSpacing: size === 'large' ? 0.4 : 0,
        }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.text,
  bg = colors.surface,
  size = 44,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={size * 0.45} color={color} strokeWidth={2} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: colors.text } : null]}>
      <Text style={[styles.chipText, active ? { color: colors.bg, fontFamily: fonts.semibold } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        placeholderTextColor={colors.dim}
        accessibilityLabel={label}
        {...props}
        style={[styles.field, webInputFocus, style]}
      />
    </View>
  );
}

/** Small numeric stepper used in the builders. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <T variant="label">{label}</T>
      <Row gap={4}>
        <IconButton icon="down" label={`Decrease ${label}`} size={32} bg={colors.surface2} onPress={() => onChange(Math.max(min, value - 1))} />
        <T variant="num" style={{ minWidth: 28, textAlign: 'center' }}>
          {value}
        </T>
        <IconButton icon="up" label={`Increase ${label}`} size={32} bg={colors.surface2} onPress={() => onChange(Math.min(max, value + 1))} />
      </Row>
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'good' | 'neutral' | 'warn' }) {
  const bg = tone === 'good' ? colors.accentSoft : tone === 'warn' ? colors.warnSoft : colors.neutralSoft;
  const fg = tone === 'good' ? colors.accent : tone === 'warn' ? colors.warn : colors.neutralText;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ color: fg, fontFamily: fonts.bold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <Card style={{ gap: 10 }}>
      <T variant="h3">{title}</T>
      <T variant="small">{body}</T>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerRight: { minWidth: 44, alignItems: 'flex-end' },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surface2, justifyContent: 'center' },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  field: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
