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
 */
App.Components.Avatar = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function altFor(profile) {
    return profile && profile.name ? escapeHtml(profile.name) + ' avatar' : 'Profile avatar';
  }

  function render(container, profile) {
    if (profile && profile.profilePictureType === 'preset' && profile.presetAvatarId) {
      container.innerHTML = App.Components.PresetAvatars.render(profile.presetAvatarId);
      return;
    }
    container.innerHTML = '<div class="avatar-placeholder"></div>';
    if (profile && profile.profilePictureType === 'upload' && profile.profilePictureUrl) {
      App.Storage.getProfilePhotoUrl(profile.profilePictureUrl).then(function (url) {
        if (!url) return;
        container.innerHTML = '<img src="' + url + '" alt="' + altFor(profile) + '" />';
      });
    }
  }

  // Renders a whole list at once -- entries: [{ container, profile }].
  // Presets paint immediately (no network involved). Any uploaded photos
  // paint a placeholder first, THEN get ONE single batched signed-url
  // request for the whole list (App.Storage.getProfilePhotoUrls) fired
  // after the list is already on screen -- avatars pop in a moment later
  // rather than the list itself waiting on that request. This is what
  // friends/community-member/leaderboard lists should use instead of
  // calling render() per row, which would either mean N separate signed-
  // url requests or (the earlier, since-reverted approach) blocking the
  // whole list's render on one combined request.
  function renderList(entries) {
    const paths = [];
    entries.forEach(function (e) {
      if (!e.container) return;
      if (e.profile && e.profile.profilePictureType === 'preset' && e.profile.presetAvatarId) {
        e.container.innerHTML = App.Components.PresetAvatars.render(e.profile.presetAvatarId);
      } else {
        e.container.innerHTML = '<div class="avatar-placeholder"></div>';
        if (e.profile && e.profile.profilePictureType === 'upload' && e.profile.profilePictureUrl) {
          paths.push(e.profile.profilePictureUrl);
        }
      }
    });
    if (paths.length === 0) return;
    App.Storage.getProfilePhotoUrls(paths).then(function (urlMap) {
      entries.forEach(function (e) {
        if (!e.container || !e.profile || e.profile.profilePictureType !== 'upload' || !e.profile.profilePictureUrl) return;
        const url = urlMap[e.profile.profilePictureUrl];
        if (url) e.container.innerHTML = '<img src="' + url + '" alt="' + altFor(e.profile) + '" />';
      });
    });
  }

  return { render, renderList };
})();
