# Microfrontend Platform

A React 19 application host combining several interactive workloads behind one deterministic streaming SSR pipeline. The current modular build is the baseline for extraction into independently built microfrontends.

[Live application](https://efeozalpp.com/)

## Applications

- **Query Searcher:** conversation and job-search UI with AI responses streamed over Server-Sent Events.
- **DMI App:** an interactive media interface with cards, palette-driven behavior, animation, and Shadow DOM style isolation.
- **Rock Escapade:** a Canvas2D game with onboarding, input handling, scoring, and live high-score updates.
- **Media studies:** draggable split views, data visualization, progressive images, and visibility-controlled video.

## Architecture

```text
Request
  -> Express creates an ephemeral seed
  -> the host derives deterministic application order
  -> prioritized Sanity data and critical assets are prepared
  -> React streams the server shell with renderToPipeableStream
  -> the browser hydrates with the same seed and data
  -> heavy features activate by visibility, idle time, focus, or interaction
```

The host uses an SSR registry to associate applications with data fetching, server rendering, preload hints, critical CSS, and client enhancers. Images progressively upgrade through Sanity CDN variants, while video uses poster, MP4, and WebM fallbacks with visibility-aware playback.

This version is a modular, code-split application produced by one build.

## Key files

- [Streaming server](./app/src/server/index.jsx)
- [React stream pipeline](./app/src/server/render/pipeStream.ts)
- [Application registry](./app/src/content-orchestration/component-loader.tsx)
- [SSR registry](./app/src/ssr/registry.ts)
- [Application feed](./app/src/content-orchestration/project-feed/project-feed.tsx)
- [Priority gate](./app/src/behaviors/priority-gate.tsx)
- [Media loader](./app/src/services/media/useMediaLoader.tsx)
- [Shadow root provider](./app/src/state/providers/shadow-root-context.tsx)
