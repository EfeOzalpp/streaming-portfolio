export function getViewportBand(windowWidth) {
  if (windowWidth < 768) return 'mobile';
  if (windowWidth <= 1024) return 'tablet';
  return 'desktop';
}

// Picks uniformly from [min, bandStart] U [bandEnd, max], skipping the
// forbidden middle band entirely -- weighted by each side's width so the
// distribution stays even across the allowed area even if the two zones
// end up different sizes (e.g. an off-center forbidden band).
function randomOutsideBand(p, min, max, bandStart, bandEnd) {
  const leftWidth = Math.max(0, bandStart - min);
  const rightWidth = Math.max(0, max - bandEnd);
  const total = leftWidth + rightWidth;
  if (total <= 0) return p.random(min, max);

  const pick = p.random(0, total);
  return pick < leftWidth ? min + pick : bandEnd + (pick - leftWidth);
}

export function getExplosionTarget(p, band) {
  if (band === 'mobile') {
    return {
      x: p.random(p.width * 0.5, p.width * 0.9),
      y: p.random(p.height * 0.1, p.height * 0.3),
    };
  }

  if (band === 'tablet') {
    return {
      x: p.random(p.width * 0.5, p.width * 0.9),
      y: p.random(p.height * 0.15, p.height * 0.65),
    };
  }

  return {
    x: randomOutsideBand(p, p.width * 0, p.width * 1, p.width * 0.4, p.width * 0.6),
    y: p.random(p.height * 0.1, p.height * 0.2),
  };
}

export function getParticleCount(p, band, type) {
  if (band === 'mobile') {
    return Math.floor(type === 'BLINKING' ? p.random(150, 275) : p.random(125, 225));
  }

  if (band === 'tablet') {
    return Math.floor(type === 'BLINKING' ? p.random(275, 325) : p.random(200, 250));
  }

  return Math.floor(type === 'BLINKING' ? p.random(250, 300) : p.random(300, 350));
}

export function getLaunchSpeed(p, band) {
  if (band === 'mobile') return p.random(6, 11);
  if (band === 'tablet') return p.random(5, 9);
  return p.random(3, 8);
}

export function getSpeedMultiplier(p, band) {
  if (band === 'mobile') return p.random(1.8, 2.6);
  if (band === 'tablet') return p.random(1.6, 2.2);
  return p.random(1.2, 2.2);
}

export function getParticleLifespanRange(p, band) {
  if (band === 'mobile') {
    return {
      min: p.random(30, 60),
      max: p.random(40, 80),
    };
  }

  if (band === 'tablet') {
    return {
      min: p.random(50, 80),
      max: p.random(70, 100),
    };
  }

  return {
    min: p.random(50, 90),
    max: p.random(80, 140),
  };
}
