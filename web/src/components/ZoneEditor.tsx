'use client';

import { useRef, useState, useEffect, useCallback, useId } from 'react';

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
type GeometryKey = 'x_pct' | 'y_pct' | 'w_pct' | 'h_pct';

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

const DEFAULT_FONT_SIZES: Partial<Record<ZoneKey, number>> = {
  name_zone: 40,
  tag_zone: 28,
};

const DEFAULT_TEXT_COLORS: Partial<Record<ZoneKey, string>> = {
  name_zone: '#ffffff',
  tag_zone: '#a8dadc',
};

const KEYBOARD_STEP = 0.01;
const MIN_ZONE_SIZE = 0.01;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 300;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const finiteOr = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const defaultZone = (key: ZoneKey): Zone => ({
  x_pct: 0.1,
  y_pct: 0.1,
  w_pct: key === 'qr_zone' ? 0.25 : 0.5,
  h_pct: key === 'qr_zone' ? 0.25 : 0.12,
  font_size: DEFAULT_FONT_SIZES[key],
  color: DEFAULT_TEXT_COLORS[key],
});

const normalizeZone = (zone: Zone): Zone => {
  const x = clamp(finiteOr(zone.x_pct, 0), 0, 1 - MIN_ZONE_SIZE);
  const y = clamp(finiteOr(zone.y_pct, 0), 0, 1 - MIN_ZONE_SIZE);
  const normalized: Zone = {
    ...zone,
    x_pct: x,
    y_pct: y,
    w_pct: clamp(finiteOr(zone.w_pct, MIN_ZONE_SIZE), MIN_ZONE_SIZE, 1 - x),
    h_pct: clamp(finiteOr(zone.h_pct, MIN_ZONE_SIZE), MIN_ZONE_SIZE, 1 - y),
  };

  if (zone.font_size !== undefined) {
    normalized.font_size = clamp(
      finiteOr(zone.font_size, MIN_FONT_SIZE),
      MIN_FONT_SIZE,
      MAX_FONT_SIZE,
    );
  }

  return normalized;
};

/** Apply all pointer, keyboard, and numeric changes through the same bounds logic. */
const applyZoneUpdate = (zone: Zone, updates: Partial<Zone>): Zone => {
  const current = normalizeZone(zone);
  const updatesX = updates.x_pct !== undefined && Number.isFinite(updates.x_pct);
  const updatesY = updates.y_pct !== undefined && Number.isFinite(updates.y_pct);
  const updatesWidth = updates.w_pct !== undefined && Number.isFinite(updates.w_pct);
  const updatesHeight = updates.h_pct !== undefined && Number.isFinite(updates.h_pct);

  let x = current.x_pct;
  let y = current.y_pct;
  let width = current.w_pct;
  let height = current.h_pct;

  if (updatesX) {
    x = clamp(updates.x_pct!, 0, 1 - MIN_ZONE_SIZE);
  }
  if (updatesY) {
    y = clamp(updates.y_pct!, 0, 1 - MIN_ZONE_SIZE);
  }
  if (updatesWidth) {
    width = clamp(updates.w_pct!, MIN_ZONE_SIZE, 1 - x);
  }
  if (updatesHeight) {
    height = clamp(updates.h_pct!, MIN_ZONE_SIZE, 1 - y);
  }

  // Moving a zone preserves its size; resizing preserves its top-left position.
  if (updatesX && !updatesWidth) {
    x = clamp(x, 0, 1 - width);
  }
  if (updatesY && !updatesHeight) {
    y = clamp(y, 0, 1 - height);
  }

  const updated: Zone = {
    ...current,
    ...updates,
    x_pct: x,
    y_pct: y,
    w_pct: width,
    h_pct: height,
  };

  if (updates.font_size !== undefined) {
    updated.font_size = clamp(
      finiteOr(updates.font_size, current.font_size ?? MIN_FONT_SIZE),
      MIN_FONT_SIZE,
      MAX_FONT_SIZE,
    );
  }

  return updated;
};

const displayPercent = (value: number) => Math.round(value * 1000) / 10;

const describeZone = (key: ZoneKey, zone: Zone) => {
  const fontSize = zone.font_size !== undefined ? `, font size ${zone.font_size} pixels` : '';
  return `${ZONE_LABELS[key]} zone: X ${displayPercent(zone.x_pct)} percent, Y ${displayPercent(zone.y_pct)} percent, width ${displayPercent(zone.w_pct)} percent, height ${displayPercent(zone.h_pct)} percent${fontSize}.`;
};

interface Props {
  imageUrl: string;
  initialZones?: Partial<Zones>;
  onSave: (zones: Zones) => void;
}

