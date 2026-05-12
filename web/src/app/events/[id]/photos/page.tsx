'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';
import { eventService, EventPhoto } from '@/lib/api';
import { extractInvitationId } from '@/lib/qr';
import PhotoGallery from '@/components/PhotoGallery';

type Tab = 'upload' | 'gallery';

export default function EventPhotosPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // Invitation UUID state
  const [invitationId, setInvitationId] = useState<string | null>(
    searchParams.get('invitation'),
  );
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  // Manual paste input
  const [pasteInput, setPasteInput] = useState('');

  // QR scanner
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<EventPhoto[]>([]);

  // Upload state
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Verify invitation and load photos ────────────────────────────────────
  useEffect(() => {
    if (!invitationId) return;

    setVerifying(true);
    setAuthError('');
    eventService
      .listPhotos(eventId, invitationId)
      .then((data) => {
        setPhotos(data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) {
          setAuthError(
            err?.response?.data?.detail ??
              'Access denied. Make sure you have checked in.',
          );
          setInvitationId(null);
        } else {
          setAuthError('Could not load photos. Please try again.');
        }
      })
      .finally(() => setVerifying(false));
  }, [invitationId, eventId]);

  // ── Handle paste URL / link ───────────────────────────────────────────────
  const handlePasteSubmit = () => {
    const extracted = extractInvitationId(pasteInput.trim());
    if (extracted) {
      setInvitationId(extracted);
      setPasteInput('');
    } else {
      setAuthError('Could not find an invitation ID in that link. Paste your full invite URL.');
    }
  };

  // ── QR scanner ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
          scanLoopRef.current = requestAnimationFrame(scan);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          const extracted = extractInvitationId(code.data);
          if (extracted) {
            stopScanner();
            setInvitationId(extracted);
            return;
          }
        }
        scanLoopRef.current = requestAnimationFrame(scan);
      };
      scanLoopRef.current = requestAnimationFrame(scan);
    } catch {
      setScanning(false);
      setAuthError('Camera access denied. Please paste your invite link instead.');
    }
  }, [stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !invitationId) return;

    setUploading(true);
    setUploadError('');

    for (const file of files) {
      try {
        const photo = await eventService.uploadPhoto(eventId, invitationId, file);
        setPhotos((prev) => [photo, ...prev]);
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'Upload failed. Check file size (max 10 MB) and format (JPEG/PNG/WEBP).';
        setUploadError(detail);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!invitationId || authError) {
    return (
      <div className="min-h-screen bg-lp-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-surface-container rounded-3xl p-6 shadow-sm">
          <div className="flex justify-center mb-4">
            <span
              className="material-symbols-outlined text-5xl text-brand"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              photo_camera
            </span>
          </div>
          <h1 className="text-xl font-bold text-on-surface text-center mb-1">Event Photos</h1>
          <p className="text-sm text-on-surface/60 text-center mb-6">
            Scan your personal invite QR code or paste your invite link to continue.
          </p>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          )}

          {/* QR scanner */}
          {scanning ? (
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-square bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={stopScanner}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white
                           flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ) : (
            <button
              onClick={startScanner}
              className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm
                         flex items-center justify-center gap-2 mb-3 hover:bg-brand/90 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                qr_code_scanner
              </span>
              Scan My Invite QR
            </button>
          )}

          <p className="text-center text-xs text-on-surface/40 mb-3">or</p>

          {/* Paste input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste invite link…"
              className="flex-1 h-10 px-3 rounded-full border border-outline/30 bg-surface
                         text-sm text-on-surface focus:outline-none focus:border-brand"
              onKeyDown={(e) => e.key === 'Enter' && handlePasteSubmit()}
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteInput.trim()}
              className="h-10 px-4 rounded-full bg-surface-container-high text-on-surface
                         text-sm font-medium disabled:opacity-40 hover:bg-surface-container-highest
                         transition-colors"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-lp-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lp-background pb-12">
      <header className="sticky top-0 z-10 bg-lp-background/95 backdrop-blur border-b border-outline/10 px-4 py-3 flex items-center gap-3">
        <span
          className="material-symbols-outlined text-brand text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          photo_camera
        </span>
        <h1 className="text-base font-bold text-on-surface flex-1">Event Photos</h1>
        <span className="text-xs text-on-surface/50">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-outline/10 px-4">
        {(['upload', 'gallery'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand text-brand'
                : 'border-transparent text-on-surface/50 hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {activeTab === 'upload' ? (
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full max-w-xs h-40 rounded-3xl border-2 border-dashed border-brand/30
                         flex flex-col items-center justify-center gap-3 hover:border-brand/60
                         hover:bg-brand/5 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-4xl text-brand"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    add_photo_alternate
                  </span>
                  <span className="text-sm text-on-surface/70 text-center px-4">
                    Tap to pick photos<br />
                    <span className="text-xs text-on-surface/40">JPEG, PNG, WEBP · max 10 MB each</span>
                  </span>
                </>
              )}
            </button>

            {uploadError && (
              <p className="mt-4 text-sm text-red-600 text-center">{uploadError}</p>
            )}

            {photos.length > 0 && (
              <button
                onClick={() => setActiveTab('gallery')}
                className="mt-6 text-sm text-brand font-medium underline underline-offset-2"
              >
                View gallery ({photos.length})
              </button>
            )}
          </div>
        ) : (
          <PhotoGallery photos={photos} />
        )}
      </div>
    </div>
  );
}
