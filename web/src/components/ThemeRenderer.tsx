import { getTheme } from '@/themes';
import type { ThemeProps } from '@/themes/types';

interface Props {
  themeId: string;
  props: ThemeProps;
}

export default function ThemeRenderer({ themeId, props }: Props) {
  const theme = getTheme(themeId);
  if (!theme) return null;
  const Component = theme.component;
  return <Component {...props} />;
}
