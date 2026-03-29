'use client';

import { useEffect, useState } from 'react';
import LegalPageShell from '@/components/LegalPageShell';

const COOKIE_PREFERENCES_KEY = 'yai_cookie_preferences_v1';

type CookiePreferences = {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  preferences: true,
  analytics: false,
  marketing: false,
};

const COOKIE_SECTIONS = [
  {
    title: 'How YouAreInvited Uses Cookies',
    paragraphs: [
      'We use essential cookies and similar storage technologies to keep organizers signed in, secure event check-in flows, remember session state, and deliver core parts of the platform.',
      'Optional categories such as preferences, analytics, and marketing can be managed below. Your current selections are stored in this browser so you can update them later without losing control of your settings.',
    ],
  },
  {
    title: 'What These Settings Affect',
    paragraphs: [
      'Essential cookies stay on because the platform cannot work without them. Optional categories help remember non-essential preferences, measure product performance, or support future campaign experiences when enabled.',
    ],
    bullets: [
      'Essential: login sessions, security tokens, invite delivery, and venue check-in access.',
      'Preferences: saved non-essential choices, interface settings, and convenience features.',
      'Analytics: usage measurement to improve event, invitation, and dashboard experiences.',
      'Marketing: campaign attribution, referral tracking, and future promotional measurement.',
    ],
  },
] as const;

type ToggleCardProps = {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (nextValue: boolean) => void;
};

function ToggleCard({ title, description, checked, locked = false, onChange }: ToggleCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/45 bg-white/65 backdrop-blur-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-on-lp-background text-lg">{title}</h3>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{description}</p>
        </div>

        <button
          type="button"
          disabled={locked}
          aria-pressed={checked}
          onClick={() => onChange?.(!checked)}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
            checked ? 'bg-brand' : 'bg-outline-variant/30'
          } ${locked ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">{locked ? 'lock' : checked ? 'check_circle' : 'radio_button_unchecked'}</span>
        {locked ? 'Always active' : checked ? 'Enabled' : 'Disabled'}
      </div>
    </div>
  );
}

export default function CookieSettingsClient() {
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
      setPreferences({
        essential: true,
        preferences: parsed.preferences ?? DEFAULT_PREFERENCES.preferences,
        analytics: parsed.analytics ?? DEFAULT_PREFERENCES.analytics,
        marketing: parsed.marketing ?? DEFAULT_PREFERENCES.marketing,
      });
    } catch {
      window.localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    }
  }, []);

  const updatePreference = (key: keyof Omit<CookiePreferences, 'essential'>, value: boolean) => {
    setSaved(false);
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const savePreferences = () => {
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <LegalPageShell
      eyebrow="Cookies"
      title="Cookie Settings"
      description="Manage the optional cookies and browser storage choices used by YouAreInvited while keeping essential event and security flows working."
      lastUpdated="March 28, 2026"
      sections={[...COOKIE_SECTIONS]}
    >
      <section className="bg-white/65 backdrop-blur-xl rounded-[1.75rem] border border-white/45 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h2 className="font-headline text-2xl text-on-lp-background">Manage Preferences</h2>
            <p className="text-sm sm:text-base text-on-surface-variant mt-3 max-w-2xl leading-relaxed">
              Essential cookies stay on for sign-in, invitation access, QR check-in, and security. Everything else can be adjusted here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetPreferences}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white border border-outline-variant/15 text-sm font-semibold text-on-surface shadow-sm"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={savePreferences}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand text-white text-sm font-semibold shadow-lg shadow-brand/20"
            >
              <span className="material-symbols-outlined text-base">{saved ? 'check' : 'save'}</span>
              {saved ? 'Saved' : 'Save Preferences'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleCard
            title="Essential Cookies"
            description="Required for login sessions, security tokens, invitation delivery, QR validation, and other critical platform behavior."
            checked
            locked
          />
          <ToggleCard
            title="Preference Cookies"
            description="Remember non-essential choices such as support or experience preferences so your workflow feels more consistent."
            checked={preferences.preferences}
            onChange={(value) => updatePreference('preferences', value)}
          />
          <ToggleCard
            title="Analytics Cookies"
            description="Help us understand product usage patterns, measure page performance, and improve organizer and guest journeys."
            checked={preferences.analytics}
            onChange={(value) => updatePreference('analytics', value)}
          />
          <ToggleCard
            title="Marketing Cookies"
            description="Support campaign attribution and future marketing measurement if promotional experiences are enabled."
            checked={preferences.marketing}
            onChange={(value) => updatePreference('marketing', value)}
          />
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand mb-2">Current Platform Note</p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Your choice is saved locally in this browser. Essential cookies remain active because YouAreInvited relies on them for organizer sessions,
            guest access, and venue check-in security.
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
