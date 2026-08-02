window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Custom-built, themed dropdown/listbox replacing native <select> for
 * exercise pickers -- native selects render their option list with the
 * browser's own UI (plain white on most platforms) which can't be
 * restyled, so this renders a button that toggles an in-page panel we fully
 * control instead. Grouped by muscle-group category exactly like the
 * picker used to be grouped via <optgroup>.
 *
 * Also owns the "Add Exercise" flow: a search box at the top of the panel
 * filters the existing options live, and typing something that isn't
 * already in this user's list checks the curated pool (App.ExercisePool)
 * for an exact or close/typo match before offering a manual custom-
 * exercise form as a last resort. Needs `opts.userId` to do any of that --
 * without it the picker still works as a plain filtered dropdown, it just
 * can't offer to add anything new.
 *
 * No hidden native <select> backs this -- callers get the current value
 * via the onChange callback and are expected to track it themselves (the
 * same way the rest of this app already tracks form state in closures).
 */
App.Components.ExercisePicker = (function () {
  let uidCounter = 0;

  function closeAllPanels() {
    document.querySelectorAll('.ex-picker-panel').forEach(function (panel) {
      if (panel.hidden) return;
      panel.hidden = true;
      const trigger = document.getElementById(panel.getAttribute('aria-labelledby'));
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
      }
    });
  }

  // Single shared listeners (not one per mounted instance) so repeatedly
  // re-rendering the page (this app re-renders whole sections on most
  // actions) never accumulates duplicate document-level handlers.
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ex-picker')) closeAllPanels();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllPanels();
  });

  function normalize(str) {
    return String(str || '').trim().toLowerCase();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const MUSCLE_GROUPS = App.Standards.CATEGORIES.map(function (g) { return g.label; });
  const PATTERN_OPTIONS = [
    { value: '', label: 'None / not sure' },
    { value: 'squat', label: 'Squat' },
    { value: 'hinge', label: 'Hinge (deadlift-style)' },
    { value: 'vertical_push', label: 'Vertical push (overhead press)' },
    { value: 'horizontal_push', label: 'Horizontal push (bench-style)' },
    { value: 'vertical_pull', label: 'Vertical pull (pull-up style)' },
    { value: 'horizontal_pull', label: 'Horizontal pull (row-style)' },
    { value: 'isolation_curl', label: 'Isolation curl' },
    { value: 'isolation_extension', label: 'Isolation extension' },
    { value: 'leg_curl', label: 'Leg curl' },
    { value: 'calf_raise', label: 'Calf raise' },
    { value: 'hip_thrust', label: 'Hip thrust' },
    { value: 'core', label: 'Core / ab' },
    { value: 'shrug', label: 'Shrug' },
  ];

  function render(container, opts) {
    const id = opts.id || ('ex-picker-' + (++uidCounter));
    const triggerClass = opts.triggerClass || '';
    const userId = opts.userId;
    let currentValue = opts.value;
    const onChange = opts.onChange || function () {};

    function labelFor(lift) {
      return App.ExerciseLibrary.label(lift, userId);
    }

    const categories = App.ExerciseLibrary.categories(userId);

    const groupsHtml = categories.map(function (group) {
      const optionsHtml = group.lifts.map(function (lift) {
        const selected = lift === currentValue;
        return (
          '<div class="ex-picker-option" role="option" data-lift="' + lift + '" ' +
            'id="' + id + '-opt-' + lift + '" aria-selected="' + selected + '">' +
            escapeHtml(labelFor(lift)) +
          '</div>'
        );
      }).join('');
      return (
        '<div class="ex-picker-group" role="group" aria-label="' + group.label + '">' +
          '<div class="ex-picker-group-label">' + group.label + '</div>' +
          optionsHtml +
        '</div>'
      );
    }).join('');

    container.innerHTML =
      '<div class="ex-picker">' +
        '<button type="button" class="ex-picker-trigger ' + triggerClass + '" id="' + id + '" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="ex-picker-trigger-label">' + escapeHtml(labelFor(currentValue)) + '</span>' +
          '<span class="ex-picker-trigger-chevron" aria-hidden="true">&#9662;</span>' +
        '</button>' +
        '<div class="ex-picker-panel" role="listbox" aria-labelledby="' + id + '" hidden>' +
          (userId ? '<div class="ex-picker-search-wrap"><input type="text" class="ex-picker-search" placeholder="Search or add an exercise…" /></div>' : '') +
          '<div class="ex-picker-groups">' + groupsHtml + '</div>' +
          (userId ? '<div class="ex-picker-add-area" hidden></div>' : '') +
        '</div>' +
      '</div>';

    const root = container.querySelector('.ex-picker');
    const trigger = root.querySelector('.ex-picker-trigger');
    const panel = root.querySelector('.ex-picker-panel');
    const labelEl = root.querySelector('.ex-picker-trigger-label');
    const searchInput = root.querySelector('.ex-picker-search');
    const addArea = root.querySelector('.ex-picker-add-area');

    function optionEls() {
      return Array.prototype.slice.call(panel.querySelectorAll('.ex-picker-option'));
    }

    function setActive(optEl) {
      optionEls().forEach(function (o) { o.classList.remove('ex-picker-option--active'); });
      if (optEl) {
        optEl.classList.add('ex-picker-option--active');
        trigger.setAttribute('aria-activedescendant', optEl.id);
        optEl.scrollIntoView({ block: 'nearest' });
      }
    }

    // Full rebuild -- only ever called after a discrete completed action
    // (an option chosen, an exercise added), never from the search input's
    // own 'input' handler, so typing can never lose focus mid-keystroke.
    function finalizeSelection(lift) {
      currentValue = lift;
      onChange(lift);
      closeAllPanels();
      render(container, Object.assign({}, opts, { value: lift }));
    }

    function choose(lift) {
      labelEl.textContent = labelFor(lift);
      optionEls().forEach(function (o) {
        o.setAttribute('aria-selected', String(o.dataset.lift === lift));
      });
      finalizeSelection(lift);
    }

    function renderAddArea(query) {
      if (!userId) return;
      const q = normalize(query);
      if (!q) { addArea.hidden = true; addArea.innerHTML = ''; return; }

      const visibleLabels = optionEls().filter(function (o) { return !o.hidden; }).map(function (o) { return normalize(o.textContent); });
      if (visibleLabels.indexOf(q) !== -1) { addArea.hidden = true; addArea.innerHTML = ''; return; }

      const result = App.ExercisePool.search(query);
      addArea.hidden = false;

      if (result.exact) {
        addArea.innerHTML =
          '<p class="ex-picker-add-hint">Found in the exercise library:</p>' +
          '<button type="button" class="btn-ghost-sm ex-picker-add-btn" data-add-key="' + result.exact.key + '">' +
            '+ Add “' + escapeHtml(result.exact.label) + '” to my list' +
          '</button>';
      } else if (result.close.length) {
        addArea.innerHTML =
          '<p class="ex-picker-add-hint">No exact match — did you mean:</p>' +
          '<div class="ex-picker-suggestions">' +
            result.close.map(function (ex) {
              return '<button type="button" class="btn-ghost-sm ex-picker-add-btn" data-add-key="' + ex.key + '">' + escapeHtml(ex.label) + '</button>';
            }).join('') +
          '</div>' +
          '<button type="button" class="ex-picker-custom-link" id="ex-picker-open-custom">None of these — add “' + escapeHtml(query.trim()) + '” as a custom exercise</button>';
      } else {
        addArea.innerHTML =
          '<p class="ex-picker-add-hint">Not in the exercise library.</p>' +
          '<button type="button" class="btn-ghost-sm ex-picker-add-btn" id="ex-picker-open-custom">+ Add “' + escapeHtml(query.trim()) + '” as a custom exercise</button>';
      }

      addArea.querySelectorAll('.ex-picker-add-btn[data-add-key]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const key = btn.dataset.addKey;
          App.Storage.addUserAddedExercise(userId, key);
          finalizeSelection(key);
        });
      });
      const openCustomBtn = addArea.querySelector('#ex-picker-open-custom');
      if (openCustomBtn) {
        openCustomBtn.addEventListener('click', function () { renderCustomForm(query.trim()); });
      }
    }

    function renderCustomForm(prefilledName) {
      addArea.hidden = false;
      addArea.innerHTML =
        '<div class="ex-picker-custom-form">' +
          '<div class="field">' +
            '<label for="' + id + '-custom-name">Exercise name</label>' +
            '<input type="text" id="' + id + '-custom-name" value="' + escapeHtml(prefilledName) + '" />' +
          '</div>' +
          '<div class="field">' +
            '<label for="' + id + '-custom-primary">Primary muscle group</label>' +
            '<select id="' + id + '-custom-primary">' +
              '<option value="">Select one…</option>' +
              MUSCLE_GROUPS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="' + id + '-custom-secondary">Secondary muscle group (optional)</label>' +
            '<select id="' + id + '-custom-secondary">' +
              '<option value="">None</option>' +
              MUSCLE_GROUPS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="' + id + '-custom-desc">Description (optional)</label>' +
            '<input type="text" id="' + id + '-custom-desc" placeholder="A short note about this exercise" />' +
          '</div>' +
          '<div class="field">' +
            '<label for="' + id + '-custom-pattern">Closest movement animation (optional)</label>' +
            '<select id="' + id + '-custom-pattern">' +
              PATTERN_OPTIONS.map(function (p) { return '<option value="' + p.value + '">' + p.label + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<p class="field-hint">No standards ranking/gauge is available for custom exercises.</p>' +
          '<p class="field-error" id="' + id + '-custom-error"></p>' +
          '<div class="ex-picker-custom-actions">' +
            '<button type="button" class="btn-ghost-sm" id="' + id + '-custom-cancel">Cancel</button>' +
            '<button type="button" class="btn-primary" id="' + id + '-custom-save">Save exercise</button>' +
          '</div>' +
        '</div>';

      addArea.querySelector('#' + id + '-custom-cancel').addEventListener('click', function () {
        renderAddArea(searchInput.value);
      });
      addArea.querySelector('#' + id + '-custom-save').addEventListener('click', function () {
        const nameInput = addArea.querySelector('#' + id + '-custom-name');
        const primarySelect = addArea.querySelector('#' + id + '-custom-primary');
        const secondarySelect = addArea.querySelector('#' + id + '-custom-secondary');
        const descInput = addArea.querySelector('#' + id + '-custom-desc');
        const patternSelect = addArea.querySelector('#' + id + '-custom-pattern');
        const errorEl = addArea.querySelector('#' + id + '-custom-error');
        errorEl.textContent = '';

        const name = nameInput.value.trim();
        if (!name) { errorEl.textContent = 'Enter an exercise name.'; return; }
        if (!primarySelect.value) { errorEl.textContent = 'Pick a primary muscle group.'; return; }

        const custom = App.Storage.addCustomExercise(userId, {
          name: name,
          primaryMuscle: primarySelect.value,
          secondaryMuscle: secondarySelect.value || null,
          description: descInput.value.trim() || null,
          pattern: patternSelect.value || null,
        });
        finalizeSelection(custom.key);
      });
    }

    function applyFilter() {
      if (!searchInput) return;
      const q = normalize(searchInput.value);
      optionEls().forEach(function (o) {
        o.hidden = !!q && normalize(o.textContent).indexOf(q) === -1;
      });
      root.querySelectorAll('.ex-picker-group').forEach(function (groupEl) {
        const anyVisible = Array.prototype.slice.call(groupEl.querySelectorAll('.ex-picker-option')).some(function (o) { return !o.hidden; });
        groupEl.hidden = !anyVisible;
      });
      renderAddArea(searchInput.value);
    }

    function openPanel() {
      closeAllPanels();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      const current = panel.querySelector('.ex-picker-option[aria-selected="true"]') || optionEls()[0];
      setActive(current);
      if (searchInput) searchInput.focus();
    }

    function closePanel(refocus) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (searchInput) { searchInput.value = ''; applyFilter(); }
      if (refocus) trigger.focus();
    }

    trigger.addEventListener('click', function () {
      if (panel.hidden) openPanel(); else closePanel(false);
    });

    trigger.addEventListener('keydown', function (e) {
      if (panel.hidden) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPanel();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(true);
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    // Single handler for the whole panel so arrow-key/Enter navigation
    // works the same whether focus is on an option or in the search box
    // (a normal combobox pattern) -- Space is only treated as "choose" when
    // focus is NOT in the search box, so it still types a literal space
    // while searching (plenty of exercise names have one).
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(true);
        return;
      }
      const opts_ = optionEls().filter(function (o) { return !o.hidden; });
      if (!opts_.length) return;
      const activeIdx = opts_.findIndex(function (o) { return o.classList.contains('ex-picker-option--active'); });
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(opts_[(activeIdx + 1) % opts_.length]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(opts_[(activeIdx - 1 + opts_.length) % opts_.length]);
      } else if (e.key === 'Enter' || (e.key === ' ' && e.target !== searchInput)) {
        e.preventDefault();
        if (opts_[activeIdx]) choose(opts_[activeIdx].dataset.lift);
      }
    });

    panel.addEventListener('click', function (e) {
      const opt = e.target.closest('.ex-picker-option');
      if (opt) choose(opt.dataset.lift);
    });

    panel.addEventListener('mousemove', function (e) {
      const opt = e.target.closest('.ex-picker-option');
      if (opt) setActive(opt);
    });
  }

  return { render };
})();
