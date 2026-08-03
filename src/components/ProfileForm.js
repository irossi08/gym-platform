window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Shared name/age/bodyweight/profile-picture form, used both by the
 * mandatory first-time ProfileSetup page (opts.mode = 'setup', no cancel)
 * and by ProfileEditModal (opts.mode = 'edit', has a cancel button).
 * Doesn't know what happens after a successful save (navigate home vs.
 * close a modal) -- that's entirely up to opts.onSave.
 *
 * The picture choice (upload vs. preset) is mutually exclusive: actually
 * picking a file clears any preset selection, and clicking a preset avatar
 * clears any chosen file, tracked in a single `choice` object rather than
 * two independent booleans so there's never a moment both are "set".
 */
App.Components.ProfileForm = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render(container, opts) {
    const user = opts.user;
    const profile = opts.profile || null;
    const isEdit = opts.mode === 'edit';

    const choice = {
      type: profile ? profile.profilePictureType || null : null,
      file: null,
      presetId: profile ? profile.presetAvatarId || null : null,
      existingPath: profile && profile.profilePictureType === 'upload' ? profile.profilePictureUrl : null,
    };

    const presetGridHtml = App.Components.PresetAvatars.LIST.map(function (a) {
      return (
        '<button type="button" class="preset-avatar-option" data-preset-id="' + a.id + '" aria-label="' + a.label + '">' +
          App.Components.PresetAvatars.render(a.id) +
        '</button>'
      );
    }).join('');

    container.innerHTML =
      '<form class="profile-form" novalidate>' +
        '<div class="field">' +
          '<label for="pf-name">Name</label>' +
          '<input id="pf-name" type="text" autocomplete="name" value="' + (profile && profile.name ? escapeHtml(profile.name) : '') + '" />' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field">' +
            '<label for="pf-age">Age</label>' +
            '<input id="pf-age" type="number" min="1" max="120" step="1"' + (profile && profile.age ? ' value="' + profile.age + '"' : '') + ' />' +
          '</div>' +
          '<div class="field">' +
            '<label for="pf-bodyweight">Bodyweight</label>' +
            '<input id="pf-bodyweight" type="number" min="0" step="0.5"' + (profile && profile.bodyweight ? ' value="' + profile.bodyweight + '"' : '') + ' />' +
          '</div>' +
          '<div class="field field-narrow">' +
            '<label for="pf-bw-unit">Unit</label>' +
            '<select id="pf-bw-unit">' +
              '<option value="kg"' + (profile && profile.bodyweightUnit === 'lb' ? '' : ' selected') + '>kg</option>' +
              '<option value="lb"' + (profile && profile.bodyweightUnit === 'lb' ? ' selected' : '') + '>lb</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label>Profile Picture</label>' +
          '<div class="avatar-mode-toggle" role="group" aria-label="Profile picture type">' +
            '<button type="button" class="avatar-mode-btn" data-mode="upload">Upload Photo</button>' +
            '<button type="button" class="avatar-mode-btn" data-mode="preset">Choose Avatar</button>' +
          '</div>' +
          '<div class="avatar-mode-panel" id="pf-upload-panel">' +
            '<div class="avatar-preview" id="pf-upload-preview"><div class="avatar-preview-empty">No photo yet</div></div>' +
            '<input type="file" accept="image/*" id="pf-photo-input" />' +
          '</div>' +
          '<div class="avatar-mode-panel" id="pf-preset-panel" hidden>' +
            '<div class="preset-avatar-grid">' + presetGridHtml + '</div>' +
          '</div>' +
          '<p class="field-error" id="pf-avatar-error"></p>' +
        '</div>' +
        '<p class="field-error" id="pf-form-error" aria-live="polite"></p>' +
        '<div class="profile-form-actions">' +
          '<button type="submit" class="btn-primary" id="pf-submit">' + (isEdit ? 'Save changes' : 'Continue') + '</button>' +
          (isEdit ? '<button type="button" class="btn-ghost-sm" id="pf-cancel">Cancel</button>' : '') +
        '</div>' +
      '</form>';

    const els = {
      form: container.querySelector('.profile-form'),
      name: container.querySelector('#pf-name'),
      age: container.querySelector('#pf-age'),
      bodyweight: container.querySelector('#pf-bodyweight'),
      bwUnit: container.querySelector('#pf-bw-unit'),
      modeBtns: container.querySelectorAll('.avatar-mode-btn'),
      uploadPanel: container.querySelector('#pf-upload-panel'),
      presetPanel: container.querySelector('#pf-preset-panel'),
      uploadPreview: container.querySelector('#pf-upload-preview'),
      photoInput: container.querySelector('#pf-photo-input'),
      presetButtons: container.querySelectorAll('.preset-avatar-option'),
      avatarError: container.querySelector('#pf-avatar-error'),
      formError: container.querySelector('#pf-form-error'),
      submitBtn: container.querySelector('#pf-submit'),
      cancelBtn: container.querySelector('#pf-cancel'),
    };

    function showPanel(mode) {
      els.uploadPanel.hidden = mode !== 'upload';
      els.presetPanel.hidden = mode !== 'preset';
      els.modeBtns.forEach(function (btn) {
        btn.classList.toggle('avatar-mode-btn--active', btn.dataset.mode === mode);
      });
    }

    function refreshPresetHighlight() {
      els.presetButtons.forEach(function (btn) {
        btn.classList.toggle('preset-avatar-option--selected', choice.type === 'preset' && btn.dataset.presetId === choice.presetId);
      });
    }

    function refreshUploadPreview() {
      if (choice.file) {
        const url = URL.createObjectURL(choice.file);
        els.uploadPreview.innerHTML = '<img src="' + url + '" alt="Selected photo" />';
        return;
      }
      if (choice.type === 'upload' && choice.existingPath) {
        els.uploadPreview.innerHTML = '<div class="avatar-preview-empty">Loading…</div>';
        App.Storage.getProfilePhotoUrl(choice.existingPath).then(function (url) {
          if (!url) return;
          els.uploadPreview.innerHTML = '<img src="' + url + '" alt="Current photo" />';
        });
        return;
      }
      els.uploadPreview.innerHTML = '<div class="avatar-preview-empty">No photo yet</div>';
    }

    els.modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { showPanel(btn.dataset.mode); });
    });

    els.photoInput.addEventListener('change', function () {
      const file = els.photoInput.files && els.photoInput.files[0];
      if (!file) return;
      choice.type = 'upload';
      choice.file = file;
      choice.presetId = null;
      els.avatarError.textContent = '';
      refreshUploadPreview();
      refreshPresetHighlight();
    });

    els.presetButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        choice.type = 'preset';
        choice.presetId = btn.dataset.presetId;
        choice.file = null;
        choice.existingPath = null;
        els.photoInput.value = '';
        els.avatarError.textContent = '';
        refreshUploadPreview();
        refreshPresetHighlight();
      });
    });

    showPanel(choice.type === 'preset' ? 'preset' : 'upload');
    refreshPresetHighlight();
    refreshUploadPreview();

    if (isEdit) {
      els.cancelBtn.addEventListener('click', function () { opts.onCancel(); });
    }

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      els.formError.textContent = '';
      els.avatarError.textContent = '';

      const name = els.name.value.trim();
      const age = parseInt(els.age.value, 10);
      const bodyweight = parseFloat(els.bodyweight.value);
      const bodyweightUnit = els.bwUnit.value;

      if (!name) { els.formError.textContent = 'Enter your name.'; return; }
      if (!(age > 0)) { els.formError.textContent = 'Enter a valid age.'; return; }
      if (!(bodyweight > 0)) { els.formError.textContent = 'Enter a valid bodyweight.'; return; }
      if (!choice.type || (choice.type === 'upload' && !choice.file && !choice.existingPath)) {
        els.avatarError.textContent = 'Upload a photo or choose an avatar.';
        return;
      }

      const originalLabel = els.submitBtn.textContent;
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = 'Saving…';

      function finish(pictureFields) {
        opts.onSave(Object.assign({ name: name, age: age, bodyweight: bodyweight, bodyweightUnit: bodyweightUnit }, pictureFields));
      }

      function fail(message) {
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = originalLabel;
        els.formError.textContent = message;
      }

      if (choice.type === 'upload' && choice.file) {
        App.Storage.uploadProfilePhoto(user.id, choice.file).then(function (path) {
          finish({ profilePictureType: 'upload', profilePictureUrl: path, presetAvatarId: null });
        }).catch(function () {
          fail('Photo upload failed. Please try again.');
        });
      } else if (choice.type === 'upload') {
        finish({ profilePictureType: 'upload', profilePictureUrl: choice.existingPath, presetAvatarId: null });
      } else {
        finish({ profilePictureType: 'preset', profilePictureUrl: null, presetAvatarId: choice.presetId });
      }
    });
  }

  return { render };
})();
