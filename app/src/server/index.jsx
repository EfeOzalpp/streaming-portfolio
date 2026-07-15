// src/server/index.jsx
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import os from 'os';
import React from 'react';
import express from 'express';
import compression from 'compression';

import { StaticRouter } from 'react-router';

import { ChunkExtractor } from '@loadable/server';
import { resolveStatsFile } from './assets';

import { createProxyMiddleware } from 'http-proxy-middleware';

import App from '../App';
import highScoreRoute from './highScore/highScoreRoute';
import claudeRoute from './claude/claudeRoute';
import supabaseRoute from './supabase/supabaseRoute';

import { SsrDataProvider } from '../state/providers/ssr-data-context';
import { getEphemeralSeed } from './seed';

import { prepareStandardRoute } from './render/standardRoute';
import { prepareDynamicRender } from './render/dynamicRoute';
import { buildRenderHead } from './render/buildRenderHead';
import { pipeReactStream } from './render/pipeStream';

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

// gzip (safe with PassThrough piping)
app.use(
  compression({
    threshold: 1024,
  })
);

const IS_DEV = process.env.NODE_ENV !== 'production';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const DEV_CLIENT_PORT = Number(process.env.DEV_CLIENT_PORT) || 3000;
// Proxy target must be a connectable address, not a bind-all address like 0.0.0.0.
// Used server-side only (proxying /static + /sockjs-node to the CRA dev server
// running on the same machine), so 'localhost' is correct here regardless of
// what host the browser used to reach us.
const DEV_HOST_FOR_ASSETS = process.env.DEV_HOST_FOR_ASSETS || 'localhost';
const DEV_ASSETS_ORIGIN = `http://${DEV_HOST_FOR_ASSETS}:${DEV_CLIENT_PORT}/`;

// Origin baked into the <script>/<link> tags sent to the BROWSER. This must
// match whatever host the browser actually used (e.g. a LAN IP from a phone/
// tablet on the same wifi) -- 'localhost' only resolves on the dev machine
// itself, so a LAN client would silently fail to fetch the bundle and never
// hydrate. Falls back to req.hostname per-request unless explicitly pinned
// via DEV_HOST_FOR_ASSETS.
function getDevAssetsOriginForRequest(req) {
  const host = process.env.DEV_HOST_FOR_ASSETS || req.hostname || 'localhost';
  return `http://${host}:${DEV_CLIENT_PORT}/`;
}

const { BUILD_DIR, STATS_FILE, ASSET_MANIFEST } = resolveStatsFile();

/** API routes */
app.use('/api', highScoreRoute);
app.use('/api/claude', claudeRoute);
app.use('/api/supabase', supabaseRoute);

/** Static assets (public) */
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: '1y', index: false }));

if (IS_DEV) {
  // proxy CRA dev server assets + websocket
  app.use('/static', createProxyMiddleware({ target: DEV_ASSETS_ORIGIN, changeOrigin: true, ws: true }));
  app.use('/sockjs-node', createProxyMiddleware({ target: DEV_ASSETS_ORIGIN, changeOrigin: true, ws: true }));
} else {
  app.use('/static', express.static(path.join(BUILD_DIR, 'static'), { maxAge: '1y', index: false }));
  app.use(express.static(BUILD_DIR, { index: false }));
}

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/** SSR catch-all */
app.get('/*', async (req, res) => {
  const isDynamicTheme = req.path.startsWith('/dynamic-theme');

  // Quick filesystem sanity
  console.log('[SSR] cwd:', process.cwd());
  console.log('[SSR] STATS_FILE:', STATS_FILE, 'exists?', fs.existsSync(STATS_FILE));

  if (!fs.existsSync(STATS_FILE)) {
    res.status(500).send('<pre>Missing build artifacts. Run `npm run build` or ensure loadable-stats.json exists.</pre>');
    return;
  }

  // Prepare route-specific data
  let routeData;
  if (isDynamicTheme) {
    const rawSeed = Number((req.query || {}).seed);
    const querySeed = Number.isFinite(rawSeed) ? rawSeed : undefined;
    routeData = await prepareDynamicRender(querySeed);
    if (!routeData) {
      res.status(500).send('<pre>dynamic-theme descriptor missing or invalid.</pre>');
      return;
    }
  } else {
    const { seed } = getEphemeralSeed();
    routeData = await prepareStandardRoute(seed, req.path);
  }

  // ssrPayload drives the SsrDataProvider in the React tree
  const ssrPayload = isDynamicTheme
    ? { seed: null, preloaded: {}, preloadLinks: [] }
    : routeData.ssrPayload;

  const extractor = new ChunkExtractor({
    statsFile: STATS_FILE,
    publicPath: IS_DEV ? getDevAssetsOriginForRequest(req) : '/',
  });

  // JSX tree stays here: only this file uses JSX syntax
  const jsx = extractor.collectChunks(
    <SsrDataProvider value={ssrPayload}>
      <StaticRouter location={req.url}>
        <App />
      </StaticRouter>
    </SsrDataProvider>
  );

  const { htmlOpen, htmlClose } = buildRenderHead({
    IS_DEV,
    routePath: req.path,
    ASSET_MANIFEST,
    extractor,
    isDynamicTheme,
    routeData,
  });

  pipeReactStream({ jsx, htmlOpen, htmlClose, req, res, IS_DEV });
});

function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const ifaceList of Object.values(nets)) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

app.listen(PORT, HOST, () => {
  const mode = IS_DEV ? 'development' : 'production';
  if (HOST === '0.0.0.0') {
    const lan = getLanAddress();
    console.log(`SSR server running (${mode})`);
    console.log(`  Local:   http://localhost:${PORT}`);
    if (lan) console.log(`  Network: http://${lan}:${PORT}`);
  } else {
    console.log(`SSR server running at http://${HOST}:${PORT} (${mode})`);
  }
});
