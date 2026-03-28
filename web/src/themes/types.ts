import type { ReactNode } from 'react';

/** One input field a theme needs beyond the base event fields */
export interface ThemeField {
  key: string;
  label: string;
  placeholder?: string;
}

/** Standard props every theme receives */
export interface ThemeProps {
  eventName: string;
  inviteeName?: string;
  /** ISO date string "YYYY-MM-DD" — theme parses it */
  eventDate: string;
  location?: string;
  time?: string;
  qrContent?: ReactNode;
  /** Theme-specific extras from event.theme_data */
  [key: string]: unknown;
}

/** Registry entry for one theme */
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  /** Accent color shown in ThemePicker card (hex) */
  accentColor: string;
  component: React.ComponentType<ThemeProps>;
  /** Extra fields the host must fill in — saved to event.theme_data */
  extraFields: ThemeField[];
}
