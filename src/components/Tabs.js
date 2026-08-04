window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Generic in-page tab wiring, shared by every page that splits its content
 * into segmented tabs (Home's Today/Progress, CommunityDetail's Overview/
 * Challenges/Activity) instead of one long scroll. Plain show/hide on
 * panels rendered once, never a route change, so switching tabs is instant
 * and never re-fetches anything.
 *
 * Contract: a button with class `segmented-tab-btn` and `data-tab="<name>"`
 * per tab, and an element with `data-tab-panel="<name>"` per panel, both
 * inside the container passed in. The initial HTML is responsible for its
 * own default-active state (which button has `segmented-tab-btn--active`/
 * `aria-selected="true"`, which panel isn't `hidden`) -- wire() only adds
 * the click behavior on top of whatever's already there.
 */
App.Components.Tabs = (function () {
  function wire(container) {
    const btns = Array.prototype.slice.call(container.querySelectorAll('.segmented-tab-btn'));
    const panels = Array.prototype.slice.call(container.querySelectorAll('[data-tab-panel]'));

    function activate(tab) {
      btns.forEach(function (btn) {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('segmented-tab-btn--active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.tabPanel !== tab;
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () { activate(btn.dataset.tab); });
    });
  }

  return { wire };
})();
