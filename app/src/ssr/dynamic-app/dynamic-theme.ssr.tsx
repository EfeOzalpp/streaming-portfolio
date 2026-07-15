// src/ssr/dynamic-app/dynamic-theme.ssr.tsx
import type { RouteSsrDescriptor } from '../route-types';
import { prepareDynamicRoute } from '../../server/prepareDynamicRoute';
import { renderUIcardsHTML } from './UIcards.ssr';
import { renderTitleHTML } from './title.ssr';
import { renderNavigationHTML } from './navigation.ssr';
import { renderFooterHTML } from './footer.ssr';

export const dynamicThemeSSR: RouteSsrDescriptor = {
  fetch: async (seed?: number) => prepareDynamicRoute(seed),
  render: (data) => {
    const { images = [], icons = {} } = data || {};
    const arrow = icons['arrow2'] || ''; // inline SVG expected

    return (
      <section id="dynamic-theme-ssr" className="dynamic-theme-block ssr-initial">
        {/* Navigation: rendered server-side, enhanced (not re-rendered) client-side */}
        <div
          className="navigation-wrapper"
          id="dynamic-nav-mount"
          dangerouslySetInnerHTML={{ __html: renderNavigationHTML(icons) }}
        />

        <div className="firework-wrapper">
          <div className="firework-divider" id="dynamic-fireworks-mount"></div>
        </div>

        <div
          className="title-divider"
          id="dynamic-title-mount"
          dangerouslySetInnerHTML={{ __html: renderTitleHTML() }}
        />

        <div className="pause-button-wrapper" id="dynamic-pause-mount"></div>

        {/* SortBy stub (client enhancer upgrades) */}
        <div className="sort-by-divider" id="dynamic-sortby-mount" data-ssr-stub="true">
          <h3 className="students-heading">Community</h3>
          <div className="sort-by-container">
            <div className="sort-container"><p>Sort by:</p></div>
            <div className="sort-container2">
              <div className="custom-dropdown">
                <div className="custom-select">
                  <div className="selected-value"><h5>Randomized</h5></div>
                  <span className="custom-arrow">
                    {arrow ? <div dangerouslySetInnerHTML={{ __html: arrow }} /> : null}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards snapshot with LQ images + per-card SVGs */}
        <div
          dangerouslySetInnerHTML={{
            __html: renderUIcardsHTML(images, icons, 12),
          }}
        />

        {/* Footer: fully static, rendered server-side, no client enhancer needed */}
        <div
          className="footer-wrapper"
          id="dynamic-footer-mount"
          dangerouslySetInnerHTML={{ __html: renderFooterHTML(icons) }}
        />
      </section>
    );
  },
};
