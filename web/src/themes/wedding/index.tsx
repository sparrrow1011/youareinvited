import type { CSSProperties, ReactNode } from 'react';
import type { ThemeProps } from '../types';

function parseEventDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return {
    dayNumber: String(date.getDate()).padStart(2, '0'),
    monthLabel: date.toLocaleDateString('en-US', { month: 'long' }),
    yearLabel: String(date.getFullYear()),
  };
}

const fonts = {
  display: "'Cormorant Garamond', 'Noto Serif', serif",
  body: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
};

const styles: Record<string, CSSProperties> = {
  body: {
    position: 'relative',
    width: '100%',
    maxWidth: 390,
    minHeight: 1480,
    margin: '0 auto',
    overflow: 'hidden',
    background: '#DDD6CB',
    color: '#2C2A28',
  },
  hero: {
    position: 'relative',
    height: 560,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, rgba(28, 28, 26, 0.18) 0%, rgba(28, 28, 26, 0.58) 100%), linear-gradient(145deg, #b2b39e 0%, #7b8574 32%, #545a50 62%, #232523 100%)',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -80,
    left: 24,
    width: 280,
    height: 180,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.22)',
    filter: 'blur(28px)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: 48,
    right: -36,
    width: 240,
    height: 160,
    borderRadius: '50%',
    background: 'rgba(43, 52, 39, 0.46)',
    filter: 'blur(24px)',
  },
  estateFrame: {
    position: 'absolute',
    inset: '48px 34px auto',
    height: 270,
    borderRadius: 28,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.02))',
    boxShadow: '0 24px 50px rgba(23, 22, 20, 0.18)',
  },
  lakeReflection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 86,
    height: 96,
    background: 'linear-gradient(180deg, rgba(27, 29, 28, 0) 0%, rgba(19, 21, 20, 0.55) 100%)',
  },
  boat: {
    position: 'absolute',
    left: 62,
    bottom: 104,
    width: 116,
    height: 28,
    borderRadius: '0 0 60px 60px',
    background: 'linear-gradient(180deg, #5c3d28 0%, #302018 100%)',
    boxShadow: '0 10px 18px rgba(0, 0, 0, 0.16)',
  },
  heroTextWrap: {
    position: 'absolute',
    inset: '180px 42px auto',
    textAlign: 'center',
    color: '#F8F4EE',
    textShadow: '0 8px 24px rgba(0,0,0,0.28)',
  },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    opacity: 0.82,
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 54,
    lineHeight: '0.92',
    textTransform: 'uppercase',
    letterSpacing: '-0.04em',
  },
  heroNames: {
    marginTop: 170,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: '1.05',
  },
  heroDate: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: '0.04em',
  },
  flowerCluster: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 138,
    background: 'radial-gradient(circle at 14% 78%, rgba(242, 242, 234, 0.92) 0%, rgba(242, 242, 234, 0.92) 12%, transparent 13%), radial-gradient(circle at 24% 70%, rgba(242, 242, 234, 0.82) 0%, rgba(242, 242, 234, 0.82) 12%, transparent 13%), radial-gradient(circle at 33% 79%, rgba(242, 242, 234, 0.84) 0%, rgba(242, 242, 234, 0.84) 11%, transparent 12%), linear-gradient(180deg, rgba(221,214,203,0) 0%, rgba(221,214,203,0.82) 54%, #ddd6cb 100%)',
    opacity: 0.95,
  },
  paperWrap: {
    position: 'relative',
    marginTop: -16,
    background: '#F7F2EA',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    padding: '56px 30px 34px',
  },
  paperWave: {
    position: 'absolute',
    top: -36,
    left: -18,
    right: -18,
    height: 72,
    background: 'radial-gradient(circle at 12% 55%, #F7F2EA 0, #F7F2EA 24%, transparent 25%), radial-gradient(circle at 37% 42%, #F7F2EA 0, #F7F2EA 24%, transparent 25%), radial-gradient(circle at 62% 56%, #F7F2EA 0, #F7F2EA 24%, transparent 25%), radial-gradient(circle at 86% 46%, #F7F2EA 0, #F7F2EA 24%, transparent 25%)',
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 31,
    lineHeight: '1',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '-0.04em',
    color: '#554D44',
  },
  invitationCopy: {
    marginTop: 22,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: '1.8',
    textAlign: 'center',
    color: '#655D54',
  },
  blossom: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    margin: '26px auto 18px',
    background: 'radial-gradient(circle at 50% 50%, #d4b55d 0, #d4b55d 8%, transparent 9%), radial-gradient(circle at 50% 26%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.96) 28%, transparent 29%), radial-gradient(circle at 74% 44%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.96) 28%, transparent 29%), radial-gradient(circle at 66% 76%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.96) 28%, transparent 29%), radial-gradient(circle at 34% 76%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.96) 28%, transparent 29%), radial-gradient(circle at 24% 44%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.96) 28%, transparent 29%)',
    boxShadow: '0 18px 34px rgba(87, 83, 74, 0.12)',
  },
  detailPanel: {
    marginTop: 18,
    padding: '22px 20px',
    borderRadius: 24,
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(173, 166, 155, 0.24)',
    boxShadow: '0 18px 44px rgba(73, 67, 58, 0.08)',
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#7B746B',
    textAlign: 'center',
  },
  detailValue: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: '1',
    letterSpacing: '-0.04em',
    textAlign: 'center',
    color: '#4A433C',
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 18,
  },
  metaCard: {
    padding: '14px 12px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.68)',
    border: '1px solid rgba(173, 166, 155, 0.2)',
    textAlign: 'center',
  },
  metaCardTitle: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: '15px',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: '#8A8178',
  },
  metaCardValue: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: '1.05',
    color: '#4A433C',
  },
  dressCode: {
    marginTop: 18,
    padding: '18px 20px',
    borderRadius: 22,
    background: 'rgba(215, 207, 197, 0.28)',
    border: '1px solid rgba(173, 166, 155, 0.22)',
  },
  dressCodeText: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: '1.7',
    textAlign: 'center',
    color: '#645C53',
  },
  guestBlock: {
    marginTop: 22,
    textAlign: 'center',
  },
  guestLabel: {
    fontFamily: fonts.script,
    fontSize: 28,
    lineHeight: '1',
    color: '#8C8377',
  },
  guestName: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: '1.05',
    textTransform: 'uppercase',
    color: '#443D37',
  },
  guestMeta: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#7F776E',
  },
  qrFrame: {
    marginTop: 28,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(173, 166, 155, 0.25)',
    padding: '18px 16px',
  },
  qrLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: '15px',
    letterSpacing: '0.34em',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#7A7269',
  },
  qrFallback: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: '#534B44',
  },
};

