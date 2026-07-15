// src/ssr/dynamic-app/navigation.ssr.ts
// Server-rendered markup for the nav bar, matching navigation.jsx's output
// for the standalone route (isInShadow=false) so the client enhancer
// (navigation.enhancer.ts) can take it over without React re-rendering it.
// The gallery menu panel is height:0 until opened, so leaving its images
// unpopulated until the client fetch resolves causes no layout shift.

const DEFAULT_ACTIVE_COLOR = '#FFFFFF';

function adjustBrightness(hex: string, mul: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.floor(r * mul)));
  g = Math.min(255, Math.max(0, Math.floor(g * mul)));
  b = Math.min(255, Math.max(0, Math.floor(b * mul)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function renderNavigationHTML(icons: Record<string, string> = {}): string {
  const arrow1 = icons['arrow1'] || '';
  const darkenedColor = adjustBrightness(DEFAULT_ACTIVE_COLOR, 0.55);
  const edgeColor = adjustBrightness(DEFAULT_ACTIVE_COLOR, 0.8);
  const arrowHtml = arrow1 ? `<div class="arrow1">${arrow1}</div>` : '';

  return `
    <nav class="navigation visible" id="dynamic-navigation-root">
      <div class="top-bar-items" id="dynamic-top-bar-items" style="background:transparent;backdrop-filter:none;">
        <div class="site-title">
          <h-title class="title">
            <a href="/" class="homepage-link">DMI</a>
          </h-title>
        </div>
        <div class="menu-icon" id="dynamic-menu-icon">
          <div class="hamburger" id="dynamic-hamburger"></div>
        </div>
      </div>

      <div class="menu-item" id="dynamic-menu-item">
        <div class="menu-item-1" id="dynamic-menu-item-1"></div>
        <div class="menu-item-2" id="dynamic-menu-item-2" style="--darkenedColor:${darkenedColor};--darkerColor:${edgeColor};">
          <div class="menu-nav">
            <div class="nav-item">
              <a href="/dynamic-theme" class="nav-link">
                <div class="name"><h4>What is DMI?</h4></div>
                ${arrowHtml}
              </a>
            </div>
            <div class="nav-item">
              <a href="/dynamic-theme" class="nav-link">
                <h4>Case Studies</h4>
                ${arrowHtml}
              </a>
            </div>
          </div>

          <div class="gallery-wrapper">
            <div class="scroll-indicator" id="dynamic-scroll-indicator"></div>
            <div class="gallery-container" id="dynamic-gallery-container">
              <div class="image-container-g" id="dynamic-image-container-g"></div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}
