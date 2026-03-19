// src/ssr/content/kirkland.enhancer.tsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';
import PannableMedia from '../../services/media/useMediaPannable';
import MediaLoader from '../../services/media/useMediaLoader';
import { useVideoObserverSSR } from '../../behaviors/useVideoObserverSSR';

type VideoSet = { webmUrl?: string; mp4Url?: string; poster?: string };

function readSet(container: HTMLElement, prefix: 'h' | 'v') {
  const ds = container.dataset as Record<string, string | undefined>;
  return {
    webmUrl:    ds[`${prefix}Webm`]      || undefined,
    mp4Url:     ds[`${prefix}Mp4`]       || undefined,
    isVideo:    ds[`${prefix}IsVideo`]   === 'true',
    posterMed:  ds[`${prefix}PosterMed`] || undefined,
    posterFull: ds[`${prefix}PosterFull`] || undefined,
  };
}

function pickMedia(container: HTMLElement) {
  const horiz = readSet(container, 'h');
  const vert  = readSet(container, 'v');

  const isVertical  = window.innerHeight > window.innerWidth;
  const vertExists  = Boolean(vert.posterMed || vert.mp4Url || vert.webmUrl);
  const chosen      = isVertical && vertExists ? vert : horiz;

  return chosen;
}

export default function KirklandEnhancer() {
  useTooltipInit();

  const [mount, setMount]         = useState<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [tick, setTick]           = useState(0);

  useEffect(() => {
    const c = document.getElementById('kirkland-media-container') as HTMLElement | null;
    const m = document.getElementById('kirkland-video-mount')     as HTMLElement | null;
    if (!c || !m) return;

    // Upgrade SSR poster to full quality
    const img = document.getElementById('kirkland-ssr-poster') as HTMLImageElement | null;
    const full = img?.dataset?.srcFull;
    if (img && full && img.src !== full) img.src = full;

    setContainer(c);
    setMount(m);

    const onResize = () => setTick((x) => x + 1);
    window.addEventListener('resize', onResize,            { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const chosen = useMemo(() => {
    if (!container) return null;
    void tick;
    return pickMedia(container);
  }, [container, tick]);

  useVideoObserverSSR({
    videoId:         'kirkland-media-video',
    observeTargetId: 'kirkland-media-container',
    threshold:       0.15,
    enabled:         Boolean(chosen?.isVideo),
    playOnInit:      true,
  });

  // No video mount needed for image-only media
  if (!mount || !chosen || !chosen.isVideo) return null;

  const videoSet: VideoSet = {
    mp4Url:  chosen.mp4Url,
    webmUrl: chosen.webmUrl,
    poster:  chosen.posterFull || chosen.posterMed,
  };

  return createPortal(
    <PannableMedia sensitivity={2}>
      <MediaLoader
        type="video"
        src={videoSet}
        alt="Kirkland"
        id="kirkland-media-video"
        className=""
        preload="auto"
        muted
        playsInline
        loop
        style={{ width: '100%', height: '100%' }}
        objectPosition="center center"
      />
    </PannableMedia>,
    mount
  );
}
