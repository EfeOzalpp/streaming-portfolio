// src/dynamic-app/dynamic-app-ssr/dynamic-theme.route.tsx
import React, { useEffect, useRef, useState } from 'react';
import loadable from '@loadable/component';
import { createPortal } from 'react-dom';
import { useSsrData } from '../../state/providers/ssr-data-context';

import {
  primeDynamicThemeFromSSR as primeFromSSR,
  ensureDynamicThemePreload as ensureDynamicPreload,
} from '../preload-dynamic-app-route';
import { enhanceDynamicThemeSSR } from '../../ssr/dynamic-app/UIcards+sort';
import { enhanceTitle, type TitleEnhancerHandle } from '../../ssr/dynamic-app/title.enhancer';
import { enhanceNavigation, type NavigationEnhancerHandle } from '../../ssr/dynamic-app/navigation.enhancer';
import { colorMapping } from '../lib/colorString';
import fetchSVGIcons from '../lib/fetchSVGIcons';

import {
  normalizeIconMap,
  toClientIconMap,
} from '../lib/svg-icon-map';
import type { IconLike } from '../lib/svg-icon-map';

// use the actual export you have
import { computeStateFromPalette } from '../lib/palette';

// local types to satisfy TS based on your controller’s API
type Quartet = [string, string, string, string];

// client-only chunks
const FireworksDisplay = loadable(() => import('../fireworks'), { ssr: false });
const PauseButton = loadable(() => import('../components/pauseButton'), { ssr: false });

// SSR shell (UI cards + sort stub)
const DynamicTheme = loadable(() => import('./placeholder'), { ssr: true });

/* ---------- portals ---------- */
function FireworksPortal(props: {
  items: any[];
  activeColor: string;
  lastKnownColor: string;
  onToggleFireworks?: (fn: (enabled: boolean) => void) => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('dynamic-fireworks-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <FireworksDisplay
      colorMapping={colorMapping}
      items={props.items}
      activeColor={props.activeColor}
      lastKnownColor={props.lastKnownColor}
      onToggleFireworks={props.onToggleFireworks || (() => {})}
    />,
    target
  );
}

function PausePortal(props: { onToggle: (isEnabled: boolean) => void }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  // #dynamic-pause-mount is an empty .pause-button-wrapper server-side; its
  // own min-height (see sortByStyles.css) reserves the button's footprint,
  // so the portal can append straight into it with no placeholder to clear.
  useEffect(() => { setTarget(document.getElementById('dynamic-pause-mount')); }, []);
  if (!target) return null;
  return createPortal(<PauseButton toggleP5Animation={props.onToggle} />, target);
}

/* ---------- route ---------- */
export default function DynamicThemeRoute() {
  const ssr = useSsrData();
  const preload = ssr?.preloaded?.dynamicTheme;

  const [items, setItems] = useState<any[]>(Array.isArray(preload?.images) ? preload!.images : []);
  const [icons, setIcons] = useState<Record<string, string>>(normalizeIconMap(preload?.icons || {}));

  const [activeColor, setActiveColor] = useState('#FFFFFF');
  const [lastKnownColor, setLastKnownColor] = useState('#FFFFFF');

  const fwToggleRef = useRef<((enabled: boolean) => void) | null>(null);
  const titleHandleRef = useRef<TitleEnhancerHandle | null>(null);
  const navHandleRef = useRef<NavigationEnhancerHandle | null>(null);
  const handleSetToggleFireworks = (fn: (enabled: boolean) => void) => { fwToggleRef.current = fn; };
  const handlePauseToggle = (isEnabled: boolean) => {
    titleHandleRef.current?.setPaused(!isEnabled);
    try { fwToggleRef.current?.(isEnabled); } catch {}
  };

  useEffect(() => { if (preload) primeFromSSR(preload); }, [preload]);

  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const boot = w?.__DYNAMIC_THEME_PRELOAD__;
    if (boot) {
      if (Array.isArray(boot.images)) setItems(boot.images);
      if (boot.icons) setIcons(normalizeIconMap(boot.icons));
      primeFromSSR(boot);
    }
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cache = await ensureDynamicPreload();
        if (!dead && cache) {
          if (!items.length && Array.isArray(cache.images)) setItems(cache.images);
          if (!Object.keys(icons).length && cache.icons) setIcons(normalizeIconMap(cache.icons));
        }
      } catch {}
    })();
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (icons && (icons['arrow1'] || icons['arrow2'] || icons['link-icon'] || icons['logo-small-1'])) return;
      try {
        const raw = (await fetchSVGIcons().catch(() => [])) as IconLike[];
        if (!dead && Array.isArray(raw)) {
          const map = toClientIconMap(raw);
          if (Object.keys(map).length) setIcons(prev => ({ ...map, ...prev }));
        }
      } catch {}
    })();
    return () => { dead = true; };
  }, [icons]);

  // enhanceDynamicThemeSSR should only ever be initialized once per mount --
  // read the latest activeColor via a ref instead of depending on it, so this
  // effect doesn't tear down and re-run the whole enhancer on every color change.
  const activeColorRef = useRef(activeColor);
  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);

  // arrow2 may not be ready yet when the enhancer first mounts (e.g. it only
  // arrives via the async fetchSVGIcons fallback) -- push updates through so
  // the scroll-hint icon isn't permanently frozen on an empty initial value.
  useEffect(() => {
    if (icons['arrow2']) navHandleRef.current?.setScrollHintIcon(icons['arrow2']);
  }, [icons]);

  // compute palette-driven state from the enhancer (which gives a Quartet)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    titleHandleRef.current = enhanceTitle();
    navHandleRef.current = enhanceNavigation(icons['arrow2']);
    const dispose = enhanceDynamicThemeSSR({
      onColorChange: (_alt: string, palette?: string[] | null) => {
        // only accept quartets
        if (!Array.isArray(palette) || palette.length < 4) return;
        const { activeColor: nextActive, lastKnown } = computeStateFromPalette(palette as Quartet);

        if (nextActive !== activeColorRef.current) {
          setActiveColor(nextActive);
          setLastKnownColor(lastKnown ?? nextActive);
        }
        navHandleRef.current?.updateActiveColor(nextActive);
      },
      // title's marquee colors are derived straight from activeAlts + colorMapping,
      // same as title.jsx's own logic -- no need to route it through React state.
      onActiveAltsChange: (alts: string[]) => titleHandleRef.current?.updateColors(alts, colorMapping),
    });
    return () => {
      dispose?.();
      titleHandleRef.current?.dispose();
      titleHandleRef.current = null;
      navHandleRef.current?.dispose();
      navHandleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <DynamicTheme />

      <FireworksPortal
        items={items}
        activeColor={activeColor}
        lastKnownColor={lastKnownColor}
        onToggleFireworks={handleSetToggleFireworks}
      />

      <PausePortal onToggle={handlePauseToggle} />
    </>
  );
}
