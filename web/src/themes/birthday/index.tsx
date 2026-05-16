import type { CSSProperties, ReactNode } from 'react';
import type { ThemeProps } from '../types';

function parseEventDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    dayNumber: String(date.getDate()).padStart(2, '0'),
    dayLabel: date.toLocaleDateString('en-US', { weekday: 'long' }),
    monthLabel: date.toLocaleDateString('en-US', { month: 'long' }),
    yearLabel: String(date.getFullYear()),
  };
}

const fonts = {
  display: "'Aboreto', 'Cormorant Garamond', Georgia, serif",
  body: "'Work Sans', 'Helvetica Neue', Arial, sans-serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
};

const styles: Record<string, CSSProperties> = {
  body: {
    width: '100%',
    maxWidth: 430,
    minHeight: 1140,
    margin: '0 auto',
    overflow: 'hidden',
    background: '#0E0D0B',
    color: '#F8F2E8',
    fontFamily: fonts.body,
  },
  hero: {
    position: 'relative',
    minHeight: 610,
    padding: '26px 24px 32px',
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
      'radial-gradient(circle at 72% 14%, rgba(214,177,94,0.34), transparent 28%), radial-gradient(circle at 18% 40%, rgba(190,107,128,0.28), transparent 30%), linear-gradient(145deg, #191510 0%, #11100f 48%, #2a211c 100%)',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(14,13,11,0.1) 0%, rgba(14,13,11,0.32) 40%, rgba(14,13,11,0.92) 100%)',
  },
  shineLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 86,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(233,198,123,0.72), transparent)',
  },
  topText: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: 'rgba(248,242,232,0.72)',
  },
  ageWrap: {
    position: 'relative',
    zIndex: 2,
    minHeight: 330,
    display: 'flex',
    alignItems: 'flex-end',
  },
  ageNumber: {
    fontFamily: fonts.body,
    fontWeight: 800,
    fontSize: 178,
    lineHeight: '0.76',
    letterSpacing: '-0.1em',
    color: 'rgba(248,242,232,0.9)',
    textShadow: '0 22px 42px rgba(0,0,0,0.44)',
  },
  ageWord: {
    position: 'absolute',
    left: 132,
    bottom: 12,
    fontFamily: fonts.script,
    fontSize: 58,
    lineHeight: '1',
    color: '#E6BF68',
    transform: 'rotate(-7deg)',
    textShadow: '0 14px 28px rgba(0,0,0,0.3)',
  },
  titleBlock: {
    position: 'relative',
    zIndex: 2,
  },
  invitationLabel: {
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '0.34em',
    textTransform: 'uppercase',
    color: '#E6BF68',
  },
  celebrant: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: '1.04',
    textTransform: 'uppercase',
    color: '#FFF8EC',
    textShadow: '0 18px 36px rgba(0,0,0,0.34)',
  },
  content: {
    marginTop: -34,
    position: 'relative',
    padding: '40px 24px 30px',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    background: '#F8F2E8',
    color: '#181512',
  },
  leadCard: {
    padding: '26px 22px',
    border: '1px solid rgba(214,177,94,0.34)',
    background: 'linear-gradient(180deg, #FFFDF8, #F1E7D8)',
    textAlign: 'center',
  },
  script: {
    fontFamily: fonts.script,
    fontSize: 34,
    lineHeight: '1',
    color: '#B88932',
  },
  leadText: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: '1.18',
    textTransform: 'uppercase',
    color: '#201B16',
  },
  datePanel: {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: '0.88fr 1.12fr',
    border: '1px solid rgba(34,28,22,0.12)',
    background: '#12100E',
    color: '#F8F2E8',
  },
  dayNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 128,
    borderRight: '1px solid rgba(248,242,232,0.16)',
    fontFamily: fonts.body,
    fontWeight: 800,
    fontSize: 88,
    lineHeight: '1',
    letterSpacing: '-0.08em',
  },
  dateMeta: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '18px 18px',
  },
  dateSmall: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
    color: 'rgba(248,242,232,0.6)',
  },
  dateStrong: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: '1.05',
    textTransform: 'uppercase',
    color: '#F8F2E8',
  },
  venueCard: {
    marginTop: 14,
    padding: '18px 16px',
    border: '1px solid rgba(34,28,22,0.12)',
    background: '#FFFDF8',
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
    color: '#8F7547',
  },
  venueName: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: '1.08',
    textTransform: 'uppercase',
    color: '#211C17',
  },
  timeText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#6E6256',
  },
  secondaryImage: {
    marginTop: 16,
    height: 176,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '8px solid #14110F',
    boxShadow: '0 20px 44px rgba(20,17,15,0.16)',
  },
  secondaryFallback: {
    marginTop: 16,
    height: 176,
    border: '8px solid #14110F',
    background:
      'radial-gradient(circle at 26% 28%, rgba(230,191,104,0.36), transparent 26%), radial-gradient(circle at 72% 58%, rgba(190,107,128,0.24), transparent 30%), linear-gradient(135deg, #2a211c, #f8f2e8 52%, #caa55a)',
    boxShadow: '0 20px 44px rgba(20,17,15,0.16)',
  },
  guestPass: {
    marginTop: 16,
    padding: '20px 18px',
    border: '1px solid rgba(214,177,94,0.34)',
    background: '#FFFDF8',
    textAlign: 'center',
  },
  guestName: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: '1.08',
    textTransform: 'uppercase',
    color: '#201B16',
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
    color: '#76685C',
  },
  qrFrame: {
    marginTop: 16,
    padding: '18px 16px',
    background: '#14110F',
    color: '#F8F2E8',
    textAlign: 'center',
  },
  qrLabel: {
    fontSize: 10,
    lineHeight: '14px',
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#E6BF68',
  },
  qrFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginTop: 12,
    border: '1px solid rgba(248,242,232,0.18)',
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
};

