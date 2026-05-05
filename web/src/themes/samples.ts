import type { ThemeProps } from './types';

const THEME_SAMPLE_PROPS: Record<string, ThemeProps> = {
  birthday: {
    eventName: 'Aurelia at Thirty',
    inviteeName: 'Amina Bello',
    seatNumber: 'A-12',
    tag: 'VIP',
    eventDate: '2026-10-24',
    location: 'The Grand Ballroom, Lagos',
    time: '4PM Prompt',
    ageNumber: '30',
    ageWord: 'thirty',
  },
  wedding: {
    eventName: 'Alina & Andrew',
    inviteeName: 'Isabella Moretti',
    seatNumber: 'Front Row',
    tag: 'Family',
    eventDate: '2026-07-21',
    location: 'Chateau du Lac',
    time: '3PM Arrival',
    dressCode: 'Garden formal in soft neutrals, champagne tones, or classic black.',
    note: 'We have waited for this day with full hearts and would be honoured to celebrate it with you.',
  },
};

const BASE_THEME_PROP_KEYS = new Set([
  'eventName',
  'inviteeName',
  'seatNumber',
  'tag',
  'eventDate',
  'location',
  'time',
  'qrContent',
]);

export function getThemeSampleProps(themeId: string): ThemeProps | null {
  return THEME_SAMPLE_PROPS[themeId] ?? null;
}

export function getThemeSampleData(themeId: string): Record<string, unknown> {
  const sample = getThemeSampleProps(themeId);
  if (!sample) return {};

  return Object.fromEntries(
    Object.entries(sample).filter(([key]) => !BASE_THEME_PROP_KEYS.has(key)),
  );
}
