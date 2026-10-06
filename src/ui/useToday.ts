import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { today } from '@/lib/dates';

/**
 * Today's date that updates when the day rolls over, including when the app
 * comes back from the background on a later day.
 */
export function useToday(): string {
  const [value, setValue] = useState(today());
  useEffect(() => {
    const refresh = () => setValue(today());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const id = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return value;
}
