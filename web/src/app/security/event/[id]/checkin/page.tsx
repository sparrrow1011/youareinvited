'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { buildApiUrl, resolveMediaUrl } from '@/lib/api';
import jsQR from 'jsqr';

interface Guest {
  id: string;
  name: string;
  seat_number: string | null;
  tag: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

interface PublicEventInfo {
  name: string;
  brand_name: string;
  brand_logo_url: string | null;
  show_event_branding: boolean;
}

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const extractInvitationId = (value: string): string | null => {
  const trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const invitationId = parsed.searchParams.get('invitation');
    if (invitationId && UUID_PATTERN.test(invitationId)) {
      return invitationId;
    }

    const invitationMatch = parsed.pathname.match(/\/invitation\/([0-9a-f-]+)/i);
    if (invitationMatch && UUID_PATTERN.test(invitationMatch[1])) {
      return invitationMatch[1];
    }
  } catch {
    return null;
  }

  return null;
};

// ── Inner component that uses useSearchParams ──────────────────────────────────
function CheckInContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<PublicEventInfo | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [invitationInput, setInvitationInput] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const useJsQrRef = useRef(false); // true = jsQR fallback (iOS/Firefox), false = native BarcodeDetector
  const scanFrameRef = useRef<number | null>(null);
  const scanPendingRef = useRef(false);

  // Read token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`security_token_${eventId}`);
    if (!stored) {
      router.replace(`/security/event/${eventId}`);
      return;
    }
    setToken(stored);
  }, [eventId, router]);

  useEffect(() => {
    fetch(buildApiUrl(`/events/${eventId}/public_info/`))
      .then((response) => response.ok ? response.json() : Promise.reject(response.status))
      .then((data) => setEventInfo(data))
      .catch(() => setEventInfo(null));
  }, [eventId]);

  // Auto-load guest from ?invitation= param
  const invitationParam = searchParams.get('invitation');
  useEffect(() => {
    if (invitationParam && token) {
      setInvitationInput(invitationParam);
      loadGuest(invitationParam);
    }
  }, [invitationParam, token]);

  const stopScanner = useCallback(() => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    scanPendingRef.current = false;
    detectorRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerOpen(false);
    setScannerStarting(false);
  }, []);

  const loadGuest = useCallback(async (id: string) => {
    setGuestLoading(true);
    setGuestError(null);
    setGuest(null);
    try {
      const res = await fetch(buildApiUrl(`/invitations/${id}/`));
      if (res.status === 404) {
        setGuestError('Invitation not found.');
        return;
      }
      if (!res.ok) {
        setGuestError('Failed to load guest.');
        return;
      }
      setGuest(await res.json());
    } catch {
      setGuestError('Network error loading guest.');
    } finally {
      setGuestLoading(false);
    }
  }, []);

  const scanForQrCode = useCallback(() => {
    const scan = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      if (!scanPendingRef.current) {
        scanPendingRef.current = true;
        try {
          let match: string | null = null;

          if (useJsQrRef.current) {
            // ── jsQR fallback (iOS Safari, Firefox, any browser without BarcodeDetector)
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code?.data) {
                  match = extractInvitationId(code.data);
                }
              }
            }
          } else if (detectorRef.current) {
            // ── Native BarcodeDetector (Chrome/Edge on Android & desktop)
            const barcodes = await detectorRef.current.detect(videoRef.current);
            match = barcodes
              .map((b) => b.rawValue || '')
              .map(extractInvitationId)
              .find((c): c is string => !!c) ?? null;
          }

          if (match) {
            setInvitationInput(match);
            setScannerError(null);
            stopScanner();
            loadGuest(match);
            return;
          }
        } catch {
          // Keep scanning — transient decode errors are normal
        } finally {
          scanPendingRef.current = false;
        }
      }

      scanFrameRef.current = requestAnimationFrame(scan);
    };

    scanFrameRef.current = requestAnimationFrame(scan);
  }, [loadGuest, stopScanner]);

  const startScanner = useCallback(async () => {
    setScannerError(null);
    setScannerStarting(true);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScannerSupported(false);
      setScannerStarting(false);
      setScannerError('Camera access is not available in this browser.');
      return;
    }

    // Use native BarcodeDetector if available (Chrome/Edge on Android & desktop),
    // otherwise fall back to jsQR which works in every browser including iOS Safari.
    const BarcodeDetectorApi = (
      window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector;
    useJsQrRef.current = !BarcodeDetectorApi;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, // ideal = prefer rear, don't fail on desktop
        audio: false,
      });

      streamRef.current = stream;
      if (BarcodeDetectorApi) {
        detectorRef.current = new BarcodeDetectorApi({ formats: ['qr_code'] });
      }
      setScannerSupported(true);
      setScannerOpen(true);
      setScannerStarting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanForQrCode();
    } catch (error) {
      setScannerStarting(false);
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access to scan QR codes.'
          : 'Could not start the camera. Check permissions and try again.';
      setScannerError(message);
      stopScanner();
    }
  }, [scanForQrCode, stopScanner]);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  const handleCheckIn = async () => {
    if (!guest || !token) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const res = await fetch(buildApiUrl(`/invitations/${guest.id}/check_in/`), {
        method: 'POST',
        headers: { 'X-Security-Token': token },
      });
      if (res.status === 401) {
        const data = await res.json();
        if (data.detail?.toLowerCase().includes('expired')) {
          setSessionExpired(true);
          return;
        }
        setCheckInError('Authentication failed.');
        return;
      }
      if (res.status === 400) {
        const data = await res.json();
        setCheckInError(data.detail || 'Check-in failed.');
        return;
      }
      if (!res.ok) {
        setCheckInError('Check-in failed. Please try again.');
        return;
      }
      setGuest(await res.json());
    } catch {
      setCheckInError('Network error. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLogout = async () => {
    stopScanner();
    localStorage.removeItem(`security_token_${eventId}`);
    await fetch('/api/auth/security/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    router.push(`/security/event/${eventId}`);
  };

  // ── Aurora background ────────────────────────────────────────────────────────
  const Aurora = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-container/40 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary-container/30 blur-[100px]" />
      <div className="absolute -bottom-32 left-1/3 w-[480px] h-[480px] rounded-full bg-secondary-container/35 blur-[110px]" />
    </div>
  );

  // ── Session expired screen ───────────────────────────────────────────────────
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center px-4 sm:px-6">
        <Aurora />
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-6 sm:p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
          </div>
          <h1 className="font-headline text-2xl text-on-lp-background mb-2">Session Expired</h1>
          <p className="text-on-surface-variant text-sm mb-6">
            Your security session has expired. Please re-enter the PIN to continue.
          </p>
          <a
            href={`/security/event/${eventId}`}
            className="inline-flex items-center justify-center gap-2 bg-brand text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-brand/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            Re-enter PIN
          </a>
        </div>
      </div>
    );
  }

  const showEventBranding = eventInfo?.show_event_branding;
  const publicBrandName = eventInfo?.brand_name?.trim() || '';
  const publicBrandLogoUrl = resolveMediaUrl(eventInfo?.brand_logo_url);
  const publicBrandLabel = publicBrandName || eventInfo?.name || 'Event Host';

  return (
    <div className="min-h-screen bg-lp-background">
      <Aurora />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 pt-6 sm:pt-8 pb-0 max-w-xl mx-auto">
        {showEventBranding ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/75 px-4 py-2 shadow-sm backdrop-blur-xl">
            {publicBrandLogoUrl && (
              <img
                src={publicBrandLogoUrl}
                alt={`${publicBrandLabel} logo`}
                className="h-9 w-9 rounded-2xl object-cover border border-white/60 bg-white"
              />
            )}
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Gate Access</p>
              <p className="text-sm font-semibold text-on-lp-background">{publicBrandLabel}</p>
            </div>
          </div>
        ) : (
          <span className="font-headline italic text-brand text-xl tracking-tight select-none">
            youareinvited
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-on-surface-variant hover:text-on-lp-background transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          End Session
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-5">
        {/* Title */}
        <div>
          <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Gate Scanner</p>
          <h1 className="font-headline text-2xl sm:text-3xl text-on-lp-background">Check-In</h1>
          {eventInfo?.name && (
            <p className="text-sm text-on-surface-variant mt-2">
              Staff check-in for <span className="font-semibold text-on-lp-background">{eventInfo.name}</span>
            </p>
          )}
        </div>

        {/* Search */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
          <label className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Invitation ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={invitationInput}
              onChange={e => setInvitationInput(e.target.value)}
              placeholder="Scan QR or enter UUID"
              className="flex-1 h-11 rounded-2xl bg-surface-container border border-outline-variant/30 px-4 text-sm text-on-lp-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 transition-all min-w-0"
            />
            <button
              onClick={() => loadGuest(invitationInput.trim())}
              disabled={!invitationInput.trim() || guestLoading}
              className="h-11 px-5 rounded-2xl bg-brand text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand/90 transition-colors sm:w-auto"
            >
              {guestLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : 'Load'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (scannerOpen) {
                  stopScanner();
                  return;
                }
                startScanner();
              }}
              disabled={scannerStarting}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-white/80 px-4 py-2 text-sm font-semibold text-on-surface hover:border-brand/30 hover:text-brand disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {scannerOpen ? 'videocam_off' : 'qr_code_scanner'}
              </span>
              {scannerStarting ? 'Starting camera…' : scannerOpen ? 'Stop Scanner' : 'Scan QR Code'}
            </button>
            {!scannerSupported && (
              <p className="text-xs text-on-surface-variant">
                QR scanning is not supported in this browser.
              </p>
            )}
          </div>
          {scannerOpen && (
            <div className="mt-4 rounded-3xl border border-outline-variant/20 bg-on-lp-background p-3 text-white">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-72 w-full object-cover"
                />
                {/* Hidden canvas used by jsQR fallback to capture frames */}
                <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-[2rem] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
                </div>
              </div>
              <p className="mt-3 text-xs text-white/75">
                Align the guest QR code inside the frame. We will load the invitation automatically.
              </p>
            </div>
          )}
          {guestError && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {guestError}
            </p>
          )}
          {scannerError && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">camera</span>
              {scannerError}
            </p>
          )}
        </div>

        {/* Guest card */}
        {guest && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
            {/* Name */}
            <div className="mb-4">
              <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Guest</p>
              <h2 className="font-headline text-2xl text-on-lp-background">{guest.name}</h2>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {guest.seat_number && (
                <div className="flex items-center gap-1.5 bg-brand-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-brand text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chair</span>
                  <span className="text-sm font-semibold text-brand">Seat {guest.seat_number}</span>
                </div>
              )}
              {guest.tag && (
                <div className="flex items-center gap-1.5 bg-secondary-container/40 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-on-surface text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
                  <span className="text-sm font-semibold text-on-surface">{guest.tag}</span>
                </div>
              )}
            </div>

            {/* Status */}
            {guest.checked_in ? (
              <>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-700">Already Checked In</p>
                    {guest.checked_in_at && (
                      <p className="text-xs text-green-600 mt-0.5">{new Date(guest.checked_in_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <a
                  href={`/events/${eventId}/photos?invitation=${guest.id}`}
                  className="w-full h-12 rounded-full border-2 border-brand text-brand font-semibold text-sm
                             hover:bg-brand/5 active:bg-brand/10 transition-all flex items-center justify-center gap-2"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    photo_camera
                  </span>
                  View &amp; Upload Event Photos
                </a>
              </>
            ) : (
              <>
                {checkInError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3">
                    <span className="material-symbols-outlined text-red-400 text-base mt-0.5">warning</span>
                    <p className="text-sm text-red-700">{checkInError}</p>
                  </div>
                )}
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                      Check In Guest
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Page export — wrap in Suspense for useSearchParams ────────────────────────
export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
