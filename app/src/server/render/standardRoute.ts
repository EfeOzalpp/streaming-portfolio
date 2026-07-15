// src/server/render/standardRoute.ts
import { ssrRegistry } from '../../ssr/registry';
import { prepareSsrData } from '../prepareSsrData';
import { buildCriticalCss } from '../cssPipeline';
import { buildPreloadLinks, readFontCss } from '../assets';
import type { ProjectKey } from '../../content-orchestration/component-loader';

export interface StandardRouteData {
  ssrPayload: { seed: number; preloaded: Record<string, any>; preloadLinks: string[] };
  preloadLinks: string[];
  extraCriticalCss: string;
  appCriticalCss: string;
  fontsCss: { rubikCss: string; orbitronCss: string; poppinsCss: string; epilogueCss: string };
}

export async function prepareStandardRoute(seed: number, routePath: string): Promise<StandardRouteData> {
  const ssrPayload = await prepareSsrData(seed);

  const firstKey = Object.keys(ssrPayload.preloaded || {})[0];
  const firstData = firstKey ? ssrPayload.preloaded[firstKey] : null;
  const preloadLinks = buildPreloadLinks(firstData);

  const keys = Object.keys(ssrPayload.preloaded || {}).slice(0, 3);
  const allFiles = keys.flatMap((k) => ssrRegistry[k as ProjectKey]?.criticalCssFiles ?? []);
  const uniqueFiles = Array.from(new Set(allFiles));
  let extraCriticalCss = '';
  if (uniqueFiles.length > 0) {
    try {
      extraCriticalCss = await buildCriticalCss(uniqueFiles);
    } catch {
      // silent — non-critical CSS failure shouldn't break the response
    }
  }

  // App-shell critical CSS only for landing routes (this route is wrapped in #main-shell)
  let appCriticalCss = '';
  if (routePath === '/' || routePath === '/home') {
    try {
      appCriticalCss = await buildCriticalCss([
        'src/styles/font+theme.css',
        'src/styles/general-block.css',
        'src/styles/block-type-t.css',
      ]);
    } catch {
      // silent — non-critical CSS failure shouldn't break the response
    }
  }

  const fontsCss = readFontCss();

  return { ssrPayload, preloadLinks, extraCriticalCss, appCriticalCss, fontsCss };
}
