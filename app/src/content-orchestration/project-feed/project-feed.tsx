// src/ProjectFeed/ProjectFeed.tsx
import { useState, useEffect, useRef } from 'react';
import { useProjectVisibility } from '../../state/providers/project-context';
import { baseProjects, type Project } from '../component-loader';
import { ProjectPane } from '../project-pane';
import { useSsrData } from '../../state/providers/ssr-data-context';
import { orderProjectsTopTwoSeeded } from '../seed/project-order';

import { useRealMobileViewport } from '../../shared/useRealMobile';

import type { ProjectFeedProps } from './types';

function useMaxWidth(max: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [max]);

  return matches;
}

const ProjectFeed = ({ className }: ProjectFeedProps) => {
  const { scrollContainerRef } = useProjectVisibility();

  const isRealMobile = useRealMobileViewport();
  const isUnder900 = useMaxWidth(900);
  const isSnapMode = isRealMobile && isUnder900;

  const { seed = 12345 } = useSsrData() || {};

  // stable order for session
  const projectsRef = useRef<Project[]>(
    orderProjectsTopTwoSeeded(baseProjects, seed)
  );
  const projects = projectsRef.current;

  return (
    <div
      ref={scrollContainerRef}
      className={`Scroll ${className ?? ''} ${isSnapMode ? '' : 'no-snap-desktop'}`}
      style={{
        overflowY: 'auto',
        scrollSnapType: isSnapMode ? 'y mandatory' : 'none',
        scrollBehavior: isSnapMode ? 'smooth' : 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .Scroll::-webkit-scrollbar { display: none; }
        .Scroll { overscroll-behavior: auto; }
        .embedded-app { touch-action: pan-y; overscroll-behavior: auto; }
      `}</style>

      {projects.map((item, idx) => (
        <ProjectPane
          key={item.key}
          item={item}
          isFirst={idx === 0}
        />
      ))}
    </div>
  );
};

export default ProjectFeed;
