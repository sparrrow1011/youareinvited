import type { CSSProperties, ReactNode } from 'react';

export type BirthdayTemplateProps = {
  celebrantName?: string;
  inviteeName?: string;
  ageWord?: string;
  ageNumber?: string;
  dayNumber?: string;
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
  location?: string;
  timeLabel?: string;
  qrContent?: ReactNode;
};

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
    width: 390,
    minHeight: 1418,
    background: '#F3F1F0',
    color: '#000000',
    overflow: 'hidden',
  },
  canvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 390,
    maxWidth: 448,
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
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: fonts.headline,
    fontSize: 20,
    lineHeight: '36px',
    letterSpacing: '-0.75px',
    textTransform: 'uppercase',
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

export default function BirthdayTemplate({
  celebrantName = 'Name of Celebrant',
  inviteeName = 'Invitee',
  ageWord = 'thirty',
  ageNumber = '30',
  dayNumber = '17',
  dayLabel = 'Sunday',
  monthLabel = 'November',
  yearLabel = '2026',
  location = 'Location',
  timeLabel = '4PM PROMPT',
  qrContent,
}: BirthdayTemplateProps) {
  return (
    <div style={styles.body}>
      <div style={styles.canvas}>
        <section style={styles.hero}>
          <div style={styles.giantAgeWrap}>
            <div style={styles.giantAge}>{ageNumber}</div>
            <div style={styles.ageWord}>{ageWord}</div>
          </div>
        </section>

        <section style={styles.nameSection}>
          <div style={styles.nameCluster}>
            <div style={styles.celebrant}>{celebrantName}</div>
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
            <div style={styles.invitee}>{inviteeName}</div>
          </div>

          <div style={styles.footer}>
            <div style={styles.locationBlock}>
              <div style={styles.location}>{location}</div>
              <div style={styles.time}>{timeLabel}</div>
            </div>

            <div style={styles.qrFrameWrap}>
              <div style={styles.qrFrame}>
                {qrContent ? (
                  qrContent
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
