const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

/**
 * Daily Vercel Cron job (see vercel.json, "0 19 * * *" -- 19:00 UTC).
 * Checks every opted-in user's status and sends AT MOST one push each:
 * "you haven't logged today's scheduled workout" if their streak is
 * currently 0, or the more urgent "your streak is on the line" variant
 * if they actually have one to lose. Nothing is sent on a rest day (no
 * scheduled day today) or once today's workout is already logged.
 *
 * Runs with the Supabase SERVICE ROLE key, not the publishable one the
 * client uses -- this deliberately bypasses RLS (push_subscriptions'
 * owner-only policy, and everyone's splits/completions/streaks) because
 * it has to read across every subscribed user, not just one signed-in
 * user's own rows. That's the intended, standard way a trusted backend
 * job accesses Supabase; never expose the service role key to the client.
 *
 * One caveat, accepted as a known simplification for now (see the
 * request this shipped from): "today" and "evening" are both judged
 * against server UTC time for every user regardless of their own
 * timezone. True per-user timezone accuracy would need each user's
 * timezone stored somewhere and per-user scheduling, not a single daily
 * cron tick -- a real upgrade, not implemented here.
 */
module.exports = async function handler(req, res) {
  // Vercel automatically sends this exact header on cron-triggered
  // invocations when CRON_SECRET is set -- anyone else hitting this URL
  // directly (it's a public endpoint path) gets rejected here instead of
  // being able to trigger mass notification sends on demand.
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
  for (const name of required) {
    if (!process.env[name]) return res.status(500).json({ error: 'Missing environment variable: ' + name });
  }

  webpush.setVapidDetails(
    'mailto:ibnyousuf08@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth_key')
    .eq('enabled', true);

  if (subsError) return res.status(500).json({ error: subsError.message });
  if (!subs || subs.length === 0) return res.status(200).json({ checked: 0, sent: 0, cleaned: 0 });

  const userIds = subs.map(function (s) { return s.user_id; });

  const [splitsRes, completionsRes, streaksRes] = await Promise.all([
    supabase.from('splits').select('user_id, days').in('user_id', userIds),
    supabase.from('completions').select('user_id, date, completed').in('user_id', userIds),
    supabase.from('streaks').select('user_id, count').in('user_id', userIds),
  ]);

  if (splitsRes.error) return res.status(500).json({ error: splitsRes.error.message });
  if (completionsRes.error) return res.status(500).json({ error: completionsRes.error.message });
  if (streaksRes.error) return res.status(500).json({ error: streaksRes.error.message });

  const splitByUser = {};
  (splitsRes.data || []).forEach(function (s) { splitByUser[s.user_id] = s; });

  // Server UTC "today" -- see the module doc comment's timezone caveat.
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const jsDay = now.getUTCDay();
  // 0 = Monday ... 6 = Sunday, matching App.SplitBuilder/App.Schedule's
  // convention on the client -- a split day's own `weekday` field uses
  // the same numbering, so this has to match exactly or every comparison
  // below would silently check the wrong day.
  const todayWeekday = jsDay === 0 ? 6 : jsDay - 1;

  const completedTodayByUser = {};
  (completionsRes.data || []).forEach(function (c) {
    if (c.date === todayKey && c.completed) completedTodayByUser[c.user_id] = true;
  });

  const streakByUser = {};
  (streaksRes.data || []).forEach(function (s) { streakByUser[s.user_id] = s.count || 0; });

  let sent = 0;
  let cleaned = 0;
  const errors = [];

  for (const sub of subs) {
    const split = splitByUser[sub.user_id];
    if (!split || !split.days || !split.days.length) continue; // no split built yet -- nothing to check against

    const isScheduledToday = split.days.some(function (d) { return d.weekday === todayWeekday; });
    if (!isScheduledToday) continue; // rest day -- nothing to remind about, no streak risk either

    if (completedTodayByUser[sub.user_id]) continue; // already logged today

    const streakCount = streakByUser[sub.user_id] || 0;
    const payload = streakCount > 0
      ? {
          title: 'Your streak is on the line 🔥',
          body: 'You’re at a ' + streakCount + '-day streak — log today’s workout before it resets.',
          url: './#/home',
        }
      : {
          title: 'Today’s workout is still open',
          body: 'You haven’t logged today’s scheduled workout yet.',
          url: './#/home',
        };

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth_key },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      sent++;
    } catch (err) {
      // 404/410 means the browser itself dropped this subscription
      // (uninstalled, cleared site data, etc.) -- clean up rather than
      // retrying it forever on every future run.
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
        cleaned++;
      } else {
        errors.push({ user_id: sub.user_id, error: err && err.message });
      }
    }
  }

  return res.status(200).json({ checked: subs.length, sent: sent, cleaned: cleaned, errors: errors });
};
