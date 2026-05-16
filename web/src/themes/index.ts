import type { ThemeMeta } from './types';
import BirthdayTheme from './birthday';
import WeddingTheme from './wedding';

export const THEMES: ThemeMeta[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    description: 'Luxury birthday soirée with portrait-led editorial styling',
    accentColor: '#D8B15F',
    component: BirthdayTheme,
    extraFields: [
      { key: 'ageNumber', label: 'Age (number)', placeholder: '30' },
      { key: 'ageWord',   label: 'Age (in words)', placeholder: 'thirty' },
      { key: 'location',  label: 'Venue', placeholder: 'The Grand Ballroom, Lagos' },
      { key: 'time',      label: 'Time', placeholder: '4PM Prompt' },
    ],
  },
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Editorial wedding invitation with custom photography and formal guest pass details',
    accentColor: '#B9975B',
    component: WeddingTheme,
    extraFields: [
      { key: 'location', label: 'Venue', placeholder: 'Chateau du Lac' },
      { key: 'time', label: 'Time', placeholder: '4PM Prompt' },
      { key: 'dressCode', label: 'Dress Code', placeholder: 'Garden formal in soft neutrals' },
      { key: 'note', label: 'Invitation Note', placeholder: 'Celebrate this day of joy and devotion with us.' },
    ],
  },
];

export function getTheme(id: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}
