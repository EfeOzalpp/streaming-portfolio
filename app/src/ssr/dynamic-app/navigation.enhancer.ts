// src/ssr/dynamic-app/navigation.enhancer.ts
// Enhances the server-rendered nav (navigation.ssr.ts) in place -- scroll
// show/hide, hamburger open/close, gallery fetch + render, horizontal wheel
// scroll, scroll-indicator progress, and the one-time scroll hint --
// mirroring navigation.jsx's logic exactly but via direct DOM writes, so
// React never touches this subtree.

import fetchGallery from '../../dynamic-app/lib/fetchGallery';

export interface NavigationEnhancerHandle {
  updateActiveColor: (hex: string) => void;
  setScrollHintIcon: (svg: string) => void;
  dispose: () => void;
}

function adjustBrightness(hex: string, mul: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.floor(r * mul)));
  g = Math.min(255, Math.max(0, Math.floor(g * mul)));
  b = Math.min(255, Math.max(0, Math.floor(b * mul)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha = 0.1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function enhanceNavigation(scrollHintIcon?: string): NavigationEnhancerHandle | null {
  const root = document.getElementById('dynamic-navigation-root');
  const topBarItems = document.getElementById('dynamic-top-bar-items');
  const menuIcon = document.getElementById('dynamic-menu-icon');
  const hamburger = document.getElementById('dynamic-hamburger');
  const menuItem = document.getElementById('dynamic-menu-item');
  const menuItem1 = document.getElementById('dynamic-menu-item-1');
  const menuItem2 = document.getElementById('dynamic-menu-item-2');
  const galleryContainer = document.getElementById('dynamic-gallery-container');
  const imageContainerG = document.getElementById('dynamic-image-container-g');
  const scrollIndicator = document.getElementById('dynamic-scroll-indicator');
  if (!root || !topBarItems || !menuIcon || !hamburger || !menuItem || !menuItem1 || !menuItem2) return null;

  let isOpen = false;
  let lastScrollY = window.scrollY;
  let isScrollingUp = true;
  let isScrolled = false;
  let hasShownScrollHint = false;
  let currentScrollHintIcon = scrollHintIcon;
  const setScrollHintIcon = (svg: string) => { currentScrollHintIcon = svg; };
  let activeColor = '#FFFFFF';

  const updateTopBar = () => {
    topBarItems.style.background = !isOpen && isScrolled ? hexToRgba(activeColor, 0.8) : 'transparent';
    topBarItems.style.backdropFilter = isScrolled && !isOpen ? 'blur(5px)' : 'none';
    topBarItems.classList.toggle('menu-open', isOpen);
  };

  const updateMenuColors = () => {
    menuItem2.style.setProperty('--darkenedColor', adjustBrightness(activeColor, 0.55));
    menuItem2.style.setProperty('--darkerColor', adjustBrightness(activeColor, 0.8));
  };

  const updateActiveColor = (hex: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    activeColor = hex;
    updateTopBar();
    updateMenuColors();
  };

  // ---- scroll show/hide + scrolled-background tint ----
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 5) {
      isScrollingUp = true;
    } else {
      isScrollingUp = currentScrollY < lastScrollY;
    }
    isScrolled = currentScrollY > window.innerHeight * 0.1;
    lastScrollY = currentScrollY;

    root.classList.toggle('visible', isScrollingUp);
    root.classList.toggle('hidden', !isScrollingUp);
    updateTopBar();
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  // ---- scroll hint (shown once, first time the menu opens) ----
  let fadeOutTimeout: ReturnType<typeof setTimeout> | null = null;
  let removeTimeout: ReturnType<typeof setTimeout> | null = null;
  const showScrollHintOnce = () => {
    if (hasShownScrollHint || !galleryContainer) return;
    const hint = document.createElement('div');
    hint.className = 'scroll-hint';
    hint.innerHTML = `<h5>Scroll to explore</h5><span class="arrow2">${currentScrollHintIcon ? currentScrollHintIcon : ''}</span>`;
    galleryContainer.insertBefore(hint, galleryContainer.firstChild);

    fadeOutTimeout = setTimeout(() => { hint.style.opacity = '0'; }, 3000);
    removeTimeout = setTimeout(() => {
      hint.remove();
      hasShownScrollHint = true;
    }, 4000);
  };

  // ---- hamburger open/close ----
  const setOpen = (next: boolean) => {
    isOpen = next;
    hamburger.classList.toggle('open', isOpen);
    menuItem.classList.toggle('open', isOpen);
    document.body.classList.toggle('no-scroll', isOpen);
    updateTopBar();
    if (isOpen) showScrollHintOnce();
  };
  const onMenuIconClick = () => setOpen(!isOpen);
  const onMenuItem1Click = () => setOpen(false);
  menuIcon.addEventListener('click', onMenuIconClick);
  menuItem1.addEventListener('click', onMenuItem1Click);

  // ---- gallery: fetch once, render into the existing static shell ----
  let disposed = false;
  fetchGallery()
    .then((images: Array<{ url: string; alt: string; cssClass?: string }>) => {
      if (disposed || !imageContainerG || !Array.isArray(images)) return;
      imageContainerG.innerHTML = images
        .map((img, index) => {
          const src = escapeAttr(img.url || '');
          const alt = escapeHtml(img.alt || '');
          return `<img src="${src}" alt="${alt}" draggable="false" class="gallery-image image-${index}">`;
        })
        .join('');
    })
    .catch((err: unknown) => console.error('Error fetching gallery images:', err));

  function escapeAttr(s: string) {
    return String(s).replace(/"/g, '&quot;');
  }

  // ---- horizontal wheel scroll (desktop only) ----
  const handleHorizontalScroll = (e: WheelEvent) => {
    if (!imageContainerG) return;
    e.preventDefault();
    imageContainerG.scrollLeft += e.deltaY;
  };
  const wheelTarget = imageContainerG;
  if (window.innerWidth > 1024 && wheelTarget) {
    wheelTarget.addEventListener('wheel', handleHorizontalScroll, { passive: false });
  }

  // ---- scroll-indicator progress ----
  const updateScrollIndicator = () => {
    if (!imageContainerG || !scrollIndicator) return;
    if (window.innerWidth > 1024) {
      const scrollWidth = imageContainerG.scrollWidth - imageContainerG.clientWidth;
      const scrollLeft = imageContainerG.scrollLeft;
      const percentage = scrollWidth > 0 ? Math.max(2, (scrollLeft / scrollWidth) * 100) : 2;
      scrollIndicator.style.setProperty('--progress-dimension', `${percentage}%`);
    } else {
      const scrollHeight = imageContainerG.scrollHeight - imageContainerG.clientHeight;
      const scrollTop = imageContainerG.scrollTop;
      if (scrollHeight > 0) {
        const normalPercentage = 100 - (scrollTop / scrollHeight) * 100;
        const reversedPercentage = Math.min(100, Math.max(2, 100 - normalPercentage));
        scrollIndicator.style.setProperty('--progress-dimension', `${reversedPercentage}%`);
      } else {
        scrollIndicator.style.setProperty('--progress-dimension', '2%');
      }
    }
  };
  updateScrollIndicator();
  imageContainerG?.addEventListener('scroll', updateScrollIndicator, { passive: true });

  const dispose = () => {
    disposed = true;
    window.removeEventListener('scroll', handleScroll);
    menuIcon.removeEventListener('click', onMenuIconClick);
    menuItem1.removeEventListener('click', onMenuItem1Click);
    wheelTarget?.removeEventListener('wheel', handleHorizontalScroll);
    imageContainerG?.removeEventListener('scroll', updateScrollIndicator);
    if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
    if (removeTimeout) clearTimeout(removeTimeout);
    document.body.classList.remove('no-scroll');
  };

  return { updateActiveColor, setScrollHintIcon, dispose };
}
