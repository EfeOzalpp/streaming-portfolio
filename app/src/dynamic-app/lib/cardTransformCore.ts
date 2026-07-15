// src/dynamic-app/lib/cardTransformCore.ts
// Scroll-driven stacked-photo transform for .card-container elements.
// Single implementation shared by both entry points into this module:
// - useIntersectionTransform: React hook, one card per call (shadow-wrapped + standalone SPA)
// - setupIntersectionObserver: vanilla setup over a root's .card-container elements (SSR/document path)
import { useEffect } from 'react';

type CardState = 'entering' | 'active';

// A distinct transition per state -- different duration/easing so each is
// identifiable by feel, not just by end position.
const TRANSITIONS: Record<CardState, string> = {
  entering: 'transform 0.2s ease-out',
  active: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)', // slight overshoot
};

// Resolves the scrollable frame a card should be measured against: the
// closest `.embedded-app` ancestor when the card lives in a shadow tree
// (closest() can't cross the shadow boundary, so we climb from the host
// element instead) or in the light DOM directly. Falls back to the window
// viewport when there's no such frame.
function resolveViewportEl(cardEl: HTMLElement): HTMLElement | null {
  const root = cardEl.getRootNode();
  if (root instanceof ShadowRoot) {
    const hostEl = root.host as HTMLElement;
    return (hostEl.closest('.embedded-app') as HTMLElement | null) || null;
  }
  return (cardEl.closest('.embedded-app') as HTMLElement | null) || null;
}

function watchCardTransform(cardEl: HTMLElement): () => void {
  const imageContainer = cardEl.querySelector('.image-container') as HTMLElement | null;
  const imageContainer2 = cardEl.querySelector('.image-container2') as HTMLElement | null;
  if (!imageContainer || !imageContainer2) return () => {};

  const viewportEl = resolveViewportEl(cardEl);
  const isDynamicThemeRoute = !!cardEl.closest('#dynamic-theme-ssr');

  let lastState: CardState | null = null;

  // image-container2 sits absolutely positioned directly over image-container
  // (see UIcards.css), so no travel distance is needed to bring it into
  // place -- these are just small stacked-photo offset nudges.
  const applyTransform = (state: CardState) => {
    if (state === lastState) return;
    lastState = state;

    const transition = TRANSITIONS[state];
    imageContainer.style.transition = transition;
    imageContainer2.style.transition = transition;

    if (state === 'entering') {
      imageContainer.style.transform = 'translate(-0.5em, -0.5em)';
      imageContainer.style.zIndex = '1';
      imageContainer2.style.transform = 'translate(0.5em, 0.5em)';
      imageContainer2.style.zIndex = '5';
    } else {
      imageContainer.style.transform = 'translate(-0.5em, -0.5em)';
      imageContainer.style.zIndex = '5';
      imageContainer2.style.transform = 'translate(0.5em, 0.5em)';
      imageContainer2.style.zIndex = '1';
    }
  };

  // How much of the card is visible, normalized against whichever is
  // smaller -- its own height or the frame's -- so a card taller than the
  // frame can still reach "fully visible" instead of being capped low.
  const computeState = (): CardState => {
    const cardRect = cardEl.getBoundingClientRect();
    const frameRect = viewportEl
      ? viewportEl.getBoundingClientRect()
      : ({ top: 0, bottom: window.innerHeight } as DOMRect);
    const realFrameHeight = viewportEl ? viewportEl.clientHeight : window.innerHeight;

    const isCompact = window.innerWidth <= 1024;
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;

    // On compact viewports, only a shorter, vertically-centered "core"
    // region of the real frame counts toward visibility -- a card sitting
    // at the very top or bottom edge of the actual frame (even if fully
    // within its real bounds) should read as less than fully visible,
    // instead of hitting ratio 1 just by being technically on-screen.
    // The dynamic-theme SSR route has no .embedded-app frame (that's
    // shadow-only), so it always falls into the shrunk case regardless of
    // width -- tablet there additionally wants a tighter core than mobile/desktop.
    let shrinkFactor = isCompact || !viewportEl ? 0.7 : 1;
    if (isDynamicThemeRoute && isTablet) shrinkFactor = 0.6;
    const frameHeight = realFrameHeight * shrinkFactor;
    const frameTop = frameRect.top + (realFrameHeight - frameHeight) / 2;

    const visibleTop = Math.max(cardRect.top, frameTop);
    const visibleBottom = Math.min(cardRect.bottom, frameTop + frameHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibilityDenominator = Math.min(cardRect.height, frameHeight);
    const visibilityRatio = visibilityDenominator > 0 ? visibleHeight / visibilityDenominator : 0;

    // Only the lower edge matters: barely visible = entering, everything
    // from there up through fully covering the (shrunk, compact) frame =
    // active.
    const activeMin = isCompact ? 0.95 : 0.8;

    if (visibilityRatio > activeMin) return 'entering';
    return 'active';
  };

  let ticking = false;
  let tracking = false;

  const onScrollOrResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      applyTransform(computeState());
    });
  };

  const scrollTarget: EventTarget = viewportEl ?? window;

  const startTracking = () => {
    if (tracking) return;
    tracking = true;
    scrollTarget.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    onScrollOrResize();
  };

  const stopTracking = () => {
    if (!tracking) return;
    tracking = false;
    scrollTarget.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) startTracking();
      else stopTracking();
    },
    { root: null, threshold: 0 }
  );

  applyTransform(computeState());
  observer.observe(cardEl);

  return () => {
    observer.disconnect();
    stopTracking();
  };
}

// React entry point: one card per call, driven by a ref (shadow-wrapped +
// standalone SPA paths).
export function useIntersectionTransform(
  ref: React.RefObject<HTMLElement>,
  pauseAnimation: boolean,
) {
  useEffect(() => {
    if (!ref.current || pauseAnimation) return;
    return watchCardTransform(ref.current);
  }, [ref, pauseAnimation]);
}

// Vanilla entry point: sets up every .card-container under rootElement
// (SSR/document-enhancement path, no React involved).
let disposers: Array<() => void> = [];

export function setupIntersectionObserver(
  pauseAnimation: boolean,
  rootElement: Document | ShadowRoot = document,
) {
  disposers.forEach((dispose) => dispose());
  disposers = [];

  if (pauseAnimation) return;

  const cards = rootElement.querySelectorAll('.card-container');
  cards.forEach((card) => {
    disposers.push(watchCardTransform(card as HTMLElement));
  });
}
