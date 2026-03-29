import LegalFooterLinks from '@/components/LegalFooterLinks';

type PoweredByFooterProps = {
  hostLabel?: string;
  className?: string;
};

export default function PoweredByFooter({ hostLabel, className = '' }: PoweredByFooterProps) {
  return (
    <footer className={`pb-8 text-center ${className}`.trim()}>
      {hostLabel && (
        <p className="text-xs text-on-surface-variant mb-1">
          Hosted by <span className="font-semibold text-on-lp-background">{hostLabel}</span>
        </p>
      )}
      <p className="text-xs text-on-surface-variant">
        Powered by <span className="font-semibold text-brand">youareinvited</span>
      </p>
      <LegalFooterLinks className="mt-3 text-[11px] text-on-surface-variant font-medium" />
    </footer>
  );
}
