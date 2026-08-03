window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Manual "mark complete" now requires a photo as proof of being at the
 * gym, rather than a bare button press -- this is the fallback for days
 * auto-detection (App.Components.GymAutoComplete) doesn't catch. Shared by
 * both Home's Today's Workout card and Split Builder's per-day complete
 * button. Uploads via App.Storage.uploadWorkoutPhoto (same resize-then-
 * upload, private-per-user-bucket pattern as profile photos), then marks
 * the date complete with photoUrl set and autoDetected false.
 * Same overlay pattern as the other document.body-level modals.
 */
App.Components.WorkoutCompleteModal = (function () {
  let overlayEl = null;
  let selectedFile = null;

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.remove();
    overlayEl = null;
    selectedFile = null;
    window.removeEventListener('hashchange', close);
    document.removeEventListener('keydown', onKeydown);
  }

  function open(user, dateKey, dayOfWeek, onDone) {
    close();
    selectedFile = null;

    overlayEl = document.createElement('div');
    overlayEl.className = 'workout-complete-overlay';
    overlayEl.innerHTML =
      '<div class="workout-complete-modal" role="dialog" aria-modal="true" aria-label="Mark workout complete">' +
        '<button type="button" class="workout-complete-close" aria-label="Close">&times;</button>' +
        '<h2 class="section-title">Mark Complete</h2>' +
        '<p class="field-hint">Upload a photo as proof you were at the gym.</p>' +
        '<div class="workout-complete-preview" id="wc-preview"><div class="avatar-placeholder"></div></div>' +
        '<input type="file" accept="image/*" capture="environment" id="wc-photo-input" />' +
        '<p class="field-error" id="wc-error"></p>' +
        '<button type="button" class="btn-primary" id="wc-confirm-btn">Confirm complete</button>' +
      '</div>';

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) close(); });
    overlayEl.querySelector('.workout-complete-close').addEventListener('click', close);
    document.body.appendChild(overlayEl);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKeydown);

    const previewEl = overlayEl.querySelector('#wc-preview');
    const errorEl = overlayEl.querySelector('#wc-error');
    const confirmBtn = overlayEl.querySelector('#wc-confirm-btn');

    overlayEl.querySelector('#wc-photo-input').addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      selectedFile = file;
      errorEl.textContent = '';
      const url = URL.createObjectURL(file);
      previewEl.innerHTML = '<img src="' + url + '" alt="Selected proof photo" />';
    });

    confirmBtn.addEventListener('click', function () {
      if (!selectedFile) { errorEl.textContent = 'Choose a photo first.'; return; }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Uploading…';
      App.Storage.uploadWorkoutPhoto(user.id, dateKey, selectedFile).then(function (path) {
        App.Schedule.setCompleted(user.id, dateKey, dayOfWeek, true, { photoUrl: path, autoDetected: false });
        close();
        onDone();
      }).catch(function () {
        errorEl.textContent = 'Photo upload failed. Please try again.';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm complete';
      });
    });
  }

  return { open, close };
})();
