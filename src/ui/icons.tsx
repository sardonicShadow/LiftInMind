import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from './theme';

export type IconName =
  | 'calendar'
  | 'dumbbell'
  | 'search'
  | 'chart'
  | 'play'
  | 'check'
  | 'back'
  | 'plus'
  | 'close'
  | 'chevron'
  | 'up'
  | 'down'
  | 'timer'
  | 'trophy'
  | 'trash'
  | 'more';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = colors.text, strokeWidth = 1.8 }: Props) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15} rx={3} {...common} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...common} />
        </>
      )}
      {name === 'dumbbell' && <Path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" {...common} />}
      {name === 'search' && (
        <>
          <Circle cx={10.5} cy={10.5} r={6} {...common} />
          <Path d="M15 15l5 5" {...common} />
        </>
      )}
      {name === 'chart' && <Path d="M4 20h16M7 16v-4M12 16V7M17 16v-7" {...common} />}
      {name === 'play' && <Path d="M7 4.5v15l12-7.5z" fill={color} stroke="none" />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} />}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...common} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'chevron' && <Path d="M9 5l7 7-7 7" {...common} />}
      {name === 'up' && <Path d="M12 19V5M6 11l6-6 6 6" {...common} />}
      {name === 'down' && <Path d="M12 5v14M6 13l6 6 6-6" {...common} />}
      {name === 'timer' && (
        <>
          <Circle cx={12} cy={13} r={8} {...common} />
          <Path d="M12 9v4l2.5 2M9.5 2.5h5" {...common} />
        </>
      )}
      {name === 'trophy' && <Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M9 20h6" {...common} />}
      {name === 'trash' && <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...common} />}
      {name === 'more' && (
        <>
          <Circle cx={5} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={19} cy={12} r={1.6} fill={color} />
        </>
      )}
    </Svg>
  );
}