export default function WeddingTheme({
  eventName,
  inviteeName,
  seatNumber,
  tag,
  eventDate,
  location,
  time,
  qrContent,
  dressCode,
  note,
}: ThemeProps) {
  const { dayNumber, monthLabel, yearLabel } = parseEventDate(eventDate || '2026-01-01');
  const displayDressCode =
    typeof dressCode === 'string' && dressCode.trim()
      ? dressCode
      : 'Garden formal in soft neutrals, champagne tones, or classic black.';
  const displayNote =
    typeof note === 'string' && note.trim()
      ? note
      : 'We have waited for this day with full hearts and would be honoured to celebrate it with you.';

  return (
    <div style={styles.body}>
      <section style={styles.hero}>
        <div style={styles.heroGlowTop} />
        <div style={styles.heroGlowBottom} />
        <div style={styles.estateFrame} />
        <div style={styles.lakeReflection} />
        <div style={styles.boat} />

        <div style={styles.heroTextWrap}>
          <div style={styles.eyebrow}>Wedding Celebration</div>
          <div style={styles.heroTitle}>
            Wedding
            <br />
            Day
          </div>
          <div style={styles.heroNames}>{eventName || 'Alina & Andrew'}</div>
          <div style={styles.heroDate}>{dayNumber}.{eventDate ? eventDate.slice(5, 7) : '07'}.{yearLabel}</div>
        </div>

        <div style={styles.flowerCluster} />
      </section>

      <section style={styles.paperWrap}>
        <div style={styles.paperWave} />
        <div style={styles.sectionTitle}>Wedding Invitation</div>
        <p style={styles.invitationCopy}>{displayNote}</p>
        <div style={styles.blossom} />

        <div style={styles.detailPanel}>
          <div style={styles.detailLabel}>Ceremony</div>
          <div style={styles.detailValue}>{location || 'Chateau du Lac'}</div>

          <div style={styles.metaRow}>
            <div style={styles.metaCard}>
              <div style={styles.metaCardTitle}>Date</div>
              <div style={styles.metaCardValue}>{`${dayNumber} ${monthLabel}`}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaCardTitle}>Time</div>
              <div style={styles.metaCardValue}>{time || '4PM Prompt'}</div>
            </div>
          </div>

          <div style={styles.dressCode}>
            <div style={styles.detailLabel}>Dress Code</div>
            <div style={styles.dressCodeText}>{displayDressCode}</div>
          </div>

          {inviteeName && (
            <div style={styles.guestBlock}>
              <div style={styles.guestLabel}>with love for</div>
              <div style={styles.guestName}>{inviteeName}</div>
              {(seatNumber || tag) && (
                <div style={styles.guestMeta}>
                  {seatNumber && <span>Seat {seatNumber}</span>}
                  {tag && <span>{tag}</span>}
                </div>
              )}
            </div>
          )}

          <div style={styles.qrFrame}>
            <div style={styles.qrLabel}>Your Entry QR</div>
            {qrContent ? (
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{qrContent as ReactNode}</div>
            ) : (
              <div style={styles.qrFallback}>QR Code</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
