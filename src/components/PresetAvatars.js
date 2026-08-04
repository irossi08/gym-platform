window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Preset "character" avatars offered as an alternative to uploading a
 * photo during profile setup/edit. Hand-built inline SVGs (no bundled
 * image assets in this app), sharing one subtle CSS blink animation (see
 * .preset-avatar-eye in style.css) so each reads as "animated" without
 * needing a unique animation per character.
 *
 * Two generations coexist here, deliberately never merged into one list:
 *
 * - LIST: the original 6 flat-color characters. Untouched -- anyone who
 *   already picked one keeps seeing exactly the same thing, forever. Its
 *   ids are bare words ("coral", "teal", ...).
 *
 * - MASCOTS: the expanded fitness-themed animal/robot set added later.
 *   Each one is a BASE character combined with a color variant (the
 *   outfit accent -- headband/collar tint) and an optional accessory
 *   (headband/wristbands/cap), so the real number of distinct-looking
 *   avatars is characters x colors x accessories, not just the character
 *   count. A combination is encoded as one composite string id via
 *   mascotId()/parseMascotId() -- "mascot:<charId>:<colorId>:<accessoryId>"
 *   -- specifically so it fits in the EXISTING profiles.preset_avatar_id
 *   text column with no schema change and no new storage plumbing: the
 *   "mascot:" prefix can never collide with an old bare-word id, so
 *   render() just checks for it and falls back to the original LIST
 *   lookup otherwise.
 */
