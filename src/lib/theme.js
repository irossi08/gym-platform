window.App = window.App || {};

/**
 * Runtime theme engine. The whole app is already built on CSS custom
 * properties (--bg, --surface, --accent, --text-primary, etc.), so
 * switching modes is just a matter of overriding those variables on the
 * root element at runtime and re-applying them on load -- no alternate
 * stylesheet needed.
 *
 * Color is NOT user-customizable -- Settings only offers a light/dark mode
 * toggle (App.Pages.Settings), and every color value here comes from one of
 * the two fixed PRESETS below. Light mode's accent is a deliberately
 * darker shade of the same pink, not the dark-mode value reused as-is --
 * the dark-mode pink (#ff2ea6) only clears ~3.4:1 contrast against a white
 * background, short of WCAG AA's 4.5:1 body-text threshold, since it's
 * used as plain text/icon color in a lot of places, not just button fills
 * with their own ink color. #d6007b (same hue/saturation, lower lightness)
 * clears ~5:1. The chart/gauge/status tokens are similarly given a light
 * counterpart rather than left dark-tuned, since e.g. --gridline
 * (#232323, barely lighter than dark mode's near-black bg) would render as
 * a heavy near-black line across a white page if left unchanged.
 */
App.Theme = (function () {
  const PRESETS = {
    dark: {
      bg: '#0a0a0a',
      surface: '#161616',
      text: '#f5f5f5',
      accent: '#ff2ea6',
      gridline: '#232323',
      baseline: '#3c3c3c',
      chartContext3: '#b3b3b3',
      gauge: ['#232323', '#2f2f2f', '#3c3c3c', '#4a4a4a', '#5c5c5c'],
      statusCritical: '#ff4d4d',
      statusWarning: '#ffb020',
      communityAccent: '#ff8a1e',
      communityAccentInk: '#0a0a0a',
    },
    light: {
      bg: '#ffffff',
      surface: '#f2f2f2',
      text: '#1a1a1a',
      accent: '#d6007b',
      gridline: '#e4e4e4',
      baseline: '#c7c7c7',
      chartContext3: '#6b6b6b',
      gauge: ['#ececec', '#dcdcdc', '#c8c8c8', '#b2b2b2', '#9a9a9a'],
      statusCritical: '#d9363e',
      statusWarning: '#b8790a',
      // Same "distinct space" fixed orange as dark mode's, darkened for
      // the same reason the main accent is: the dark-mode value
      // (#ff8a1e) only clears ~2.3:1 against a white page, since Community
      // uses it as plain text/icon color, not just inside button fills.
      communityAccent: '#b85800',
      communityAccentInk: '#ffffff',
    },
  };

  const DEFAULTS = {
    mode: 'dark',
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
  // the preset's base colors.
  function mix(hex, targetHex, weight) {
    const a = hexToRgb(hex);
    const b = hexToRgb(targetHex);
    const r = clamp255(Math.round(a.r + (b.r - a.r) * weight));
    const g = clamp255(Math.round(a.g + (b.g - a.g) * weight));
    const bl = clamp255(Math.round(a.b + (b.b - a.b) * weight));
    return 'rgb(' + r + ', ' + g + ', ' + bl + ')';
  }

  // Perceived brightness (0-255) -- decides whether black or white text
  // reads better on top of the accent color.
  function luminance(hex) {
    const c = hexToRgb(hex);
    return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  }

  function applyTheme(theme) {
    const t = Object.assign({}, DEFAULTS, theme || {});
    const mode = t.mode === 'light' ? 'light' : 'dark';
    const p = PRESETS[mode];
    const root = document.documentElement.style;

    root.setProperty('color-scheme', mode);

    root.setProperty('--bg', p.bg);
    root.setProperty('--bg-rgb', rgbString(p.bg));
    root.setProperty('--surface', p.surface);
    // Nested elements (inputs, chips) need to pop a step further than the
    // card surface they sit on. Dark mode achieves that by mixing toward
    // white (the surface is already near-black, so lightening it stands
    // out); light mode needs the opposite direction -- mixing toward white
    // from a surface that's already near-white would barely move at all,
    // so it mixes toward black instead, by a smaller weight so it stays
    // subtle rather than muddy.
    root.setProperty('--surface-2', mode === 'light' ? mix(p.surface, '#000000', 0.06) : mix(p.surface, '#ffffff', 0.08));
    root.setProperty('--text-primary', p.text);
    root.setProperty('--text-secondary', mix(p.text, p.bg, 0.42));
    root.setProperty('--text-muted', mix(p.text, p.bg, 0.62));
    root.setProperty('--border', 'rgba(' + rgbString(p.text) + ', 0.12)');

    root.setProperty('--accent', p.accent);
    root.setProperty('--accent-rgb', rgbString(p.accent));
    root.setProperty('--accent-ink', luminance(p.accent) > 150 ? '#0a0a0a' : '#ffffff');
    root.setProperty('--accent-glow', 'rgba(' + rgbString(p.accent) + ', 0.35)');

    root.setProperty('--gridline', p.gridline);
    root.setProperty('--baseline', p.baseline);
    root.setProperty('--chart-context-3', p.chartContext3);
    root.setProperty('--gauge-1', p.gauge[0]);
    root.setProperty('--gauge-2', p.gauge[1]);
    root.setProperty('--gauge-3', p.gauge[2]);
    root.setProperty('--gauge-4', p.gauge[3]);
    root.setProperty('--gauge-5', p.gauge[4]);
    root.setProperty('--status-critical', p.statusCritical);
    root.setProperty('--status-warning', p.statusWarning);
    root.setProperty('--community-accent', p.communityAccent);
    root.setProperty('--community-accent-rgb', rgbString(p.communityAccent));
    root.setProperty('--community-accent-ink', p.communityAccentInk);

    const density = DENSITY_VALUES[t.density] || DENSITY_VALUES.spacious;
    root.setProperty('--density-card-padding', density.cardPadding);
    root.setProperty('--density-item-padding', density.itemPadding);
    root.setProperty('--density-field-gap', density.fieldGap);
    root.setProperty('--density-section-gap', density.sectionGap);

    document.documentElement.style.fontSize = FONT_SCALE[t.fontSize] || FONT_SCALE.medium;
    document.body.setAttribute('data-view-style', t.viewStyle === 'card' ? 'card' : 'list');
  }

  return { DEFAULTS, applyTheme };
})();
