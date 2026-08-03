window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Friends list dropdown, opened from the icon on Home's page header --
 * lives entirely on Home, no page navigation. Shows accepted friends only
 * (managing incoming/outgoing requests and communities stays on the
 * Community page, linked from here) with a live search-by-name filter.
 * Overlay appended to document.body, same open/close/outside-click/
 * Escape/hashchange pattern as StreakModal/ProfileEditModal.
 */
App.Components.FriendsPanel = (function () {
  let overlayEl = null;
  let allFriends = [];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.remove();
    overlayEl = null;
    window.removeEventListener('hashchange', close);
    document.removeEventListener('keydown', onKeydown);
  }

  function renderList(listEl, friends) {
    listEl.innerHTML = friends.length
      ? friends.map(function (f) {
          return (
            '<li class="community-person-row" data-user-id="' + f.userId + '">' +
              '<div class="community-person-avatar"></div>' +
              '<span class="community-person-name">' + (f.profile && f.profile.name ? escapeHtml(f.profile.name) : 'Unknown user') + '</span>' +
            '</li>'
          );
        }).join('')
      : '<li class="empty-hint">No friends match.</li>';

    App.Components.Avatar.renderList(friends.map(function (f) {
      const row = listEl.querySelector('.community-person-row[data-user-id="' + f.userId + '"]');
      return { container: row ? row.querySelector('.community-person-avatar') : null, profile: f.profile };
    }));
  }

  function open(user) {
    close();

    overlayEl = document.createElement('div');
    overlayEl.className = 'friends-panel-overlay';
    overlayEl.innerHTML =
      '<div class="friends-panel" role="dialog" aria-modal="true" aria-label="Friends">' +
        '<button type="button" class="friends-panel-close" aria-label="Close">&times;</button>' +
        '<h2 class="section-title">Friends</h2>' +
        '<input type="text" class="friends-panel-search" placeholder="Search friends by name…" />' +
        '<ul class="community-people-list friends-panel-list"><li class="empty-hint">Loading…</li></ul>' +
        '<a href="#/community" class="btn-ghost-sm friends-panel-manage-link">Manage friends &amp; requests</a>' +
      '</div>';

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) close(); });
    overlayEl.querySelector('.friends-panel-close').addEventListener('click', close);
    overlayEl.querySelector('.friends-panel-manage-link').addEventListener('click', close);

    document.body.appendChild(overlayEl);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKeydown);

    const listEl = overlayEl.querySelector('.friends-panel-list');
    const searchInput = overlayEl.querySelector('.friends-panel-search');

    App.Social.getFriendData(user.id).then(function (fd) {
      allFriends = fd.friends;
      renderList(listEl, allFriends);
    });

    searchInput.addEventListener('input', function () {
      const term = searchInput.value.trim().toLowerCase();
      const filtered = !term
        ? allFriends
        : allFriends.filter(function (f) { return f.profile && f.profile.name && f.profile.name.toLowerCase().indexOf(term) !== -1; });
      renderList(listEl, filtered);
    });
  }

  return { open, close };
})();
