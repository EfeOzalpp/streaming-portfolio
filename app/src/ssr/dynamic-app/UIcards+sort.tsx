// src/ssr/dynamic-app/UIcards+sort.tsx
import { ensureDynamicThemePreload } from '../../dynamic-app/preload-dynamic-app-route';
import { setupIntersectionObserver } from '../../dynamic-app/lib/cardTransformCore';
import setupAltObserver from '../../dynamic-app/lib/setupAltObserver';
import { colorMapping } from '../../dynamic-app/lib/colorString';

/* =========================
   Config / selectors
   ========================= */
const SEL = {
  list: '.UI-card-divider',
  card: '.card-container',
  imgPref: '.ui-image2',    // prefer this image
  imgFallback: '.ui-image1' // fallback image
};

/* =========================
   Helpers
   ========================= */

// normalize for safer alphabetic sorting (accent/case/numeric)
function normalizeForSort(s?: string | null) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en');
}
function compareAsc(a: string, b: string) {
  return normalizeForSort(a).localeCompare(normalizeForSort(b), 'en', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });
}
function compareDesc(a: string, b: string) {
  return -compareAsc(a, b);
}

// fresh shuffle each call (seedless)
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// get <img alt> from a card; prefer .ui-image2 then .ui-image1
function getAltFromCard(cardEl: HTMLElement): string {
  const img =
    (cardEl.querySelector(SEL.imgPref) as HTMLImageElement | null) ||
    (cardEl.querySelector(SEL.imgFallback) as HTMLImageElement | null);
  return (img?.getAttribute('alt') || '').trim();
}

// ES2019-safe replaceAll via split/join
function replaceAllCompat(h: string, n: string, r: string) {
  return h.split(n).join(r);
}

// Retag index-based classes if you rely on them for styling
function retagIndexClasses(cardEl: HTMLElement, oldIndex: number, newIndex: number) {
  const rewrite = (el: Element) => {
    const node = el as HTMLElement;
    const cls = node.className;
    if (typeof cls === 'string' && cls) {
      let next = cls;
      next = replaceAllCompat(next, `custom-card-${oldIndex}-2`, `custom-card-${newIndex}-2`);
      next = replaceAllCompat(next, `custom-card-${oldIndex}`, `custom-card-${newIndex}`);
      node.className = next;
    }
  };
  rewrite(cardEl);
  cardEl.querySelectorAll('*').forEach(rewrite);
}

// tiny debounce
function debounce<F extends (...args: any[]) => void>(fn: F, ms = 120) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// hex (#rrggbb) -> rgba(r,g,b,a) with fallback to original if parse fails
function hexToRgba(hex: string, alpha = 0.65): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =========================
   SortBy chrome color from current DOM order
   ========================= */

// Rule: ≥1025px → 3rd card, 768–1024 → 2nd card, <768 → 1st card.
// Use that card’s alt → colorMapping[alt][2] (border) / colorMapping[alt][3] (box-shadow),
// matching the React sortBy.jsx treatment used by the shadow-embedded widget.
function computeViewportIndex(width: number) {
  return width >= 1025 ? 2 : width >= 768 ? 1 : 0;
}

function applySortChromeColorFromDomOrder(listContainer: HTMLElement, sortRoot: HTMLElement | null) {
  if (!sortRoot || !listContainer) return;

  const cards = Array.from(listContainer.querySelectorAll(SEL.card)) as HTMLElement[];
  if (cards.length === 0) return;

  const idx = computeViewportIndex(window.innerWidth);
  const target = cards[idx];
  if (!target) return;

  const alt = getAltFromCard(target);
  if (!alt) return;

  const colors = (colorMapping as any)?.[alt];
  if (!Array.isArray(colors)) return;

  const borderColor = colors[2] || '#ffffff';
  const boxShadowColor = colors[3] || '#ffffff';

  const borderRgba = hexToRgba(borderColor, 0.6);

  (sortRoot as HTMLElement).style.border = `solid 1.6px ${borderRgba}`;
  (sortRoot as HTMLElement).style.boxShadow = `
    0 1px 8px rgba(0,0,0,0.1),
    0 22px 8px rgba(0,0,0,0.08),
    8px 8px ${boxShadowColor}
  `;

  // Listbox border matches the same color, no top edge (sits flush under the trigger)
  const optionsEl = sortRoot.querySelector('.options-container') as HTMLElement | null;
  if (optionsEl) {
    optionsEl.style.border = `solid 1.6px ${borderRgba}`;
    optionsEl.style.borderTop = 'none';
  }
}

/* =========================
   Progressive HQ upgrade (visible first + background queue)
   ========================= */

