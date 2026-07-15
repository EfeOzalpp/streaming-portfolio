// src/ssr/dynamic-app/title.ssr.ts
// Server-rendered markup for the hero title, matching title.jsx's output
// exactly so the client enhancer (title.enhancer.ts) can take it over without
// React ever re-rendering it.

const DEFAULT_TRIPLET: [string, string, string] = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
const MULS: [number, number, number] = [1.05, 1.25, 1.1];

function adjustBrightness(hex: string, mul: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.floor(r * mul)));
  g = Math.min(255, Math.max(0, Math.floor(g * mul)));
  b = Math.min(255, Math.max(0, Math.floor(b * mul)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderColoredLetters(text: string, colors: [string, string, string]): string {
  return Array.from(text)
    .map((char, index) => {
      if (char === ' ') {
        return `<span class="moving-text-space" aria-hidden="true">&nbsp;</span>`;
      }
      const color = colors[index % 2 === 0 ? index % colors.length : (index + 1) % colors.length];
      return `<span class="moving-letter" style="color:${color};transition:color 120ms linear;">${escapeHtml(char)}</span>`;
    })
    .join('');
}

export function renderTitleHTML(): string {
  const colors: [string, string, string] = [
    adjustBrightness(DEFAULT_TRIPLET[0], MULS[0]),
    adjustBrightness(DEFAULT_TRIPLET[1], MULS[1]),
    adjustBrightness(DEFAULT_TRIPLET[2], MULS[2]),
  ];
  const titleLine = 'Dynamic Media Institute';

  return `
    <div class="title-container" id="dynamic-title-root">
      <div class="static-title">
        <h1>MassArt 2026</h1>
      </div>
      <div class="moving-title" id="dynamic-moving-title">
        <h1 class="title-with-icon moving-text-wrapper static-color-title" id="dynamic-moving-text-wrapper">
          ${renderColoredLetters(titleLine, colors)}
        </h1>
      </div>
    </div>
  `;
}
