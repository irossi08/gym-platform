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
 *
 * Presets come in two generations (see App.Components.PresetAvatars): the
 * original flat-color set, and the newer fitness-mascot set, where picking
 * a character reveals a customize panel (color + accessory) below the
 * grid. mascotState tracks that customization separately from `choice` --
 * `choice.presetId` only ever holds the single composite id actually
 * saved, while mascotState is what the color/accessory controls read and
 * write, rebuilding that composite id via PresetAvatars.mascotId() on any
 * change.
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

    // Mascot customization (color + accessory) -- only meaningful once a
    // mascot is actually selected, but always initialized to sensible
    // defaults (or, if this profile already has one picked, parsed back
    // out of its composite id) so the customize panel has something
    // reasonable to show the very first time it opens.
    const existingMascot = App.Components.PresetAvatars.parseMascotId(choice.presetId);
    const mascotState = existingMascot || {
      charId: App.Components.PresetAvatars.MASCOTS[0].id,
      colorId: App.Components.PresetAvatars.COLORS[0].id,
      accessoryId: 'none',
    };

    const presetGridHtml = App.Components.PresetAvatars.LIST.map(function (a) {
      return (
        '<button type="button" class="preset-avatar-option" data-preset-id="' + a.id + '" aria-label="' + a.label + '">' +
          App.Components.PresetAvatars.render(a.id) +
        '</button>'
      );
    }).join('');

    // Each mascot button previews its character in a fixed neutral look
    // (first color, no accessory) -- picking one selects the CHARACTER;
    // the actual color/accessory is then chosen below via the customize
    // panel's own live preview, not by re-rendering all 14 of these.
    const mascotGridHtml = App.Components.PresetAvatars.MASCOTS.map(function (m) {
      return (
        '<button type="button" class="preset-avatar-option" data-mascot-char="' + m.id + '" aria-label="' + m.label + '">' +
          App.Components.PresetAvatars.render(App.Components.PresetAvatars.mascotId(m.id, App.Components.PresetAvatars.COLORS[0].id, 'none')) +
        '</button>'
      );
    }).join('');

    const colorSwatchesHtml = App.Components.PresetAvatars.COLORS.map(function (c) {
      return '<button type="button" class="mascot-color-swatch" data-color-id="' + c.id + '" style="background:' + c.hex + '" aria-label="' + c.label + '"></button>';
    }).join('');

    const accessoryButtonsHtml = App.Components.PresetAvatars.ACCESSORIES.map(function (a) {
      return '<button type="button" class="mascot-accessory-btn" data-accessory-id="' + a.id + '">' + a.label + '</button>';
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
            '<p class="preset-section-label">Originals</p>' +
            '<div class="preset-avatar-grid">' + presetGridHtml + '</div>' +
            '<p class="preset-section-label">Mascots</p>' +
            '<div class="preset-avatar-grid">' + mascotGridHtml + '</div>' +
            '<div class="mascot-customize" id="pf-mascot-customize" hidden>' +
              '<div class="mascot-customize-preview" id="pf-mascot-preview"></div>' +
              '<div class="mascot-customize-controls">' +
                '<p class="mascot-customize-label">Color</p>' +
                '<div class="mascot-color-row">' + colorSwatchesHtml + '</div>' +
                '<p class="mascot-customize-label">Accessory</p>' +
                '<div class="mascot-accessory-row">' + accessoryButtonsHtml + '</div>' +
              '</div>' +
            '</div>' +
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
      presetButtons: container.querySelectorAll('.preset-avatar-option[data-preset-id]'),
      mascotCharButtons: container.querySelectorAll('.preset-avatar-option[data-mascot-char]'),
      mascotCustomize: container.querySelector('#pf-mascot-customize'),
      mascotPreview: container.querySelector('#pf-mascot-preview'),
      mascotColorBtns: container.querySelectorAll('.mascot-color-swatch'),
      mascotAccessoryBtns: container.querySelectorAll('.mascot-accessory-btn'),
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
      const selectedMascot = choice.type === 'preset' ? App.Components.PresetAvatars.parseMascotId(choice.presetId) : null;
      els.mascotCharButtons.forEach(function (btn) {
        btn.classList.toggle('preset-avatar-option--selected', !!selectedMascot && btn.dataset.mascotChar === selectedMascot.charId);
      });
    }

    // The customize panel (live preview + color/accessory pickers) only
    // shows once the current choice is actually a mascot -- picking an
    // original avatar hides it again, since color/accessory don't apply
    // to those. mascotState itself is intentionally NOT reset when it's
    // hidden, so switching back to a mascot (even a different character)
    // remembers whatever color/accessory was last chosen.
    function refreshMascotCustomize() {
      const selectedMascot = choice.type === 'preset' ? App.Components.PresetAvatars.parseMascotId(choice.presetId) : null;
      els.mascotCustomize.hidden = !selectedMascot;
      if (!selectedMascot) return;

      els.mascotPreview.innerHTML = App.Components.PresetAvatars.render(choice.presetId);
      els.mascotColorBtns.forEach(function (btn) {
        btn.classList.toggle('mascot-color-swatch--selected', btn.dataset.colorId === mascotState.colorId);
      });
      els.mascotAccessoryBtns.forEach(function (btn) {
        btn.classList.toggle('mascot-accessory-btn--active', btn.dataset.accessoryId === mascotState.accessoryId);
      });
    }

    function selectMascot() {
      choice.type = 'preset';
      choice.presetId = App.Components.PresetAvatars.mascotId(mascotState.charId, mascotState.colorId, mascotState.accessoryId);
      choice.file = null;
      choice.existingPath = null;
      els.photoInput.value = '';
      els.avatarError.textContent = '';
      refreshUploadPreview();
      refreshPresetHighlight();
      refreshMascotCustomize();
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
        refreshMascotCustomize();
      });
    });

    els.mascotCharButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        mascotState.charId = btn.dataset.mascotChar;
        selectMascot();
      });
    });

    els.mascotColorBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        mascotState.colorId = btn.dataset.colorId;
        selectMascot();
      });
    });

    els.mascotAccessoryBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        mascotState.accessoryId = btn.dataset.accessoryId;
        selectMascot();
      });
    });

    showPanel(choice.type === 'preset' ? 'preset' : 'upload');
    refreshPresetHighlight();
    refreshUploadPreview();
    refreshMascotCustomize();

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
