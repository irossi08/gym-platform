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
              '<label for="a-username">Username</label>' +
              '<input id="a-username" type="text" autocomplete="username" autocapitalize="none" />' +
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
            '<button type="submit" class="btn-primary" id="a-submit">' + (isSignup ? 'Create account' : 'Log in') + '</button>' +
          '</form>' +
        '</div>' +
      '</section>';

    const form = container.querySelector('.auth-form');
    const usernameInput = container.querySelector('#a-username');
    const passwordInput = container.querySelector('#a-password');
    const confirmInput = container.querySelector('#a-confirm');
    const formError = container.querySelector('#a-form-error');
    const submitBtn = container.querySelector('#a-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formError.textContent = '';

      const username = usernameInput.value;
      const password = passwordInput.value;

      if (isSignup && confirmInput.value !== password) {
        formError.textContent = "Passwords don't match.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait…';

      const authFn = isSignup ? App.Auth.signup : App.Auth.login;
      authFn(username, password).then(function (res) {
        if (!res.ok) {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignup ? 'Create account' : 'Log in';
          formError.textContent = res.error;
          return;
        }
        App.Router.navigate('home');
      });
    });
  }

  return { render };
})();
