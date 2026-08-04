window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Reusable onboarding-tour engine, driven entirely by whatever step array
 * it's given -- this file has no per-page knowledge and no fixed idea of
 * "the" tour, it just knows how to navigate to a step's route, find its
 * target element, spotlight it, and show the robot's message. That's what
 * lets it back BOTH the main app tour (App.TourSteps) and the separate,
 * shorter first-achievement tour (App.AchievementTourSteps) -- each call
 * to start() supplies its own steps and its own "mark as seen" callback,
 * so the two tours never share state or interfere with each other.
 *
 * Appended to document.body (like StreakModal/GoalCelebration) so it
 * survives the page-navigation it itself triggers, since router.js wipes
 * and rebuilds #app-root on every route change.
 *
 * A step whose target selector never appears (e.g. Split Builder's day-card
 * step for a brand-new account with no split yet, or the Achievements step
 * for an account that hasn't unlocked it) is skipped automatically rather
 * than faking data to force it to show -- see tourSteps.js.
 */
App.Components.TourOverlay = (function () {
  let state = null; // { user, index, steps, onFinish }
  let els = null; // { backdrop, spotlight, tooltip }
  let repositionHandler = null;

  function currentTarget() {
    const step = state.steps[state.index];
    return step && step.target ? document.querySelector(step.target) : null;
  }

  function buildDom() {
    const backdrop = document.createElement('div');
    backdrop.className = 'tour-backdrop';

    const spotlight = document.createElement('div');
    spotlight.className = 'tour-spotlight';
    spotlight.hidden = true;

    const tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.innerHTML =
      '<div class="tour-robot">' + App.Components.TourRobot.render() + '</div>' +
      '<div class="tour-bubble">' +
        '<p class="tour-message"></p>' +
        '<div class="tour-actions">' +
          '<button type="button" class="tour-skip-btn">Skip tour</button>' +
          '<button type="button" class="btn-primary tour-next-btn">Next</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(spotlight);
    document.body.appendChild(tooltip);

    els = { backdrop: backdrop, spotlight: spotlight, tooltip: tooltip };

    tooltip.querySelector('.tour-skip-btn').addEventListener('click', finish);
    tooltip.querySelector('.tour-next-btn').addEventListener('click', function () {
      goToStep(state.index + 1);
    });

    // Fade the backdrop in on open; step-to-step movement is handled by the
    // spotlight/tooltip's own top/left transitions instead.
    requestAnimationFrame(function () { backdrop.classList.add('tour-backdrop--visible'); });
  }

  function teardownDom() {
    if (!els) return;
    window.removeEventListener('resize', repositionHandler);
    window.removeEventListener('scroll', repositionHandler, true);
    els.backdrop.remove();
    els.spotlight.remove();
    els.tooltip.remove();
    els = null;
    repositionHandler = null;
  }

  function positionForTarget(target) {
    if (!target) {
      els.spotlight.hidden = true;
      els.tooltip.classList.add('tour-tooltip--center');
      els.tooltip.style.top = '';
      els.tooltip.style.left = '';
      return;
    }

    els.tooltip.classList.remove('tour-tooltip--center');
    const rect = target.getBoundingClientRect();
    const pad = 8;
    els.spotlight.hidden = false;
    els.spotlight.style.top = (rect.top - pad) + 'px';
    els.spotlight.style.left = (rect.left - pad) + 'px';
    els.spotlight.style.width = (rect.width + pad * 2) + 'px';
    els.spotlight.style.height = (rect.height + pad * 2) + 'px';

    const tooltipRect = els.tooltip.getBoundingClientRect();
    const margin = 12;
    const spaceBelow = window.innerHeight - (rect.bottom + pad);
    let top;
    if (spaceBelow >= tooltipRect.height + margin) {
      top = rect.bottom + pad + margin;
    } else if (rect.top - pad - margin - tooltipRect.height >= 0) {
      top = rect.top - pad - margin - tooltipRect.height;
    } else {
      top = Math.max(margin, Math.min(rect.bottom + pad + margin, window.innerHeight - tooltipRect.height - margin));
    }
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - tooltipRect.width - margin));

    els.tooltip.style.top = top + 'px';
    els.tooltip.style.left = left + 'px';
  }

  function reposition() {
    if (!state || !els) return;
    positionForTarget(currentTarget());
  }

  function showStep() {
    const step = state.steps[state.index];
    // Optional per-step DOM prep that has to happen before positioning --
    // e.g. Home's tour steps use this to switch to the tab their target
    // lives in, since a hidden (display: none) target has a zero-size
    // bounding rect and would otherwise spotlight nothing.
    if (step.before) step.before();
    const isLast = state.index === state.steps.length - 1;
    // A step's message can be a plain string or a function of the current
    // user (e.g. the main tour's closing step only mentions Achievements
    // if it wasn't already shown earlier in the same run).
    const message = typeof step.message === 'function' ? step.message(state.user) : step.message;

    els.tooltip.querySelector('.tour-message').textContent = message;
    els.tooltip.querySelector('.tour-next-btn').textContent = isLast ? 'Got it!' : 'Next';

    const target = currentTarget();
    positionForTarget(target);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // getBoundingClientRect right after scrollIntoView can be mid-scroll --
      // reposition again once it's had time to settle.
      setTimeout(reposition, 350);
    }
  }

  // `didNavigate` distinguishes two cases: right after we changed routes,
  // the target may not exist YET (the new page's synchronous render hasn't
  // run at the moment we check), so it's worth a short MutationObserver
  // wait. Without a navigation, nothing in this app renders asynchronously,
  // so a missing target is genuinely absent (e.g. no split generated yet)
  // and there's no reason to wait at all -- resolve immediately.
  function waitForTarget(selector, onFound, onTimeout, didNavigate) {
    if (!selector) { onFound(null); return; }
    if (!didNavigate) { onFound(document.querySelector(selector)); return; }

    const existing = document.querySelector(selector);
    if (existing) { onFound(existing); return; }

    let settled = false;
    const observer = new MutationObserver(function () {
      const el = document.querySelector(selector);
      if (el && !settled) {
        settled = true;
        observer.disconnect();
        onFound(el);
      }
    });
    observer.observe(document.getElementById('app-root'), { childList: true, subtree: true });

    setTimeout(function () {
      if (settled) return;
      settled = true;
      observer.disconnect();
      onTimeout();
    }, 1200);
  }

  function goToStep(index) {
    if (index >= state.steps.length) { finish(); return; }
    state.index = index;
    const step = state.steps[index];
    const needsNav = !!step.route && step.route !== App.Router.getRoute();

    function handleTarget(el) {
      if (step.target && !el) {
        // Genuinely not on the page (e.g. no split built yet, or
        // Achievements never unlocked) -- skip straight past it instead of
        // spotlighting nothing.
        goToStep(index + 1);
        return;
      }
      showStep();
    }

    if (needsNav) {
      App.Router.navigate(step.route);
      waitForTarget(step.target, handleTarget, function () { goToStep(index + 1); }, true);
    } else {
      waitForTarget(step.target, handleTarget, function () { goToStep(index + 1); }, false);
    }
  }

  function finish() {
    if (!state) return;
    const user = state.user;
    const onFinish = state.onFinish;
    teardownDom();
    state = null;
    if (onFinish) onFinish(user);
  }

  function isActive() {
    return !!state;
  }

  // `steps` is the array of {route, target, message} to run. `opts.onFinish`
  // fires once, on completion OR skip, with the user -- callers use it to
  // persist their own "seen" flag (main tour vs achievement tour each set a
  // different one, which is exactly why this isn't done here directly).
  function start(user, steps, opts) {
    if (state || !steps || !steps.length) return;
    opts = opts || {};
    state = { user: user, index: 0, steps: steps, onFinish: opts.onFinish || null };
    buildDom();
    repositionHandler = reposition;
    window.addEventListener('resize', repositionHandler);
    window.addEventListener('scroll', repositionHandler, true);
    goToStep(0);
  }

  return { start, isActive };
})();
