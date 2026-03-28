'use client';

import { THEMES } from '@/themes';

interface Props {
  selectedTheme: string;
  themeData: Record<string, unknown>;
  onChange: (theme: string, themeData: Record<string, unknown>) => void;
  saving?: boolean;
}

export default function ThemePicker({ selectedTheme, themeData, onChange, saving }: Props) {
  const activeMeta = THEMES.find((t) => t.id === selectedTheme);

  const handleThemeSelect = (themeId: string) => {
    onChange(themeId, themeId === selectedTheme ? themeData : {});
  };

  const handleFieldChange = (key: string, value: string) => {
    onChange(selectedTheme, { ...themeData, [key]: value });
  };

  const handleClear = () => {
    onChange('', {});
  };

  return (
    <div>
      {/* Theme cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {THEMES.map((theme) => {
          const isSelected = theme.id === selectedTheme;
          return (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`shrink-0 w-28 rounded-2xl p-3 border-2 text-left transition-all ${
                isSelected
                  ? 'border-brand bg-brand-container/20'
                  : 'border-outline-variant/20 bg-surface-container hover:border-brand/40'
              }`}
            >
              <div
                className="w-full h-16 rounded-xl mb-2"
                style={{ background: theme.accentColor }}
              />
              <p className="text-xs font-semibold text-on-surface truncate">{theme.name}</p>
              <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5 line-clamp-2">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Extra fields for selected theme */}
      {activeMeta && activeMeta.extraFields.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-widest">
            Theme Details
          </p>
          {activeMeta.extraFields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              <input
                type="text"
                value={String(themeData[field.key] ?? '')}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full h-10 rounded-xl bg-surface-container border border-outline-variant/30 px-3 text-sm text-on-lp-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
              />
            </div>
          ))}
        </div>
      )}

      {/* Clear selection */}
      {selectedTheme && (
        <button
          onClick={handleClear}
          disabled={saving}
          className="mt-3 text-xs text-on-surface-variant hover:text-on-surface underline disabled:opacity-50"
        >
          Remove theme
        </button>
      )}
    </div>
  );
}
