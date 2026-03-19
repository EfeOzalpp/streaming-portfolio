// src/components/block-type-1/kirkland.tsx
import { useEffect, useState } from 'react';
import { getProjectData } from '../../services/sanity/get-project-data';
import MediaLoader from '../../services/media/useMediaLoader';
import PannableMedia from '../../services/media/useMediaPannable';
import { getHighQualityImageUrl } from '../../services/media/image-builder';
import '../../styles/block-type-1.css';

type VideoSet = { webmUrl?: string; mp4Url?: string; poster?: any };
type MediaSlot = { alt?: string; image?: any; video?: VideoSet };

type KirklandData = {
  mediaOne?: MediaSlot;
  mediaTwo?: MediaSlot;
};

export default function KirklandBlock() {
  const [data, setData] = useState<KirklandData | null>(null);
  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    getProjectData<KirklandData>('kirkland').then((d) => {
      if (!d) console.warn('[Kirkland] getProjectData returned null — check Sanity type/slug');
      else if (!d.mediaOne) console.warn('[Kirkland] data has no mediaOne:', d);
      setData(d);
    });
  }, []);

  useEffect(() => {
    const onResize = () => setIsVertical(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const selectedMedia = isVertical && data?.mediaTwo ? data.mediaTwo : data?.mediaOne;
  if (!selectedMedia) return null;

  const { alt = 'Kirkland', image, video } = selectedMedia;
  const isVideo = Boolean(video?.webmUrl || video?.mp4Url);

  const highPoster = video?.poster
    ? getHighQualityImageUrl(video.poster, 1920, 90)
    : undefined;

  return (
    <section
      className="block-type-1"
      id="no-ssr"
      style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}
    >
      <div
        className="media-content"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      >
        <PannableMedia sensitivity={2}>
          <MediaLoader
            type={isVideo ? 'video' : 'image'}
            src={isVideo ? (video as VideoSet) : image}
            alt={alt}
            id={isVideo ? 'kirkland-media-video' : 'kirkland-media'}
            {...(highPoster ? { 'data-src-full': highPoster } : {})}
            className=""
            objectPosition="center center"
            style={{ width: '100%', height: '100%' }}
          />
        </PannableMedia>
      </div>
      <a
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
}
