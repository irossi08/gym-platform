window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Renders a profile's avatar (uploaded photo or preset) into a container --
 * synchronously for a preset, or with a placeholder swapped for an <img>
 * once a signed URL resolves for an uploaded photo. Shared by anywhere
 * another user's (or your own) avatar needs to show up outside the Home
 * profile card: friends list, community member list, challenge leaderboard.
 * Works cross-user because getProfilePhotoUrl just signs whatever path
 * it's given -- RLS (profile_photos_select_connections in schema.sql)
 * decides whether the caller is actually allowed to see that path.
 *
 * If `profile.resolvedPhotoUrl` is already set (App.Social.profilesForUserIds
 * batches this for a whole list in one request), it's used immediately with
 * no network call here at all -- this per-avatar fetch is only a fallback
 * for a profile object built some other way.
 */
App.Components.Avatar = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render(container, profile) {
    if (profile && profile.profilePictureType === 'preset' && profile.presetAvatarId) {
      container.innerHTML = App.Components.PresetAvatars.render(profile.presetAvatarId);
      return;
    }
    const alt = profile && profile.name ? escapeHtml(profile.name) + ' avatar' : 'Profile avatar';
    if (profile && profile.profilePictureType === 'upload' && profile.resolvedPhotoUrl) {
      container.innerHTML = '<img src="' + profile.resolvedPhotoUrl + '" alt="' + alt + '" />';
      return;
    }
    container.innerHTML = '<div class="avatar-placeholder"></div>';
    if (profile && profile.profilePictureType === 'upload' && profile.profilePictureUrl) {
      App.Storage.getProfilePhotoUrl(profile.profilePictureUrl).then(function (url) {
        if (!url) return;
        container.innerHTML = '<img src="' + url + '" alt="' + alt + '" />';
      });
    }
  }

  return { render };
})();
