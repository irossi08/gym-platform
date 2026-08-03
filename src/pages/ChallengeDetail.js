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

  function progressText(c, p) {
    if (p.currentValue == null) return 'No data logged yet';
    if (c.type === 'strength') return App.Units.round(p.currentValue, 1) + '% of ' + c.targetPercent + '%';
    const delta = c.type === 'gain' ? p.currentValue - (p.startValue || 0) : (p.startValue || 0) - p.currentValue;
    return (delta >= 0 ? '+' : '') + App.Units.round(delta, 1) + ' kg of ' + c.targetKg + ' kg';
  }

  function render(container, opts) {
    const user = opts.user;
    const challengeId = opts.challengeId;

    container.innerHTML = '<section class="page page-challenge-detail is-loading"><p class="app-boot-hint">Loading…</p></section>';

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
      ? '<div class="community-banner">' +
          '<span>You’ve been invited to this challenge.</span>' +
          '<button type="button" class="btn-accent-sm" id="ch-accept-btn">Accept</button>' +
          '<button type="button" class="btn-ghost-sm" id="ch-decline-btn">Decline</button>' +
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
        App.Challenges.respondToInvite(user, challenge, true).then(function () {
          render(container, { user: user, challengeId: challenge.id });
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
  }

  return { render };
})();
