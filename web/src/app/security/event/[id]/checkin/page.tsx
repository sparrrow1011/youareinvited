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
  table_number?: string | null;
  group_label?: string | null;
  phone_number?: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  rsvp_attending?: boolean;
  rsvp_responded_at?: string | null;
}

interface SecurityGuestListResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Guest[];
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
  const [activeTab, setActiveTab] = useState<'checkin' | 'guests'>('checkin');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestList, setGuestList] = useState<Guest[]>([]);
  const [guestListCount, setGuestListCount] = useState(0);
  const [guestListLoading, setGuestListLoading] = useState(false);
  const [guestListError, setGuestListError] = useState<string | null>(null);
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
  const scannerSessionRef = useRef(0);

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
    scannerSessionRef.current += 1;
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

  const loadGuestList = useCallback(async (search = guestSearch.trim()) => {
    if (!token) return;
    setGuestListLoading(true);
    setGuestListError(null);
    try {
      const query = new URLSearchParams({ page_size: '200' });
      if (search) query.set('search', search);
      const res = await fetch(buildApiUrl(`/events/${eventId}/security-guests/?${query.toString()}`), {
        headers: { 'X-Security-Token': token },
      });

      if (res.status === 401) {
        const data = await res.json();
        if (data.detail?.toLowerCase().includes('expired')) {
          setSessionExpired(true);
          return;
        }
        setGuestListError('Authentication failed.');
        return;
      }
      if (!res.ok) {
        setGuestListError('Failed to load guest list.');
        return;
      }

      const data = await res.json() as SecurityGuestListResponse;
      setGuestList(data.results);
      setGuestListCount(data.count);
    } catch {
      setGuestListError('Network error loading guest list.');
    } finally {
      setGuestListLoading(false);
    }
  }, [eventId, guestSearch, token]);

  useEffect(() => {
    if (activeTab !== 'guests' || !token) return;
    const timeout = window.setTimeout(() => {
      loadGuestList(guestSearch.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [activeTab, guestSearch, loadGuestList, token]);

  const scanForQrCode = useCallback((sessionId: number) => {
    const sessionIsActive = () => scannerSessionRef.current === sessionId;
    const scheduleNextScan = () => {
      if (sessionIsActive()) {
        scanFrameRef.current = requestAnimationFrame(scan);
      }
    };

    const scan = async () => {
      if (!sessionIsActive()) return;

      if (!videoRef.current || videoRef.current.readyState < 2) {
        scheduleNextScan();
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

          if (!sessionIsActive()) return;

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

      scheduleNextScan();
    };

    scheduleNextScan();
  }, [loadGuest, stopScanner]);

  useEffect(() => {
    if (!scannerOpen || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const sessionId = scannerSessionRef.current;
    let cancelled = false;

    const prepareScanner = async () => {
      try {
        video.srcObject = streamRef.current;
        await video.play();
        if (!cancelled) scanForQrCode(sessionId);
      } catch {
        if (!cancelled) {
          setScannerError('Could not display the camera preview. Check permissions and try again.');
          stopScanner();
        }
      }
    };

    prepareScanner();

    return () => {
      cancelled = true;
    };
  }, [scanForQrCode, scannerOpen, stopScanner]);

  const startScanner = useCallback(async () => {
    setScannerError(null);
    setScannerStarting(true);
    const sessionId = scannerSessionRef.current + 1;
    scannerSessionRef.current = sessionId;

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

      if (scannerSessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (BarcodeDetectorApi) {
        detectorRef.current = new BarcodeDetectorApi({ formats: ['qr_code'] });
      }
      setScannerSupported(true);
      setScannerOpen(true);
      setScannerStarting(false);
    } catch (error) {
      if (scannerSessionRef.current !== sessionId) return;

      setScannerStarting(false);
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access to scan QR codes.'
          : 'Could not start the camera. Check permissions and try again.';
      setScannerError(message);
      stopScanner();
    }
  }, [stopScanner]);

  const selectTab = (tab: 'checkin' | 'guests') => {
    if (tab === 'guests') stopScanner();
    setActiveTab(tab);
  };

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
      if (activeTab === 'guests') {
        loadGuestList();
      }
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

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-5">
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

        <div className="grid grid-cols-2 gap-2 rounded-full bg-white/70 p-1 shadow-sm border border-white/40 backdrop-blur-xl">
          {[
            { id: 'checkin', label: 'Check-In', icon: 'qr_code_scanner' },
            { id: 'guests', label: 'Guest List', icon: 'group' },
          ].map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id as 'checkin' | 'guests')}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
                  selected ? 'bg-brand text-white shadow-sm' : 'text-on-surface-variant hover:text-brand'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        {activeTab === 'checkin' && <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
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
              type="button"
              onClick={() => {
                if (scannerOpen) {
                  stopScanner();
                  return;
                }
                startScanner();
              }}
              disabled={scannerStarting || !scannerSupported}
              aria-expanded={scannerOpen}
              aria-controls="qr-scanner-preview"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-white/80 px-4 py-2 text-sm font-semibold text-on-surface hover:border-brand/30 hover:text-brand disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {scannerOpen ? 'videocam_off' : 'qr_code_scanner'}
              </span>
              {scannerStarting ? 'Starting camera…' : scannerOpen ? 'Stop Scanner' : 'Scan QR Code'}
            </button>
            {!scannerSupported && (
              <p role="status" className="text-xs text-on-surface-variant">
                QR scanning is not supported in this browser. Enter the invitation ID instead.
              </p>
            )}
          </div>
          {scannerOpen && (
            <div
              id="qr-scanner-preview"
              className="mt-4 rounded-3xl border border-outline-variant/20 bg-on-lp-background p-3 text-white"
            >
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
            <p role="alert" className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {guestError}
            </p>
          )}
          {scannerError && (
            <p role="alert" className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">camera</span>
              {scannerError}
            </p>
          )}
        </div>}

        {/* Guest card */}
        {activeTab === 'checkin' && guest && (
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

        {activeTab === 'guests' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-label font-semibold text-brand uppercase tracking-widest mb-1">Guest List</p>
                <h2 className="font-headline text-2xl text-on-lp-background">All guests</h2>
              </div>
              <span className="text-xs text-on-surface-variant">
                {guestListCount} guest{guestListCount === 1 ? '' : 's'}
              </span>
            </div>

            <label className="relative mt-5 block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                type="search"
                value={guestSearch}
                onChange={(event) => setGuestSearch(event.target.value)}
                placeholder="Search name, seat, tag, table, group, or phone"
                className="h-11 w-full rounded-full border border-outline-variant/20 bg-surface-container pl-10 pr-4 text-sm text-on-surface outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
              />
            </label>

            {guestListError && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {guestListError}
              </p>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-outline-variant/10 bg-white/60">
              {guestListLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                  <p className="mt-3 text-sm text-on-surface-variant">Loading guests...</p>
                </div>
              ) : guestList.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">group_off</span>
                  <p className="text-sm text-on-surface-variant">No guests match your search.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {guestList.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setInvitationInput(item.id);
                        setGuest(item);
                        setActiveTab('checkin');
                      }}
                      className="w-full px-4 py-4 text-left transition hover:bg-surface-container/70"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{item.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                            {item.seat_number && <span>Seat {item.seat_number}</span>}
                            {item.table_number && <span>Table {item.table_number}</span>}
                            {item.tag && <span>{item.tag}</span>}
                            {item.group_label && <span>{item.group_label}</span>}
                            {item.phone_number && <span>{item.phone_number}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.checked_in ? 'bg-green-50 text-green-700' : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.checked_in ? 'bg-green-500' : 'bg-outline-variant'}`} />
                            {item.checked_in ? 'Checked In' : 'Pending'}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.rsvp_responded_at
                              ? item.rsvp_attending ? 'bg-brand-container/40 text-on-brand-container' : 'bg-tertiary-container/25 text-tertiary'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            {item.rsvp_responded_at ? (item.rsvp_attending ? 'Coming' : 'Not coming') : 'No RSVP'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
