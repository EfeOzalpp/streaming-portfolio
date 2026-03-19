// src/ssr/content/kirkland.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';
import { getMediumImageUrl, getHighQualityImageUrl } from '../../services/media/image-builder';
import PannableMedia from '../../services/media/useMediaPannable';

type VideoSet = { webmUrl?: string; mp4Url?: string; poster?: any };
type MediaSlot = { alt?: string; image?: any; video?: VideoSet };
type KirklandData = { mediaOne?: MediaSlot; mediaTwo?: MediaSlot };

export const kirklandSSR: SsrDescriptor = {
  fetch: () => getProjectData<KirklandData>('kirkland'),

  render: (data: KirklandData | null) => {
    const m1 = data?.mediaOne || {};
    const v1 = (m1 as MediaSlot).video || {};

    const m2 = data?.mediaTwo || {};
    const v2 = (m2 as MediaSlot).video || {};

    // Horizontal (mediaOne)
    const isVideoH = Boolean((v1 as VideoSet).mp4Url || (v1 as VideoSet).webmUrl);
    const posterMedH = (v1 as VideoSet).poster
      ? getMediumImageUrl((v1 as VideoSet).poster)
      : (m1 as MediaSlot).image
      ? getMediumImageUrl((m1 as MediaSlot).image)
      : undefined;
    const posterHighH = (v1 as VideoSet).poster
      ? getHighQualityImageUrl((v1 as VideoSet).poster, 1920, 90)
      : (m1 as MediaSlot).image
      ? getHighQualityImageUrl((m1 as MediaSlot).image, 1920, 90)
      : undefined;

    // Vertical (mediaTwo) — optional
    const isVideoV = Boolean((v2 as VideoSet).mp4Url || (v2 as VideoSet).webmUrl);
    const posterMedV = (v2 as VideoSet).poster
      ? getMediumImageUrl((v2 as VideoSet).poster)
      : (m2 as MediaSlot).image
      ? getMediumImageUrl((m2 as MediaSlot).image)
      : undefined;
    const posterHighV = (v2 as VideoSet).poster
      ? getHighQualityImageUrl((v2 as VideoSet).poster, 1920, 90)
      : (m2 as MediaSlot).image
      ? getHighQualityImageUrl((m2 as MediaSlot).image, 1920, 90)
      : undefined;

    if (!posterMedH) return null;

    return (
      <section
        id="kirkland-ssr"
        className="block-type-1"
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        <div
          id="kirkland-media-container"
          className="media-content"
          data-h-webm={(v1 as VideoSet).webmUrl || ''}
          data-h-mp4={(v1 as VideoSet).mp4Url || ''}
          data-h-is-video={isVideoH ? 'true' : 'false'}
          data-h-poster-med={posterMedH || ''}
          data-h-poster-full={posterHighH || ''}
          data-v-webm={(v2 as VideoSet).webmUrl || ''}
          data-v-mp4={(v2 as VideoSet).mp4Url || ''}
          data-v-is-video={isVideoV ? 'true' : 'false'}
          data-v-poster-med={posterMedV || ''}
          data-v-poster-full={posterHighV || ''}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <PannableMedia sensitivity={2}>
            <img
              id="kirkland-ssr-poster"
              className=""
              src={posterMedH}
              {...(posterHighH ? { 'data-src-full': posterHighH } : {})}
              alt={(m1 as MediaSlot).alt ?? 'Kirkland'}
              draggable={false}
              decoding="async"
              fetchPriority="high"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block',
              }}
            />
          </PannableMedia>

          {/* CSR mounts the real media here when it's a video */}
          <div
            id="kirkland-video-mount"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
        <a
          id="kirkland-case-study-btn"
          href="https://www.behance.net/gallery/193950167/Web-Dev"
          target="_blank"
          rel="noopener noreferrer"
          className="kirkland-case-study-btn"
        >
          Case Study
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.1525 10.8995L12.1369 19.9151C10.0866 21.9653 6.7625 21.9653 4.71225 19.9151C2.662 17.8648 2.662 14.5407 4.71225 12.4904L13.7279 3.47483C15.0947 2.108 17.3108 2.108 18.6776 3.47483C20.0444 4.84167 20.0444 7.05775 18.6776 8.42458L10.0156 17.0866C9.33213 17.7701 8.22409 17.7701 7.54068 17.0866C6.85726 16.4032 6.85726 15.2952 7.54068 14.6118L15.1421 7.01037" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </section>
    );
  },

  buildPreloads: (data: KirklandData | null) => {
    const m1 = data?.mediaOne;
    const v1 = m1?.video;
    const poster = v1?.poster ?? m1?.image;
    if (!poster) return [];
    const url = getMediumImageUrl(poster);
    return url ? [`<link rel="preload" as="image" href="${url}">`] : [];
  },

  criticalCssFiles: ['src/styles/block-type-1.css'],
};
