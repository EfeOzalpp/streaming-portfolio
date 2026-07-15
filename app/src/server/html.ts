// src/server/html.ts

/** Build limited font preloads from the blocks actually emitted */
function buildFontPreloads(fontCssBlocks: string[], limit = 4): string[] {
  const urlRegex = /url\((['"]?)([^)]+?\.woff2)\1\)/g;
  const urls: string[] = [];
  for (const block of fontCssBlocks) {
    let m: RegExpExecArray | null;
    while ((m = urlRegex.exec(block)) !== null) {
      const href = m[2];
      if (!urls.includes(href)) urls.push(href);
      if (urls.length >= limit) break;
    }
    if (urls.length >= limit) break;
  }
  return urls.map(href => `<link rel="preload" as="font" href="${href}" type="font/woff2" crossorigin>`);
}

/* Per-route head */
export function buildRouteHead(routePath: string) {
  if (routePath.startsWith('/dynamic-theme')) {
    return `
      <title>DMI App</title>
      <meta name="description" content="Fresh Media is a Dynamic Media Institute at MassArt tradition.">
      <meta name="keywords" content="Innovation, Art, Technology, Science, Culture, Exhibition, Installation, Display, Projects">
      <meta name="theme-color" content="#1e1e1f">
    `;
  }
  return '';
}

export function buildHtmlOpen(opts: {
  IS_DEV: boolean;
  routePath: string;
  iconSvg: string;
  iconIco: string;
  preloadLinks: string[];
  fontsCss: {
    rubikCss: string;
    orbitronCss: string;
    poppinsCss: string;
    epilogueCss: string;
  };
  extractorLinkTags: string;
  extractorStyleTags: string;
  extraCriticalCss?: string;
  appCriticalCss?: string;
  dynamicThemeInlineCss?: string;
  injectBeforeRoot?: string;  // <-- added for dynamic snapshot HTML
}) {
  const {
    IS_DEV, routePath, iconSvg, iconIco, preloadLinks,
    fontsCss, extractorLinkTags, extractorStyleTags,
    extraCriticalCss = '',
    appCriticalCss = '',
    dynamicThemeInlineCss = '',
    injectBeforeRoot = '',
  } = opts;

  const projectCriticalCss = extraCriticalCss ? '\n' + extraCriticalCss : '';

  const htmlClass =
    routePath.startsWith('/dynamic-theme') ? 'route-dynamic' :
    (routePath === '/' || routePath === '/home') ? 'font-small' :
    '';

  const routeHead = buildRouteHead(routePath);
  const injectDefaultSiteHead = routeHead === '';
  const defaultTitle = `<title>Efe Ozalp - Portfolio</title>`;
  const defaultDesc  = `<meta name="description" content="web engineering, 3D modeling, visual design portfolio of Efe Ozalp" />`;

  const isDynamicTheme = routePath.startsWith('/dynamic-theme');
  const v = IS_DEV ? `?v=${Date.now()}` : '';
  const iconLinks = isDynamicTheme
    ? `<link rel="icon" href="${iconSvg}${v}" type="image/svg+xml" sizes="any">`
    : `<link rel="icon" href="${iconIco}${v}" sizes="any">`;
  const appleTouch = isDynamicTheme
    ? `<link rel="apple-touch-icon" sizes="180x180" href="/freshmedia-icon.png${v}">`
    : `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png${v}">`;

  // Dynamic Theme's own base styles, inlined unprefixed (this route isn't wrapped in #main-shell)
  const dynamicThemeInlineStyleTag = dynamicThemeInlineCss
    ? `<style id="critical-dynamic-inline">${dynamicThemeInlineCss}</style>`
    : '';

  // FONTS: use whatever was passed (index.jsx trims Poppins/Epilogue for dynamic)
  const fontBlocks = [
    fontsCss.rubikCss,
    fontsCss.orbitronCss,
    fontsCss.poppinsCss,
    fontsCss.epilogueCss,
  ].filter(Boolean);

  const fontPreloadLinks = buildFontPreloads(fontBlocks, 4).join('\n');

  return `<!doctype html>
<html lang="en" class="${htmlClass}">
<head>
<meta charSet="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
${injectDefaultSiteHead ? defaultTitle : ''}
${injectDefaultSiteHead ? defaultDesc  : ''}
${IS_DEV ? `<script>window.__ASSET_ORIGIN__="http://"+(window.location.hostname)+":3000"</script>` : ''}

<script>
  try {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  } catch (e) {}
</script>

${iconLinks}
${appleTouch}

<link rel="manifest" href="/site.webmanifest" />
<link rel="preconnect" href="https://cdn.sanity.io" crossorigin>
<link rel="dns-prefetch" href="https://cdn.sanity.io">
${(preloadLinks || []).join('\n')}
${fontPreloadLinks}

<style>
${fontBlocks.join('\n')}
</style>

${extractorLinkTags}
${extractorStyleTags}
${(appCriticalCss || projectCriticalCss)
  ? `<style id="critical-inline-app-css">${appCriticalCss}${projectCriticalCss}</style>`
  : ''}

${dynamicThemeInlineStyleTag}
${routeHead}
</head>
<body>
${injectBeforeRoot}
<div id="root">`;
}

export function buildHtmlClose(ssrPayload: any, scriptTags: string, extraScripts = '') {
  const ssrJson = `<script>window.__SSR_DATA__=${JSON.stringify(ssrPayload).replace(/</g, '\\u003c')}</script>`;
  return `</div>${ssrJson}
${extraScripts}
${scriptTags}
</body></html>`;
}
