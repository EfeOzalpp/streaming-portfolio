// src/ssr/dynamic-app/title.enhancer.ts
// Enhances the server-rendered title (title.ssr.ts) in place -- measures
// marquee widths, gates color updates on visibility, and applies per-letter
// colors -- mirroring title.jsx's logic exactly but via direct DOM writes,
// so React never touches this subtree.

export interface TitleEnhancerHandle {
  updateColors: (activeAlts: string[], colorMapping: Record<string, any>) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}

const MULS: [number, number, number] = [1.05, 1.25, 1.1];

function adjustBrightness(hex: string, mul: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.floor(r * mul)));
  g = Math.min(255, Math.max(0, Math.floor(g * mul)));
  b = Math.min(255, Math.max(0, Math.floor(b * mul)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const NBSP_RE = new RegExp(String.fromCharCode(160), 'g');
function normalizeKey(v: any): string {
  return String(v ?? '')
    .replace(NBSP_RE, ' ')
    .replace(/ /g, ' ')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTriplet(v: any): v is [string, string, string] {
  return Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'string');
}

function sameTriplet(a: any, b: any): boolean {
  return a?.[0] === b?.[0] && a?.[1] === b?.[1] && a?.[2] === b?.[2];
}

export function enhanceTitle(): TitleEnhancerHandle | null {
  const root = document.getElementById('dynamic-title-root');
  const movingTitleEl = document.getElementById('dynamic-moving-title');
  const textWrapperEl = document.getElementById('dynamic-moving-text-wrapper');
  if (!root || !movingTitleEl || !textWrapperEl) return null;

  const letterEls = Array.from(textWrapperEl.querySelectorAll('.moving-letter')) as HTMLElement[];

  // ---- marquee width measurement (matches title.jsx's useLayoutEffect) ----
  let lastContainerW = -1;
  let lastContentW = -1;
  const applyMarqueeWidths = () => {
    const containerW = movingTitleEl.clientWidth;
    const contentW = textWrapperEl.offsetWidth;
    if (Math.abs(containerW - lastContainerW) < 2 && Math.abs(contentW - lastContentW) < 2) return;
    lastContainerW = containerW;
    lastContentW = contentW;
    movingTitleEl.style.setProperty('--marquee-container-w', `${containerW}px`);
    movingTitleEl.style.setProperty('--marquee-content-w', `${contentW}px`);
  };
  applyMarqueeWidths();
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applyMarqueeWidths) : null;
  resizeObserver?.observe(movingTitleEl);
  resizeObserver?.observe(textWrapperEl);

  // ---- color state (matches title.jsx's stableColors/pendingRef dance) ----
  let isVisible = true;
  let stableColors: [string, string, string] = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
  let pendingColors: [string, string, string] | null = null;

  const applyColors = (triplet: [string, string, string]) => {
    if (sameTriplet(stableColors, triplet)) return;
    stableColors = triplet;
    const colors: [string, string, string] = [
      adjustBrightness(triplet[0], MULS[0]),
      adjustBrightness(triplet[1], MULS[1]),
      adjustBrightness(triplet[2], MULS[2]),
    ];
    letterEls.forEach((el, index) => {
      el.style.color = colors[index % 2 === 0 ? index % colors.length : (index + 1) % colors.length];
    });
  };

  const intersectionObserver = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        ([entry]) => {
          isVisible = !!entry.isIntersecting;
          if (isVisible && pendingColors && !sameTriplet(stableColors, pendingColors)) {
            applyColors(pendingColors);
            pendingColors = null;
          }
        },
        { threshold: 0.01 }
      )
    : null;
  intersectionObserver?.observe(root);

  // normalized colorMapping is cached per-reference since it's a static import upstream
  let normalizedMappingCache: Record<string, any> | null = null;
  let normalizedMappingSource: any = null;
  const getNormalizedMapping = (colorMapping: Record<string, any>) => {
    if (normalizedMappingSource === colorMapping && normalizedMappingCache) return normalizedMappingCache;
    const out: Record<string, any> = Object.create(null);
    for (const [k, v] of Object.entries(colorMapping || {})) {
      const nk = normalizeKey(k);
      if (!nk) continue;
      out[nk] = v;
    }
    normalizedMappingCache = out;
    normalizedMappingSource = colorMapping;
    return out;
  };

  // ---- driven by the same alt-observer that colors the sort chrome/cards ----
  const updateColors = (activeAlts: string[], colorMapping: Record<string, any>) => {
    const screenWidth = window.innerWidth;
    const paletteCount = screenWidth > 1024 ? 3 : screenWidth >= 768 ? 2 : 1;

    const list = Array.isArray(activeAlts) ? activeAlts.map(normalizeKey).filter(Boolean) : [];
    const pickedAlts = list.slice(0, paletteCount);
    const normalizedMapping = getNormalizedMapping(colorMapping);

    const palettes = pickedAlts
      .map((alt) => {
        const p = normalizedMapping[alt];
        return Array.isArray(p) && p.length >= 4 ? p : null;
      })
      .filter(Boolean) as string[][];

    if (palettes.length === 0) return;

    const idxByLane = [0, 1, 3];
    const triplet = [0, 1, 2].map((lane) => palettes[lane % palettes.length][idxByLane[lane]]);
    if (!isTriplet(triplet) || !triplet.every(Boolean)) return;

    if (isVisible) {
      applyColors(triplet);
      pendingColors = null;
    } else {
      pendingColors = triplet;
    }
  };

  const setPaused = (paused: boolean) => {
    movingTitleEl.classList.toggle('paused', paused);
  };

  const dispose = () => {
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
  };

  return { updateColors, setPaused, dispose };
}
