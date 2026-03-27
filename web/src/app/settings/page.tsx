'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AccountSettings,
  Event,
  authService,
  eventService,
  resolveMediaUrl,
} from '@/lib/api';
import VerificationBanner from '@/components/VerificationBanner';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
  ) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const getPlanLabel = (plan?: AccountSettings['plan']) => (
  plan === 'pro' ? 'Pro Organizer' : 'Free Organizer'
);

export default function SettingsPage() {
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });
  const [brandForm, setBrandForm] = useState({
    brandName: '',
    showEventBranding: false,
    defaultWhatsAppMessage: '',
  });
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState('');
  const [clearBrandLogo, setClearBrandLogo] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profileStatus, setProfileStatus] = useState('');
  const [brandStatus, setBrandStatus] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [settingsResult, eventsResult] = await Promise.allSettled([
          authService.getSettings(),
          eventService.getAll(),
        ]);

        if (settingsResult.status === 'rejected') {
          throw settingsResult.reason;
        }

        if (!isMounted) return;

        setSettings(settingsResult.value);
        setProfileForm({
          displayName: settingsResult.value.display_name,
          email: settingsResult.value.email,
          currentPassword: '',
          newPassword: '',
        });
        setBrandForm({
          brandName: settingsResult.value.brand_name,
          showEventBranding: settingsResult.value.show_event_branding,
          defaultWhatsAppMessage: settingsResult.value.default_whatsapp_message_template,
        });

        if (eventsResult.status === 'fulfilled') {
          setEvents(eventsResult.value);
        } else {
          setEvents([]);
        }
      } catch (error) {
        if (!isMounted) return;
        setPageError(getErrorMessage(error, 'Failed to load your settings.'));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => () => {
    if (brandLogoPreview) {
      URL.revokeObjectURL(brandLogoPreview);
    }
  }, [brandLogoPreview]);

  const protectedEvents = events.filter((event) => event.has_security_pin);
  const unprotectedEvents = events.filter((event) => !event.has_security_pin);
  const brandLogoUrl = clearBrandLogo
    ? ''
    : brandLogoPreview || resolveMediaUrl(settings?.brand_logo_url);
  const hasBrandIdentity = Boolean(brandForm.brandName.trim() || brandLogoUrl);
  const organizerBrandName = brandForm.brandName.trim() || settings?.brand_name || '';
  const organizerBrandLogoUrl = brandLogoUrl;
  const organizerDisplayName = settings?.display_name || 'Organizer';
  const organizerIdentityName = organizerBrandName || organizerDisplayName;
  const organizerIdentityMeta = organizerBrandName
    ? `${organizerDisplayName} · ${getPlanLabel(settings?.plan)}`
    : getPlanLabel(settings?.plan);
  const invitationAssetsReady = settings?.media_storage !== 'unconfigured';

  const handleBrandLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (brandLogoPreview) {
      URL.revokeObjectURL(brandLogoPreview);
    }

    setBrandLogoFile(file);
    setBrandLogoPreview(URL.createObjectURL(file));
    setClearBrandLogo(false);
    setBrandStatus('');
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileStatus('');
    setPageError('');

    try {
      const updatedSettings = await authService.updateSettings({
        display_name: profileForm.displayName.trim(),
        email: profileForm.email.trim(),
        ...(profileForm.currentPassword || profileForm.newPassword
          ? {
            current_password: profileForm.currentPassword,
            new_password: profileForm.newPassword,
          }
          : {}),
      });

      setSettings(updatedSettings);
      setProfileForm((current) => ({
        ...current,
        displayName: updatedSettings.display_name,
        email: updatedSettings.email,
        currentPassword: '',
        newPassword: '',
      }));
      setProfileStatus('Profile updated.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to update your profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleBrandSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBrandSaving(true);
    setBrandStatus('');
    setPageError('');

    try {
      const formData = new FormData();
      formData.append('brand_name', brandForm.brandName.trim());
      formData.append('show_event_branding', String(brandForm.showEventBranding));
      formData.append('default_whatsapp_message_template', brandForm.defaultWhatsAppMessage.trim());

      if (clearBrandLogo) {
        formData.append('clear_brand_logo', 'true');
      }

      if (brandLogoFile) {
        formData.append('brand_logo', brandLogoFile);
      }

      const updatedSettings = await authService.updateSettings(formData);
      setSettings(updatedSettings);
      setBrandForm({
        brandName: updatedSettings.brand_name,
        showEventBranding: updatedSettings.show_event_branding,
        defaultWhatsAppMessage: updatedSettings.default_whatsapp_message_template,
      });
      setBrandLogoFile(null);
      if (brandLogoPreview) {
        URL.revokeObjectURL(brandLogoPreview);
      }
      setBrandLogoPreview('');
      setClearBrandLogo(false);
      setBrandStatus('Brand settings saved.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to save brand settings.'));
    } finally {
      setBrandSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setPageError('');

    try {
      const blob = await authService.exportData();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'youareinvited-account-export.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to export your account data.'));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      setPageError('Type DELETE to confirm account removal.');
      return;
    }

    setDeleting(true);
    setPageError('');

    try {
      await authService.deleteAccount(deletePassword);
      await authService.logout();
      window.location.href = '/';
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to delete your account.'));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-sm text-on-surface-variant">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-tertiary text-sm">{pageError || 'Unable to load settings.'}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 text-brand font-semibold">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background text-on-surface font-body">
      {settings && !settings.email_verified && <VerificationBanner />}

      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-16 -left-20 w-[520px] h-[520px] rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-16 w-[420px] h-[420px] rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="absolute -bottom-24 left-1/3 w-[460px] h-[460px] rounded-full bg-secondary-container/20 blur-[130px]" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/60 text-sm font-semibold text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Dashboard
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 text-sm font-semibold text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-base">support_agent</span>
                Support
              </Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand mb-3">Organizer Settings</p>
            <h1 className="font-headline text-4xl sm:text-5xl leading-tight text-on-lp-background">
              Control your profile,
              <br />
              brand identity, and event defaults.
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant mt-4 max-w-2xl">
              Shape how your workspace looks, decide whether your brand appears on guest-facing event surfaces, and review the infrastructure behind your events.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white/75 backdrop-blur-xl border border-white/60 px-5 py-4 shadow-sm min-w-[280px]">
            <div className="flex items-center gap-4">
              {organizerBrandLogoUrl ? (
                <img
                  src={organizerBrandLogoUrl}
                  alt={`${organizerIdentityName} logo`}
                  className="w-14 h-14 rounded-[1.4rem] object-cover border border-white/60 bg-white"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center text-lg font-bold">
                  {settings.avatar_initial}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-on-lp-background">{organizerIdentityName}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{organizerIdentityMeta}</p>
                <p className="text-xs text-on-surface-variant mt-1">{settings.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {hasBrandIdentity ? 'Brand identity ready' : 'No brand identity yet'}
              </span>
              <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {brandForm.showEventBranding ? 'Event branding on' : 'Event branding off'}
              </span>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 rounded-2xl border border-tertiary/15 bg-tertiary-container/20 px-4 py-3 text-sm text-tertiary">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <form onSubmit={handleBrandSubmit} className="order-first xl:col-span-2 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Brand Identity</p>
                <h2 className="font-headline text-2xl text-on-lp-background">Organizer brand and event surfaces</h2>
                <p className="text-sm text-on-surface-variant mt-3 max-w-2xl">
                  Your workspace can always use your brand identity. The toggle below decides whether guest-facing invitation pages, default invite cards, security pages, and share tone should carry that brand too.
                </p>
              </div>
              {brandStatus && <span className="text-xs font-semibold text-brand">{brandStatus}</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-3">Brand preview</p>
                <div className="rounded-[1.75rem] border border-dashed border-outline-variant/20 bg-white/70 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {brandLogoUrl ? (
                    <img src={brandLogoUrl} alt="Brand logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-brand-container/30 text-brand mx-auto mb-3 flex items-center justify-center">
                        <span className="material-symbols-outlined">imagesmode</span>
                      </div>
                      <p className="text-sm font-semibold text-on-lp-background">{brandForm.brandName || settings.display_name}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Upload a logo or keep the simple text-first brand identity.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${settings.can_upload_brand_logo ? 'bg-brand text-white cursor-pointer' : 'bg-surface-container text-on-surface-variant cursor-not-allowed'}`}>
                    <span className="material-symbols-outlined text-base">upload</span>
                    Upload logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleBrandLogoChange}
                      disabled={!settings.can_upload_brand_logo}
                    />
                  </label>
                  {(brandLogoUrl || settings.brand_logo_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setClearBrandLogo(true);
                        setBrandLogoFile(null);
                        if (brandLogoPreview) {
                          URL.revokeObjectURL(brandLogoPreview);
                        }
                        setBrandLogoPreview('');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant/20 bg-white/70 text-sm font-semibold text-on-surface"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Remove
                    </button>
                  )}
                </div>

                {!settings.can_upload_brand_logo && (
                  <p className="text-xs text-tertiary mt-3">
                    Brand logo uploads need external media storage in production before they can be enabled.
                  </p>
                )}

                <p className="text-xs text-on-surface-variant mt-3">
                  Your organizer workspace uses this identity automatically whenever a brand name or logo is available. Event surfaces only use it when the toggle below is on.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Brand name</span>
                  <input
                    value={brandForm.brandName}
                    onChange={(event) => setBrandForm((current) => ({ ...current, brandName: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="Your studio or event brand"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Default WhatsApp message template</span>
                  <textarea
                    value={brandForm.defaultWhatsAppMessage}
                    onChange={(event) => setBrandForm((current) => ({ ...current, defaultWhatsAppMessage: event.target.value }))}
                    rows={6}
                    className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none resize-none focus:ring-2 focus:ring-brand/30"
                    placeholder="Use {{brand_name}}, {{name}}, {{seat_number}}, {{tag}}, and {{link}} placeholders."
                  />
                </label>

                <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="block text-sm font-semibold text-on-lp-background">Use brand on guest-facing event experiences</span>
                      <span className="block text-sm text-on-surface-variant mt-1">
                        Apply your brand to public invitation pages, security screens, default invite cards, and the default share tone.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBrandForm((current) => ({ ...current, showEventBranding: !current.showEventBranding }))}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${brandForm.showEventBranding ? 'bg-brand' : 'bg-outline-variant/40'
                        }`}
                      aria-pressed={brandForm.showEventBranding}
                      aria-label="Toggle guest-facing brand identity"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${brandForm.showEventBranding ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                  <span className="block text-xs text-on-surface-variant mt-3 uppercase tracking-[0.16em]">
                    {hasBrandIdentity
                      ? (brandForm.showEventBranding ? 'Guest-facing brand identity enabled' : 'Guest-facing brand identity disabled')
                      : 'Add a brand name or logo to activate this across events'}
                  </span>
                </div>



                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-sm text-on-surface-variant">
                    New events inherit this WhatsApp template automatically if you leave the event template blank.
                  </p>
                  <button
                    type="submit"
                    disabled={brandSaving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {brandSaving ? 'Saving…' : 'Save Brand Settings'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <form onSubmit={handleProfileSubmit} className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Organizer Profile</p>
                <h2 className="font-headline text-2xl text-on-lp-background">Name, email, and password</h2>
              </div>
              {profileStatus && <span className="text-xs font-semibold text-brand">{profileStatus}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Display name</span>
                <input
                  value={profileForm.displayName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Your organizer name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Email</span>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="name@example.com"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Current password</span>
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(event) => setProfileForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Required to change password"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">New password</span>
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(event) => setProfileForm((current) => ({ ...current, newPassword: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Leave blank to keep current password"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                Your avatar uses the first letter of your organizer username across the dashboard whenever no brand logo is set.
              </p>
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand text-white text-sm font-semibold disabled:opacity-60"
              >
                {profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>

          <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Plan and Billing</p>
            <h2 className="font-headline text-2xl text-on-lp-background mb-5">Current subscription state</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Active plan</p>
                <p className="text-xl font-semibold text-on-lp-background">{getPlanLabel(settings.plan)}</p>
                <p className="text-sm text-on-surface-variant mt-2">
                  {settings.plan === 'pro'
                    ? 'Your plan already removes the standard watermark from generated invitations.'
                    : 'Brand identity lives here, watermark still present until account moves to pro version.'}
                </p>
              </div>
              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Billing controls</p>
                <p className="text-sm text-on-surface leading-relaxed">
                  {/* Billing self-service is not wired yet. Plan changes and payment questions still go through the platform admin or support team. */}
                </p>
                <Link href="/support" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand">
                  <span className="material-symbols-outlined text-base">support_agent</span>
                  Contact support about billing
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Security Defaults</p>
            <h2 className="font-headline text-2xl text-on-lp-background mb-5">Staff access and QR flow</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Protected events</p>
                <p className="text-2xl font-semibold text-on-lp-background">{settings.protected_events}/{settings.total_events}</p>
                <p className="text-sm text-on-surface-variant mt-2">
                  QR codes always route into the security check-in flow. PIN protection remains event-specific.
                </p>
              </div>
              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Team/staff mode</p>
                <p className="text-lg font-semibold text-on-lp-background">Shared staff links + security PIN</p>
                <p className="text-sm text-on-surface-variant mt-2">
                  Separate staff accounts are not built yet. Your team uses the event staff link and PIN instead.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {protectedEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-white/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-lp-background">{event.name}</p>
                    <p className="text-xs text-on-surface-variant">{event.date} · Security PIN active</p>
                  </div>
                  <span className="material-symbols-outlined text-brand">north_east</span>
                </Link>
              ))}

              {protectedEvents.length === 0 && (
                <div className="rounded-2xl border border-outline-variant/10 bg-white/60 px-4 py-4 text-sm text-on-surface-variant">
                  No events currently have a security PIN. Open an event to protect staff check-in access.
                </div>
              )}

              {unprotectedEvents.length > 0 && (
                <p className="text-sm text-on-surface-variant pt-1">
                  {unprotectedEvents.length} event{unprotectedEvents.length === 1 ? '' : 's'} still need a security PIN.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Workspace Readiness</p>
            <h2 className="font-headline text-2xl text-on-lp-background mb-5">What is ready for your events</h2>

            <div className="space-y-4">
              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Guest links</p>
                <p className="text-sm font-semibold text-on-lp-background">Live and ready</p>
                <p className="text-xs text-on-surface-variant mt-2">
                  Invitation pages, QR routes, and staff check-in links follow your live event experience automatically.
                </p>
              </div>

              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Brand uploads</p>
                <p className="text-sm font-semibold text-on-lp-background">
                  {settings.can_upload_brand_logo ? 'Ready for logo uploads' : 'Needs support setup'}
                </p>
                <p className="text-xs text-on-surface-variant mt-2">
                  {settings.can_upload_brand_logo
                    ? 'You can upload and refresh your organizer logo whenever your brand changes.'
                    : 'Logo uploads need production media setup first. Contact support if you want this enabled.'}
                </p>
              </div>

              <div className="rounded-3xl bg-surface-container-low p-5 border border-outline-variant/10">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant mb-2">Invitation templates</p>
                <p className="text-sm font-semibold text-on-lp-background">
                  {invitationAssetsReady ? 'Ready for uploads and generated invite assets' : 'Needs support setup'}
                </p>
                <p className="text-xs text-on-surface-variant mt-2">
                  {invitationAssetsReady
                    ? 'Your invitation templates, QR images, and generated invite assets are available for active events.'
                    : 'Template uploads and generated invite assets need production media setup before they can be turned on.'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 sm:p-8 shadow-sm xl:col-span-2">
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand mb-2">Data Controls</p>
                <h2 className="font-headline text-2xl text-on-lp-background mb-4">Export data or delete the account</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Export your organizer data as JSON for backup or migration. Deleting the account removes your organizer profile, events, guests, and generated invitation assets.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand text-white text-sm font-semibold disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    {exporting ? 'Exporting…' : 'Export Account Data'}
                  </button>
                  <Link
                    href="/support"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-outline-variant/20 bg-white/70 text-sm font-semibold text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">support_agent</span>
                    Need help first
                  </Link>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="rounded-[2rem] border border-tertiary/15 bg-tertiary-container/15 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary mb-2">Delete account</p>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                  This action is permanent. Confirm with your password and type DELETE to continue.
                </p>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Password</span>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-white/80 px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-tertiary/30"
                      placeholder="Enter your current password"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Type DELETE</span>
                    <input
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-outline-variant/20 bg-white/80 px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-tertiary/30"
                      placeholder="DELETE"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-tertiary text-white text-sm font-semibold disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">delete_forever</span>
                    {deleting ? 'Deleting…' : 'Delete Account'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
