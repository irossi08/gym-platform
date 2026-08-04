window.App = window.App || {};
App.Pages = App.Pages || {};

/**
 * Full-page profile view: avatar (uploaded photo or preset), name/age/
 * bodyweight, current streak, up to 3 most-recent earned medals overlapping
 * the avatar's lower edge (the whole cluster links to the full Achievements
 * list), and an edit pencil opening ProfileEditModal -- exactly what used to
 * be Home's own profile card, moved here wholesale (same markup/classes, so
 * none of its existing CSS needed to change). Reached from the account
 * name/avatar area in the top bar (see Navbar.js), not from Home. The
 * profile itself is guaranteed to exist by the time this ever renders --
 * router.js redirects to the mandatory setup flow otherwise.
 */
App.Pages.Profile = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderProfileCard(container, user) {
    const profile = App.Storage.getProfile(user.id);
    const streak = App.Storage.getStreak(user.id);
    const achievements = App.Storage.getAchievements(user.id)
      .slice()
      .sort(function (a, b) { return new Date(b.achievedAt) - new Date(a.achievedAt); });
    const recentMedals = achievements.slice(0, 3);

    const displayUnit = App.Storage.getSettings(user.id).displayUnit || profile.bodyweightUnit || 'kg';
    const bwText = profile.bodyweight != null
      ? App.Units.round(App.Units.convert(profile.bodyweight, profile.bodyweightUnit || 'kg', displayUnit), 1) + ' ' + displayUnit
      : null;
    const metaParts = [];
    if (profile.age) metaParts.push(profile.age + ' yrs');
    if (bwText) metaParts.push(bwText);

    const avatarHtml = (profile.profilePictureType === 'preset' && profile.presetAvatarId)
      ? App.Components.PresetAvatars.render(profile.presetAvatarId)
      : '<div class="profile-avatar-empty"></div>';

    const medalsHtml = recentMedals.length
      ? '<a href="#/achievements" class="profile-medals" aria-label="View all earned medals">' +
          recentMedals.map(function (a) { return '<span class="profile-medal">' + App.Components.MedalIcon.render(a.tier) + '</span>'; }).join('') +
        '</a>'
      : '';

    container.innerHTML =
      '<div class="profile-card-inner">' +
        '<div class="profile-avatar-wrap">' +
          '<div class="profile-avatar" id="profile-avatar-slot">' + avatarHtml + '</div>' +
          medalsHtml +
        '</div>' +
        '<div class="profile-info">' +
          '<p class="profile-name">' + (profile.name ? escapeHtml(profile.name) : '') + '</p>' +
          (metaParts.length ? '<p class="profile-meta">' + metaParts.join(' &middot; ') + '</p>' : '') +
          '<p class="profile-streak">' + App.Components.StreakIcon.render(streak.count || 0) + '<span>' + (streak.count || 0) + ' day streak</span></p>' +
        '</div>' +
        '<button type="button" class="profile-edit-btn" id="profile-edit-btn" aria-label="Edit profile">&#9998;</button>' +
      '</div>';

    if (profile.profilePictureType === 'upload' && profile.profilePictureUrl) {
      App.Storage.getProfilePhotoUrl(profile.profilePictureUrl).then(function (url) {
        if (!url) return;
        const slot = container.querySelector('#profile-avatar-slot');
        if (slot) slot.innerHTML = '<img src="' + url + '" alt="Profile photo" />';
      });
    }

    container.querySelector('#profile-edit-btn').addEventListener('click', function () {
      App.Components.ProfileEditModal.open(user, function () {
        renderProfileCard(container, user);
        App.Router.refreshNavbar(); // picks up a changed name/photo in the top bar immediately
      });
    });
  }

  function render(container, opts) {
    const user = opts.user;

    container.innerHTML =
      '<section class="page page-profile">' +
        '<div class="page-header"><h1 class="page-title">Profile</h1></div>' +
        '<div id="profile-quick-links"></div>' +
        '<div class="card profile-card" id="profile-card-container"></div>' +
      '</section>';

    App.Components.QuickLinks.render(container.querySelector('#profile-quick-links'), user, 'profile');
    renderProfileCard(container.querySelector('#profile-card-container'), user);
  }

  return { render };
})();
