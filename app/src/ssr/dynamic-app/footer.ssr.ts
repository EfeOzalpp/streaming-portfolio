// src/ssr/dynamic-app/footer.ssr.ts
// Server-rendered markup for the footer, matching footer.jsx's output
// exactly. Fully static -- no state, no effects, no event handlers in the
// original component -- so no client enhancer is needed at all.

export function renderFooterHTML(icons: Record<string, string> = {}): string {
  const arrow3 = icons['arrow1'] || '';
  const linkArrow = icons['link-icon'] || '';
  const arrow3Html = arrow3 ? `<div class="arrow3">${arrow3}</div>` : '';
  const linkArrowHtml = linkArrow ? `<div id="link-arrow" class="arrow3">${linkArrow}</div>` : '';

  return `
    <footer class="footer">
      <div class="footer-links">
        <div class="nav-item">
          <div class="nav-link-2" role="button" tabindex="0">
            <div class="name"><h4>What is DMI?</h4></div>
            ${arrow3Html}
          </div>
        </div>
        <div class="nav-item">
          <div class="nav-link-2" role="button" tabindex="0">
            <h4>Case Studies</h4>
            ${arrow3Html}
          </div>
        </div>
      </div>
      <div class="footer-info">
        <div class="nav-item">
          <a href="https://github.com/EfeOzalpp" target="_blank" rel="noopener noreferrer" class="nav-link-2">
            <h4>Developed by Efe Ozalp</h4>
            ${linkArrowHtml}
          </a>
        </div>
        <div class="nav-item">
          <a href="https://www.instagram.com/yxuart/" target="_blank" rel="noopener noreferrer" class="nav-link-2">
            <h4>Illustrations by Yiner Xu @yxuart</h4>
            ${linkArrowHtml}
          </a>
        </div>
      </div>
    </footer>
  `;
}
