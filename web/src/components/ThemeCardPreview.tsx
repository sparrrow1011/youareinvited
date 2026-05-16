type ThemeCardPreviewProps = {
  themeId: string;
  themeName: string;
  accentColor: string;
  previewEventName: string;
  previewThemeData: Record<string, unknown>;
};

function BirthdayPreview({
  eventName,
  ageNumber,
  ageWord,
}: {
  eventName: string;
  ageNumber: string;
  ageWord: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_72%_12%,rgba(216,177,95,0.32),transparent_30%),linear-gradient(145deg,#17120f,#0e0d0b_55%,#2a201b)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/80" />
      <div className="absolute left-1/2 top-10 -translate-x-1/2 text-[8rem] font-black leading-none tracking-[-0.18em] text-white/85">
        {ageNumber}
      </div>
      <div
        className="absolute right-8 top-32 text-[2.75rem] leading-none text-[#e6bf68]"
        style={{ fontFamily: '"Great Vibes", "Brush Script MT", cursive', transform: 'rotate(-6deg)' }}
      >
        {ageWord}
      </div>
      <div className="absolute inset-x-6 bottom-24 text-center">
        <div className="text-[10px] uppercase tracking-[0.28em] text-[#e6bf68]">Private Soiree</div>
        <div className="mt-3 font-headline text-xl uppercase leading-tight text-white">
          {eventName}
        </div>
      </div>
      <div className="absolute inset-x-6 bottom-6 border border-[#e6bf68]/35 bg-black/55 px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.34em] text-white">
        Private Access
      </div>
    </div>
  );
}

function WeddingPreview({
  eventName,
}: {
  eventName: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_70%_18%,rgba(185,151,91,0.32),transparent_32%),linear-gradient(145deg,#3a3328,#171512_58%,#0e0d0b)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/80" />
      <div className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/45 font-headline text-lg text-white">
        W
      </div>
      <div className="absolute inset-x-6 bottom-28">
        <div className="text-[10px] uppercase tracking-[0.32em] text-[#d8bd86]">The Wedding Of</div>
        <div className="mt-3 font-headline text-[2.7rem] leading-[0.92] text-white">{eventName}</div>
        <div className="mt-4 inline-flex border-y border-white/30 py-2 text-[10px] uppercase tracking-[0.26em] text-white/80">21 July 2026</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-[#f6efe4] px-8 py-7">
        <div className="font-headline text-[1.75rem] uppercase leading-none text-[#2a241d]">Formal Guest Pass</div>
        <div className="mt-3 text-xs leading-relaxed text-[#6b5d4d]">Custom photo, private details, and entry QR.</div>
      </div>
    </div>
  );
}

function NoThemePreview({ eventName }: { eventName: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#f4efe9] via-white to-[#eceef1]">
      <div className="absolute inset-6 rounded-[1.4rem] border border-black/5 bg-white/80 shadow-[0_18px_50px_rgba(47,51,54,0.08)]" />
      <div className="absolute inset-x-10 top-14 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">Plain Invite</div>
        <div className="mt-4 font-headline text-3xl text-on-lp-background">No Theme</div>
        <div className="mt-5 h-px bg-outline-variant/30" />
        <div className="mt-6 font-headline text-xl uppercase leading-tight text-on-lp-background">
          {eventName}
        </div>
        <div className="mt-10 text-sm text-on-surface-variant">
          Guests see the essential card details and QR without a themed presentation layer.
        </div>
      </div>
      <div className="absolute left-10 right-10 bottom-10 rounded-2xl border border-outline-variant/15 bg-white/80 px-5 py-4 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">Clean Utility View</div>
      </div>
    </div>
  );
}

function GenericThemePreview({
  eventName,
  accentColor,
  themeName,
}: {
  eventName: string;
  accentColor: string;
  themeName: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(160deg, ${accentColor}22 0%, rgba(255,255,255,0.95) 46%, ${accentColor}12 100%)` }}>
      <div className="absolute left-6 right-6 top-6 rounded-[1.4rem] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_20px_50px_rgba(47,51,54,0.08)]">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">{themeName}</div>
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
        </div>
        <div className="mt-12 font-headline text-2xl uppercase leading-tight text-on-lp-background">
          {eventName}
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-surface-container-highest" />
          <div className="h-2 w-4/5 rounded-full bg-surface-container-highest" />
          <div className="h-2 w-3/5 rounded-full bg-surface-container-highest" />
        </div>
      </div>
      <div className="absolute inset-x-10 bottom-10 rounded-2xl border border-white/70 bg-white/75 px-4 py-4 text-center shadow-[0_18px_40px_rgba(47,51,54,0.05)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">Guest Invitation</div>
      </div>
    </div>
  );
}

export default function ThemeCardPreview({
  themeId,
  themeName,
  accentColor,
  previewEventName,
  previewThemeData,
}: ThemeCardPreviewProps) {
  if (!themeId) {
    return <NoThemePreview eventName={previewEventName} />;
  }

  if (themeId === 'birthday') {
    return (
      <BirthdayPreview
        eventName={previewEventName}
        ageNumber={String(previewThemeData.ageNumber ?? '30')}
        ageWord={String(previewThemeData.ageWord ?? 'thirty')}
      />
    );
  }

  if (themeId === 'wedding') {
    return <WeddingPreview eventName={previewEventName} />;
  }

  return (
    <GenericThemePreview
      eventName={previewEventName}
      accentColor={accentColor}
      themeName={themeName}
    />
  );
}
