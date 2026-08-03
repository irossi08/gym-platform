window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Edit form for the profile card's pencil icon -- same field set as the
 * mandatory ProfileSetup page, reused via ProfileForm in 'edit' mode (adds
 * a Cancel button). Overlay appended to document.body, same
 * open/close/outside-click/Escape/hashchange pattern as StreakModal.
 */
App.Components.ProfileEditModal = (function () {
  let overlayEl = null;

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

  function open(user, onSaved) {
    close();
    const profile = App.Storage.getProfile(user.id);

    overlayEl = document.createElement('div');
    overlayEl.className = 'profile-edit-overlay';
    overlayEl.innerHTML =
      '<div class="profile-edit-modal" role="dialog" aria-modal="true" aria-label="Edit profile">' +
        '<button type="button" class="profile-edit-close" aria-label="Close">&times;</button>' +
        '<h2 class="section-title">Edit Profile</h2>' +
        '<div id="profile-edit-form-slot"></div>' +
      '</div>';

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) close(); });
    overlayEl.querySelector('.profile-edit-close').addEventListener('click', close);

    document.body.appendChild(overlayEl);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKeydown);

    App.Components.ProfileForm.render(overlayEl.querySelector('#profile-edit-form-slot'), {
      user: user,
      profile: profile,
      mode: 'edit',
      onCancel: close,
      onSave: function (fields) {
        App.Storage.saveProfile(user.id, Object.assign({}, profile, fields));
        App.Storage.addBodyweightEntry(user.id, {
          date: new Date().toISOString(),
          weight: fields.bodyweight,
          unit: fields.bodyweightUnit,
        });
        close();
        if (onSaved) onSaved();
      },
    });
  }

  return { open, close };
})();
