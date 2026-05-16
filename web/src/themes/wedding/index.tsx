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
  display: "'Cormorant Garamond', 'Noto Serif', Georgia, serif",
  body: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
};

const styles: Record<string, CSSProperties> = {
  body: {
    width: '100%',
    maxWidth: 430,
    minHeight: 1180,
    margin: '0 auto',
    overflow: 'hidden',
    background: '#171512',
    color: '#F9F1E5',
    fontFamily: fonts.body,
  },
  hero: {
    position: 'relative',
    minHeight: 640,
    padding: '28px 26px 34px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  heroFallback: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 74% 12%, rgba(222,197,150,0.32), transparent 32%), radial-gradient(circle at 10% 38%, rgba(111,128,105,0.28), transparent 34%), linear-gradient(145deg, #39362f 0%, #1f231f 45%, #11100e 100%)',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(10,10,9,0.12) 0%, rgba(10,10,9,0.45) 46%, rgba(10,10,9,0.84) 100%)',
  },
  topBar: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    color: 'rgba(249,241,229,0.86)',
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '1px solid rgba(249,241,229,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.display,
    fontSize: 20,
    background: 'rgba(23,21,18,0.26)',
    backdropFilter: 'blur(10px)',
  },
  eyebrow: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  titleBlock: {
    position: 'relative',
    zIndex: 2,
    paddingTop: 190,
  },
  invitationLabel: {
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    color: 'rgba(249,241,229,0.74)',
  },
  names: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 58,
    lineHeight: '0.92',
    letterSpacing: '-0.02em',
    color: '#FFF8EC',
    textShadow: '0 14px 34px rgba(0,0,0,0.34)',
  },
  dateLine: {
    marginTop: 18,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    borderTop: '1px solid rgba(249,241,229,0.34)',
    borderBottom: '1px solid rgba(249,241,229,0.34)',
    padding: '10px 0',
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: 'rgba(249,241,229,0.82)',
  },
  content: {
    position: 'relative',
    marginTop: -42,
    padding: '44px 24px 30px',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    background: '#F6EFE4',
    color: '#211D18',
  },
  introCard: {
    border: '1px solid rgba(111,91,61,0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.34))',
    padding: '28px 24px',
    textAlign: 'center',
  },
  sectionKicker: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#8E7347',
  },
  invitationCopy: {
    margin: '16px 0 0',
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: '1.18',
    color: '#342D24',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 18,
  },
  detailCard: {
    minHeight: 104,
    padding: '16px 14px',
    border: '1px solid rgba(111,91,61,0.16)',
    background: '#FFFBF4',
  },
  detailLabel: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: '#8A7A68',
  },
  detailValue: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: '1.02',
    color: '#2A241D',
  },
  venueCard: {
    marginTop: 12,
    padding: '18px 16px',
    border: '1px solid rgba(111,91,61,0.16)',
    background: '#E8DED0',
    textAlign: 'center',
  },
  venueName: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 29,
    lineHeight: '1.04',
    color: '#2E2921',
  },
  secondaryImage: {
    marginTop: 18,
    height: 178,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '8px solid #FFFBF4',
    boxShadow: '0 20px 42px rgba(31,26,19,0.13)',
  },
  secondaryFallback: {
    marginTop: 18,
    height: 178,
    border: '8px solid #FFFBF4',
    background:
      'radial-gradient(circle at 20% 40%, rgba(145,122,83,0.28), transparent 22%), radial-gradient(circle at 70% 36%, rgba(103,121,101,0.24), transparent 24%), linear-gradient(135deg, #d7c8b3, #f7efe4 52%, #b9aa94)',
    boxShadow: '0 20px 42px rgba(31,26,19,0.13)',
  },
  dressCode: {
    marginTop: 18,
    padding: '18px 18px',
    background: '#211D18',
    color: '#F9F1E5',
    textAlign: 'center',
  },
  dressText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: '1.6',
    color: 'rgba(249,241,229,0.76)',
  },
  guestPass: {
    marginTop: 18,
    padding: '20px 18px',
    border: '1px solid rgba(111,91,61,0.18)',
    background: '#FFFBF4',
    textAlign: 'center',
  },
  guestScript: {
    fontFamily: fonts.script,
    fontSize: 28,
    lineHeight: '1',
    color: '#9C7C48',
  },
  guestName: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 29,
    lineHeight: '1.02',
    textTransform: 'uppercase',
    color: '#29231C',
  },
  guestMeta: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#7E6E5E',
  },
  qrFrame: {
    marginTop: 18,
    padding: '18px 16px',
    background: '#171512',
    color: '#F9F1E5',
    textAlign: 'center',
  },
  qrLabel: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: 'rgba(249,241,229,0.66)',
  },
  qrFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginTop: 12,
    border: '1px solid rgba(249,241,229,0.2)',
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
};

