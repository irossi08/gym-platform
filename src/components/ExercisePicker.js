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

  function labelFor(lift) {
    return App.Standards.LIFT_LABELS[lift] || lift;
  }

  function render(container, opts) {
    const id = opts.id || ('ex-picker-' + (++uidCounter));
    const triggerClass = opts.triggerClass || '';
    let currentValue = opts.value;
    const onChange = opts.onChange || function () {};

    const groupsHtml = App.Standards.CATEGORIES.map(function (group) {
      const optionsHtml = group.lifts.map(function (lift) {
        const selected = lift === currentValue;
        return (
          '<div class="ex-picker-option" role="option" data-lift="' + lift + '" ' +
            'id="' + id + '-opt-' + lift + '" aria-selected="' + selected + '">' +
            labelFor(lift) +
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
          '<span class="ex-picker-trigger-label">' + labelFor(currentValue) + '</span>' +
          '<span class="ex-picker-trigger-chevron" aria-hidden="true">&#9662;</span>' +
        '</button>' +
        '<div class="ex-picker-panel" role="listbox" aria-labelledby="' + id + '" hidden>' +
          groupsHtml +
        '</div>' +
      '</div>';

    const root = container.querySelector('.ex-picker');
    const trigger = root.querySelector('.ex-picker-trigger');
    const panel = root.querySelector('.ex-picker-panel');
    const labelEl = root.querySelector('.ex-picker-trigger-label');

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

    function openPanel() {
      closeAllPanels();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      const current = panel.querySelector('.ex-picker-option[aria-selected="true"]') || optionEls()[0];
      setActive(current);
    }

    function closePanel(refocus) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (refocus) trigger.focus();
    }

    function choose(lift) {
      currentValue = lift;
      labelEl.textContent = labelFor(lift);
      optionEls().forEach(function (o) {
        o.setAttribute('aria-selected', String(o.dataset.lift === lift));
      });
      closePanel(false);
      onChange(lift);
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
      const opts_ = optionEls();
      const activeIdx = opts_.findIndex(function (o) { return o.classList.contains('ex-picker-option--active'); });
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(opts_[(activeIdx + 1) % opts_.length]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(opts_[(activeIdx - 1 + opts_.length) % opts_.length]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (opts_[activeIdx]) choose(opts_[activeIdx].dataset.lift);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(true);
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
