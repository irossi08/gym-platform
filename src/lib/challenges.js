window.App = window.App || {};

/**
 * Community challenges: create/list/respond, plus progress computation.
 *
 * Progress is derived entirely from data the current user already has
 * loaded (App.Storage's bodyweight log / history), never a separate manual
 * entry -- each participant's OWN client computes their own current_value
 * and writes it to their own challenge_participants row, which fellow
 * community members can then read (see schema.sql: that table is
 * member-visible, but nobody can read anyone else's raw entries/
 * bodyweight_log -- only this one derived number ever crosses that
 * boundary).
 *
 * Weight Gain/Loss target_kg is an AMOUNT (like the existing Home goal
 * card), not an absolute bodyweight -- "gain 5kg" is fair to apply to
 * everyone in a community regardless of where they're each starting from.
 * Strength target_percent is a target ratio of the lifter's own bodyweight
 * (e.g. 150 = 1.5x bodyweight), same fairness reasoning across body sizes.
 */
App.Challenges = (function () {
  const db = App.Supabase;

  function challengeRowToObj(row) {
    return {
      id: row.id, communityId: row.community_id, createdBy: row.created_by,
      type: row.type, lift: row.lift, liftLabel: row.lift_label, targetKg: row.target_kg, targetPercent: row.target_percent,
      mode: row.mode, startDate: row.start_date, endDate: row.end_date,
      endedAt: row.ended_at, winnerId: row.winner_id, createdAt: row.created_at,
    };
  }

  function participantRowToObj(row) {
    return {
      challengeId: row.challenge_id, userId: row.user_id, status: row.status,
      startValue: row.start_value, currentValue: row.current_value,
      updatedAt: row.updated_at, joinedAt: row.joined_at, responded_at: row.responded_at,
    };
  }

  function createChallenge(user, communityId, fields) {
    const row = {
      community_id: communityId,
      created_by: user.id,
      type: fields.type,
      lift: fields.type === 'strength' ? fields.lift : null,
      lift_label: fields.type === 'strength' ? App.ExerciseLibrary.label(fields.lift) : null,
      target_kg: fields.type !== 'strength' ? fields.targetKg : null,
      target_percent: fields.type === 'strength' ? fields.targetPercent : null,
      mode: fields.mode,
      start_date: fields.startDate,
      end_date: fields.endDate,
    };
    return db.from('challenges').insert(row).select().single().then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      const challenge = challengeRowToObj(res.data);
      return db.from('community_members').select('user_id').eq('community_id', communityId).then(function (memRes) {
        if (memRes.error) return { ok: false, error: memRes.error.message };
        const memberIds = (memRes.data || []).map(function (r) { return r.user_id; });
        const participantRows = memberIds.map(function (uid) {
          return uid === user.id
            ? { challenge_id: challenge.id, user_id: uid, status: 'accepted', responded_at: new Date().toISOString() }
            : { challenge_id: challenge.id, user_id: uid, status: 'invited' };
        });
        return db.from('challenge_participants').insert(participantRows).then(function (partRes) {
          if (partRes.error) return { ok: false, error: partRes.error.message };
          return { ok: true, challenge: challenge };
        });
      });
    });
  }

  // Capped rather than fetching a community's entire challenge history --
  // 25 most recent is plenty for the list view, and avoids an
  // ever-growing, unbounded payload on every visit to CommunityDetail as a
  // community accumulates challenges over time.
  function getChallenges(communityId) {
    return db.from('challenges').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(25).then(function (res) {
      if (res.error) {
        console.error('[Challenges] getChallenges failed:', res.error);
        return [];
      }
      return (res.data || []).map(challengeRowToObj);
    });
  }

  function getChallenge(challengeId) {
    return db.from('challenges').select('*').eq('id', challengeId).maybeSingle().then(function (res) {
      if (res.error || !res.data) return null;
      return challengeRowToObj(res.data);
    });
  }

  function getParticipants(challengeId) {
    return db.from('challenge_participants').select('*').eq('challenge_id', challengeId).then(function (res) {
      if (res.error) {
        console.error('[Challenges] getParticipants failed:', res.error);
        return [];
      }
      const rows = (res.data || []).map(participantRowToObj);
      return App.Social.profilesForUserIds(rows.map(function (r) { return r.userId; })).then(function (profileMap) {
        rows.forEach(function (r) { r.profile = profileMap[r.userId] || null; });
        return rows;
      });
    });
  }

  // For gain/loss, accepting REQUIRES an explicit starting weight (kg) --
  // startWeightKg -- provided by the caller after prompting the user for
  // it (see ChallengeDetail.js). Deliberately not inferred from the
  // bodyweight log/profile anymore: that value could be stale or simply
  // absent, and a missing start_value silently broke the progress display
  // (it rendered as the raw current weight instead of a delta). Ignored
  // for strength and for declines.
  function respondToInvite(user, challenge, accept, startWeightKg) {
    const patch = { status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() };
    if (accept && challenge.type !== 'strength' && startWeightKg != null) patch.start_value = startWeightKg;
    return db.from('challenge_participants').update(patch).eq('challenge_id', challenge.id).eq('user_id', user.id)
      .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
  }

  // Backfills a starting weight for a participant who's already accepted
  // but has no start_value on record -- the retroactive fix path for any
  // challenge/participant affected before this change existed. Prompted
  // for the same way as at accept time (see ChallengeDetail.js), just
  // later.
  function setStartValue(user, challenge, startWeightKg) {
    return db.from('challenge_participants').update({ start_value: startWeightKg })
      .eq('challenge_id', challenge.id).eq('user_id', user.id)
      .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
  }

  function computeGainLossCurrentValue(user, challenge) {
    const startDate = new Date(challenge.startDate);
    const log = App.Storage.getBodyweightLog(user.id)
      .map(function (e) { return { date: new Date(e.date), kg: App.Units.convert(e.weight, e.unit, 'kg') }; })
      .filter(function (e) { return e.date >= startDate; })
      .sort(function (a, b) { return a.date - b.date; });
    return log.length ? App.Units.round(log[log.length - 1].kg, 2) : null;
  }

  function computeStrengthCurrentValue(user, challenge) {
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    end.setHours(23, 59, 59, 999);
    const ratios = App.Storage.getHistory(user.id)
      .filter(function (e) { return e.lift === challenge.lift; })
      .filter(function (e) { const d = new Date(e.date); return d >= start && d <= end; })
      .map(function (e) { return (e.weight / e.bodyweight) * 100; })
      .filter(function (r) { return isFinite(r) && r > 0; });
    return ratios.length ? App.Units.round(Math.max.apply(null, ratios), 1) : null;
  }

  // 0..1+ fraction of the way to the target -- the single shared formula
  // used both for "has this been reached" and for sorting the leaderboard.
  function progressRatio(challenge, participant) {
    if (participant.currentValue == null) return 0;
    if (challenge.type === 'strength') {
      return challenge.targetPercent ? participant.currentValue / challenge.targetPercent : 0;
    }
    if (participant.startValue == null || !challenge.targetKg) return 0;
    const delta = challenge.type === 'gain'
      ? participant.currentValue - participant.startValue
      : participant.startValue - participant.currentValue;
    return delta / challenge.targetKg;
  }

  function hasReachedTarget(challenge, participant) {
    return progressRatio(challenge, participant) >= 1;
  }

  // Race mode only: the first client to notice its own user crossed the
  // target writes the shared winner_id/ended_at fields, guarded by
  // `.is('ended_at', null)` so a later straggler's write can't overwrite an
  // already-decided race. Same opportunistic self-heal style as
  // App.Goals.ensureArchived elsewhere in this app.
  function maybeFinalizeRace(challenge, participant) {
    if (challenge.mode !== 'race' || challenge.endedAt) return Promise.resolve();
    if (!hasReachedTarget(challenge, participant)) return Promise.resolve();
    return db.from('challenges')
      .update({ winner_id: participant.userId, ended_at: new Date().toISOString() })
      .eq('id', challenge.id)
      .is('ended_at', null)
      .then(function () {});
  }

  // Recomputes and persists the CURRENT user's own progress for a
  // challenge they've accepted, then self-heals a race finish if they just
  // crossed the target. No-ops once the challenge has already ended.
  function refreshMyProgress(user, challenge, myParticipant) {
    if (!myParticipant || myParticipant.status !== 'accepted' || challenge.endedAt) {
      return Promise.resolve(myParticipant);
    }
    const currentValue = challenge.type === 'strength'
      ? computeStrengthCurrentValue(user, challenge)
      : computeGainLossCurrentValue(user, challenge);
    const updated = Object.assign({}, myParticipant, { currentValue: currentValue });

    return db.from('challenge_participants')
      .update({ current_value: currentValue, updated_at: new Date().toISOString() })
      .eq('challenge_id', challenge.id).eq('user_id', user.id)
      .then(function () { return maybeFinalizeRace(challenge, updated); })
      .then(function () { return updated; });
  }

  return {
    createChallenge, getChallenges, getChallenge, getParticipants,
    respondToInvite, setStartValue, refreshMyProgress, progressRatio, hasReachedTarget,
  };
})();