function getInitials(name: string) {
  return name
    .split(/[&\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'W';
}

export default function WeddingTheme({
  eventName,
  inviteeName,
  seatNumber,
  tag,
  eventDate,
  location,
  time,
  themeHeroImage,
  themeSecondaryImage,
  qrContent,
  dressCode,
  note,
}: ThemeProps) {
  const { dayNumber, monthLabel, yearLabel } = parseEventDate(eventDate || '2026-01-01');
  const displayName = eventName || 'Alina & Andrew';
  const displayDressCode =
    typeof dressCode === 'string' && dressCode.trim()
      ? dressCode
      : 'Black tie optional, soft neutrals, champagne, or classic evening wear.';
  const displayNote =
    typeof note === 'string' && note.trim()
      ? note
      : 'Together with their families, they request the pleasure of your company for an intimate celebration of love.';

  return (
    <div style={styles.body}>
      <section style={styles.hero}>
        {themeHeroImage ? (
          <div style={{ ...styles.heroImage, backgroundImage: `url("${themeHeroImage}")` }} />
        ) : (
          <div style={styles.heroFallback} />
        )}
        <div style={styles.heroOverlay} />

        <div style={styles.topBar}>
          <div style={styles.monogram}>{getInitials(displayName)}</div>
          <div style={styles.eyebrow}>Private Wedding Invitation</div>
        </div>

        <div style={styles.titleBlock}>
          <div style={styles.invitationLabel}>The Wedding Of</div>
          <div style={styles.names}>{displayName}</div>
          <div style={styles.dateLine}>
            <span>{dayNumber}</span>
            <span>{monthLabel}</span>
            <span>{yearLabel}</span>
          </div>
        </div>
      </section>

      <section style={styles.content}>
        <div style={styles.introCard}>
          <div style={styles.sectionKicker}>With Honour</div>
          <p style={styles.invitationCopy}>{displayNote}</p>
        </div>

        <div style={styles.detailGrid}>
          <div style={styles.detailCard}>
            <div style={styles.detailLabel}>Date</div>
            <div style={styles.detailValue}>{`${dayNumber} ${monthLabel}`}</div>
          </div>
          <div style={styles.detailCard}>
            <div style={styles.detailLabel}>Time</div>
            <div style={styles.detailValue}>{time || '4PM Prompt'}</div>
          </div>
        </div>

        <div style={styles.venueCard}>
          <div style={styles.sectionKicker}>Ceremony & Reception</div>
          <div style={styles.venueName}>{location || 'Chateau du Lac'}</div>
        </div>

        {themeSecondaryImage ? (
          <div style={{ ...styles.secondaryImage, backgroundImage: `url("${themeSecondaryImage}")` }} />
        ) : (
          <div style={styles.secondaryFallback} />
        )}

        <div style={styles.dressCode}>
          <div style={styles.sectionKicker}>Dress Code</div>
          <div style={styles.dressText}>{displayDressCode}</div>
        </div>

        {inviteeName && (
          <div style={styles.guestPass}>
            <div style={styles.guestScript}>reserved for</div>
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
          <div style={styles.qrLabel}>Entry Pass QR</div>
          {qrContent ? (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{qrContent as ReactNode}</div>
          ) : (
            <div style={styles.qrFallback}>QR Code</div>
          )}
        </div>
      </section>
    </div>
  );
}
