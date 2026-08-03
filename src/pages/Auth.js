window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Auth = (function () {
  function render(container, opts) {
    const mode = opts.mode === 'signup' ? 'signup' : 'login';
    const isSignup = mode === 'signup';

    container.innerHTML =
      '<section class="page page-auth">' +
        '<div class="auth-card card">' +
          '<div class="auth-tabs">' +
            '<a href="#/login" class="auth-tab' + (!isSignup ? ' auth-tab--active' : '') + '">Log In</a>' +
            '<a href="#/signup" class="auth-tab' + (isSignup ? ' auth-tab--active' : '') + '">Sign Up</a>' +
          '</div>' +
          '<h1 class="auth-title">' + (isSignup ? 'Create your account' : 'Welcome back') + '</h1>' +
          '<form class="auth-form" novalidate>' +
            '<div class="field">' +
              '<label for="a-email">Email</label>' +
              '<input id="a-email" type="email" autocomplete="email" autocapitalize="none" />' +
            '</div>' +
            '<div class="field">' +
              '<label for="a-password">Password</label>' +
              '<input id="a-password" type="password" autocomplete="' + (isSignup ? 'new-password' : 'current-password') + '" />' +
            '</div>' +
            (isSignup
              ? '<div class="field">' +
                  '<label for="a-confirm">Confirm password</label>' +
                  '<input id="a-confirm" type="password" autocomplete="new-password" />' +
                '</div>'
              : '') +
            '<p class="field-error" id="a-form-error" aria-live="polite"></p>' +
            '<p class="field-hint" id="a-form-hint" hidden></p>' +
            '<button type="submit" class="btn-primary" id="a-submit">' + (isSignup ? 'Create account' : 'Log in') + '</button>' +
          '</form>' +
        '</div>' +
      '</section>';

    const form = container.querySelector('.auth-form');
    const emailInput = container.querySelector('#a-email');
    const passwordInput = container.querySelector('#a-password');
    const confirmInput = container.querySelector('#a-confirm');
    const formError = container.querySelector('#a-form-error');
    const formHint = container.querySelector('#a-form-hint');
    const submitBtn = container.querySelector('#a-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formError.textContent = '';
      formHint.hidden = true;

      const email = emailInput.value;
      const password = passwordInput.value;

      if (isSignup && confirmInput.value !== password) {
        formError.textContent = "Passwords don't match.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait…';

      const authFn = isSignup ? App.Auth.signup : App.Auth.login;
      authFn(email, password).then(function (res) {
        if (!res.ok) {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignup ? 'Create account' : 'Log in';
          formError.textContent = res.error;
          return;
        }
        if (res.needsConfirmation) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create account';
          formHint.hidden = false;
          formHint.textContent = 'Check your email for a confirmation link, then log in below.';
          return;
        }
        // The new/returning session's data doesn't exist in this browser's
        // cache yet -- load everything once up front so Home (and anything
        // else) can keep reading App.Storage synchronously the moment it
        // renders, same as it always has.
        App.Storage.preloadAll(res.user.id).then(function () {
          App.Components.FriendRequestToast.init(res.user);
          App.Router.navigate('home');
        });
      });
    });
  }

  return { render };
})();
