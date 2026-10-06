import { useEffect, useRef, useState } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';

import { colors, fonts, webInputFocus } from './theme';

/**
 * Numeric text field that keeps the user's raw text while they type (so
 * "62." is not reformatted mid-entry) and reports the parsed number.
 */
export function NumInput({
  value,
  onChange,
  placeholder,
  label,
  decimal = true,
  style,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
  label: string;
  decimal?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const format = (n: number | null) => (n == null ? '' : String(n));
  const [text, setText] = useState(format(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(format(value));
  }, [value]);

  return (
    <TextInput
      accessibilityLabel={label}
      value={text}
      placeholder={placeholder}
      placeholderTextColor={colors.dim}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      inputMode={decimal ? 'decimal' : 'numeric'}
      selectTextOnFocus
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(format(value));
      }}
      onChangeText={(t) => {
        const clean = t.replace(',', '.').replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setText(clean);
        const n = parseFloat(clean);
        onChange(Number.isFinite(n) ? n : null);
      }}
      style={[
        {
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.surface2,
          color: colors.text,
          textAlign: 'center',
          fontFamily: fonts.cond,
          fontSize: 22,
          paddingHorizontal: 4,
        },
        webInputFocus,
        style,
      ]}
    />
  );
}
