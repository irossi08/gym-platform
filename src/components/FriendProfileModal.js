window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Read-only view of a friend's profile -- avatar, name, age, bodyweight,
 * streak, and medals, the same fields Home's own profile card shows for
 * you. Opened by clicking a friend in FriendsPanel or Community.js's
 * friends list. Also offers "invite to a community", scoped to
 * communities the VIEWER created (App.Communities.getMyCreatedCommunities).
 * Same overlay pattern as the other document.body-level modals in this app.
 */
App.Components.FriendProfileModal = (function () {
  let overlayEl = null;

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

  function open(friendUserId, viewerUser) {
    close();

    overlayEl = document.createElement('div');
    overlayEl.className = 'friend-profile-overlay';
    overlayEl.innerHTML =
      '<div class="friend-profile-modal" role="dialog" aria-modal="true" aria-label="Friend profile">' +
        '<button type="button" class="friend-profile-close" aria-label="Close">&times;</button>' +
        '<p class="empty-hint">Loading…</p>' +
      '</div>';

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) close(); });
    overlayEl.querySelector('.friend-profile-close').addEventListener('click', close);

    document.body.appendChild(overlayEl);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKeydown);

    Promise.all([
      App.Social.getFriendProfile(friendUserId),
      App.Communities.getMyCreatedCommunities(viewerUser.id),
    ]).then(function (results) {
      if (!overlayEl) return; // closed before this resolved
      const data = results[0];
      const myCommunities = results[1];
      if (!data) {
        overlayEl.querySelector('.friend-profile-modal').innerHTML =
          '<button type="button" class="friend-profile-close" aria-label="Close">&times;</button>' +
          '<p class="empty-hint">Couldn’t load this profile.</p>';
        overlayEl.querySelector('.friend-profile-close').addEventListener('click', close);
        return;
      }
      renderProfile(friendUserId, viewerUser, data, myCommunities);
    });
  }

  function renderProfile(friendUserId, viewerUser, data, myCommunities) {
    const modalEl = overlayEl.querySelector('.friend-profile-modal');
    const displayUnit = App.Storage.getSettings(viewerUser.id).displayUnit || data.bodyweightUnit || 'kg';
    const bwText = data.bodyweight != null
      ? App.Units.round(App.Units.convert(data.bodyweight, data.bodyweightUnit || 'kg', displayUnit), 1) + ' ' + displayUnit
      : null;
    const metaParts = [];
    if (data.age) metaParts.push(data.age + ' yrs');
    if (bwText) metaParts.push(bwText);

    const recentMedals = data.achievements.slice(0, 3);
    const medalsHtml = recentMedals.length
      ? '<div class="profile-medals friend-profile-medals">' +
          recentMedals.map(function (a) { return '<span class="profile-medal">' + App.Components.MedalIcon.render(a.tier) + '</span>'; }).join('') +
        '</div>'
      : '';

    const inviteListHtml = myCommunities.length
      ? myCommunities.map(function (c) {
          return (
            '<li class="community-list-item">' +
              '<span class="community-list-name">' + escapeHtml(c.name) + '</span>' +
              '<button type="button" class="btn-ghost-sm friend-profile-invite-btn" data-community-id="' + c.id + '">Invite</button>' +
            '</li>'
          );
        }).join('')
      : '<li class="empty-hint">You haven’t created any communities yet.</li>';

    modalEl.innerHTML =
      '<button type="button" class="friend-profile-close" aria-label="Close">&times;</button>' +
      '<div class="profile-avatar-wrap friend-profile-avatar-wrap">' +
        '<div class="profile-avatar" id="friend-profile-avatar-slot"></div>' +
        medalsHtml +
      '</div>' +
      '<p class="profile-name friend-profile-name">' + (data.profile.name ? escapeHtml(data.profile.name) : 'Unknown user') + '</p>' +
      (metaParts.length ? '<p class="profile-meta friend-profile-meta">' + metaParts.join(' &middot; ') + '</p>' : '') +
      '<p class="profile-streak friend-profile-streak">' + App.Components.StreakIcon.render(data.streakCount || 0) + '<span>' + (data.streakCount || 0) + ' day streak</span></p>' +
      '<hr class="goal-divider" />' +
      '<h2 class="section-title">Invite to a community</h2>' +
      '<ul class="community-list">' + inviteListHtml + '</ul>' +
      '<p class="field-hint friend-profile-invite-status"></p>';

    App.Components.Avatar.render(modalEl.querySelector('#friend-profile-avatar-slot'), data.profile);
    modalEl.querySelector('.friend-profile-close').addEventListener('click', close);

    modalEl.querySelectorAll('.friend-profile-invite-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        const statusEl = modalEl.querySelector('.friend-profile-invite-status');
        App.Communities.inviteFriendToCommunity(btn.dataset.communityId, friendUserId).then(function (res) {
          statusEl.textContent = res.ok
            ? (data.profile.name || 'They') + ' has been added to that community.'
            : (res.error || 'Could not send the invite.');
          if (!res.ok) btn.disabled = false;
        });
      });
    });
  }

  return { open, close };
})();
