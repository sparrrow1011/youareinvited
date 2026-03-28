import type { ThemeMeta } from './types';
import BirthdayTheme from './birthday';

export const THEMES: ThemeMeta[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    description: 'Elegant birthday celebration card',
    accentColor: '#C9B99A',
    component: BirthdayTheme,
    extraFields: [
      { key: 'ageNumber', label: 'Age (number)', placeholder: '30' },
      { key: 'ageWord',   label: 'Age (in words)', placeholder: 'thirty' },
      { key: 'location',  label: 'Venue', placeholder: 'The Grand Ballroom, Lagos' },
      { key: 'time',      label: 'Time', placeholder: '4PM Prompt' },
    ],
  },
];

export function getTheme(id: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}
