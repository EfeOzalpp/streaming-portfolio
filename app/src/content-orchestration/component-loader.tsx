// src/content-orchestration/component-loader.tsx
import { type ComponentType } from 'react';
import { useSsrData } from '../state/providers/ssr-data-context';
import { ssrRegistry } from '../ssr/registry';

// ----- Split loaders for dynamic (frame & shadow)
export const dynamicLoaders = {
  frame: () =>
    import(
      /* webpackChunkName: "dynamic-frame" */
      '../components/shadow-dynamic-app/frame'
    ),
  shadow: () =>
    import(
      /* webpackChunkName: "dynamic-shadow" */
      '../components/shadow-dynamic-app/shadowEntry'
    ),
} as const;

export const gameLoaders = {
  components: () =>
    import(
      /* webpackChunkName: "components" */
      '../components/rock-escapade/block-g-host'
    ),
  game: () =>
    import(
      /* webpackChunkName: "game" */
      '../components/rock-escapade/game-canvas'
    ),
} as const;

// Explicit union preserves "dynamic" as a valid key
export type ProjectKey = 'rotary' | 'scoop' | 'dataviz' | 'climate' | 'game' | 'dynamic' | 'query-searcher';

export interface ProjectMeta {
  key: ProjectKey;
  title: string;
  isLink?: boolean;
}

export interface Project extends ProjectMeta {
  lazyImport: () => Promise<{ default: ComponentType<any> }>;
}

const toComponent = <T extends ComponentType<any>>(
  p: Promise<{ default: T }>
): Promise<{ default: ComponentType<any> }> =>
  p as unknown as Promise<{ default: ComponentType<any> }>;

// Stable base list (default client loaders).
// For "dynamic", point to the lightweight frame by default.
// Shadow chunk is mounted separately by the SSR enhancer (SSR path)
// or by ProjectPane's HeavyMount (client-only path).
export const baseProjects: Project[] = [
  {
    key: 'scoop',
    title: 'Ice Cream Scoop',
    lazyImport: () => toComponent(import('../components/block-type-1/ice-cream-scoop')),
  },
  {
    key: 'rotary',
    title: 'Rotary Lamp',
    lazyImport: () => toComponent(import('../components/block-type-1/rotary-lamp')),
  },
  {
    key: 'dataviz',
    title: 'Data Visualization',
    lazyImport: () => toComponent(import('../components/block-type-1/data-visualization')),
  },
  {
    key: 'game',
    title: 'Evade the Rock',
    lazyImport: () => toComponent(gameLoaders.components()),
  },
  {
    key: 'dynamic',
    title: 'DMI App',
    isLink: true,
    lazyImport: () => toComponent(dynamicLoaders.frame()),
  },
  {
    key: 'query-searcher',
    title: 'Query Searcher',
    lazyImport: () => toComponent(import('../components/query-searcher')),
  },
];

type EnhancerLoader = () => Promise<{ default: ComponentType<any> }>;

const ssrEnhancers: Partial<Record<ProjectKey, EnhancerLoader>> = {
  scoop: () => import('../ssr/content/scoop.enhancer'),
  rotary: () => import('../ssr/content/rotary.enhancer'),
  dataviz: () => import('../ssr/content/dataviz.enhancer'),
  dynamic: () => import('../ssr/content/dynamic.enhancer'),
  game: () => import('../ssr/content/game.enhancer'),
  'query-searcher': () => import('../ssr/content/query-searcher.enhancer'),
};

const clientLoaderOverrides: Partial<Record<ProjectKey, Project['lazyImport']>> = {
  dynamic: () => toComponent(dynamicLoaders.frame()),
  game: () => toComponent(gameLoaders.components()),
};

function wrapSsrContent(
  render: () => ReturnType<NonNullable<(typeof ssrRegistry)[ProjectKey]>['render']>,
  loadEnhancer?: EnhancerLoader
) {
  return async () => {
    const Enhancer = loadEnhancer ? (await loadEnhancer()).default : null;
    return {
      default: () => (
        <>
          {render()}
          {Enhancer ? <Enhancer /> : null}
        </>
      ),
    };
  };
}

// Hook that returns a loader respecting SSR (when present) and client lazy loading.
export function useProjectLoader(key: ProjectKey) {
  const ssr = useSsrData();
  const project = baseProjects.find((p) => p.key === key);
  if (!project) throw new Error(`Unknown project key: ${key}`);

  const payload = ssr?.preloaded?.[key];
  const desc = ssrRegistry[key];

  // --- SSR path: render prebuilt HTML (and attach enhancers) ---
  if (payload && desc?.render) {
    const data = (payload as any).data ?? payload;
    return wrapSsrContent(() => desc.render!(data), ssrEnhancers[key]);
  }

  // --- Client lazy path ---
  return clientLoaderOverrides[key] ?? project.lazyImport;
}
