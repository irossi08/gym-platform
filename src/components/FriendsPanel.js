window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Friends dropdown, opened from the icon on Home's page header -- lives
 * entirely on Home, no page navigation. Shows pending incoming requests
 * (accept/decline right here) above the accepted-friends list, which has
 * a live search-by-name filter; clicking a friend opens their full
 * profile (FriendProfileModal). Managing outgoing/sent requests and
 * communities stays on the Community page, linked from here.
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

  function renderRequests(requestsEl, incoming, user) {
    if (incoming.length === 0) {
      requestsEl.innerHTML = '';
      return;
    }
    requestsEl.innerHTML =
      '<div class="community-subsection">' +
        '<p class="community-subsection-label">Friend requests</p>' +
        '<ul class="community-people-list">' +
          incoming.map(function (r) {
            return (
              '<li class="community-person-row" data-request-id="' + r.requestId + '">' +
                '<div class="community-person-avatar"></div>' +
                '<span class="community-person-name">' + (r.profile && r.profile.name ? escapeHtml(r.profile.name) : 'Unknown user') + '</span>' +
                '<button type="button" class="btn-accent-sm friends-panel-accept-btn" data-request-id="' + r.requestId + '">Accept</button>' +
                '<button type="button" class="btn-ghost-sm friends-panel-decline-btn" data-request-id="' + r.requestId + '">Decline</button>' +
              '</li>'
            );
          }).join('') +
        '</ul>' +
      '</div>';

    App.Components.Avatar.renderList(incoming.map(function (r) {
      const row = requestsEl.querySelector('.community-person-row[data-request-id="' + r.requestId + '"]');
      return { container: row ? row.querySelector('.community-person-avatar') : null, profile: r.profile };
    }));

    requestsEl.querySelectorAll('.friends-panel-accept-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.Social.respondToFriendRequest(btn.dataset.requestId, true).then(function () { refresh(user); });
      });
    });
    requestsEl.querySelectorAll('.friends-panel-decline-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.Social.respondToFriendRequest(btn.dataset.requestId, false).then(function () { refresh(user); });
      });
    });
  }

  function renderList(listEl, friends, user) {
    listEl.innerHTML = friends.length
      ? friends.map(function (f) {
          return (
            '<li class="community-person-row community-person-row--clickable" data-user-id="' + f.userId + '">' +
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

    listEl.querySelectorAll('.community-person-row--clickable').forEach(function (row) {
      row.addEventListener('click', function () {
        close();
        App.Components.FriendProfileModal.open(row.dataset.userId, user);
      });
    });
  }

  function refresh(user) {
    if (!overlayEl) return;
    const requestsEl = overlayEl.querySelector('.friends-panel-requests');
    const listEl = overlayEl.querySelector('.friends-panel-list');
    const searchInput = overlayEl.querySelector('.friends-panel-search');
    App.Social.getFriendData(user.id).then(function (fd) {
      if (!overlayEl) return;
      allFriends = fd.friends;
      renderRequests(requestsEl, fd.incoming, user);
      const term = searchInput.value.trim().toLowerCase();
      renderList(listEl, term ? filterFriends(term) : allFriends, user);
      App.Components.FriendsBadge.setCount(fd.incoming.length);
    });
  }

  function filterFriends(term) {
    return allFriends.filter(function (f) { return f.profile && f.profile.name && f.profile.name.toLowerCase().indexOf(term) !== -1; });
  }

  function open(user) {
    close();

    overlayEl = document.createElement('div');
    overlayEl.className = 'friends-panel-overlay';
    overlayEl.innerHTML =
      '<div class="friends-panel" role="dialog" aria-modal="true" aria-label="Friends">' +
        '<button type="button" class="friends-panel-close" aria-label="Close">&times;</button>' +
        '<h2 class="section-title">Friends</h2>' +
        '<div class="friends-panel-requests"></div>' +
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
      if (!overlayEl) return;
      allFriends = fd.friends;
      renderRequests(overlayEl.querySelector('.friends-panel-requests'), fd.incoming, user);
      renderList(listEl, allFriends, user);
      App.Components.FriendsBadge.setCount(fd.incoming.length);
    });

    searchInput.addEventListener('input', function () {
      const term = searchInput.value.trim().toLowerCase();
      renderList(listEl, term ? filterFriends(term) : allFriends, user);
    });
  }

  return { open, close };
})();