App.Components.PresetAvatars = (function () {
  const INK = '#12121a';

  // ---------- original set (unchanged) ----------
  const LIST = [
    { id: 'coral', label: 'Coral', color: '#ff6f61' },
    { id: 'teal', label: 'Teal', color: '#4dd0e1' },
    { id: 'gold', label: 'Gold', color: '#ffd166' },
    { id: 'violet', label: 'Violet', color: '#b388ff' },
    { id: 'sky', label: 'Sky', color: '#64b5f6' },
    { id: 'rose', label: 'Rose', color: '#f06292' },
  ];

  function find(id) {
    return LIST.find(function (a) { return a.id === id; }) || LIST[0];
  }

  function renderOriginal(a) {
    return (
      '<svg viewBox="0 0 100 100" class="preset-avatar-svg" role="img" aria-label="' + a.label + ' avatar">' +
        '<circle cx="50" cy="50" r="48" fill="' + a.color + '" />' +
        '<circle class="preset-avatar-eye" cx="35" cy="45" r="6.5" fill="' + INK + '" />' +
        '<circle class="preset-avatar-eye" cx="65" cy="45" r="6.5" fill="' + INK + '" />' +
        '<path d="M34 66 Q50 78 66 66" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round" />' +
      '</svg>'
    );
  }

  // ---------- color helpers (for shading a character's own base color --
  // e.g. a snout patch a shade darker -- never used on the user-picked
  // accent, which is applied exactly as chosen) ----------
  function hexToRgb(hex) {
    const clean = String(hex).replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(function (c) { return c + c; }).join('') : clean;
    const num = parseInt(full, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function darken(hex, amount) {
    const c = hexToRgb(hex);
    return 'rgb(' + Math.round(c.r * (1 - amount)) + ', ' + Math.round(c.g * (1 - amount)) + ', ' + Math.round(c.b * (1 - amount)) + ')';
  }
  function lighten(hex, amount) {
    const c = hexToRgb(hex);
    return 'rgb(' + Math.round(c.r + (255 - c.r) * amount) + ', ' + Math.round(c.g + (255 - c.g) * amount) + ', ' + Math.round(c.b + (255 - c.b) * amount) + ')';
  }

  // Shared geometry every character builds on: a head circle smaller than
  // the SVG's own visible circular mask (r=40 vs the container's
  // inscribed r=50), specifically so ear/tuft/antenna shapes drawn BEHIND
  // it (earlier in the markup) still peek out above/beside it instead of
  // being fully covered -- and default eyes at a fixed shared position so
  // accessories (headband, etc.) line up the same way on every character.
  function head(fur) {
    return '<circle cx="50" cy="52" r="40" fill="' + fur + '" />';
  }
  function defaultEyes(color) {
    const c = color || INK;
    return (
      '<circle class="preset-avatar-eye" cx="38.5" cy="49.5" r="5.5" fill="' + c + '" />' +
      '<circle class="preset-avatar-eye" cx="61.5" cy="49.5" r="5.5" fill="' + c + '" />'
    );
  }
  function smile(width) {
    return '<path d="M42 68 Q50 ' + (74 + (width || 0)) + ' 58 68" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" />';
  }

  // ---------- the 14 base mascot characters ----------
  const MASCOTS = [
    {
      id: 'bear', label: 'Bear',
      build: function (fur) {
        return (
          '<circle cx="21" cy="17" r="13" fill="' + fur + '" />' +
          '<circle cx="79" cy="17" r="13" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="66" rx="12" ry="8" fill="' + darken(fur, 0.3) + '" />' +
          '<ellipse cx="50" cy="63.5" rx="5" ry="3.5" fill="' + INK + '" />' +
          smile()
        );
      },
    },
    {
      id: 'fox', label: 'Fox',
      build: function (fur) {
        return (
          '<path d="M4 34 L22 2 L38 26 Z" fill="' + fur + '" />' +
          '<path d="M96 34 L78 2 L62 26 Z" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="70" rx="20" ry="14" fill="#ffffff" />' +
          '<ellipse cx="50" cy="68.5" rx="6" ry="4.5" fill="' + INK + '" />'
        );
      },
    },
    {
      id: 'panda', label: 'Panda',
      build: function (fur) {
        return (
          '<circle cx="20" cy="16" r="15" fill="' + INK + '" />' +
          '<circle cx="80" cy="16" r="15" fill="' + INK + '" />' +
          head(fur) +
          '<ellipse class="preset-avatar-eye" cx="38.5" cy="49.5" rx="9" ry="12" fill="' + INK + '" />' +
          '<ellipse class="preset-avatar-eye" cx="61.5" cy="49.5" rx="9" ry="12" fill="' + INK + '" />' +
          '<ellipse cx="50" cy="65" rx="4" ry="3" fill="' + INK + '" />' +
          smile(-4)
        );
      },
    },
    {
      id: 'tiger', label: 'Tiger',
      build: function (fur) {
        return (
          '<circle cx="21" cy="17" r="13" fill="' + fur + '" />' +
          '<circle cx="79" cy="17" r="13" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<path d="M22 24 Q28 34 22 44" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" />' +
          '<path d="M78 24 Q72 34 78 44" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" />' +
          '<ellipse cx="50" cy="68" rx="18" ry="12" fill="#fff3e0" />' +
          '<ellipse cx="50" cy="66" rx="5" ry="3.5" fill="' + INK + '" />'
        );
      },
    },
    {
      id: 'lion', label: 'Lion',
      build: function (fur) {
        return (
          '<circle cx="50" cy="52" r="47" fill="' + darken(fur, 0.25) + '" />' +
          '<circle cx="24" cy="20" r="11" fill="' + fur + '" />' +
          '<circle cx="76" cy="20" r="11" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="66" rx="11" ry="7" fill="' + lighten(fur, 0.35) + '" />' +
          '<ellipse cx="50" cy="63.5" rx="5" ry="3.5" fill="' + INK + '" />' +
          smile()
        );
      },
    },
    {
      id: 'owl', label: 'Owl',
      build: function (fur) {
        return (
          '<path d="M24 26 L30 4 L38 24 Z" fill="' + fur + '" />' +
          '<path d="M76 26 L70 4 L62 24 Z" fill="' + fur + '" />' +
          head(fur) +
          '<circle cx="38.5" cy="49.5" r="9" fill="#ffffff" />' +
          '<circle cx="61.5" cy="49.5" r="9" fill="#ffffff" />' +
          '<circle class="preset-avatar-eye" cx="38.5" cy="49.5" r="4" fill="' + INK + '" />' +
          '<circle class="preset-avatar-eye" cx="61.5" cy="49.5" r="4" fill="' + INK + '" />' +
          '<path d="M50 60 L44 68 L56 68 Z" fill="#e8a23c" />'
        );
      },
    },
    {
      id: 'bulldog', label: 'Bulldog',
      build: function (fur) {
        return (
          '<ellipse cx="14" cy="46" rx="9" ry="15" fill="' + darken(fur, 0.15) + '" transform="rotate(-20 14 46)" />' +
          '<ellipse cx="86" cy="46" rx="9" ry="15" fill="' + darken(fur, 0.15) + '" transform="rotate(20 86 46)" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="36" cy="78" rx="10" ry="9" fill="' + darken(fur, 0.08) + '" />' +
          '<ellipse cx="64" cy="78" rx="10" ry="9" fill="' + darken(fur, 0.08) + '" />' +
          '<ellipse cx="50" cy="64" rx="7" ry="5" fill="' + INK + '" />' +
          '<path d="M40 74 Q50 78 60 74" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" />'
        );
      },
    },
    {
      id: 'rabbit', label: 'Rabbit',
      build: function (fur) {
        return (
          '<ellipse cx="30" cy="14" rx="8" ry="22" fill="' + fur + '" />' +
          '<ellipse cx="70" cy="14" rx="8" ry="22" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="63" rx="4" ry="3" fill="' + INK + '" />' +
          smile(-4)
        );
      },
    },
    {
      id: 'koala', label: 'Koala',
      build: function (fur) {
        return (
          '<circle cx="16" cy="20" r="17" fill="' + fur + '" />' +
          '<circle cx="84" cy="20" r="17" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="64" rx="9" ry="7" fill="' + INK + '" />' +
          smile()
        );
      },
    },
    {
      id: 'wolf', label: 'Wolf',
      build: function (fur) {
        return (
          '<path d="M8 30 L24 0 L34 26 Z" fill="' + fur + '" />' +
          '<path d="M92 30 L76 0 L66 26 Z" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="70" rx="14" ry="10" fill="' + lighten(fur, 0.3) + '" />' +
          '<ellipse cx="50" cy="66" rx="4.5" ry="3.5" fill="' + INK + '" />'
        );
      },
    },
    {
      id: 'gorilla', label: 'Gorilla',
      build: function (fur) {
        return (
          '<circle cx="24" cy="30" r="7" fill="' + fur + '" />' +
          '<circle cx="76" cy="30" r="7" fill="' + fur + '" />' +
          head(fur) +
          '<rect x="28" y="37" width="44" height="8" rx="4" fill="' + darken(fur, 0.4) + '" />' +
          defaultEyes() +
          '<ellipse cx="44" cy="65" rx="3" ry="4" fill="' + INK + '" />' +
          '<ellipse cx="56" cy="65" rx="3" ry="4" fill="' + INK + '" />' +
          '<line x1="40" y1="76" x2="60" y2="76" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" />'
        );
      },
    },
    {
      id: 'shark', label: 'Shark',
      build: function (fur) {
        return (
          '<path d="M50 0 L64 26 L36 26 Z" fill="' + fur + '" />' +
          head(fur) + defaultEyes() +
          '<ellipse cx="50" cy="62" rx="3" ry="2.5" fill="' + INK + '" />' +
          '<path d="M36 68 Q50 80 64 68 Z" fill="' + INK + '" />' +
          '<path d="M42 70 L45 76 L48 70 Z" fill="#ffffff" />' +
          '<path d="M52 70 L55 76 L58 70 Z" fill="#ffffff" />'
        );
      },
    },
    {
      id: 'robot1', label: 'Robo',
      build: function (fur) {
        return (
          '<line x1="50" y1="2" x2="50" y2="16" stroke="' + fur + '" stroke-width="4" stroke-linecap="round" />' +
          '<circle cx="50" cy="8" r="8" fill="' + fur + '" />' +
          head(fur) +
          '<rect x="28" y="40" width="44" height="18" rx="4" fill="#1b2a38" />' +
          '<circle class="preset-avatar-eye" cx="38.5" cy="49" r="5" fill="#5be0ff" />' +
          '<circle class="preset-avatar-eye" cx="61.5" cy="49" r="5" fill="#5be0ff" />' +
          '<rect x="40" y="66" width="20" height="6" rx="3" fill="#1b2a38" />'
        );
      },
    },
    {
      id: 'robot2', label: 'Botly',
      build: function (fur) {
        return (
          '<rect x="46" y="2" width="8" height="8" fill="' + fur + '" />' +
          '<line x1="50" y1="10" x2="50" y2="18" stroke="' + fur + '" stroke-width="4" stroke-linecap="round" />' +
          head(fur) +
          '<circle cx="50" cy="49" r="14" fill="#1b2a38" />' +
          '<circle class="preset-avatar-eye" cx="50" cy="49" r="8" fill="#5be0ff" />' +
          '<rect x="40" y="70" width="4" height="8" fill="#1b2a38" />' +
          '<rect x="48" y="70" width="4" height="8" fill="#1b2a38" />' +
          '<rect x="56" y="70" width="4" height="8" fill="#1b2a38" />'
        );
      },
    },
  ];

  const MASCOT_BASE_FUR = {
    bear: '#8a5a3c', fox: '#e8722c', panda: '#f2f2f2', tiger: '#e8862c',
    lion: '#e0a840', owl: '#8a6a4a', bulldog: '#c9b8a0', rabbit: '#ece4da',
    koala: '#9a9a9a', wolf: '#6a6a72', gorilla: '#4a4038', shark: '#6b8fa3',
    robot1: '#8090a0', robot2: '#a8b0b8',
  };

  const COLORS = [
    { id: 'red', label: 'Red', hex: '#e63946' },
    { id: 'blue', label: 'Blue', hex: '#1e9bff' },
    { id: 'green', label: 'Green', hex: '#2ecc71' },
    { id: 'purple', label: 'Purple', hex: '#9b5de5' },
    { id: 'orange', label: 'Orange', hex: '#f77f00' },
    { id: 'black', label: 'Black', hex: '#2b2b2b' },
  ];

  const ACCESSORIES = [
    { id: 'none', label: 'None' },
    { id: 'headband', label: 'Headband' },
    { id: 'wristbands', label: 'Wristbands' },
    { id: 'cap', label: 'Cap' },
  ];

  function findMascot(charId) {
    return MASCOTS.find(function (m) { return m.id === charId; }) || MASCOTS[0];
  }
  function findColorHex(colorId) {
    const c = COLORS.find(function (c) { return c.id === colorId; });
    return c ? c.hex : COLORS[0].hex;
  }

  // Always-visible outfit cue (a small collar/crew-neck band) so the
  // color variant reads even when no accessory is chosen -- accessories
  // are the SEPARATE, optional layer on top of this.
  function collarSvg(colorHex) {
    return '<rect x="25" y="84" width="50" height="12" rx="6" fill="' + colorHex + '" />';
  }

  function accessorySvg(accessoryId, colorHex) {
    if (accessoryId === 'headband') {
      return '<rect x="10" y="24" width="80" height="12" rx="6" fill="' + colorHex + '" />';
    }
    if (accessoryId === 'wristbands') {
      return (
        '<rect x="2" y="70" width="16" height="10" rx="5" fill="' + colorHex + '" />' +
        '<rect x="82" y="70" width="16" height="10" rx="5" fill="' + colorHex + '" />'
      );
    }
    if (accessoryId === 'cap') {
      return (
        '<ellipse cx="50" cy="6" rx="42" ry="27" fill="' + colorHex + '" />' +
        '<ellipse cx="50" cy="34" rx="26" ry="7" fill="' + darken(colorHex, 0.2) + '" />'
      );
    }
    return '';
  }

  const MASCOT_PREFIX = 'mascot:';

  function mascotId(charId, colorId, accessoryId) {
    return MASCOT_PREFIX + charId + ':' + colorId + ':' + accessoryId;
  }

  // Returns {charId, colorId, accessoryId} for a composite id, or null for
  // anything else (including every original LIST id, which never contains
  // the "mascot:" prefix) -- this is the sole switch between the two
  // avatar generations.
  function parseMascotId(id) {
    if (typeof id !== 'string' || id.indexOf(MASCOT_PREFIX) !== 0) return null;
    const parts = id.slice(MASCOT_PREFIX.length).split(':');
    if (parts.length !== 3) return null;
    return { charId: parts[0], colorId: parts[1], accessoryId: parts[2] };
  }

  function renderMascot(charId, colorId, accessoryId) {
    const char = findMascot(charId);
    const fur = MASCOT_BASE_FUR[char.id] || '#8090a0';
    const colorHex = findColorHex(colorId);
    return (
      '<svg viewBox="0 0 100 100" class="preset-avatar-svg" role="img" aria-label="' + char.label + ' avatar">' +
        char.build(fur) +
        collarSvg(colorHex) +
        accessorySvg(accessoryId, colorHex) +
      '</svg>'
    );
  }

  const DEFAULT_MASCOT_ID = mascotId(MASCOTS[0].id, COLORS[0].id, 'none');

  function render(id) {
    const parsed = parseMascotId(id);
    if (parsed) return renderMascot(parsed.charId, parsed.colorId, parsed.accessoryId);
    return renderOriginal(find(id));
  }

  return {
    LIST, find, render,
    MASCOTS, COLORS, ACCESSORIES,
    mascotId, parseMascotId, DEFAULT_MASCOT_ID,
  };
})();
