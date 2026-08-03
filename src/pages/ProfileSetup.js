window.App = window.App || {};
App.Pages = App.Pages || {};

/**
 * Mandatory first-time profile setup. router.js redirects any protected
 * route here whenever the current user's profile.setupComplete flag isn't
 * true yet, and redirects away from here back to home once it is -- this
 * page is never revisited after the first completion; later edits happen
 * via ProfileEditModal from Home instead.
 */
App.Pages.ProfileSetup = (function () {
  function render(container, opts) {
    const user = opts.user;
    const profile = App.Storage.getProfile(user.id);

    container.innerHTML =
      '<section class="page page-profile-setup">' +
        '<div class="profile-setup-card card">' +
          '<h1 class="auth-title">Set up your profile</h1>' +
          '<p class="field-hint">Just a few details before you get started.</p>' +
          '<div id="profile-setup-form-slot"></div>' +
        '</div>' +
      '</section>';

    App.Components.ProfileForm.render(container.querySelector('#profile-setup-form-slot'), {
      user: user,
      profile: profile,
      mode: 'setup',
      onSave: function (fields) {
        App.Storage.saveProfile(user.id, Object.assign({}, profile, fields, { setupComplete: true }));
        App.Storage.addBodyweightEntry(user.id, {
          date: new Date().toISOString(),
          weight: fields.bodyweight,
          unit: fields.bodyweightUnit,
        });
        App.Router.navigate('home');
      },
    });
  }

  return { render };
})();
