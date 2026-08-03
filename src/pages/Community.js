window.App = window.App || {};
App.Pages = App.Pages || {};

/**
 * Community hub: your shareable ID, friends (list/add/pending requests),
 * and communities (yours, create, join by code, browse public directory).
 * Async render (loading hint, then fetch, then draw) since friends/
 * communities are live cross-user data, not part of the boot-time cache --
 * see App.Social/App.Communities.
 */
App.Pages.Community = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function nameOrFallback(profile) {
    return profile && profile.name ? escapeHtml(profile.name) : 'Unknown user';
  }

  function render(container, opts) {
    const user = opts.user;
    const joinCode = opts.joinCode;

    container.innerHTML = '<section class="page page-community"><p class="app-boot-hint">Loading…</p></section>';

    const joinStep = joinCode
      ? App.Communities.joinByCode(joinCode).then(function (res) { return res; })
      : Promise.resolve(null);

    joinStep.then(function (joinResult) {
      return Promise.all([
        App.Social.getFriendData(user.id),
        App.Communities.getMyCommunities(user.id),
      ]).then(function (results) {
        renderPage(container, user, { friendData: results[0], communities: results[1], joinResult: joinResult });
      });
    });
  }

  function renderPage(container, user, state) {
    const profile = App.Storage.getProfile(user.id);
    const fd = state.friendData;

    const joinBannerHtml = state.joinResult
      ? (state.joinResult.ok
          ? '<div class="community-banner community-banner--ok">Joined “' + escapeHtml(state.joinResult.community.name) + '”.</div>'
          : '<div class="community-banner community-banner--error">' + escapeHtml(state.joinResult.error || 'Could not join that community.') + '</div>')
      : '';

    const incomingHtml = fd.incoming.length
      ? '<div class="community-subsection">' +
          '<p class="community-subsection-label">Friend requests</p>' +
          '<ul class="community-people-list">' +
            fd.incoming.map(function (r) {
              return (
                '<li class="community-person-row" data-request-id="' + r.requestId + '">' +
                  '<div class="community-person-avatar"></div>' +
                  '<span class="community-person-name">' + nameOrFallback(r.profile) + '</span>' +
                  '<button type="button" class="btn-accent-sm community-accept-btn" data-request-id="' + r.requestId + '">Accept</button>' +
                  '<button type="button" class="btn-ghost-sm community-decline-btn" data-request-id="' + r.requestId + '">Decline</button>' +
                '</li>'
              );
            }).join('') +
          '</ul>' +
        '</div>'
      : '';

    const outgoingHtml = fd.outgoing.length
      ? '<div class="community-subsection">' +
          '<p class="community-subsection-label">Sent requests</p>' +
          '<ul class="community-people-list">' +
            fd.outgoing.map(function (r) {
              return (
                '<li class="community-person-row" data-request-id="' + r.requestId + '">' +
                  '<div class="community-person-avatar"></div>' +
                  '<span class="community-person-name">' + nameOrFallback(r.profile) + '</span>' +
                  '<span class="community-pending-label">Pending</span>' +
                  '<button type="button" class="btn-ghost-sm community-decline-btn" data-request-id="' + r.requestId + '">Cancel</button>' +
                '</li>'
              );
            }).join('') +
          '</ul>' +
        '</div>'
      : '';

    const friendsHtml = fd.friends.length
      ? '<ul class="community-people-list">' +
          fd.friends.map(function (r) {
            return (
              '<li class="community-person-row" data-request-id="' + r.requestId + '">' +
                '<div class="community-person-avatar"></div>' +
                '<span class="community-person-name">' + nameOrFallback(r.profile) + '</span>' +
                '<button type="button" class="btn-ghost-sm community-decline-btn" data-request-id="' + r.requestId + '">Unfriend</button>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">No friends yet — add one using their ID above.</p>';

    const myCommunitiesHtml = state.communities.length
      ? '<ul class="community-list">' +
          state.communities.map(function (c) {
            return (
              '<li class="community-list-item">' +
                '<a href="#/community/' + c.id + '" class="community-list-link">' +
                  '<span class="community-list-name">' + escapeHtml(c.name) + '</span>' +
                  '<span class="community-list-visibility community-list-visibility--' + c.visibility + '">' + c.visibility + '</span>' +
                '</a>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">You haven’t joined any communities yet.</p>';

    const hasPublicId = !!(profile && profile.publicId);
    if (!hasPublicId) {
      console.warn(
        '[Community] profile.publicId is missing. Most likely causes: (1) the ' +
        'public_id migration in supabase/schema.sql hasn’t been run against ' +
        'this project yet, or (2) it was run, but this browser session’s ' +
        'profile was cached (via preloadAll) before that happened -- a full ' +
        'page refresh (or logging out and back in) re-fetches the profile row ' +
        'and should pick it up. Run `select user_id, public_id from public.' +
        'profiles;` in the Supabase SQL Editor to check whether the column ' +
        'exists and is populated.'
      );
    }

    container.innerHTML =
      '<section class="page page-community">' +
        '<div class="page-header"><h1 class="page-title">Community</h1></div>' +
        '<div id="community-quick-links"></div>' +
        joinBannerHtml +
        '<div class="card">' +
          '<h2 class="section-title">Your ID</h2>' +
          (hasPublicId
            ? '<div class="community-id-row">' +
                '<span class="community-id-value">' + escapeHtml(profile.publicId) + '</span>' +
                '<button type="button" class="btn-ghost-sm" id="community-id-copy">Copy</button>' +
              '</div>' +
              '<p class="field-hint">Share this with a friend so they can add you.</p>'
            : '<p class="field-hint">Your ID isn’t available yet — try refreshing the page. ' +
              'If that doesn’t help, check the browser console for details.</p>'
          ) +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">Friends</h2>' +
          '<div class="field-row">' +
            '<div class="field"><input type="text" id="community-add-friend-input" placeholder="e.g. user163745" maxlength="20" /></div>' +
            '<button type="button" class="btn-primary community-add-friend-btn" id="community-add-friend-btn">Find</button>' +
          '</div>' +
          '<p class="field-error" id="community-add-friend-error"></p>' +
          '<div id="community-add-friend-result"></div>' +
          incomingHtml +
          outgoingHtml +
          '<div class="community-subsection">' +
            '<p class="community-subsection-label">Friends</p>' +
            friendsHtml +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h2 class="section-title">My Communities</h2>' +
          myCommunitiesHtml +
          '<div class="community-actions-row">' +
            '<button type="button" class="btn-primary community-action-btn" id="community-create-btn">Create a community</button>' +
            '<button type="button" class="btn-ghost-sm" id="community-join-code-btn">Join by code</button>' +
            '<button type="button" class="btn-ghost-sm" id="community-browse-btn">Browse public</button>' +
          '</div>' +
          '<div id="community-create-form-slot"></div>' +
          '<div id="community-join-code-slot"></div>' +
          '<div id="community-browse-slot"></div>' +
        '</div>' +
      '</section>';

    // Avatar thumbnails, rendered async into their placeholder slots.
    container.querySelectorAll('.community-person-row').forEach(function (row) {
      const requestId = row.dataset.requestId;
      const all = fd.friends.concat(fd.incoming, fd.outgoing);
      const entry = all.find(function (r) { return String(r.requestId) === requestId; });
      if (entry) App.Components.Avatar.render(row.querySelector('.community-person-avatar'), entry.profile);
    });

    App.Components.QuickLinks.render(container.querySelector('#community-quick-links'), user, 'community');
    wireIdCopy(container, profile);
    wireAddFriend(container, user);
    wireRequestButtons(container, user);
    wireCommunityActions(container, user);
  }

  function wireIdCopy(container, profile) {
    const btn = container.querySelector('#community-id-copy');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!profile || !profile.publicId) return;
      const done = function () { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(profile.publicId).then(done).catch(function () {});
      } else {
        done();
      }
    });
  }

  // Two explicit steps, not one: looking someone up by ID just shows who
  // they are first (name + avatar) with its own "Send friend request"
  // button, rather than firing the request the instant a match is found --
  // makes it obvious a request is about to be sent, and to whom.
  function wireAddFriend(container, user) {
    const btn = container.querySelector('#community-add-friend-btn');
    const input = container.querySelector('#community-add-friend-input');
    const errorEl = container.querySelector('#community-add-friend-error');
    const resultEl = container.querySelector('#community-add-friend-result');

    function lookUp() {
      errorEl.textContent = '';
      resultEl.innerHTML = '';
      const id = input.value.trim();
      if (!id) { errorEl.textContent = 'Enter an ID.'; return; }
      btn.disabled = true;
      App.Social.findUserByPublicId(id).then(function (found) {
        btn.disabled = false;
        if (!found) { errorEl.textContent = 'No user found with that ID.'; return; }
        if (found.userId === user.id) { errorEl.textContent = 'That’s your own ID.'; return; }
        resultEl.innerHTML =
          '<div class="community-found-user">' +
            '<div class="community-person-avatar" id="community-found-avatar"></div>' +
            '<span class="community-person-name">' + nameOrFallback(found) + '</span>' +
            '<button type="button" class="btn-accent-sm" id="community-send-request-btn">Send friend request</button>' +
          '</div>';
        App.Components.Avatar.render(resultEl.querySelector('#community-found-avatar'), found);
        resultEl.querySelector('#community-send-request-btn').addEventListener('click', function (e) {
          const sendBtn = e.currentTarget;
          sendBtn.disabled = true;
          App.Social.sendFriendRequest(user.id, found.userId).then(function (res) {
            if (!res.ok) {
              errorEl.textContent = res.error && res.error.indexOf('duplicate') !== -1
                ? 'You’re already friends or have a pending request with this person.'
                : 'Could not send the request.';
              sendBtn.disabled = false;
              return;
            }
            render(container, { user: user });
          });
        });
      });
    }

    btn.addEventListener('click', lookUp);
  }

  function wireRequestButtons(container, user) {
    container.querySelectorAll('.community-accept-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.Social.respondToFriendRequest(btn.dataset.requestId, true).then(function () { render(container, { user: user }); });
      });
    });
    container.querySelectorAll('.community-decline-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.Social.respondToFriendRequest(btn.dataset.requestId, false).then(function () { render(container, { user: user }); });
      });
    });
  }

  function wireCommunityActions(container, user) {
    container.querySelector('#community-create-btn').addEventListener('click', function () {
      renderCreateForm(container.querySelector('#community-create-form-slot'), user, container);
    });
    container.querySelector('#community-join-code-btn').addEventListener('click', function () {
      renderJoinCodeForm(container.querySelector('#community-join-code-slot'), user, container);
    });
    container.querySelector('#community-browse-btn').addEventListener('click', function () {
      renderBrowse(container.querySelector('#community-browse-slot'), user, container);
    });
  }

  function renderCreateForm(slot, user, pageContainer) {
    if (slot.dataset.open) { slot.innerHTML = ''; slot.dataset.open = ''; return; }
    slot.dataset.open = '1';
    slot.innerHTML =
      '<form class="community-inline-form" novalidate>' +
        '<div class="field"><label for="cc-name">Community name</label><input id="cc-name" type="text" /></div>' +
        '<div class="field">' +
          '<label>Visibility</label>' +
          '<div class="goal-type-toggle">' +
            '<button type="button" class="goal-type-btn goal-type-btn--active" data-visibility="public">Public</button>' +
            '<button type="button" class="goal-type-btn" data-visibility="private">Private</button>' +
          '</div>' +
        '</div>' +
        '<p class="field-error" id="cc-error"></p>' +
        '<button type="submit" class="btn-primary">Create</button>' +
      '</form>';
    let visibility = 'public';
    slot.querySelectorAll('[data-visibility]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        visibility = btn.dataset.visibility;
        slot.querySelectorAll('[data-visibility]').forEach(function (b) { b.classList.toggle('goal-type-btn--active', b === btn); });
      });
    });
    slot.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      const errorEl = slot.querySelector('#cc-error');
      const name = slot.querySelector('#cc-name').value.trim();
      if (!name) { errorEl.textContent = 'Enter a name.'; return; }
      App.Communities.createCommunity(user.id, { name: name, visibility: visibility }).then(function (res) {
        if (!res.ok) { errorEl.textContent = res.error || 'Could not create community.'; return; }
        App.Router.navigate('community/' + res.community.id);
      });
    });
  }

  function renderJoinCodeForm(slot, user, pageContainer) {
    if (slot.dataset.open) { slot.innerHTML = ''; slot.dataset.open = ''; return; }
    slot.dataset.open = '1';
    slot.innerHTML =
      '<form class="community-inline-form" novalidate>' +
        '<div class="field"><label for="cj-code">Invite code</label><input id="cj-code" type="text" /></div>' +
        '<p class="field-error" id="cj-error"></p>' +
        '<button type="submit" class="btn-primary">Join</button>' +
      '</form>';
    slot.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      const errorEl = slot.querySelector('#cj-error');
      const code = slot.querySelector('#cj-code').value.trim();
      if (!code) { errorEl.textContent = 'Enter a code.'; return; }
      App.Communities.joinByCode(code).then(function (res) {
        if (!res.ok) { errorEl.textContent = res.error || 'Invalid code.'; return; }
        App.Router.navigate('community/' + res.community.id);
      });
    });
  }

  function renderBrowse(slot, user, pageContainer) {
    if (slot.dataset.open) { slot.innerHTML = ''; slot.dataset.open = ''; return; }
    slot.dataset.open = '1';
    slot.innerHTML =
      '<div class="community-browse">' +
        '<input type="text" id="cb-search" placeholder="Search public communities…" />' +
        '<div id="cb-results" class="community-browse-results"><p class="empty-hint">Loading…</p></div>' +
      '</div>';

    function search(term) {
      App.Communities.browsePublicCommunities(term).then(function (list) {
        const resultsEl = slot.querySelector('#cb-results');
        if (!resultsEl) return;
        resultsEl.innerHTML = list.length
          ? '<ul class="community-list">' +
              list.map(function (c) {
                return (
                  '<li class="community-list-item">' +
                    '<span class="community-list-name">' + escapeHtml(c.name) + '</span>' +
                    '<button type="button" class="btn-ghost-sm community-join-public-btn" data-community-id="' + c.id + '">Join</button>' +
                  '</li>'
                );
              }).join('') +
            '</ul>'
          : '<p class="empty-hint">No public communities found.</p>';
        resultsEl.querySelectorAll('.community-join-public-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            App.Communities.joinPublicCommunity(user.id, btn.dataset.communityId).then(function (res) {
              if (res.ok) App.Router.navigate('community/' + btn.dataset.communityId);
            });
          });
        });
      });
    }

    search('');
    let debounce;
    slot.querySelector('#cb-search').addEventListener('input', function (e) {
      clearTimeout(debounce);
      const val = e.target.value;
      debounce = setTimeout(function () { search(val); }, 300);
    });
  }

  return { render };
})();