export default function ZoneEditor({ imageUrl, initialZones = {}, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instructionsId = useId();
  const controlsId = useId();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zones, setZones] = useState<Zones>(() => ({
    qr_zone: initialZones.qr_zone ? normalizeZone(initialZones.qr_zone) : null,
    name_zone: initialZones.name_zone ? normalizeZone(initialZones.name_zone) : null,
    tag_zone: initialZones.tag_zone ? normalizeZone(initialZones.tag_zone) : null,
  }));
  const zonesRef = useRef(zones);
  const [activeZone, setActiveZone] = useState<ZoneKey>('name_zone');
  const [announcement, setAnnouncement] = useState('Guest Name zone selected.');
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

  const commitZone = useCallback((key: ZoneKey, zone: Zone | null, announce = true) => {
    const nextZones = { ...zonesRef.current, [key]: zone };
    zonesRef.current = nextZones;
    setZones(nextZones);

    if (announce) {
      setAnnouncement(zone ? describeZone(key, zone) : `${ZONE_LABELS[key]} zone cleared.`);
    }
  }, []);

  const updateZone = useCallback((key: ZoneKey, updates: Partial<Zone>, announce = true) => {
    const current = zonesRef.current[key] ?? defaultZone(key);
    commitZone(key, applyZoneUpdate(current, updates), announce);
  }, [commitZone]);

  const selectZone = (key: ZoneKey) => {
    setActiveZone(key);
    const zone = zonesRef.current[key];
    setAnnouncement(
      zone
        ? `${ZONE_LABELS[key]} zone selected. ${describeZone(key, zone)}`
        : `${ZONE_LABELS[key]} zone selected. No zone is set; use the canvas or numeric controls to create one.`,
    );
  };

  const getCanvasPosFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) * (canvas.width / rect.width), 0, canvas.width),
      y: clamp((clientY - rect.top) * (canvas.height / rect.height), 0, canvas.height),
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
    updateZone(activeZone, {
      x_pct: x / canvas.width,
      y_pct: y / canvas.height,
      w_pct: w / canvas.width,
      h_pct: h / canvas.height,
    }, false);
  }, [activeZone, updateZone]);

  const announceActiveGeometry = () => {
    const zone = zonesRef.current[activeZone];
    setAnnouncement(
      zone
        ? describeZone(activeZone, zone)
        : `${ZONE_LABELS[activeZone]} zone is not set. Use an arrow key to create and move it, or use the numeric controls.`,
    );
  };

  // ── Mouse handlers ───────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.currentTarget.focus({ preventScroll: true });
    startPosRef.current = getCanvasPosFromClient(e.clientX, e.clientY);
    drawingRef.current = true;
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    applyDrag(getCanvasPosFromClient(e.clientX, e.clientY));
  };
  const onMouseUp = () => {
    if (drawingRef.current) announceActiveGeometry();
    drawingRef.current = false;
  };

  // ── Touch handlers ───────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
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
    if (drawingRef.current) announceActiveGeometry();
    drawingRef.current = false;
  };

  const onCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      commitZone(activeZone, null);
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();

    const zone = zonesRef.current[activeZone] ?? defaultZone(activeZone);
    if (e.shiftKey) {
      const resizeUpdates: Partial<Zone> = {};
      if (e.key === 'ArrowLeft') resizeUpdates.w_pct = zone.w_pct - KEYBOARD_STEP;
      if (e.key === 'ArrowRight') resizeUpdates.w_pct = zone.w_pct + KEYBOARD_STEP;
      if (e.key === 'ArrowUp') resizeUpdates.h_pct = zone.h_pct - KEYBOARD_STEP;
      if (e.key === 'ArrowDown') resizeUpdates.h_pct = zone.h_pct + KEYBOARD_STEP;
      updateZone(activeZone, resizeUpdates);
      return;
    }

    const moveUpdates: Partial<Zone> = {};
    if (e.key === 'ArrowLeft') moveUpdates.x_pct = zone.x_pct - KEYBOARD_STEP;
    if (e.key === 'ArrowRight') moveUpdates.x_pct = zone.x_pct + KEYBOARD_STEP;
    if (e.key === 'ArrowUp') moveUpdates.y_pct = zone.y_pct - KEYBOARD_STEP;
    if (e.key === 'ArrowDown') moveUpdates.y_pct = zone.y_pct + KEYBOARD_STEP;
    updateZone(activeZone, moveUpdates);
  };

  const activeValue = zones[activeZone] ?? defaultZone(activeZone);
  const activeZoneIsSet = zones[activeZone] !== null;
  const inputClassName = 'w-full rounded border border-[#0f3460] bg-transparent px-2 py-1 text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-[#a8dadc]';

  const renderGeometryInput = (
    key: GeometryKey,
    label: string,
    min: number,
    max: number,
  ) => {
    const inputId = `${controlsId}-${key}`;
    return (
      <div>
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-400">
          {label} (%)
        </label>
        <input
          id={inputId}
          name={`${activeZone}-${key}`}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          min={displayPercent(min)}
          max={displayPercent(max)}
          step="any"
          value={displayPercent(activeValue[key])}
          onChange={(e) => {
            const value = e.currentTarget.valueAsNumber;
            if (Number.isFinite(value)) updateZone(activeZone, { [key]: value / 100 });
          }}
          className={inputClassName}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Zone selector */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select a zone to edit">
        {(Object.keys(ZONE_LABELS) as ZoneKey[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={activeZone === key}
            aria-label={`${ZONE_LABELS[key]}, ${zones[key] ? 'zone set' : 'zone not set'}`}
            onClick={() => selectZone(key)}
            className={`px-3 py-1 rounded text-sm font-medium border-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#a8dadc] focus-visible:ring-offset-2 ${
              activeZone === key
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
            style={{ borderColor: activeZone === key ? ZONE_COLORS[key] : undefined }}
          >
            <span
              aria-hidden="true"
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: ZONE_COLORS[key] }}
            />
            {ZONE_LABELS[key]}
            {zones[key] && <span aria-hidden="true"> ✓</span>}
          </button>
        ))}
      </div>

      <p id={instructionsId} className="text-sm text-[#a8dadc]">
        Editing: <strong>{ZONE_LABELS[activeZone]}</strong> — drag on the image, or focus it and use arrow keys to move. Hold Shift with an arrow key to resize. Press Delete or Backspace to clear the zone. You can also set every value with the numeric controls below.
      </p>

      {/* Canvas — dimensions match actual image aspect ratio to prevent zone distortion */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        tabIndex={0}
        aria-label={`Template zone editing canvas. Active zone: ${ZONE_LABELS[activeZone]}.`}
        aria-describedby={instructionsId}
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Delete Backspace"
        className="w-full rounded border border-[#0f3460] cursor-crosshair touch-none focus-visible:ring-2 focus-visible:ring-[#a8dadc] focus-visible:ring-offset-2"
        onFocus={announceActiveGeometry}
        onKeyDown={onCanvasKeyDown}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        Use the numeric controls below to set the active template zone.
      </canvas>

      <fieldset className="rounded border border-[#0f3460] p-3">
        <legend className="px-1 text-sm font-medium">
          {ZONE_LABELS[activeZone]} Geometry
        </legend>
        {!activeZoneIsSet && (
          <p className="mb-3 text-xs text-gray-400">
            No zone is set. Changing any value creates one with the values shown.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {renderGeometryInput('x_pct', 'X position', 0, 1 - activeValue.w_pct)}
          {renderGeometryInput('y_pct', 'Y position', 0, 1 - activeValue.h_pct)}
          {renderGeometryInput('w_pct', 'Width', MIN_ZONE_SIZE, 1 - activeValue.x_pct)}
          {renderGeometryInput('h_pct', 'Height', MIN_ZONE_SIZE, 1 - activeValue.y_pct)}
          {activeZone !== 'qr_zone' && (
            <div>
              <label htmlFor={`${controlsId}-font-size`} className="mb-1 block text-xs font-medium text-gray-400">
                Font size (px)
              </label>
              <input
                id={`${controlsId}-font-size`}
                name={`${activeZone}-font-size`}
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step="1"
                value={activeValue.font_size ?? DEFAULT_FONT_SIZES[activeZone]}
                onChange={(e) => {
                  const value = e.currentTarget.valueAsNumber;
                  if (Number.isFinite(value)) updateZone(activeZone, { font_size: value });
                }}
                className={inputClassName}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => commitZone(activeZone, null)}
          disabled={!activeZoneIsSet}
          className="mt-3 rounded border border-[#0f3460] px-3 py-1 text-sm text-gray-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#a8dadc] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear {ZONE_LABELS[activeZone]} Zone
        </button>
      </fieldset>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {/* Save button */}
      <button
        type="button"
        onClick={() => onSave(zones)}
        className="px-6 py-2 bg-[#e94560] text-white rounded font-semibold hover:bg-opacity-90 focus-visible:ring-2 focus-visible:ring-[#a8dadc] focus-visible:ring-offset-2"
      >
        Save Template Zones
      </button>
    </div>
  );
}
