window.App = window.App || {};
App.Pages = App.Pages || {};

/**
 * A single community, split into three tabs (App.Components.Tabs):
 * Overview (join banner, invite link, member list), Challenges (the list
 * plus the create-challenge flow), and Activity (the community feed).
 * Non-members can still land here (community metadata is world-readable,
 * see schema.sql) but see a join prompt instead of member-only content --
 * members/challenges queries simply come back empty for a non-member
 * thanks to RLS, so this checks membership itself to decide what to show.
 */
App.Pages.CommunityDetail = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function typeLabel(c) {
    return c.type === 'gain' ? 'Weight Gain' : c.type === 'loss' ? 'Weight Loss' : 'Strength';
  }

  function challengeSubtitle(c) {
    return c.type === 'strength' ? c.liftLabel : (c.type === 'gain' ? '+' + c.targetKg + ' kg' : '-' + c.targetKg + ' kg');
  }

  function challengeStatusLabel(c) {
    if (c.endedAt) return 'Ended';
    if (new Date(c.endDate) < new Date()) return 'Window closed';
    return 'Active';
  }

  function activityText(a) {
    const name = a.profile && a.profile.name ? escapeHtml(a.profile.name) : 'Someone';
    switch (a.type) {
      case 'pr':
        return name + ' hit a new PR: ' + a.value + ' ' + a.unit + ' on ' + (a.liftLabel ? escapeHtml(a.liftLabel) : 'an exercise');
      case 'challenge_completed':
        return name + ' completed a challenge';
      case 'streak_milestone':
        return name + ' reached a ' + a.value + '-day streak 🔥';
      case 'member_joined':
        return name + ' joined the community';
      default:
        return name + ' had some activity';
    }
  }

  function render(container, opts) {
    const user = opts.user;
    const communityId = opts.communityId;

    container.innerHTML = '<section class="page page-community-detail"><p class="app-boot-hint">Loading…</p></section>';

    Promise.all([
      App.Communities.getCommunity(communityId),
      App.Communities.getMembers(communityId),
      App.Challenges.getChallenges(communityId),
      App.Communities.getRecentActivity(communityId),
    ]).then(function (results) {
      const community = results[0];
      if (!community) {
        container.innerHTML = '<section class="page page-community-detail"><p class="empty-hint">Community not found.</p></section>';
        return;
      }
      renderPage(container, user, community, results[1], results[2], results[3]);
    });
  }

  function renderPage(container, user, community, members, challenges, activity) {
    const isMember = members.some(function (m) { return m.userId === user.id; });

    const memberListHtml = members.length
      ? '<ul class="community-member-list">' +
          members.map(function (m) {
            return (
              '<li class="community-person-row" data-user-id="' + m.userId + '">' +
                '<div class="community-person-avatar"></div>' +
                '<span class="community-person-name">' + (m.profile && m.profile.name ? escapeHtml(m.profile.name) : 'Unknown') + '</span>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">No members yet.</p>';

    const challengesHtml = challenges.length
      ? '<ul class="challenge-list">' +
          challenges.map(function (c) {
            return (
              '<li class="challenge-list-item">' +
                '<a href="#/community/' + c.communityId + '/challenge/' + c.id + '" class="challenge-list-link">' +
                  '<span class="challenge-list-title">' + typeLabel(c) + ' — ' + challengeSubtitle(c) + '</span>' +
                  '<span class="challenge-list-meta">' + (c.mode === 'race' ? 'Race' : 'Leaderboard') + ' &middot; ' + challengeStatusLabel(c) + '</span>' +
                '</a>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">No challenges yet.</p>';

    const activityHtml = activity.length
      ? '<ul class="community-activity-list">' +
          activity.map(function (a) {
            return (
              '<li class="community-activity-row" data-activity-id="' + a.id + '">' +
                '<div class="community-person-avatar community-activity-avatar"></div>' +
                '<div class="community-activity-info">' +
                  '<p class="community-activity-text">' + activityText(a) + '</p>' +
                  '<p class="community-activity-date">' + new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + '</p>' +
                '</div>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">No activity yet — new PRs, streak milestones, completed challenges, and new members will show up here.</p>';

    const notMemberBannerHtml = !isMember
      ? (community.visibility === 'public'
          ? '<div class="community-banner"><span>You’re not a member yet.</span><button type="button" class="btn-accent-sm" id="cd-join-btn">Join</button></div>'
          : '<div class="community-banner community-banner--error">This is a private community — you need an invite link to join.</div>')
      : '';

    container.innerHTML =
      '<section class="page page-community-detail">' +
        '<div class="page-header">' +
          '<div class="page-title-row">' +
            '<h1 class="page-title">' + escapeHtml(community.name) + '</h1>' +
            '<span class="community-list-visibility community-list-visibility--' + community.visibility + '">' + community.visibility + '</span>' +
          '</div>' +
        '</div>' +
        '<div id="cd-quick-links"></div>' +
        '<div class="segmented-tabs" role="tablist">' +
          '<button type="button" class="segmented-tab-btn segmented-tab-btn--active" data-tab="overview" role="tab" aria-selected="true">Overview</button>' +
          '<button type="button" class="segmented-tab-btn" data-tab="challenges" role="tab" aria-selected="false">Challenges</button>' +
          '<button type="button" class="segmented-tab-btn" data-tab="activity" role="tab" aria-selected="false">Activity</button>' +
        '</div>' +
        '<div data-tab-panel="overview">' +
          notMemberBannerHtml +
          (isMember
            ? '<div class="card">' +
                '<h2 class="section-title">Invite link</h2>' +
                '<div class="community-id-row">' +
                  '<span class="community-id-value community-invite-link">' + escapeHtml(App.Communities.inviteLink(community.inviteCode)) + '</span>' +
                  '<button type="button" class="btn-ghost-sm" id="cd-invite-copy">Copy</button>' +
                '</div>' +
              '</div>'
            : '') +
          '<div class="card">' +
            '<h2 class="section-title">Members (' + members.length + ')</h2>' +
            memberListHtml +
            (isMember ? '<button type="button" class="btn-ghost-sm" id="cd-leave-btn">Leave community</button>' : '') +
          '</div>' +
        '</div>' +
        '<div data-tab-panel="challenges" hidden>' +
          '<div class="card">' +
            '<div class="goal-card-head">' +
              '<h2 class="section-title">Challenges</h2>' +
              (isMember ? '<button type="button" class="btn-ghost-sm" id="cd-new-challenge-btn">New challenge</button>' : '') +
            '</div>' +
            challengesHtml +
            '<div id="cd-challenge-form-slot"></div>' +
          '</div>' +
        '</div>' +
        '<div data-tab-panel="activity" hidden>' +
          '<div class="card">' +
            '<h2 class="section-title">Activity</h2>' +
            activityHtml +
          '</div>' +
        '</div>' +
      '</section>';

    App.Components.Avatar.renderList(
      members.map(function (m) {
        const row = container.querySelector('.community-person-row[data-user-id="' + m.userId + '"]');
        return { container: row ? row.querySelector('.community-person-avatar') : null, profile: m.profile };
      }).concat(
        activity.map(function (a) {
          const row = container.querySelector('.community-activity-row[data-activity-id="' + a.id + '"]');
          return { container: row ? row.querySelector('.community-activity-avatar') : null, profile: a.profile };
        })
      )
    );

    App.Components.QuickLinks.render(container.querySelector('#cd-quick-links'), user, 'community');
    App.Components.Tabs.wire(container);

    const joinBtn = container.querySelector('#cd-join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', function () {
        App.Communities.joinPublicCommunity(user.id, community.id).then(function (res) {
          if (res.ok) render(container, { user: user, communityId: community.id });
        });
      });
    }

    const copyBtn = container.querySelector('#cd-invite-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const link = App.Communities.inviteLink(community.inviteCode);
        const done = function () { copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done).catch(function () {});
        else done();
      });
    }

    const leaveBtn = container.querySelector('#cd-leave-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', function () {
        App.Communities.leaveCommunity(user.id, community.id).then(function (res) {
          if (res.ok) App.Router.navigate('community');
        });
      });
    }

    const newChallengeBtn = container.querySelector('#cd-new-challenge-btn');
    if (newChallengeBtn) {
      newChallengeBtn.addEventListener('click', function () {
        const slot = container.querySelector('#cd-challenge-form-slot');
        if (slot.dataset.open) { slot.innerHTML = ''; slot.dataset.open = ''; return; }
        slot.dataset.open = '1';
        App.Components.ChallengeForm.render(slot, {
          user: user,
          communityId: community.id,
          onCreated: function (challenge) { App.Router.navigate('community/' + community.id + '/challenge/' + challenge.id); },
        });
      });
    }
  }

  return { render };
})();
