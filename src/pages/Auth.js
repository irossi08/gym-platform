window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Auth = (function () {
  // Google's own standard multi-color "G" mark -- used as-is (light
  // button style, their own brand guidelines) rather than recolored to
  // match the app's own accent, since this button represents Google's
  // identity, not ours.
  function googleIconSvg() {
    return (
      '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">' +
        '<path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>' +
        '<path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>' +
        '<path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>' +
        '<path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>' +
      '</svg>'
    );
  }

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
          '<button type="button" class="btn-google" id="a-google-btn">' +
            googleIconSvg() +
            '<span>Continue with Google</span>' +
          '</button>' +
          '<p class="field-error" id="a-google-error" aria-live="polite"></p>' +
          '<div class="auth-divider"><span>or</span></div>' +
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

    const googleBtn = container.querySelector('#a-google-btn');
    const googleError = container.querySelector('#a-google-error');
    googleBtn.addEventListener('click', function () {
      googleError.textContent = '';
      googleBtn.disabled = true;
      // No mode branching needed here (unlike the email/password form
      // above) -- Google OAuth doesn't distinguish "sign up" from
      // "log in": Supabase creates the account the first time this
      // email/Google identity is seen and just logs it in on every
      // return visit, same button either way.
      App.Auth.signInWithGoogle().then(function (res) {
        if (!res.ok) {
          googleBtn.disabled = false;
          googleError.textContent = res.error || 'Could not start Google sign-in. Please try again.';
        }
        // On success the page is already navigating away to Google --
        // nothing left to do here.
      });
    });

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
          App.Components.GymAutoComplete.init(res.user);
          App.Router.navigate('home');
        });
      });
    });
  }

  return { render };
})();
