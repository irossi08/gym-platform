window.App = window.App || {};

/**
 * Runtime theme engine. The whole app is already built on CSS custom
 * properties (--bg, --surface, --accent, --text-primary, etc.), so
 * customizing the look is just a matter of overriding those variables on
 * the root element at runtime and re-applying them on load -- no
 * alternate stylesheet needed.
 *
 * Background, surface/card, and text are fixed (black/near-black/white) --
 * only the accent is user-facing, via Settings. Everything derived from it
 * (accent-ink for button text, accent-glow for highlights, and every rule
 * that reads var(--accent-rgb) for a custom-alpha tint) is computed here so
 * those relationships hold up for ANY chosen accent, not just the default
 * pink-on-black one.
 */
App.Theme = (function () {
  const DEFAULTS = {
    bg: '#0a0a0a',
    surface: '#161616',
    accent: '#ff2ea6',
    text: '#f5f5f5',
    density: 'spacious',
    viewStyle: 'list',
    fontSize: 'medium',
  };

  const FONT_SCALE = { small: '87.5%', medium: '100%', large: '112.5%' };

  const DENSITY_VALUES = {
    spacious: { cardPadding: '18px', itemPadding: '12px', fieldGap: '14px', sectionGap: '16px' },
    compact: { cardPadding: '12px', itemPadding: '8px', fieldGap: '10px', sectionGap: '10px' },
  };

  function clamp255(n) {
    return Math.max(0, Math.min(255, n));
  }

  function hexToRgb(hex) {
    const clean = String(hex).replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(function (c) { return c + c; }).join('') : clean;
    const num = parseInt(full, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbString(hex) {
    const c = hexToRgb(hex);
    return c.r + ', ' + c.g + ', ' + c.b;
  }

  // Mixes `hex` toward `targetHex` by `weight` (0 = hex, 1 = targetHex) --
  // used to derive secondary/muted text and the surface-2 tint from just
  // the 4 base colors.
  function mix(hex, targetHex, weight) {
    const a = hexToRgb(hex);
    const b = hexToRgb(targetHex);
    const r = clamp255(Math.round(a.r + (b.r - a.r) * weight));
    const g = clamp255(Math.round(a.g + (b.g - a.g) * weight));
    const bl = clamp255(Math.round(a.b + (b.b - a.b) * weight));
    return 'rgb(' + r + ', ' + g + ', ' + bl + ')';
  }

  // Perceived brightness (0-255) -- decides whether black or white text
  // reads better on top of an arbitrary accent color.
  function luminance(hex) {
    const c = hexToRgb(hex);
    return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  }

  function applyTheme(theme) {
    const t = Object.assign({}, DEFAULTS, theme || {});
    const root = document.documentElement.style;

    root.setProperty('--bg', t.bg);
    root.setProperty('--surface', t.surface);
    root.setProperty('--surface-2', mix(t.surface, '#ffffff', 0.08));
    root.setProperty('--text-primary', t.text);
    root.setProperty('--text-secondary', mix(t.text, t.bg, 0.42));
    root.setProperty('--text-muted', mix(t.text, t.bg, 0.62));
    root.setProperty('--border', 'rgba(' + rgbString(t.text) + ', 0.12)');

    root.setProperty('--accent', t.accent);
    root.setProperty('--accent-rgb', rgbString(t.accent));
    root.setProperty('--accent-ink', luminance(t.accent) > 150 ? '#0a0a0a' : '#ffffff');
    root.setProperty('--accent-glow', 'rgba(' + rgbString(t.accent) + ', 0.35)');

    const density = DENSITY_VALUES[t.density] || DENSITY_VALUES.spacious;
    root.setProperty('--density-card-padding', density.cardPadding);
    root.setProperty('--density-item-padding', density.itemPadding);
    root.setProperty('--density-field-gap', density.fieldGap);
    root.setProperty('--density-section-gap', density.sectionGap);

    document.documentElement.style.fontSize = FONT_SCALE[t.fontSize] || FONT_SCALE.medium;
    document.body.setAttribute('data-view-style', t.viewStyle === 'card' ? 'card' : 'list');
  }

  return { DEFAULTS, applyTheme, hexToRgb, mix, luminance };
})();
