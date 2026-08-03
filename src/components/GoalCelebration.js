window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Confetti + applause + a congratulatory message, fired once from wherever
 * a goal-completing value gets logged (Home's quick bodyweight log,
 * OneRepMax's log-a-set, Split Builder's questionnaire). A fire-and-forget
 * overlay appended to document.body, independent of whatever page
 * triggered it -- same pattern as StreakModal. The applause is synthesized
 * with Web Audio (filtered noise bursts) rather than an audio file, since
 * this app ships with no bundled assets.
 */
App.Components.GoalCelebration = (function () {
  // First entry is the live accent (a CSS custom property token works fine
  // in an inline style attribute, same as in a stylesheet) so it always
  // matches whatever accent color is currently set, not just the original
  // green default.
  const CONFETTI_COLORS = ['var(--accent)', '#4dd0e1', '#ff6f61', '#ffd166', '#b388ff', '#64b5f6'];

  function messageFor(goal) {
    const target = App.Units.round(goal.targetWeight, 1);
    if (goal.type === 'bodyweight') {
      const verb = goal.direction === 'lose' ? 'down to' : 'up to';
      return 'Goal reached! You made it ' + verb + ' ' + target + ' ' + goal.unit + ' \u{1F4AA}';
    }
    return 'Goal reached! You hit ' + target + ' ' + goal.unit + ' on ' + App.ExerciseLibrary.label(goal.lift) + ' \u{1F4AA}';
  }

  function playApplause() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const clapCount = 16;
      for (let i = 0; i < clapCount; i++) {
        const start = ctx.currentTime + (i / clapCount) * 0.9 + Math.random() * 0.03;
        const duration = 0.05 + Math.random() * 0.05;

        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1500 + Math.random() * 1000;
        bandpass.Q.value = 0.7;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35 + Math.random() * 0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + duration);
      }
      setTimeout(function () { ctx.close(); }, 1500);
    } catch (e) {
      // Web Audio unavailable/blocked -- confetti and the message still play.
    }
  }

  function spawnConfetti() {
    const overlay = document.createElement('div');
    overlay.className = 'confetti-overlay';
    const pieceCount = 90;
    let html = '';
    for (let i = 0; i < pieceCount; i++) {
      const left = (Math.random() * 100).toFixed(1);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const delay = (Math.random() * 0.5).toFixed(2);
      const duration = (2.4 + Math.random() * 1.6).toFixed(2);
      const drift = (Math.random() * 80 - 40).toFixed(0);
      const rotate = Math.floor(Math.random() * 360);
      html +=
        '<span class="confetti-piece" style="left:' + left + '%; background:' + color + ';' +
        ' animation-delay:' + delay + 's; animation-duration:' + duration + 's;' +
        ' --drift:' + drift + 'px; --rotate:' + rotate + 'deg;"></span>';
    }
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.remove(); }, 4500);
  }

  function celebrate(goal) {
    spawnConfetti();
    playApplause();

    const banner = document.createElement('div');
    banner.className = 'goal-celebration-overlay';
    banner.innerHTML =
      '<div class="goal-celebration-card">' +
        '<p class="goal-celebration-message">' + messageFor(goal) + '</p>' +
        '<button type="button" class="btn-primary goal-celebration-dismiss">Nice!</button>' +
      '</div>';
    document.body.appendChild(banner);

    function dismiss() { banner.remove(); }
    banner.querySelector('.goal-celebration-dismiss').addEventListener('click', dismiss);
    banner.addEventListener('click', function (e) { if (e.target === banner) dismiss(); });
    setTimeout(dismiss, 6000);
  }

  return { celebrate };
})();