export default function BirthdayTheme({
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
  ageNumber,
  ageWord,
}: ThemeProps) {
  const { dayNumber, dayLabel, monthLabel, yearLabel } = parseEventDate(eventDate || '2026-01-01');
  const displayAgeNumber = typeof ageNumber === 'string' || typeof ageNumber === 'number'
    ? String(ageNumber)
    : '30';
  const displayAgeWord = typeof ageWord === 'string' || typeof ageWord === 'number'
    ? String(ageWord)
    : 'thirty';

  return (
    <div style={styles.body}>
      <section style={styles.hero}>
        {themeHeroImage ? (
          <div style={{ ...styles.heroImage, backgroundImage: `url("${themeHeroImage}")` }} />
        ) : (
          <div style={styles.heroFallback} />
        )}
        <div style={styles.heroOverlay} />
        <div style={styles.shineLine} />

        <div style={styles.topText}>
          <span>Private Soiree</span>
          <span>{yearLabel}</span>
        </div>

        <div style={styles.ageWrap}>
          <div style={styles.ageNumber}>{displayAgeNumber}</div>
          {displayAgeWord && <div style={styles.ageWord}>{displayAgeWord}</div>}
        </div>

        <div style={styles.titleBlock}>
          <div style={styles.invitationLabel}>Birthday Celebration</div>
          <div style={styles.celebrant}>{eventName || 'Aurelia at Thirty'}</div>
        </div>
      </section>

      <section style={styles.content}>
        <div style={styles.leadCard}>
          <div style={styles.script}>celebrate with us</div>
          <div style={styles.leadText}>An intimate evening of music, dinner, and champagne</div>
        </div>

        <div style={styles.datePanel}>
          <div style={styles.dayNumber}>{dayNumber}</div>
          <div style={styles.dateMeta}>
            <div style={styles.dateSmall}>{dayLabel}</div>
            <div style={styles.dateStrong}>{monthLabel}</div>
            <div style={styles.dateSmall}>{yearLabel}</div>
          </div>
        </div>

        <div style={styles.venueCard}>
          <div style={styles.label}>Venue</div>
          <div style={styles.venueName}>{location || 'The Grand Ballroom, Lagos'}</div>
          <div style={styles.timeText}>{time || '4PM Prompt'}</div>
        </div>

        {themeSecondaryImage ? (
          <div style={{ ...styles.secondaryImage, backgroundImage: `url("${themeSecondaryImage}")` }} />
        ) : (
          <div style={styles.secondaryFallback} />
        )}

        {inviteeName && (
          <div style={styles.guestPass}>
            <div style={styles.script}>reserved for</div>
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
          <div style={styles.qrLabel}>Private Access QR</div>
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
