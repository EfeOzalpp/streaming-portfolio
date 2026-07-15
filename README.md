# Progressive Frontend Runtime

A deterministic streaming SSR runtime that composes several interactive applications through one React host. The platform combines an AI conversation and search interface, a Canvas2D game, a Shadow DOM-isolated generative interface, and interactive media studies without placing their full runtime cost on the initial render.

[Live application](https://efeozalpp.com/)

## What it does

The primary route is an experience feed whose applications have different rendering and resource requirements:

- **Query Searcher** provides conversation and job-search modes and consumes tokenized AI responses over Server-Sent Events.
- **Rock Escapade** is an interactive Canvas2D game with onboarding, input management, coins, game-over state, and a live high-score subscription.
- **Dynamic Theme** embeds a generative interface inside a device frame and isolates its styles in a Shadow DOM boundary.
- **Media studies** combine draggable split views, data visualization, progressive images, and visibility-controlled video.

The host determines which applications receive server data, critical styles, preload hints, and early client activation. Expensive features can wait for viewport visibility, browser idle time, focus, or explicit interaction.

## Rendering model

```text
Request
  -> Express selects an ephemeral seed
  -> the host derives a deterministic application order
  -> prioritized Sanity data and critical assets are prepared
  -> React streams the server-rendered shell at onShellReady
  -> the response serializes the same seed and data for the browser
  -> React hydrates the host with the matching initial state
  -> heavy features activate by priority, visibility, idle time, or interaction
```

The server and browser share the same seed and preloaded payload, preventing the experience feed from changing order during hydration. The first applications receive server-rendered representations; client enhancers then attach richer controls or mount heavier subsystems.

This is currently a modular host application with code-split feature boundaries. Its features are produced by one build and are not represented as independently deployed microfrontends.

## Architecture

| Layer | Responsibility |
| --- | --- |
| **React host** | Routes, experience composition, focus state, deterministic ordering, hydration, and feature activation |
| **SSR registry** | Associates each experience with server data fetching, synchronous rendering, preload hints, and critical CSS |
| **Express renderer** | Prepares route data, discovers code-split assets, writes the document head, and streams React through `renderToPipeableStream` |
| **Priority gates** | Separate code preloading from component mounting using visibility, idle, focus, and interaction signals |
| **Client enhancers** | Add controls and behavior to server-rendered project shells without delaying their initial HTML |
| **Media services** | Build Sanity CDN variants, stage image-quality upgrades, preload near the viewport, and manage video posters and playback |
| **Shadow DOM subsystem** | Isolates the embedded Dynamic Theme application and injects deduplicated styles into its shadow root |
| **API layer** | Streams Anthropic responses over SSE, validates high-score writes, and exposes server-owned data routes |
| **Sanity** | Stores project media, device assets, SVGs, gallery content, and high scores |
| **Supabase** | Provides an additional server-side data integration and application service boundary |

## Progressive client activation

The application distinguishes several moments that are often treated as one operation:

1. Render a lightweight server representation.
2. Preload a feature's JavaScript.
3. Mount its interactive component.
4. Pause or unmount expensive work when focus changes.

`PriorityGateRender`, `HeavyMount`, and `EventMount` implement these policies for different workloads. Intersection Observer initiates near-viewport work, `requestIdleCallback` uses available browser time, and focus-driven mounting keeps case studies and the game out of the active tree until needed.

This lets the host prioritize the first useful render while retaining richer interactions deeper in the feed.

## Deterministic SSR

Each request receives an ephemeral server seed. The seed is used to derive project order and is serialized with the server-preloaded data in `window.__SSR_DATA__`. The browser consumes that payload rather than independently choosing its initial order.

Project SSR is descriptor-driven:

```ts
type SsrDescriptor = {
  fetch: (seed?: number) => Promise<unknown>;
  render: (data: unknown) => React.ReactNode;
  buildPreloads?: (data: unknown) => string[];
  criticalCssFiles?: string[];
};
```

The registry allows the server to prepare only the applications selected for the initial response while the remaining implementations stay code-split for the client.

## Streaming response pipeline

The production server uses `@loadable/server` to resolve the client chunks required by the rendered React tree. It writes the document head when the shell is ready, pipes React output through a final transform, then appends serialized SSR state and client scripts.

The pipeline also handles:

- Request disconnects and stream cancellation
- Development and production asset origins
- Render abort timeouts
- Route-specific metadata and styles
- Font and image preload limits
- Inline critical CSS for the shell and prioritized applications
- Gzip compression and immutable static-asset caching

## Media delivery

Images move through low-, medium-, and high-quality Sanity CDN variants. Quality upgrades are coordinated to avoid initiating every expensive decode at once, while dense thumbnail views can opt out of the automatic high-resolution wave.

Video uses posters until the first painted frame, supports MP4 and WebM sources, loads near the viewport, and pauses or resumes based on visibility. The loader also provides still-image fallbacks and reserves layout space while media becomes ready.

## Feature isolation

Dynamic Theme runs inside a Shadow DOM root. A provider exposes style and link injection to the embedded application, using constructable stylesheets where available and `<style>` elements as a fallback. The outer host controls when the subsystem is loaded and mounted, while the embedded application owns its internal presentation and interaction state.

The rest of the application is scoped beneath `#main-shell`; PostCSS applies the same selector-prefixing rules to the client build and server-generated critical CSS.

## Repository structure

```text
.
├── app/
│   ├── src/server/                 Express server and streaming renderer
│   ├── src/ssr/                    Project and route SSR descriptors
│   ├── src/content-orchestration/  Project registry, feed, and seeded ordering
│   ├── src/behaviors/              Priority, visibility, and lifecycle gates
│   ├── src/components/             Game, search, media, and shared UI
│   ├── src/dynamic-app/            Shadow DOM-isolated generative interface
│   ├── src/services/               Sanity, Supabase, and media services
│   └── src/state/                  Host and feature providers
└── sanity/                         Sanity Studio and content schemas
```

## Navigation

- [Streaming server](./app/src/server/index.jsx)
- [React stream pipeline](./app/src/server/render/pipeStream.ts)
- [Project component registry](./app/src/content-orchestration/component-loader.tsx)
- [SSR registry](./app/src/ssr/registry.ts)
- [Experience feed](./app/src/content-orchestration/project-feed/project-feed.tsx)
- [Priority gate](./app/src/behaviors/priority-gate.tsx)
- [Heavy feature lifecycle](./app/src/behaviors/heavy-mount.tsx)
- [Progressive media loader](./app/src/services/media/useMediaLoader.tsx)
- [Shadow root provider](./app/src/state/providers/shadow-root-context.tsx)
- [Query Searcher](./app/src/components/query-searcher/index.tsx)
- [Rock Escapade](./app/src/components/rock-escapade/game-canvas.tsx)
- [Sanity schemas](./sanity/schemaTypes/index.ts)

## Running locally

Install the application dependencies:

```bash
cd app
npm install
```

Run the client development server by itself:

```bash
npm start
```

Run the client, watched SSR build, and Express server together:

```bash
npm run dev:ssr
```

Create and serve production builds:

```bash
npm run build
npm run build:ssr
npm run start:ssr
```

Server integrations use the following environment variables where applicable:

```text
ANTHROPIC_API_KEY
SANITY_WRITE_TOKEN
SUPABASE_URL
SUPABASE_ANON_KEY
PORT
HOST
DEV_CLIENT_PORT
DEV_HOST_FOR_ASSETS
```

The Sanity Studio is maintained separately in `sanity/` and has its own package scripts.

## Contact

Questions are welcome at **eozalp.efe@gmail.com**.
