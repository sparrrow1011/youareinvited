'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export interface Zone {
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  font_size?: number;
  color?: string;
}

export interface Zones {
  qr_zone: Zone | null;
  name_zone: Zone | null;
  tag_zone: Zone | null;
}

type ZoneKey = keyof Zones;

const ZONE_COLORS: Record<ZoneKey, string> = {
  qr_zone: '#e94560',
  name_zone: '#a8dadc',
  tag_zone: '#f0c040',
};

const ZONE_LABELS: Record<ZoneKey, string> = {
  qr_zone: 'QR Code',
  name_zone: 'Guest Name',
  tag_zone: 'Tag / Category',
};

interface Props {
  imageUrl: string;
  initialZones?: Partial<Zones>;
  onSave: (zones: Zones) => void;
}

export default function ZoneEditor({ imageUrl, initialZones = {}, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zones, setZones] = useState<Zones>({
    qr_zone: initialZones.qr_zone ?? null,
    name_zone: initialZones.name_zone ?? null,
    tag_zone: initialZones.tag_zone ?? null,
  });
  const [activeZone, setActiveZone] = useState<ZoneKey>('name_zone');
  const drawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Load image — set canvas dimensions to match actual image aspect ratio
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      // Keep width fixed at 800; scale height to preserve aspect ratio
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      setCanvasSize({ width: 800, height: Math.round(800 * aspectRatio) });
      setImage(img);
    };
  }, [imageUrl]);

  // Draw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    // Draw each zone
    (Object.keys(zones) as ZoneKey[]).forEach((key) => {
      const zone = zones[key];
      if (!zone) return;
      const x = zone.x_pct * width;
      const y = zone.y_pct * height;
      const w = zone.w_pct * width;
      const h = zone.h_pct * height;
      ctx.strokeStyle = ZONE_COLORS[key];
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = ZONE_COLORS[key] + '33'; // 20% opacity
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = ZONE_COLORS[key];
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(ZONE_LABELS[key], x + 4, y + 14);
    });
  }, [image, zones]);

  useEffect(() => { redraw(); }, [redraw]);

  const getCanvasPosFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const applyDrag = useCallback((pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sp = startPosRef.current;
    const x = Math.min(sp.x, pos.x);
    const y = Math.min(sp.y, pos.y);
    const w = Math.abs(pos.x - sp.x);
    const h = Math.abs(pos.y - sp.y);
    setZones((prev) => ({
      ...prev,
      [activeZone]: {
        x_pct: x / canvas.width,
        y_pct: y / canvas.height,
        w_pct: w / canvas.width,
        h_pct: h / canvas.height,
        font_size: activeZone === 'name_zone' ? 40 : activeZone === 'tag_zone' ? 28 : undefined,
        color: activeZone === 'name_zone' ? '#ffffff' : activeZone === 'tag_zone' ? '#a8dadc' : undefined,
      } as Zone,
    }));
  }, [activeZone]);

  // ── Mouse handlers ───────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startPosRef.current = getCanvasPosFromClient(e.clientX, e.clientY);
    drawingRef.current = true;
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    applyDrag(getCanvasPosFromClient(e.clientX, e.clientY));
  };
  const onMouseUp = () => { drawingRef.current = false; };

  // ── Touch handlers ───────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    startPosRef.current = getCanvasPosFromClient(t.clientX, t.clientY);
    drawingRef.current = true;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    const t = e.touches[0];
    applyDrag(getCanvasPosFromClient(t.clientX, t.clientY));
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = false;
  };

  return (
    <div className="space-y-4">
      {/* Zone selector */}
      <div className="flex gap-2">
        {(Object.keys(ZONE_LABELS) as ZoneKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveZone(key)}
            className={`px-3 py-1 rounded text-sm font-medium border-2 transition-colors ${
              activeZone === key
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
            style={{ borderColor: activeZone === key ? ZONE_COLORS[key] : undefined }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: ZONE_COLORS[key] }}
            />
            {ZONE_LABELS[key]}
            {zones[key] && ' ✓'}
          </button>
        ))}
      </div>

      <p className="text-sm text-[#a8dadc]">
        Drawing: <strong>{ZONE_LABELS[activeZone]}</strong> — click and drag on the image to set zone
      </p>

      {/* Canvas — dimensions match actual image aspect ratio to prevent zone distortion */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full rounded border border-[#0f3460] cursor-crosshair touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Save button */}
      <button
        onClick={() => onSave(zones)}
        className="px-6 py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90"
      >
        Save Template Zones
      </button>
    </div>
  );
}
