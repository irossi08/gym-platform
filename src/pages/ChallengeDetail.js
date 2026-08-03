window.App = window.App || {};
App.Pages = App.Pages || {};

/**
 * A single challenge: description, accept/decline (if invited), and the
 * progress/leaderboard. The current user's own progress is recomputed from
 * their own locally-cached history and written back on every visit (see
 * App.Challenges.refreshMyProgress) -- that's also what self-heals a Race
 * finish the moment the viewer happens to be the one who crossed it.
 */
App.Pages.ChallengeDetail = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function typeLabel(c) {
    return c.type === 'gain' ? 'Weight Gain' : c.type === 'loss' ? 'Weight Loss' : 'Strength';
  }

  function targetLabel(c) {
    return c.type === 'strength' ? c.targetPercent + '% of bodyweight on ' + c.liftLabel
      : (c.type === 'gain' ? 'Gain ' + c.targetKg + ' kg' : 'Lose ' + c.targetKg + ' kg');
  }

  // BUG FIX: this used to fall back to `(p.startValue || 0)` when
  // startValue was missing, which silently computed the delta against a
  // baseline of 0 -- displaying the raw current weight (e.g. "71 of 5kg")
  // instead of "no starting weight yet". Missing startValue is now its own
  // explicit case, never a 0 stand-in.
  function progressText(c, p) {
    if (c.type === 'strength') {
      if (p.currentValue == null) return '0% of ' + c.targetPercent + '% (no set logged yet)';
      return App.Units.round(p.currentValue, 1) + '% of ' + c.targetPercent + '%';
    }
    if (p.startValue == null) return 'Needs a starting weight';
    // No weigh-in since accepting yet -- show 0 progress rather than
    // hiding them or erroring; they still appear in the leaderboard.
    const current = p.currentValue == null ? p.startValue : p.currentValue;
    const delta = c.type === 'gain' ? current - p.startValue : p.startValue - current;
    const sign = delta > 0 ? '+' : ''; // delta itself renders its own "-" for negatives -- never clamped to 0
    const deltaText = sign + App.Units.round(delta, 1) + ' kg of ' + c.targetKg + ' kg';
    return p.currentValue == null ? deltaText + ' (no weigh-in yet)' : deltaText;
  }

  function render(container, opts) {
    const user = opts.user;
    const challengeId = opts.challengeId;

    container.innerHTML = '<section class="page page-challenge-detail"><p class="app-boot-hint">Loading…</p></section>';

    Promise.all([
      App.Challenges.getChallenge(challengeId),
      App.Challenges.getParticipants(challengeId),
    ]).then(function (results) {
      const challenge = results[0];
      const participants = results[1];
      if (!challenge) {
        container.innerHTML = '<section class="page page-challenge-detail"><p class="empty-hint">Challenge not found.</p></section>';
        return;
      }
      // Paint with what's already fetched immediately -- don't make the
      // first render wait on a round trip to WRITE this user's own
      // progress plus another to re-read the challenge afterward. That
      // refresh (needed to self-heal a race finish -- see
      // App.Challenges.maybeFinalizeRace) still happens, just in the
      // background, and only triggers a second render if something the
      // page actually shows changed.
      renderPage(container, user, challenge, participants);

      const mineIdx = participants.findIndex(function (p) { return p.userId === user.id; });
      if (mineIdx === -1 || participants[mineIdx].status !== 'accepted' || challenge.endedAt) return;

      App.Challenges.refreshMyProgress(user, challenge, participants[mineIdx]).then(function (updatedMine) {
        App.Challenges.getChallenge(challengeId).then(function (freshChallenge) {
          const valueChanged = updatedMine.currentValue !== participants[mineIdx].currentValue;
          const justEnded = freshChallenge && freshChallenge.endedAt && !challenge.endedAt;
          if (!valueChanged && !justEnded) return;
          participants[mineIdx] = updatedMine;
          renderPage(container, user, freshChallenge || challenge, participants);
        });
      });
    });
  }

  function renderPage(container, user, challenge, participants) {
    const mine = participants.find(function (p) { return p.userId === user.id; });
    const accepted = participants.filter(function (p) { return p.status === 'accepted'; });
    const ranked = accepted.slice().sort(function (a, b) { return App.Challenges.progressRatio(challenge, b) - App.Challenges.progressRatio(challenge, a); });

    const winner = challenge.winnerId ? participants.find(function (p) { return p.userId === challenge.winnerId; }) : null;
    const isEnded = !!challenge.endedAt || (challenge.mode === 'leaderboard' && new Date(challenge.endDate) < new Date());

    const winnerBannerHtml = challenge.mode === 'race' && winner
      ? '<div class="community-banner community-banner--ok">🏆 ' + (winner.profile && winner.profile.name ? escapeHtml(winner.profile.name) : 'Someone') + ' won this race!</div>'
      : (isEnded ? '<div class="community-banner">This challenge has ended.</div>' : '');

    const inviteBannerHtml = mine && mine.status === 'invited'
      ? '<div class="community-banner" id="ch-invite-banner">' +
          '<span>You’ve been invited to this challenge.</span>' +
          '<button type="button" class="btn-accent-sm" id="ch-accept-btn">Accept</button>' +
          '<button type="button" class="btn-ghost-sm" id="ch-decline-btn">Decline</button>' +
        '</div>'
      : '';

    // Retroactive fix path: an already-accepted gain/loss participant with
    // no start_value on record (affected by the earlier bug, or invited
    // before this change existed) gets prompted here instead of silently
    // showing wrong numbers -- they still appear in the leaderboard in the
    // meantime (progressText shows "Needs a starting weight").
    const needsStartWeightBannerHtml = mine && mine.status === 'accepted' && challenge.type !== 'strength'
        && mine.startValue == null && !challenge.endedAt
      ? '<div class="community-banner" id="ch-start-weight-banner">' +
          '<span>Enter your starting weight to track your progress in this challenge.</span>' +
        '</div>'
      : '';

    const rankedHtml = ranked.length
      ? '<ul class="challenge-leaderboard">' +
          ranked.map(function (p, i) {
            const ratio = Math.max(0, Math.min(1, App.Challenges.progressRatio(challenge, p)));
            const isMe = p.userId === user.id;
            const isWinnerRow = challenge.mode === 'race' && challenge.winnerId === p.userId;
            return (
              '<li class="challenge-leaderboard-row' + (isMe ? ' challenge-leaderboard-row--me' : '') + '" data-user-id="' + p.userId + '">' +
                '<span class="challenge-rank">' + (i + 1) + '</span>' +
                '<div class="community-person-avatar challenge-leaderboard-avatar"></div>' +
                '<div class="challenge-leaderboard-info">' +
                  '<p class="challenge-leaderboard-name">' + (p.profile && p.profile.name ? escapeHtml(p.profile.name) : 'Unknown') + (isWinnerRow ? ' 🏆' : '') + '</p>' +
                  '<div class="challenge-progress-bar"><div class="challenge-progress-fill" style="width:' + (ratio * 100).toFixed(0) + '%"></div></div>' +
                  '<p class="challenge-leaderboard-value">' + progressText(challenge, p) + '</p>' +
                '</div>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">Nobody has accepted this challenge yet.</p>';

    const invitedCount = participants.filter(function (p) { return p.status === 'invited'; }).length;
    const declinedCount = participants.filter(function (p) { return p.status === 'declined'; }).length;
    const pendingNoteHtml = (invitedCount || declinedCount)
      ? '<p class="field-hint">' + invitedCount + ' still deciding &middot; ' + declinedCount + ' declined</p>'
      : '';

    container.innerHTML =
      '<section class="page page-challenge-detail">' +
        '<div class="page-header">' +
          '<div class="page-title-row">' +
            '<h1 class="page-title">' + typeLabel(challenge) + '</h1>' +
            '<span class="community-list-visibility">' + (challenge.mode === 'race' ? 'Race' : 'Leaderboard') + '</span>' +
          '</div>' +
        '</div>' +
        '<div id="ch-quick-links"></div>' +
        winnerBannerHtml +
        inviteBannerHtml +
        needsStartWeightBannerHtml +
        '<div class="card">' +
          '<p class="challenge-target-line">' + targetLabel(challenge) + '</p>' +
          '<p class="field-hint">' + new Date(challenge.startDate).toLocaleDateString() + ' &ndash; ' + new Date(challenge.endDate).toLocaleDateString() + '</p>' +
          '<p class="field-hint">' + (challenge.mode === 'race'
            ? 'First person to reach the target wins, challenge ends the moment someone hits it.'
            : 'Everyone ranked at the end of the time window by how close they got or how much they achieved — no early winner.') + '</p>' +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">Leaderboard</h2>' +
          rankedHtml +
          pendingNoteHtml +
        '</div>' +
      '</section>';

    App.Components.Avatar.renderList(ranked.map(function (p) {
      const row = container.querySelector('.challenge-leaderboard-row[data-user-id="' + p.userId + '"]');
      return { container: row ? row.querySelector('.challenge-leaderboard-avatar') : null, profile: p.profile };
    }));

    App.Components.QuickLinks.render(container.querySelector('#ch-quick-links'), user, 'community');

    const acceptBtn = container.querySelector('#ch-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        if (challenge.type === 'strength') {
          acceptBtn.disabled = true;
          App.Challenges.respondToInvite(user, challenge, true).then(function () {
            render(container, { user: user, challengeId: challenge.id });
          });
          return;
        }
        // Gain/Loss requires an explicit starting weight before accepting
        // -- swap the invite banner for the weigh-in form rather than
        // accepting first and asking after.
        renderStartWeightForm(container.querySelector('#ch-invite-banner'), user, challenge, function (weightKg) {
          App.Challenges.respondToInvite(user, challenge, true, weightKg).then(function () {
            render(container, { user: user, challengeId: challenge.id });
          });
        });
      });
    }
    const declineBtn = container.querySelector('#ch-decline-btn');
    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        App.Challenges.respondToInvite(user, challenge, false).then(function () {
          App.Router.navigate('community/' + challenge.communityId);
        });
      });
    }

    const startWeightBanner = container.querySelector('#ch-start-weight-banner');
    if (startWeightBanner) {
      renderStartWeightForm(startWeightBanner, user, challenge, function (weightKg) {
        App.Challenges.setStartValue(user, challenge, weightKg).then(function () {
          render(container, { user: user, challengeId: challenge.id });
        });
      });
    }
  }

  // Shared by both the accept-time prompt and the retroactive backfill
  // prompt -- collects a weight+unit, converts to kg, logs it to the
  // user's own bodyweight history (consistent with every other bodyweight
  // entry point in this app), and hands the kg value to onSubmit.
  function renderStartWeightForm(bannerEl, user, challenge, onSubmit) {
    bannerEl.innerHTML =
      '<div class="challenge-start-weight-form">' +
        '<p>Enter your current weight to start this ' + (challenge.type === 'gain' ? 'gain' : 'loss') + ' challenge:</p>' +
        '<div class="field-row">' +
          '<div class="field"><input type="number" id="ch-start-weight-input" step="0.5" min="0" placeholder="e.g. 70" /></div>' +
          '<div class="field field-narrow">' +
            '<select id="ch-start-weight-unit"><option value="kg">kg</option><option value="lb">lb</option></select>' +
          '</div>' +
          '<button type="button" class="btn-accent-sm" id="ch-start-weight-confirm">Confirm</button>' +
        '</div>' +
        '<p class="field-error" id="ch-start-weight-error"></p>' +
      '</div>';

    bannerEl.querySelector('#ch-start-weight-confirm').addEventListener('click', function (e) {
      const btn = e.currentTarget;
      const errorEl = bannerEl.querySelector('#ch-start-weight-error');
      const weight = parseFloat(bannerEl.querySelector('#ch-start-weight-input').value);
      const unit = bannerEl.querySelector('#ch-start-weight-unit').value;
      if (!(weight > 0)) { errorEl.textContent = 'Enter a weight greater than 0.'; return; }
      btn.disabled = true;
      App.Storage.addBodyweightEntry(user.id, { date: new Date().toISOString(), weight: weight, unit: unit });
      onSubmit(App.Units.round(App.Units.convert(weight, unit, 'kg'), 2));
    });
  }

  return { render };
})();
