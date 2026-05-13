interface ProFeatureBannerProps {
  featureName: string;
}

export default function ProFeatureBanner({ featureName }: ProFeatureBannerProps) {
  return (
    <div className="flex items-start gap-4 bg-brand-container/20 border border-brand/20 rounded-2xl px-5 py-4">
      <div className="w-10 h-10 rounded-full bg-brand-container/40 flex items-center justify-center shrink-0 mt-0.5">
        <span
          className="material-symbols-outlined text-brand text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          workspace_premium
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface">
          {featureName} — Pro Feature
        </p>
        <p className="text-sm text-on-surface-variant mt-0.5">
          This feature is not enabled for this event.{' '}
          <a
            href="mailto:support@youare-invited.com"
            className="text-brand underline hover:no-underline"
          >
            Contact us
          </a>{' '}
          to activate it.
        </p>
      </div>
    </div>
  );
}
