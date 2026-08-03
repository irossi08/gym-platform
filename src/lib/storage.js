window.App = window.App || {};

/**
 * Data layer backed by Supabase, but every function here keeps the exact
 * synchronous signature the rest of the app already calls (getHistory,
 * addEntry, saveGoal, etc. all still return immediately, no .then()
 * needed at call sites). That's possible because of a simple pattern:
 *
 *   - `preloadAll(userId)` fetches every table for a user in one parallel
 *     batch and fills an in-memory cache. App.Auth + app.js/Auth.js always
 *     await this once (on initial load and right after login/signup)
 *     BEFORE any page gets a chance to render, so by the time any getX()
 *     below is called, the cache for the current user is already warm.
 *   - Every getX(userId) just reads that cache synchronously.
 *   - Every saveX/addX/deleteX updates the cache synchronously (so an
 *     immediately-following getX in the same render sees the change) and
 *     also fires off the matching Supabase write in the background,
 *     fire-and-forget with the error logged if it fails.
 *
 * Field names in the cache stay the same camelCase shape the app already
 * uses; only the row<->cache mapping functions below know about Supabase's
 * snake_case columns.
 */
App.Storage = (function () {
  const db = App.Supabase;
  const cache = {};

  function emptyCacheFor() {
    return {
      history: [],
      settings: {},
      profile: null,
      split: null,
      completions: [],
      streak: { count: 0, creditedDates: {}, lastCheckedDateKey: null },
      bodyweightLog: [],
      goal: null,
      achievements: [],
      tourSeen: false,
      achievementTourSeen: false,
      theme: {},
      addedExercises: [],
      customExercises: [],
    };
  }

  // Defensive fallback -- in normal operation preloadAll() has always
  // already run for the current user by the time anything reads this, but
  // this keeps every getter crash-proof regardless.
  function cacheFor(userId) {
    if (!cache[userId]) cache[userId] = emptyCacheFor();
    return cache[userId];
  }

  function logIfError(label) {
    return function (result) {
      if (result && result.error) console.error('[Storage] ' + label + ' failed:', result.error);
      return result;
    };
  }

  // Strips null/undefined keys so a fetched row with unset columns doesn't
  // clobber App.Theme's/other Object.assign(defaults, ...) merge patterns
  // with explicit nulls.
  function compact(obj) {
    const out = {};
    Object.keys(obj).forEach(function (k) {
      if (obj[k] != null) out[k] = obj[k];
    });
    return out;
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  // ---------- entries (logged sets / history) ----------

  function entryFromRow(row) {
    return {
      id: row.id, lift: row.lift, weight: row.weight, reps: row.reps, unit: row.unit,
      estimated1RM: row.estimated_1rm, epley: row.epley, brzycki: row.brzycki, lombardi: row.lombardi,
      bodyweight: row.bodyweight, sex: row.sex, addedWeight: row.added_weight, date: row.date,
    };
  }

  function entryToRow(userId, entry, id) {
    return {
      id: id, user_id: userId, lift: entry.lift, weight: entry.weight, reps: entry.reps, unit: entry.unit,
      estimated_1rm: entry.estimated1RM, epley: entry.epley, brzycki: entry.brzycki, lombardi: entry.lombardi,
      bodyweight: entry.bodyweight, sex: entry.sex, added_weight: entry.addedWeight, date: entry.date,
    };
  }

  function getHistory(userId) {
    return cacheFor(userId).history;
  }

  function saveHistory(userId, list) {
    // Cache-only setter -- addEntry/deleteEntry (the only real entry
    // points) handle their own targeted Supabase insert/delete themselves,
    // so this never needs to push a bulk sync.
    cacheFor(userId).history = list;
  }

  function addEntry(userId, entry) {
    const id = makeId();
    const withId = Object.assign({ id: id }, entry);
    const list = getHistory(userId).concat([withId]);
    cacheFor(userId).history = list;
    db.from('entries').insert(entryToRow(userId, entry, id)).then(logIfError('addEntry'));
    return list;
  }

  function deleteEntry(userId, id) {
    const list = getHistory(userId).filter(function (e) { return e.id !== id; });
    cacheFor(userId).history = list;
    db.from('entries').delete().eq('id', id).then(logIfError('deleteEntry'));
    return list;
  }

  // ---------- settings (display unit + form defaults) ----------

  function getSettings(userId) {
    return cacheFor(userId).settings;
  }

  function saveSettings(userId, settings) {
    cacheFor(userId).settings = settings;
    db.from('settings').upsert({
      user_id: userId,
      display_unit: settings.displayUnit,
      form_defaults: settings.formDefaults,
    }, { onConflict: 'user_id' }).then(logIfError('saveSettings'));
  }

  // ---------- profile (Split Builder questionnaire answers) ----------

  function getProfile(userId) {
    return cacheFor(userId).profile;
  }

  function saveProfile(userId, profile) {
    // Merge rather than replace -- Split Builder's questionnaire and the
    // profile setup/edit form each save only their own subset of fields
    // (e.g. Split Builder never sends name/profilePictureType), and a full
    // replace here would wipe whatever the other flow last set in the
    // in-memory cache (the DB side is already safe: undefined keys drop out
    // of the JSON body below, so upsert only ever touches columns actually
    // passed in).
    cacheFor(userId).profile = Object.assign({}, cacheFor(userId).profile, profile);
    db.from('profiles').upsert({
      user_id: userId,
      age: profile.age,
      bodyweight: profile.bodyweight,
      bodyweight_unit: profile.bodyweightUnit,
      sex: profile.sex,
      days_per_week: profile.daysPerWeek,
      training_weekdays: profile.trainingWeekdays,
      time_per_session: profile.timePerSession,
      experience_level: profile.experienceLevel,
      name: profile.name,
      profile_picture_type: profile.profilePictureType,
      profile_picture_url: profile.profilePictureUrl,
      preset_avatar_id: profile.presetAvatarId,
      setup_complete: profile.setupComplete,
    }, { onConflict: 'user_id' }).then(logIfError('saveProfile'));
  }

  // ---------- profile photo (Supabase Storage, private per-user bucket) ----------

  const PROFILE_PHOTOS_BUCKET = 'profile-photos';

  // A photo straight off a phone camera can be several MB -- avatars only
  // ever display at a few dozen pixels across (Home's profile card,
  // friends list, community members, challenge leaderboard), so uploading
  // the original at full resolution means every one of those views
  // downloads the whole multi-MB file just to shrink it in CSS. Resizing
  // to a modest max dimension and re-encoding as JPEG client-side, before
  // upload, fixes that at the source for every future viewer at once.
  const MAX_PHOTO_DIMENSION = 320;

  function resizeImageFile(file, maxDim) {
    return new Promise(function (resolve, reject) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        let width = img.naturalWidth, height = img.naturalHeight;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('Could not process image.'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read image.'));
      };
      img.src = objectUrl;
    });
  }

  // Fixed path per user (no extension) so a re-upload always replaces the
  // previous photo in place instead of leaving orphaned files behind;
  // contentType on the upload carries the real image type for display.
  function uploadProfilePhoto(userId, file) {
    const path = userId + '/photo';
    return resizeImageFile(file, MAX_PHOTO_DIMENSION).then(function (resized) {
      return db.storage.from(PROFILE_PHOTOS_BUCKET).upload(path, resized, {
        upsert: true,
        contentType: 'image/jpeg',
      });
    }).then(function (res) {
      if (res.error) {
        console.error('[Storage] uploadProfilePhoto failed:', res.error);
        throw res.error;
      }
      return path;
    });
  }

  // The bucket is private, so there's no public URL to just store and
  // reuse -- every render asks Storage for a fresh short-lived signed URL
  // for whatever path is on the profile row.
  function getProfilePhotoUrl(path) {
    if (!path) return Promise.resolve(null);
    return db.storage.from(PROFILE_PHOTOS_BUCKET).createSignedUrl(path, 3600).then(function (res) {
      if (res.error) {
        console.error('[Storage] getProfilePhotoUrl failed:', res.error);
        return null;
      }
      return res.data.signedUrl;
    });
  }

  // Batched version -- one request for N paths instead of N separate
  // round trips. Used anywhere a list of OTHER people's avatars needs
  // signing at once (friends list, community members, challenge
  // leaderboard) -- firing a signed-url request per row was the main
  // culprit behind slow loads on the Community pages, especially over a
  // mobile connection where per-request latency is higher. Returns a
  // {path: url} map; a path that failed to sign is simply absent.
  function getProfilePhotoUrls(paths) {
    const unique = Array.from(new Set((paths || []).filter(Boolean)));
    if (unique.length === 0) return Promise.resolve({});
    return db.storage.from(PROFILE_PHOTOS_BUCKET).createSignedUrls(unique, 3600).then(function (res) {
      const map = {};
      if (res.error) {
        console.error('[Storage] getProfilePhotoUrls failed:', res.error);
        return map;
      }
      (res.data || []).forEach(function (item) {
        if (item.signedUrl && !item.error) map[item.path] = item.signedUrl;
      });
      return map;
    });
  }

  // ---------- split (Build My Split's generated weekly plan) ----------

  function getSplit(userId) {
    return cacheFor(userId).split;
  }

  function saveSplit(userId, split) {
    cacheFor(userId).split = split;
    db.from('splits').upsert({
      user_id: userId,
      days: split.days,
    }, { onConflict: 'user_id' }).then(logIfError('saveSplit'));
  }

  // ---------- completions (per-calendar-date workout completion log) ----------

  function getCompletions(userId) {
    return cacheFor(userId).completions;
  }

  function saveCompletions(userId, list) {
    cacheFor(userId).completions = list;
    if (list.length === 0) return;
    db.from('completions').upsert(list.map(function (e) {
      return { user_id: userId, date: e.date, day_of_week: e.dayOfWeek, completed: e.completed };
    }), { onConflict: 'user_id,date' }).then(logIfError('saveCompletions'));
  }

  // ---------- streaks ----------

  function getStreak(userId) {
    return cacheFor(userId).streak;
  }

  function saveStreak(userId, streak) {
    cacheFor(userId).streak = streak;
    db.from('streaks').upsert({
      user_id: userId,
      count: streak.count,
      credited_dates: streak.creditedDates,
      last_checked_date_key: streak.lastCheckedDateKey,
    }, { onConflict: 'user_id' }).then(logIfError('saveStreak'));
  }

  // ---------- bodyweight log ----------

  function getBodyweightLog(userId) {
    return cacheFor(userId).bodyweightLog;
  }

  function saveBodyweightLog(userId, list) {
    // Cache-only setter -- addBodyweightEntry is the only real entry point.
    cacheFor(userId).bodyweightLog = list;
  }

  function addBodyweightEntry(userId, entry) {
    const list = getBodyweightLog(userId).concat([entry]);
    cacheFor(userId).bodyweightLog = list;
    db.from('bodyweight_log').insert({
      user_id: userId, date: entry.date, weight: entry.weight, unit: entry.unit,
    }).then(logIfError('addBodyweightEntry'));
    return list;
  }

  // ---------- goal (single active goal per user) ----------

  function getGoal(userId) {
    return cacheFor(userId).goal;
  }

  function saveGoal(userId, goal) {
    cacheFor(userId).goal = goal;
    db.from('goals').upsert({
      user_id: userId,
      type: goal.type,
      direction: goal.direction,
      amount: goal.amount,
      start_weight: goal.startWeight,
      target_weight: goal.targetWeight,
      unit: goal.unit,
      lift: goal.lift,
      created_at: goal.createdAt,
      achieved: !!goal.achieved,
      achieved_at: goal.achievedAt,
    }, { onConflict: 'user_id' }).then(logIfError('saveGoal'));
  }

  function clearGoal(userId) {
    cacheFor(userId).goal = null;
    db.from('goals').delete().eq('user_id', userId).then(logIfError('clearGoal'));
  }

  // ---------- achievements (archived reached goals) ----------

  function getAchievements(userId) {
    return cacheFor(userId).achievements;
  }

  function saveAchievements(userId, list) {
    // Cache-only setter -- addAchievement is the only real entry point.
    cacheFor(userId).achievements = list;
  }

  function addAchievement(userId, achievement) {
    const list = getAchievements(userId).concat([achievement]);
    cacheFor(userId).achievements = list;
    db.from('achievements').insert({
      id: achievement.id,
      user_id: userId,
      type: achievement.type,
      lift: achievement.lift,
      direction: achievement.direction,
      start_value: achievement.startValue,
      target_value: achievement.targetValue,
      amount: achievement.amount,
      unit: achievement.unit,
      achieved_at: achievement.achievedAt,
      tier: achievement.tier,
    }).then(logIfError('addAchievement'));
    return list;
  }

  // ---------- onboarding tour flag ----------

  function getTourSeen(userId) {
    return cacheFor(userId).tourSeen;
  }

  function setTourSeen(userId) {
    cacheFor(userId).tourSeen = true;
    db.from('settings').upsert({
      user_id: userId,
      tour_seen: true,
    }, { onConflict: 'user_id' }).then(logIfError('setTourSeen'));
  }

  // Separate flag for the short first-achievement mini-tour -- tracked
  // independently so it never interferes with the main tour's flag above.
  function getAchievementTourSeen(userId) {
    return cacheFor(userId).achievementTourSeen;
  }

  function setAchievementTourSeen(userId) {
    cacheFor(userId).achievementTourSeen = true;
    db.from('settings').upsert({
      user_id: userId,
      achievement_tour_seen: true,
    }, { onConflict: 'user_id' }).then(logIfError('setAchievementTourSeen'));
  }

  // ---------- theme (Settings page appearance) ----------

  function getTheme(userId) {
    return cacheFor(userId).theme;
  }

  function saveTheme(userId, theme) {
    cacheFor(userId).theme = theme;
    db.from('themes').upsert({
      user_id: userId,
      bg: theme.bg,
      surface: theme.surface,
      accent: theme.accent,
      text_color: theme.text,
      density: theme.density,
      view_style: theme.viewStyle,
      font_size: theme.fontSize,
    }, { onConflict: 'user_id' }).then(logIfError('saveTheme'));
  }

  // ---------- user-added curated-pool exercises ----------

  function getUserAddedExercises(userId) {
    return cacheFor(userId).addedExercises;
  }

  function addUserAddedExercise(userId, exerciseKey) {
    const list = getUserAddedExercises(userId);
    if (list.indexOf(exerciseKey) !== -1) return list;
    const updated = list.concat([exerciseKey]);
    cacheFor(userId).addedExercises = updated;
    db.from('user_added_exercises').insert({
      user_id: userId, exercise_key: exerciseKey,
    }).then(logIfError('addUserAddedExercise'));
    return updated;
  }

  // ---------- user-authored custom exercises (no standards data) ----------

  function getCustomExercises(userId) {
    return cacheFor(userId).customExercises;
  }

  function addCustomExercise(userId, custom) {
    const key = makeId();
    const withKey = Object.assign({ key: key }, custom);
    const list = getCustomExercises(userId).concat([withKey]);
    cacheFor(userId).customExercises = list;
    db.from('user_custom_exercises').insert({
      id: key,
      user_id: userId,
      name: custom.name,
      primary_muscle: custom.primaryMuscle,
      secondary_muscle: custom.secondaryMuscle,
      description: custom.description,
      pattern: custom.pattern,
    }).then(logIfError('addCustomExercise'));
    return withKey;
  }

  // ---------- preload ----------

  // Fetches everything for `userId` in one parallel batch and fills the
  // cache. Must be awaited before any page that reads App.Storage renders
  // -- see app.js (initial load) and Auth.js (right after login/signup).
  function preloadAll(userId) {
    return Promise.all([
      db.from('entries').select('*').eq('user_id', userId),
      db.from('settings').select('*').eq('user_id', userId).maybeSingle(),
      db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      db.from('splits').select('*').eq('user_id', userId).maybeSingle(),
      db.from('completions').select('*').eq('user_id', userId),
      db.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
      db.from('bodyweight_log').select('*').eq('user_id', userId),
      db.from('goals').select('*').eq('user_id', userId).maybeSingle(),
      db.from('achievements').select('*').eq('user_id', userId),
      db.from('themes').select('*').eq('user_id', userId).maybeSingle(),
      db.from('user_added_exercises').select('*').eq('user_id', userId),
      db.from('user_custom_exercises').select('*').eq('user_id', userId),
    ]).then(function (results) {
      const [
        entriesRes, settingsRes, profileRes, splitRes, completionsRes,
        streakRes, bwLogRes, goalRes, achievementsRes, themeRes,
        addedExercisesRes, customExercisesRes,
      ] = results;

      results.forEach(function (r, i) {
        if (r.error) console.error('[Storage] preloadAll query ' + i + ' failed:', r.error);
      });

      const settingsRow = settingsRes.data;
      const profileRow = profileRes.data;
      const splitRow = splitRes.data;
      const streakRow = streakRes.data;
      const goalRow = goalRes.data;
      const themeRow = themeRes.data;

      cache[userId] = {
        history: (entriesRes.data || []).map(entryFromRow),

        settings: settingsRow ? compact({ displayUnit: settingsRow.display_unit, formDefaults: settingsRow.form_defaults }) : {},

        profile: profileRow ? {
          age: profileRow.age, bodyweight: profileRow.bodyweight, bodyweightUnit: profileRow.bodyweight_unit,
          sex: profileRow.sex, daysPerWeek: profileRow.days_per_week, trainingWeekdays: profileRow.training_weekdays,
          timePerSession: profileRow.time_per_session, experienceLevel: profileRow.experience_level,
          name: profileRow.name, profilePictureType: profileRow.profile_picture_type,
          profilePictureUrl: profileRow.profile_picture_url, presetAvatarId: profileRow.preset_avatar_id,
          publicId: profileRow.public_id, setupComplete: !!profileRow.setup_complete,
        } : null,

        split: (splitRow && Array.isArray(splitRow.days)) ? { days: splitRow.days } : null,

        completions: (completionsRes.data || []).map(function (row) {
          return { date: row.date, dayOfWeek: row.day_of_week, completed: row.completed };
        }),

        streak: streakRow
          ? { count: streakRow.count, creditedDates: streakRow.credited_dates || {}, lastCheckedDateKey: streakRow.last_checked_date_key }
          : { count: 0, creditedDates: {}, lastCheckedDateKey: null },

        bodyweightLog: (bwLogRes.data || []).map(function (row) {
          return { date: row.date, weight: row.weight, unit: row.unit };
        }),

        goal: goalRow ? {
          type: goalRow.type, direction: goalRow.direction, amount: goalRow.amount,
          startWeight: goalRow.start_weight, targetWeight: goalRow.target_weight, unit: goalRow.unit,
          lift: goalRow.lift, createdAt: goalRow.created_at, achieved: goalRow.achieved, achievedAt: goalRow.achieved_at,
        } : null,

        achievements: (achievementsRes.data || []).map(function (row) {
          return {
            id: row.id, type: row.type, lift: row.lift, direction: row.direction,
            startValue: row.start_value, targetValue: row.target_value, amount: row.amount,
            unit: row.unit, achievedAt: row.achieved_at, tier: row.tier,
          };
        }),

        tourSeen: !!(settingsRow && settingsRow.tour_seen),
        achievementTourSeen: !!(settingsRow && settingsRow.achievement_tour_seen),

        theme: themeRow ? compact({
          bg: themeRow.bg, surface: themeRow.surface, accent: themeRow.accent, text: themeRow.text_color,
          density: themeRow.density, viewStyle: themeRow.view_style, fontSize: themeRow.font_size,
        }) : {},

        addedExercises: (addedExercisesRes.data || []).map(function (row) { return row.exercise_key; }),

        customExercises: (customExercisesRes.data || []).map(function (row) {
          return {
            key: row.id, name: row.name, primaryMuscle: row.primary_muscle,
            secondaryMuscle: row.secondary_muscle, description: row.description, pattern: row.pattern,
          };
        }),
      };
    });
  }

  return {
    preloadAll,
    getHistory, saveHistory, addEntry, deleteEntry,
    getSettings, saveSettings,
    getProfile, saveProfile,
    uploadProfilePhoto, getProfilePhotoUrl, getProfilePhotoUrls,
    getSplit, saveSplit,
    getCompletions, saveCompletions,
    getStreak, saveStreak,
    getBodyweightLog, saveBodyweightLog, addBodyweightEntry,
    getGoal, saveGoal, clearGoal,
    getAchievements, saveAchievements, addAchievement,
    getTourSeen, setTourSeen,
    getAchievementTourSeen, setAchievementTourSeen,
    getTheme, saveTheme,
    getUserAddedExercises, addUserAddedExercise,
    getCustomExercises, addCustomExercise,
  };
})();
