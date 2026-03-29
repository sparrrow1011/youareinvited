import type { CSSProperties, ReactNode } from 'react';
import type { ThemeProps } from '../types';

function parseEventDate(isoDate: string) {
  // Parse as local date by appending midnight UTC offset guard
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return {
    dayNumber: String(d.getDate()),
    dayLabel: d.toLocaleDateString('en-US', { weekday: 'long' }),
    monthLabel: d.toLocaleDateString('en-US', { month: 'long' }),
    yearLabel: String(d.getFullYear()),
  };
}

const fonts = {
  display: "'Epilogue', 'Helvetica Neue', Arial, sans-serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
  headline: "'Aboreto', 'Cormorant Garamond', serif",
  body: "'Work Sans', 'Helvetica Neue', Arial, sans-serif",
};

const styles: Record<string, CSSProperties> = {
  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    position: 'relative',
    width: '100%',
    maxWidth: 390,
    minHeight: 1418,
    background: '#F3F1F0',
    color: '#000000',
    overflow: 'hidden',
    margin: '0 auto',
  },
  canvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 64,
  },
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    height: 315,
    padding: '216px 0 64px',
    isolation: 'isolate',
  },
  giantAgeWrap: {
    position: 'absolute',
    inset: '0 2.92% auto',
    height: 202,
    filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.02))',
    zIndex: 0,
  },
  giantAge: {
    position: 'absolute',
    left: -44,
    top: 19,
    width: 457,
    height: 239,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.display,
    fontWeight: 900,
    fontSize: 350,
    lineHeight: '202px',
    color: '#FFFFFF',
    letterSpacing: '-18px',
  },
  ageWord: {
    position: 'absolute',
    left: 184,
    top: 145,
    width: 148,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    fontFamily: fonts.script,
    fontSize: 72,
    lineHeight: '72px',
    color: '#000000',
    transform: 'rotate(-6deg)',
    zIndex: 1,
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 32px',
    gap: 73,
  },
  nameCluster: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: 269,
  },
  celebrant: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: fonts.headline,
    fontSize: 30,
    lineHeight: '36px',
    letterSpacing: '-0.75px',
    textTransform: 'uppercase',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '0 32px',
  },
  dateBlockWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 255,
    paddingTop: 48,
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: 255,
    padding: '16px 0',
  },
  dayNumber: {
    width: 124,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.display,
    fontSize: 128,
    lineHeight: '40px',
    letterSpacing: '-15px',
  },
  dividerWrap: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 9,
    height: 64,
  },
  divider: {
    width: 1,
    height: 64,
    background: '#C6C6C6',
  },
  dateMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    width: 121,
  },
  metaSmall: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '2.4px',
    color: '#474747',
    textTransform: 'uppercase',
  },
  metaStrong: {
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: '20px',
    letterSpacing: '2.4px',
    color: '#474747',
    textTransform: 'uppercase',
  },
  visualDividerWrap: {
    paddingTop: 48,
  },
  visualDivider: {
    width: 96,
    height: 1,
    background: 'rgba(198, 198, 198, 0.3)',
  },
  inviteeCluster: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: 269,
    marginTop: 48,
  },
  celebrateText: {
    fontFamily: fonts.script,
    fontSize: 20,
    lineHeight: '36px',
    textTransform: 'lowercase',
    color: '#5D5F5F',
  },
  invitee: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: fonts.headline,
    fontSize: 20,
    lineHeight: '36px',
    letterSpacing: '-0.75px',
    textTransform: 'uppercase',
  },
  inviteeMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '1.6px',
    color: '#5D5F5F',
    textTransform: 'uppercase',
  },
  inviteeMetaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 326,
    paddingTop: 54,
  },
  locationBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  location: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '3.2px',
    textTransform: 'uppercase',
    color: '#1B1C1A',
    textAlign: 'center',
  },
  time: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 11,
    lineHeight: '16px',
    letterSpacing: '3.2px',
    textTransform: 'uppercase',
    color: 'rgba(71, 71, 71, 0.7)',
    textAlign: 'center',
  },
  qrFrameWrap: {
    width: '100%',
    paddingTop: 24,
  },
  qrFrame: {
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    padding: '12px 24px',
    background: '#F5F3F0',
    border: '1px solid rgba(198, 198, 198, 0.2)',
    borderRadius: 12,
  },
  qrLabel: {
    fontFamily: fonts.headline,
    fontSize: 10,
    lineHeight: '15px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#000000',
  },
  qrFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 177,
    minHeight: 30,
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
  qrContent,
  ageNumber,
  ageWord,
}: ThemeProps) {
  const { dayNumber, dayLabel, monthLabel, yearLabel } = parseEventDate(eventDate || '2026-01-01');
  const displayAgeNumber = typeof ageNumber === 'string' || typeof ageNumber === 'number'
    ? String(ageNumber)
    : '';
  const displayAgeWord = typeof ageWord === 'string' || typeof ageWord === 'number'
    ? String(ageWord)
    : '';

  return (
    <div style={styles.body}>
      <div style={styles.canvas}>
        <section style={styles.hero}>
          {displayAgeNumber && (
            <div style={styles.giantAgeWrap}>
              <div style={styles.giantAge}>{displayAgeNumber}</div>
              {displayAgeWord && <div style={styles.ageWord}>{displayAgeWord}</div>}
            </div>
          )}
        </section>

        <section style={styles.nameSection}>
          <div style={styles.nameCluster}>
            <div style={styles.celebrant}>{eventName || 'Celebrant'}</div>
          </div>
        </section>

        <section style={styles.infoSection}>
          <div style={styles.dateBlockWrap}>
            <div style={styles.dateBlock}>
              <div style={styles.dayNumber}>{dayNumber}</div>
              <div style={styles.dividerWrap}>
                <div style={styles.divider} />
              </div>
              <div style={styles.dateMeta}>
                <div style={styles.metaSmall}>{dayLabel}</div>
                <div style={styles.metaStrong}>{monthLabel}</div>
                <div style={styles.metaSmall}>{yearLabel}</div>
              </div>
            </div>
          </div>

          <div style={styles.visualDividerWrap}>
            <div style={styles.visualDivider} />
          </div>

          <div style={styles.inviteeCluster}>
            <div style={styles.celebrateText}>celebrate with us</div>
            {inviteeName && <div style={styles.invitee}>{inviteeName}</div>}
            {(seatNumber || tag) && (
              <div style={styles.inviteeMeta}>
                {seatNumber && <span style={styles.inviteeMetaPill}>💺 {seatNumber}</span>}
                {tag && <span style={styles.inviteeMetaPill}>🏷️ {tag}</span>}
              </div>
            )}
          </div>

          <div style={styles.footer}>
            <div style={styles.locationBlock}>
              {location && <div style={styles.location}>{location}</div>}
              {time && <div style={styles.time}>{time}</div>}
            </div>

            <div style={styles.qrFrameWrap}>
              <div style={styles.qrFrame}>
                {qrContent ? (
                  qrContent as ReactNode
                ) : (
                  <div style={styles.qrFallback}>
                    <span style={styles.qrLabel}>QR CODE</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
