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
    <div className="absolute inset-0 overflow-hidden bg-[#F3F1F0]">
      <div className="absolute left-1/2 top-6 -translate-x-1/2 text-[8rem] font-black leading-none tracking-[-0.18em] text-white">
        {ageNumber}
      </div>
      <div
        className="absolute right-8 top-28 text-[2.75rem] leading-none text-black/85"
        style={{ fontFamily: '"Great Vibes", "Brush Script MT", cursive', transform: 'rotate(-6deg)' }}
      >
        {ageWord}
      </div>
      <div className="absolute inset-x-6 top-44 text-center">
        <div className="font-headline text-xl uppercase leading-tight text-on-lp-background">
          {eventName}
        </div>
        <div
          className="mt-14 text-lg text-[#5D5F5F]"
          style={{ fontFamily: '"Great Vibes", "Brush Script MT", cursive' }}
        >
          celebrate with us
        </div>
        <div className="mt-1 font-headline text-base uppercase text-on-lp-background">Amina Bello</div>
        <div className="mt-3 flex justify-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[#5D5F5F]">
          <span>💺 A-12</span>
          <span>🏷️ VIP</span>
        </div>
      </div>
      <div className="absolute inset-x-6 bottom-6 rounded-xl border border-black/10 bg-white/45 px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-on-lp-background">
        QR Code
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
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,rgba(29,31,28,0.12)_0%,rgba(29,31,28,0.52)_100%),linear-gradient(145deg,#b3b39f_0%,#6f7969_34%,#454a43_66%,#1f201f_100%)]">
      <div className="absolute inset-x-8 top-8 h-52 rounded-[1.8rem] border border-white/20 bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.18)]" />
      <div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
        <div className="font-headline text-[3.4rem] uppercase leading-[0.88]">
          Wedding
          <br />
          Day
        </div>
        <div className="mt-24 font-headline text-[1.7rem]">{eventName}</div>
        <div className="mt-2 text-sm tracking-[0.18em] uppercase text-white/85">21.07.2026</div>
      </div>
      <div className="absolute inset-x-0 bottom-[7.5rem] h-24 bg-[radial-gradient(circle_at_20%_60%,rgba(242,242,234,0.92)_0%,rgba(242,242,234,0.92)_12%,transparent_13%),radial-gradient(circle_at_33%_74%,rgba(242,242,234,0.84)_0%,rgba(242,242,234,0.84)_11%,transparent_12%),linear-gradient(180deg,rgba(247,242,234,0)_0%,rgba(247,242,234,0.82)_56%,#f7f2ea_100%)]" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-[#F7F2EA] px-8 py-8">
        <div className="font-headline text-[2rem] uppercase leading-none text-[#554D44]">Wedding Invitation</div>
        <div className="mt-4 text-sm leading-relaxed text-[#6B645C]">
          We have waited for this day with full hearts and would be honoured to celebrate it with you.
        </div>
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
