// src/content-orchestration/project-pane.tsx
import React, { useEffect, useState } from 'react';
import PriorityGateRender from '../behaviors/priority-gate';
import HeavyMount from '../behaviors/heavy-mount';
import LoadingScreen from '../state/loading';
import { useProjectLoader } from './component-loader';
import { useSsrData } from '../state/providers/ssr-data-context';
import { ssrRegistry } from '../ssr/registry';
import type { ProjectKey } from './component-loader';

type Props = {
  item: any;
  isFirst?: boolean;
};

type ProjectBehavior = {
  allowIdle: boolean;
  hideLoadingFallback: boolean;
  observeOwnBlock: boolean;
  viewportLock: boolean;
  shadowMount?: {
    load: () => Promise<any>;
    mountMode: 'idle';
  };
};

const defaultBehavior: ProjectBehavior = {
  allowIdle: false,
  hideLoadingFallback: false,
  observeOwnBlock: false,
  viewportLock: false,
};

const projectBehaviorByKey: Partial<Record<ProjectKey, ProjectBehavior>> = {
  dynamic: {
    allowIdle: true,
    hideLoadingFallback: true,
    observeOwnBlock: false,
    viewportLock: false,
    shadowMount: {
      load: () => import('../components/dynamic-app/shadowEntry'),
      mountMode: 'idle',
    },
  },
  game: {
    allowIdle: true,
    hideLoadingFallback: true,
    observeOwnBlock: true,
    viewportLock: true,
  },
};

export function ProjectPane({
  item,
  isFirst = false,
}: Props) {
  const load = useProjectLoader(item.key);
  const ssr = useSsrData();
  const payload = ssr?.preloaded?.[item.key];
  const desc = ssrRegistry[item.key];
  const hasSSR = Boolean(payload && desc?.render);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);

  const serverRender =
    payload && desc?.render ? desc.render((payload as any).data ?? payload) : null;
  const behavior = projectBehaviorByKey[item.key as ProjectKey] ?? defaultBehavior;

  const fallbackNode =
    !payload && isHydrated && !behavior.hideLoadingFallback ? (
      <LoadingScreen isFullScreen={false} />
    ) : null;

  const blockId = `block-${item.key}`;

  return (
    <div
      id={blockId}
      className={`project-pane ${behavior.viewportLock ? 'is-game' : ''}`}
      data-viewport-lock={behavior.viewportLock ? 'true' : undefined}
      data-project-key={item.key}
      style={{
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        contentVisibility: 'auto' as any,
        contain: 'layout paint style',
        overflow: 'hidden',
      }}
    >
      <div className="project-pane-wrapper">
        <PriorityGateRender
          load={load}
          fallback={fallbackNode}
          serverRender={serverRender}
          eager={isFirst}
          allowIdle={behavior.allowIdle}
          observeTargetId={behavior.observeOwnBlock ? blockId : undefined}
          placeholderMinHeight={0}
        />
        {behavior.shadowMount && !hasSSR ? (
          <HeavyMount
            load={behavior.shadowMount.load}
            mountMode={behavior.shadowMount.mountMode}
            preloadOnIdle
            preloadIdleTimeout={2000}
            preloadOnFirstIO
            observeTargetId={blockId}
            rootMargin="0px"
            placeholderMinHeight={0}
            componentProps={{ blockId }}
          />
        ) : null}
      </div>
    </div>
  );
}
