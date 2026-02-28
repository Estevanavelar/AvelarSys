import React, { useCallback, useRef, useState } from 'react';

const SIZE = 200;
const PAD = 40;
const SPACING = (SIZE - PAD * 2) / 2;
const DOT_R = 6;
const RING_R = 20;
const HIT_R = 32;

const DOTS: { id: number; cx: number; cy: number }[] = [];
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    DOTS.push({ id: row * 3 + col + 1, cx: PAD + col * SPACING, cy: PAD + row * SPACING });
  }
}

/** Verifica se a string é um padrão Android (apenas dígitos 1-9, 4-9 caracteres) */
export function isPatternLock(value: string): boolean {
  if (!value || value.length < 4 || value.length > 9) return false;
  return /^[1-9]+$/.test(value);
}

interface PatternLockProps {
  value: string;
  onChange?: (pattern: string) => void;
  /** Modo somente leitura: exibe o padrão desenhado sem interação */
  readOnly?: boolean;
}

export default function PatternLock({ value, onChange, readOnly = false }: PatternLockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef(false);
  const patternRef = useRef(value);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [, forceRender] = useState(0);

  patternRef.current = value;

  const toSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * SIZE,
      y: ((clientY - rect.top) / rect.height) * SIZE,
    };
  }, []);

  const hitTest = useCallback((sx: number, sy: number): number | null => {
    for (const dot of DOTS) {
      const dx = sx - dot.cx;
      const dy = sy - dot.cy;
      if (Math.sqrt(dx * dx + dy * dy) <= HIT_R) return dot.id;
    }
    return null;
  }, []);

  const addDot = useCallback((id: number) => {
    if (readOnly || !onChange) return;
    const cur = patternRef.current;
    if (cur.length >= 9) return;
    if (cur.includes(String(id))) return;
    const next = cur + String(id);
    patternRef.current = next;
    onChange(next);
    forceRender((n) => n + 1);
  }, [onChange, readOnly]);

  const onStart = useCallback((clientX: number, clientY: number) => {
    drawingRef.current = true;
    const pt = toSVG(clientX, clientY);
    setPointer(pt);
    const dot = hitTest(pt.x, pt.y);
    if (dot) addDot(dot);
  }, [toSVG, hitTest, addDot]);

  const onMove = useCallback((clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const pt = toSVG(clientX, clientY);
    setPointer(pt);
    const dot = hitTest(pt.x, pt.y);
    if (dot) addDot(dot);
  }, [toSVG, hitTest, addDot]);

  const onEnd = useCallback(() => {
    drawingRef.current = false;
    setPointer(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onStart(e.clientX, e.clientY);

    const moveHandler = (ev: MouseEvent) => onMove(ev.clientX, ev.clientY);
    const upHandler = () => {
      onEnd();
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }, [onStart, onMove, onEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    onStart(t.clientX, t.clientY);

    const moveHandler = (ev: TouchEvent) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      if (touch) onMove(touch.clientX, touch.clientY);
    };
    const endHandler = () => {
      onEnd();
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
      document.removeEventListener('touchcancel', endHandler);
    };
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
    document.addEventListener('touchcancel', endHandler);
  }, [onStart, onMove, onEnd]);

  const seq = value.split('').map(Number).filter((d) => d >= 1 && d <= 9);
  const dotById = (id: number) => DOTS.find((d) => d.id === id)!;
  const lastDot = seq.length > 0 ? dotById(seq[seq.length - 1]) : null;

  const displaySize = readOnly ? 120 : SIZE;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {readOnly ? 'Padrão cadastrado' : 'Desenhe o padrão'}
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={displaySize}
        height={displaySize}
        className={`rounded-xl select-none ${readOnly ? '' : 'cursor-crosshair'}`}
        style={{ touchAction: readOnly ? 'auto' : 'none', background: 'hsl(var(--muted) / 0.25)' }}
        onMouseDown={readOnly ? undefined : handleMouseDown}
        onTouchStart={readOnly ? undefined : handleTouchStart}
      >
        {/* Linhas entre pontos selecionados */}
        {seq.length > 1 && seq.map((id, i) => {
          if (i === 0) return null;
          const a = dotById(seq[i - 1]);
          const b = dotById(id);
          return (
            <line
              key={`seg-${i}`}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke="var(--orange)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.6"
            />
          );
        })}

        {/* Linha elástica (tracejada) seguindo o dedo - só quando não é readOnly */}
        {!readOnly && pointer && lastDot && (
          <line
            x1={lastDot.cx} y1={lastDot.cy}
            x2={pointer.x} y2={pointer.y}
            stroke="var(--orange)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.35"
            strokeDasharray="5 4"
          />
        )}

        {/* Pontos */}
        {DOTS.map((dot) => {
          const idx = seq.indexOf(dot.id);
          const isActive = idx >= 0;
          return (
            <g key={dot.id}>
              {/* Anel externo - aparece em todos; destaca quando ativo */}
              <circle
                cx={dot.cx} cy={dot.cy} r={RING_R}
                fill="none"
                stroke={isActive ? 'var(--orange)' : 'hsl(var(--border))'}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 0.8 : 0.35}
              />

              {/* Preenchimento do anel quando ativo */}
              {isActive && (
                <circle
                  cx={dot.cx} cy={dot.cy} r={RING_R}
                  fill="var(--orange)"
                  opacity="0.15"
                />
              )}

              {/* Ponto central */}
              <circle
                cx={dot.cx} cy={dot.cy} r={isActive ? DOT_R + 2 : DOT_R}
                fill={isActive ? 'var(--orange)' : 'hsl(var(--foreground))'}
                opacity={isActive ? 1 : 0.3}
              />

              {/* Número da ordem dentro do anel */}
              {isActive && (
                <text
                  x={dot.cx} y={dot.cy - RING_R - 6}
                  textAnchor="middle" dominantBaseline="auto"
                  fill="var(--orange)"
                  fontSize="10" fontWeight="800"
                >
                  {idx + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!readOnly && onChange && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