// Quick pass: upgrade any images currently visible on screen
function upgradeVisibleImages(container: HTMLElement | Document) {
  const imgs = Array.from(container.querySelectorAll('img[data-src-full]')) as HTMLImageElement[];
  const vh = window.innerHeight;
  for (const img of imgs) {
    const rect = img.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < vh;
    const full = (img.dataset as any)?.srcFull;
    if (visible && full && img.src !== full) {
      img.src = full;
      img.removeAttribute('data-src-full');
    }
  }
}

// Preload a URL with low priority then resolve (no swap here)
function preload(fullUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const ghost = new Image();
    try { (ghost as any).decoding = 'async'; } catch {}
    try { (ghost as any).fetchPriority = 'low'; } catch {}
    ghost.onload = () => resolve();
    ghost.onerror = () => resolve(); // tolerate failures; keep LQ
    ghost.src = fullUrl;
  });
}

// Background queue that eventually swaps every remaining image. Factory so
// each enhanceDynamicThemeSSR() call gets its own started/cancelled state
// instead of sharing module-level flags that never reset across calls.
function createBackgroundImageUpgrader() {
  let started = false;
  let cancelled = false;

  function run(root: Document | HTMLElement, maxConcurrent = 3) {
    if (started) return;
    started = true;

    const pool = new Set<Promise<any>>();
    const allImgs = Array.from(root.querySelectorAll('img[data-src-full]')) as HTMLImageElement[];

    // Optional: prioritize by distance from viewport top (still “all”, just nicer order)
    const vhMid = window.scrollY + window.innerHeight / 2;
    allImgs.sort((a, b) => {
      const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
      const ya = ra.top + window.scrollY; const yb = rb.top + window.scrollY;
      return Math.abs(ya - vhMid) - Math.abs(yb - vhMid);
    });

    let index = 0;

    const pump = () => {
      if (cancelled) return;
      while (pool.size < maxConcurrent && index < allImgs.length) {
        const el = allImgs[index++];
        const full = (el.dataset as any)?.srcFull;
        if (!full) continue;

        const task = preload(full).then(() => {
          if (cancelled) return;
          // If still pointing to LQ and not already swapped, replace
          if (el.isConnected && el.getAttribute('data-src-full') === full) {
            // keep lazy decoding; just change the source
            el.src = full;
            el.removeAttribute('data-src-full');
          }
        }).finally(() => {
          pool.delete(task);
          pump();
        });

        pool.add(task);
      }
    };

    pump();
  }

  function cancel() { cancelled = true; }

  return { run, cancel };
}

/* =========================
   Main enhancer (DOM-driven, seed-proof for A↔Z)
   ========================= */

