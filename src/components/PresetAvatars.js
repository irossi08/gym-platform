window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Curated set of preset "character" avatars offered as an alternative to
 * uploading a photo during profile setup/edit. Hand-built inline SVGs (no
 * bundled image assets in this app), sharing one subtle CSS blink animation
 * (see .preset-avatar-eye in style.css) so each reads as "animated" without
 * needing a unique animation per character.
 */
App.Components.PresetAvatars = (function () {
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

  function render(id) {
    const a = find(id);
    return (
      '<svg viewBox="0 0 100 100" class="preset-avatar-svg" role="img" aria-label="' + a.label + ' avatar">' +
        '<circle cx="50" cy="50" r="48" fill="' + a.color + '" />' +
        '<circle class="preset-avatar-eye" cx="35" cy="45" r="6.5" fill="#12121a" />' +
        '<circle class="preset-avatar-eye" cx="65" cy="45" r="6.5" fill="#12121a" />' +
        '<path d="M34 66 Q50 78 66 66" stroke="#12121a" stroke-width="4.5" fill="none" stroke-linecap="round" />' +
      '</svg>'
    );
  }

  return { LIST, find, render };
})();
