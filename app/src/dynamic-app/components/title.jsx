// src/dynamic-app/components/title.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStyleInjection } from '../../state/providers/style-injector.ts';
import titleCss from '../../styles/dynamic-app/title.css?raw';

const isTriplet = (v) =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'string');

const TitleDivider = ({
  pauseAnimation,
  activeAlts = [],
  colorMapping = {},
  movingTextColors, // optional fallback only for initial boot
}) => {
  useStyleInjection(titleCss, 'dynamic-app-style-title');

  const rootRef = useRef(null);
  const movingTitleRef = useRef(null);
  const textWrapperRef = useRef(null);

  // measure real container/content widths so the marquee's off-screen
  // start/end positions are exact at every breakpoint, not guessed via
  // vw/% units (which don't reconcile: translateX(%) is self-relative)
  useLayoutEffect(() => {
    const containerEl = movingTitleRef.current;
    const contentEl = textWrapperRef.current;
    if (!containerEl || !contentEl || typeof ResizeObserver === 'undefined') return;

    // Track the last-applied widths so a ResizeObserver tick that reports
    // the same (or near-same, sub-pixel-jitter) size doesn't rewrite the
    // custom properties -- the running @keyframes animation reads these for
    // its start/end translateX, so any reset mid-flight makes it visibly
    // jump/stutter, which happens often during scroll (scrollbar show/hide,
    // nav reflow, etc. all fire spurious ResizeObserver ticks).
    let lastContainerW = -1;
    let lastContentW = -1;

    const applyMarqueeWidths = () => {
      const containerW = containerEl.clientWidth;
      const contentW = contentEl.offsetWidth;

      if (Math.abs(containerW - lastContainerW) < 2 && Math.abs(contentW - lastContentW) < 2) return;

      lastContainerW = containerW;
      lastContentW = contentW;
      containerEl.style.setProperty('--marquee-container-w', `${containerW}px`);
      containerEl.style.setProperty('--marquee-content-w', `${contentW}px`);
    };

    applyMarqueeWidths();

    const ro = new ResizeObserver(applyMarqueeWidths);
    ro.observe(containerEl);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, []);

  // visibility gating (same behavior as your old working one)
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setIsVisible(!!entry.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // viewport width
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // <768 => 1, 768-1024 => 2, >1024 => 3
  const paletteCount = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;

  const normalizeKey = (v) =>
    String(v ?? '')
      .replace(/\u00a0/g, ' ')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedColorMapping = useMemo(() => {
    const out = Object.create(null);
    for (const [k, v] of Object.entries(colorMapping || {})) {
      const nk = normalizeKey(k);
      if (!nk) continue;
      out[nk] = v;
    }
    return out;
  }, [colorMapping]);

  const lastGoodAltsRef = useRef([]);
  const pickedAlts = useMemo(() => {
    const list = Array.isArray(activeAlts) ? activeAlts.map(normalizeKey).filter(Boolean) : [];

    if (list.length > 0) lastGoodAltsRef.current = list;

    const base = lastGoodAltsRef.current || [];
    return base.slice(0, paletteCount);
  }, [activeAlts, paletteCount]);

  const derivedTripletOrNull = useMemo(() => {
    const palettes = pickedAlts
      .map((alt) => {
        const p = normalizedColorMapping?.[alt];
        return Array.isArray(p) && p.length >= 4 ? p : null;
      })
      .filter(Boolean);

    if (palettes.length === 0) {
      if (isTriplet(movingTextColors)) return movingTextColors;
      return null;
    }

    const idxByLane = [0, 1, 3];

    const out = [0, 1, 2].map((lane) => {
      const palette = palettes[lane % palettes.length];
      return palette[idxByLane[lane]];
    });

    return out.every(Boolean) ? out : null;
  }, [pickedAlts, normalizedColorMapping, movingTextColors]);

  const defaultTriplet = ['#70c6b0', '#5670b5', '#50b0c5'];

  const [stableColors, setStableColors] = useState(() => {
    if (isTriplet(movingTextColors)) return movingTextColors;
    return defaultTriplet;
  });

  const pendingRef = useRef(null);
  const sameTriplet = (a, b) => a?.[0] === b?.[0] && a?.[1] === b?.[1] && a?.[2] === b?.[2];

  useEffect(() => {
    if (!isTriplet(derivedTripletOrNull)) return;

    if (isVisible) {
      setStableColors((prev) => (sameTriplet(prev, derivedTripletOrNull) ? prev : derivedTripletOrNull));
      pendingRef.current = null;
    } else {
      pendingRef.current = derivedTripletOrNull;
    }
  }, [derivedTripletOrNull, isVisible]);

  useEffect(() => {
    if (isVisible && pendingRef.current && !sameTriplet(stableColors, pendingRef.current)) {
      setStableColors(pendingRef.current);
      pendingRef.current = null;
    }
  }, [isVisible, stableColors]);

  const adjustBrightness = (hex, mul) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.floor(r * mul)));
    g = Math.min(255, Math.max(0, Math.floor(g * mul)));
    b = Math.min(255, Math.max(0, Math.floor(b * mul)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
      .toString(16)
      .padStart(2, '0')}`;
  };

  const colors = useMemo(() => {
    const muls = [1.05, 1.25, 1.1];
    return [
      adjustBrightness(stableColors[0], muls[0]),
      adjustBrightness(stableColors[1], muls[1]),
      adjustBrightness(stableColors[2], muls[2]),
    ];
  }, [stableColors]);

  const titleLine = useMemo(() => 'Dynamic Media Institute', []);

  const renderColoredLetters = (text) =>
    Array.from(text).map((char, index) => {
      if (char === ' ') {
        return <span key={`space-${index}`} className="moving-text-space" aria-hidden="true">&nbsp;</span>;
      }

      return (
        <span
          key={`char-${index}`}
          className="moving-letter"
          style={{
            color: colors[index % 2 === 0 ? index % colors.length : (index + 1) % colors.length],
            transition: 'color 120ms linear',
          }}
        >
          {char}
        </span>
      );
    });

  return (
    <div className="title-container" ref={rootRef}>
      <div className="static-title">
        <h1>
          MassArt 2026
        </h1>
      </div>

      <div className={`moving-title ${pauseAnimation ? 'paused' : ''}`} ref={movingTitleRef}>
        <h1 className="title-with-icon moving-text-wrapper static-color-title" ref={textWrapperRef}>
          {renderColoredLetters(titleLine)}
        </h1>
      </div>
    </div>
  );
};

export default TitleDivider;