export function enhanceDynamicThemeSSR(opts: {
  onColorChange?: (alt: string, colors: string[]) => void;
  onActiveAltsChange?: (alts: string[]) => void;
} = {}) {
  const { onColorChange, onActiveAltsChange } = opts;

  const host = document.getElementById('dynamic-theme-ssr');
  if (!host) {
    // This route only works when #dynamic-theme-ssr was injected by the server
    // (see server/render/dynamicRoute.ts + server/html.ts). If this ever fires,
    // something is mounting DynamicThemeRoute without a real SSR page load
    // (e.g. client-side routing instead of a full <a href> navigation) --
    // the page will render blank without this snapshot.
    console.error('[dynamic-theme] #dynamic-theme-ssr not found -- this route requires a full page load, not client-side navigation.');
    return;
  }
  if ((host as any).__enhanced) return;
  (host as any).__enhanced = true;

  // make the SSR section interactive now
  host.classList.remove('ssr-initial');
  (host as HTMLElement).style.pointerEvents = 'auto';

  // If your CSS was disabling pointer events on the snapshot, force-enable:
  const snapshot = (document.getElementById('dynamic-snapshot') as HTMLElement | null) || host;
  if (snapshot) snapshot.style.pointerEvents = 'auto';

  const listContainer = snapshot?.querySelector(SEL.list) as HTMLElement | null;
  if (!listContainer) {
    console.error('[dynamic-theme] .UI-card-divider not found inside the SSR snapshot -- cards grid markup is missing or malformed.');
    return;
  }

  const bgUpgrader = createBackgroundImageUpgrader();

  // Sort UI bits
  const sortRoot = document.querySelector('#dynamic-sortby-mount .custom-dropdown') as HTMLElement | null;
  const selectEl = sortRoot?.querySelector('.custom-select');
  const arrowEl = sortRoot?.querySelector('.custom-arrow');
  const selectedValueEl = sortRoot?.querySelector('.selected-value h5');

  let optionsEl = sortRoot?.querySelector('.options-container') as HTMLElement | null;
  if (!optionsEl) {
    optionsEl = document.createElement('div');
    optionsEl.className = 'options-container';
    optionsEl.style.display = 'none';
    optionsEl.innerHTML = `
      <div class="option selected" data-value="random">Randomized</div>
      <div class="option" data-value="titleAsc">A to Z</div>
      <div class="option" data-value="titleDesc">Z to A</div>
    `;
    sortRoot?.appendChild(optionsEl);
  }

  const openOptions = () => { optionsEl!.style.display = ''; arrowEl?.classList.add('open'); };
  const closeOptions = () => { optionsEl!.style.display = 'none'; arrowEl?.classList.remove('open'); };
  const onDocumentMousedown = (e: MouseEvent) => { if (!sortRoot?.contains(e.target as Node)) closeOptions(); };
  document.addEventListener('mousedown', onDocumentMousedown);
  selectEl?.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
  selectEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = optionsEl!.style.display !== 'none';
    isOpen ? closeOptions() : openOptions();
  });

  const setSelectedLabel = (mode: string) => {
    if (!selectedValueEl) return;
    selectedValueEl.textContent =
      mode === 'titleAsc' ? 'A to Z' :
      mode === 'titleDesc' ? 'Z to A' : 'Randomized';
  };
  const setSelectedClass = (mode: string) => {
    optionsEl!.querySelectorAll('.option').forEach((o) => {
      o.classList.toggle('selected', (o as HTMLElement).getAttribute('data-value') === mode);
    });
  };

  // Base SSR enhancements (always root = document)
  const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  setupIntersectionObserver(prefersReduced, document);

  // Observer for color dynamics — shares setupAltObserver with the shadow-embedded path
  let disposeAltObs: (() => void) | null = null;
  const rearmAlt = () => {
    disposeAltObs?.();
    disposeAltObs = setupAltObserver(
      (alt1: string) => {
        const colors = (colorMapping as any)?.[alt1];
        if (typeof onColorChange === 'function' && colors) onColorChange(alt1, colors);
      },
      () => { /* no-op */ },
      document,
      {
        onActivateMany: (alts: string[]) => onActiveAltsChange?.(alts),
        topN: 3,
      }
    );
  };

  const afterReorder = () => {
    // keep your transforms/images work
    setupIntersectionObserver(true, document);
    setupIntersectionObserver(false, document);

    // full rearm: dispose + reinvoke re-runs setupAltObserver's own bootstrap pass
    // so colors/active-alts recompute immediately against the new DOM order
    rearmAlt();

    // apply SortBy color from current DOM order according to viewport rule
    applySortChromeColorFromDomOrder(listContainer, sortRoot);

    // visible first
    upgradeVisibleImages(document);
    // and make sure the background queue is running for the rest
    bgUpgrader.run(document, 3);
  };

  // DOM-driven sort (seed-proof): use <img alt> from each card
  optionsEl!.addEventListener('click', (e) => {
    const opt = (e.target as HTMLElement).closest('.option');
    if (!opt) return;

    const mode = (opt.getAttribute('data-value') as 'random' | 'titleAsc' | 'titleDesc') || 'random';
    const cards = Array.from(listContainer.querySelectorAll(SEL.card)) as HTMLElement[];

    let ordered: HTMLElement[];
    if (mode === 'random') {
      ordered = shuffleArray(cards);
    } else {
      ordered = [...cards].sort((a, b) => {
        const A = getAltFromCard(a);
        const B = getAltFromCard(b);
        return mode === 'titleAsc' ? compareAsc(A, B) : compareDesc(A, B);
      });
    }

    // apply to DOM + keep index-based classes in sync
    const frag = document.createDocumentFragment();
    ordered.forEach((el, newIndex) => {
      const idxClass = [...el.classList].find((c) => /^custom-card-\d+$/.test(c));
      const oldIndex = idxClass ? parseInt(idxClass.split('-').pop()!, 10) : -1;
      if (oldIndex !== -1 && oldIndex !== newIndex) retagIndexClasses(el, oldIndex, newIndex);
      frag.appendChild(el);
    });
    listContainer.appendChild(frag);

    setSelectedLabel(mode);
    setSelectedClass(mode);

    closeOptions();
    afterReorder();
  });

  // Recompute SortBy color on viewport resize (debounced)
  const onResize = debounce(() => {
    applySortChromeColorFromDomOrder(listContainer, sortRoot);
    upgradeVisibleImages(document);
    bgUpgrader.run(document, 3);
  }, 150);
  window.addEventListener('resize', onResize);

  // Preload only to finish bootstrapping; color is from DOM order (not preload)
  ensureDynamicThemePreload()
    .finally(() => {
      rearmAlt();
      setSelectedLabel('random');
      setSelectedClass('random');
      // initial color from current DOM order
      applySortChromeColorFromDomOrder(listContainer, sortRoot);
      // visible images first
      upgradeVisibleImages(document);
      // then *everything else* via background queue
      bgUpgrader.run(document, 3);
    });

  // Cleanup: not yet called anywhere (this route is always a fresh full-page
  // load today), but available for when that changes.
  return () => {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('mousedown', onDocumentMousedown);
    disposeAltObs?.();
    bgUpgrader.cancel();
    (host as any).__enhanced = false;
  };
}
