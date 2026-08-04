window.App = window.App || {};

/**
 * Date/weekday utilities plus completion tracking and streak evaluation,
 * shared between the Split Builder and Home pages so "mark complete" means
 * the same thing in both places.
 *
 * Weekday numbering matches App.SplitBuilder: 0 = Monday ... 6 = Sunday.
 * Completion is tracked per actual calendar date (not per weekday slot)
 * because the split repeats weekly -- each week's occurrence of "Tuesday"
 * needs its own completion record, and a reschedule (which moves a
 * *template* weekday, not a single date) should only affect future weeks.
 */
App.Schedule = (function () {
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  // Parses a 'YYYY-MM-DD' key as a local-time date. Deliberately not
  // `new Date(key)` -- that parses date-only strings as UTC midnight, which
  // can land on the wrong local calendar day depending on timezone offset.
  function parseDateKey(key) {
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // 0 = Monday ... 6 = Sunday, converted from JS's native 0 = Sunday ... 6 = Saturday.
  function isoWeekday(date) {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  function mondayOfWeek(date) {
    const d = startOfDay(date);
    d.setDate(d.getDate() - isoWeekday(d));
    return d;
  }

  function dateForWeekday(weekday, referenceDate) {
    const monday = mondayOfWeek(referenceDate || new Date());
    const d = new Date(monday);
    d.setDate(d.getDate() + weekday);
    return d;
  }

  function todayWeekday() {
    return isoWeekday(new Date());
  }

  function isCompleted(userId, key) {
    const list = App.Storage.getCompletions(userId);
    const entry = list.find(function (e) { return e.date === key; });
    return !!(entry && entry.completed);
  }

  // Full completion record for a date -- photoUrl/autoDetected/completedAt,
  // used by the UI to show *how* a day was completed (auto-detected at a
  // gym vs. manually with a photo), not just whether it was.
  function getCompletionDetails(userId, key) {
    const list = App.Storage.getCompletions(userId);
    return list.find(function (e) { return e.date === key; }) || null;
  }

  // `extra` ({photoUrl, autoDetected}) is only meaningful when completing
  // (completed=true) -- un-completing always clears both, since a photo/
  // auto-detection flag shouldn't linger for a day that's no longer marked
  // done.
  function setCompleted(userId, key, dayOfWeek, completed, extra) {
    const list = App.Storage.getCompletions(userId);
    const idx = list.findIndex(function (e) { return e.date === key; });
    const patch = {
      date: key,
      dayOfWeek: dayOfWeek,
      completed: completed,
      photoUrl: completed ? ((extra && extra.photoUrl) || null) : null,
      autoDetected: completed ? !!(extra && extra.autoDetected) : false,
      completedAt: completed ? new Date().toISOString() : null,
    };
    if (idx !== -1) list[idx] = Object.assign({}, list[idx], patch);
    else list.push(patch);
    App.Storage.saveCompletions(userId, list);
  }

  function normalizeStreak(streak) {
    // Migrate from the old weekly shape (lastSeenWeekKey/creditedWeekKey),
    // which has no meaning for daily tracking.
    return {
      count: streak.count || 0,
      creditedDates: streak.creditedDates || {},
      lastCheckedDateKey: streak.lastCheckedDateKey || null,
    };
  }

  /**
   * Streak = consecutive SCHEDULED TRAINING DAYS completed, evaluated per
   * calendar date rather than per week. Call this right after every
   * completion toggle (not just on page load) so the number updates the
   * moment a day is marked complete or unmarked.
   *
   * `creditedDates` guards against double-counting: every call reconciles
   * the full completion log against the CURRENT split's weekday schedule,
   * crediting (+1) any completed scheduled date not yet credited and
   * uncrediting (-1) any previously-credited date that's no longer
   * completed (unmarked) or no longer scheduled. This also makes a
   * backfilled completion (e.g. marking an earlier day in the current week
   * complete from the Split page) credit correctly whenever it happens, not
   * just on the day itself.
   *
   * `lastCheckedDateKey` drives one-time miss detection: a scheduled date
   * that fully elapses (is before today) without being completed resets the
   * streak to 0 -- checked only once per date (the cursor always advances)
   * so a later backfilled completion for that same date can still credit it
   * afterwards without re-triggering the same reset.
   *
   * Rescheduling ("Missed this workout") swaps which weekday a day-template
   * is attached to, so the original weekday simply stops being "scheduled"
   * going forward -- it can no longer register as a miss, which is what
   * lets a reschedule-and-complete-elsewhere leave the streak unbroken.
   * Rest days (no day-template for that weekday) are skipped by both loops
   * below, so they neither increment nor break the streak.
   *
   * Simplification worth knowing (carried over from the prior weekly
   * version): only the CURRENT split's weekday assignments are known, so a
   * date's scheduled-ness is always judged against today's template, not
   * whatever the template looked like on that historical date.
   */
  function recalculateStreak(userId, split) {
    if (!split || !split.days || split.days.length === 0) {
      return App.Storage.getStreak(userId);
    }

    const streak = normalizeStreak(App.Storage.getStreak(userId));
    const scheduledWeekdays = {};
    split.days.forEach(function (d) { scheduledWeekdays[d.weekday] = true; });

    const today = startOfDay(new Date());
    const todayKey = dateKey(today);

    if (!streak.lastCheckedDateKey) {
      streak.lastCheckedDateKey = todayKey;
    } else if (streak.lastCheckedDateKey !== todayKey) {
      const cursor = parseDateKey(streak.lastCheckedDateKey);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor < today) {
        if (scheduledWeekdays[isoWeekday(cursor)] && !isCompleted(userId, dateKey(cursor))) {
          streak.count = 0;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      streak.lastCheckedDateKey = todayKey;
    }

    App.Storage.getCompletions(userId).forEach(function (entry) {
      const isScheduled = !!scheduledWeekdays[isoWeekday(parseDateKey(entry.date))];
      if (entry.completed && isScheduled && !streak.creditedDates[entry.date]) {
        streak.count = (streak.count || 0) + 1;
        streak.creditedDates[entry.date] = true;
      } else if ((!entry.completed || !isScheduled) && streak.creditedDates[entry.date]) {
        streak.count = Math.max(0, (streak.count || 0) - 1);
        delete streak.creditedDates[entry.date];
      }
    });

    App.Storage.saveStreak(userId, streak);

    // Community feed: post once per (community, milestone) the moment the
    // count lands exactly on one -- an exact match rather than >=, so this
    // doesn't attempt an insert on every navigation for every day beyond
    // the threshold too. Harmless either way (the streak_milestone dedup
    // index in schema.sql rejects a repeat), but no reason to try more
    // than necessary. App.Communities may not be loaded on every page in
    // theory, so guard against that rather than assume it.
    const STREAK_MILESTONES = [7, 30, 100];
    if (STREAK_MILESTONES.indexOf(streak.count) !== -1 && window.App.Communities) {
      App.Communities.logActivity(userId, 'streak_milestone', { value: streak.count });
    }

    return streak;
  }

  return {
    dateKey, parseDateKey, isoWeekday, mondayOfWeek, dateForWeekday, todayWeekday,
    isCompleted, setCompleted, getCompletionDetails, recalculateStreak,
  };
})();
