window.App = window.App || {};

// Entries and settings are namespaced per user id so different accounts on
// the same browser never see each other's data.
App.Storage = (function () {
  function entriesKey(userId) { return 'orm_entries_' + userId; }
  function settingsKey(userId) { return 'orm_settings_' + userId; }
  function profileKey(userId) { return 'orm_profile_' + userId; }
  function splitKey(userId) { return 'orm_split_' + userId; }
  function completionsKey(userId) { return 'orm_completions_' + userId; }
  function streakKey(userId) { return 'orm_streak_' + userId; }
  function bodyweightLogKey(userId) { return 'orm_bodyweight_log_' + userId; }
  function goalKey(userId) { return 'orm_goal_' + userId; }
  function achievementsKey(userId) { return 'orm_achievements_' + userId; }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getHistory(userId) {
    try {
      const raw = JSON.parse(localStorage.getItem(entriesKey(userId)));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(userId, list) {
    localStorage.setItem(entriesKey(userId), JSON.stringify(list));
  }

  function addEntry(userId, entry) {
    const list = getHistory(userId);
    const withId = Object.assign({ id: makeId() }, entry);
    list.push(withId);
    saveHistory(userId, list);
    return list;
  }

  function deleteEntry(userId, id) {
    const list = getHistory(userId).filter((e) => e.id !== id);
    saveHistory(userId, list);
    return list;
  }

  function getSettings(userId) {
    try {
      return JSON.parse(localStorage.getItem(settingsKey(userId))) || {};
    } catch (e) {
      return {};
    }
  }

  function saveSettings(userId, settings) {
    localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
  }

  function getProfile(userId) {
    try {
      return JSON.parse(localStorage.getItem(profileKey(userId))) || null;
    } catch (e) {
      return null;
    }
  }

  function saveProfile(userId, profile) {
    localStorage.setItem(profileKey(userId), JSON.stringify(profile));
  }

  function getSplit(userId) {
    try {
      const raw = JSON.parse(localStorage.getItem(splitKey(userId)));
      return raw && Array.isArray(raw.days) ? raw : null;
    } catch (e) {
      return null;
    }
  }

  function saveSplit(userId, split) {
    localStorage.setItem(splitKey(userId), JSON.stringify(split));
  }

  // Completion entries: [{ date: 'YYYY-MM-DD', dayOfWeek: 0-6, completed: bool }],
  // one per calendar date that's been explicitly toggled (not per weekday
  // template slot), since the split repeats weekly and each week's occurrence
  // needs its own record.
  function getCompletions(userId) {
    try {
      const raw = JSON.parse(localStorage.getItem(completionsKey(userId)));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveCompletions(userId, list) {
    localStorage.setItem(completionsKey(userId), JSON.stringify(list));
  }

  function getStreak(userId) {
    try {
      return JSON.parse(localStorage.getItem(streakKey(userId))) || { count: 0, creditedDates: {}, lastCheckedDateKey: null };
    } catch (e) {
      return { count: 0, creditedDates: {}, lastCheckedDateKey: null };
    }
  }

  function saveStreak(userId, streak) {
    localStorage.setItem(streakKey(userId), JSON.stringify(streak));
  }

  // Bodyweight log: [{ date: ISOString, weight, unit }], one entry per time
  // bodyweight was entered anywhere in the app (1 Rep Max page, Split
  // Builder questionnaire, Home's quick-log) -- shared so a bodyweight goal
  // has one consistent history to plot regardless of where it was logged.
  function getBodyweightLog(userId) {
    try {
      const raw = JSON.parse(localStorage.getItem(bodyweightLogKey(userId)));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveBodyweightLog(userId, list) {
    localStorage.setItem(bodyweightLogKey(userId), JSON.stringify(list));
  }

  function addBodyweightEntry(userId, entry) {
    const list = getBodyweightLog(userId);
    list.push(entry);
    saveBodyweightLog(userId, list);
    return list;
  }

  // Single active goal at a time: either
  //   { type: 'bodyweight', direction: 'lose'|'gain', amount, startWeight, targetWeight, unit, createdAt }
  // or
  //   { type: 'exercise', lift, targetWeight, unit, createdAt }
  function getGoal(userId) {
    try {
      return JSON.parse(localStorage.getItem(goalKey(userId))) || null;
    } catch (e) {
      return null;
    }
  }

  function saveGoal(userId, goal) {
    localStorage.setItem(goalKey(userId), JSON.stringify(goal));
  }

  function clearGoal(userId) {
    localStorage.removeItem(goalKey(userId));
  }

  // Achieved goals, archived permanently -- starting a new goal never
  // discards the record of one already reached. Each entry:
  //   { id, type, lift, direction, startValue, targetValue, amount, unit,
  //     achievedAt, tier }
  function getAchievements(userId) {
    try {
      const raw = JSON.parse(localStorage.getItem(achievementsKey(userId)));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveAchievements(userId, list) {
    localStorage.setItem(achievementsKey(userId), JSON.stringify(list));
  }

  function addAchievement(userId, achievement) {
    const list = getAchievements(userId);
    list.push(achievement);
    saveAchievements(userId, list);
    return list;
  }

  return {
    getHistory, saveHistory, addEntry, deleteEntry,
    getSettings, saveSettings,
    getProfile, saveProfile,
    getSplit, saveSplit,
    getCompletions, saveCompletions,
    getStreak, saveStreak,
    getBodyweightLog, saveBodyweightLog, addBodyweightEntry,
    getGoal, saveGoal, clearGoal,
    getAchievements, saveAchievements, addAchievement,
  };
})();
