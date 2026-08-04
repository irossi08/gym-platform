window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Rest timer: manual start only -- showPrompt() renders a small inline
 * "Start rest timer" button wherever the caller puts it (OneRepMax.js,
 * right after logging a set), and only once that's tapped does start()
 * bring up the actual countdown. The countdown itself is a document.body-
 * level overlay (like Toast/StreakModal), independent of page navigation,
 * so it keeps counting and stays visible/controllable even if the user
 * wanders off to another page while resting.
 */
App.Components.RestTimer = (function () {
  let overlayEl = null;
  let intervalId = null;
  let remainingSeconds = 0;
  let isPaused = false;

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + ':' + String(rem).padStart(2, '0');
  }

  // The exercise's own configured rest, if it's part of today's scheduled
  // split day -- otherwise a sensible default for a standalone logged set
  // (e.g. from the 1 Rep Max page outside of a scheduled session).
  function getRestDurationFor(user, liftKey) {
    const DEFAULT_SECONDS = 90;
    const split = App.Storage.getSplit(user.id);
    if (!split) return DEFAULT_SECONDS;
    const todayWd = App.Schedule.todayWeekday();
    const day = split.days.find(function (d) { return d.weekday === todayWd; });
    if (!day) return DEFAULT_SECONDS;
    const ex = day.exercises.find(function (e) { return e.lift === liftKey; });
    return (ex && ex.restSeconds) ? ex.restSeconds : DEFAULT_SECONDS;
  }

  function showPrompt(container, seconds) {
    container.innerHTML =
      '<button type="button" class="rest-timer-prompt-btn" id="rest-timer-start-btn">' +
        '⏱ Start rest timer — ' + formatTime(seconds) +
      '</button>';
    container.querySelector('#rest-timer-start-btn').addEventListener('click', function () {
      container.innerHTML = '';
      start(seconds);
    });
  }

  function playCompletionSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      function tone(freq, startOffset) {
        const start = ctx.currentTime + startOffset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      }
      tone(880, 0);
      tone(1046.5, 0.25);
      setTimeout(function () { ctx.close(); }, 1200);
    } catch (e) {
      // Web Audio unavailable/blocked -- vibration/visual still happen.
    }
  }

  function vibrate() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  function close() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    isPaused = false;
  }

  function updateDisplay() {
    if (!overlayEl) return;
    overlayEl.querySelector('.rest-timer-time').textContent = formatTime(remainingSeconds);
    const pauseBtn = overlayEl.querySelector('#rt-pause');
    if (pauseBtn) pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  }

  function finish() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (!overlayEl) return;
    overlayEl.classList.add('rest-timer-overlay--done');
    overlayEl.querySelector('.rest-timer-bar').innerHTML =
      '<span class="rest-timer-time rest-timer-time--done">Rest complete! 💪</span>';
    vibrate();
    playCompletionSound();
    setTimeout(close, 4000);
  }

  function tick() {
    if (isPaused) return;
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      finish();
      return;
    }
    updateDisplay();
  }

  function start(seconds) {
    close();
    remainingSeconds = seconds;
    isPaused = false;

    overlayEl = document.createElement('div');
    overlayEl.className = 'rest-timer-overlay';
    overlayEl.innerHTML =
      '<div class="rest-timer-bar">' +
        '<span class="rest-timer-time">' + formatTime(remainingSeconds) + '</span>' +
        '<div class="rest-timer-controls">' +
          '<button type="button" class="rest-timer-btn" id="rt-pause">Pause</button>' +
          '<button type="button" class="rest-timer-btn" id="rt-add">+15s</button>' +
          '<button type="button" class="rest-timer-btn" id="rt-skip">Skip</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayEl);

    overlayEl.querySelector('#rt-pause').addEventListener('click', function () {
      isPaused = !isPaused;
      updateDisplay();
    });
    overlayEl.querySelector('#rt-add').addEventListener('click', function () {
      remainingSeconds += 15;
      updateDisplay();
    });
    overlayEl.querySelector('#rt-skip').addEventListener('click', close);

    intervalId = setInterval(tick, 1000);
  }

  return { getRestDurationFor, showPrompt, start, close };
})();
