export function adjustHexBrightness(hex, multiplier) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;

  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.min(255, Math.max(0, Math.floor(r * multiplier)));
  g = Math.min(255, Math.max(0, Math.floor(g * multiplier)));
  b = Math.min(255, Math.max(0, Math.floor(b * multiplier)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function getUsablePalette(items, colorMapping) {
  const selectedAlt = items?.[0]?.alt1 || '';
  const colorArray = colorMapping?.[selectedAlt] || [];

  return [colorArray[0], colorArray[1], colorArray[3]].filter(Boolean);
}
