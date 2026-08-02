window.App = window.App || {};

App.OneRepMax = (function () {
  const RELIABLE_REPS_LIMIT = 12;

  function epley(weight, reps) {
    return weight * (1 + reps / 30);
  }

  function brzycki(weight, reps) {
    // Formula is only defined for reps < 37; clamp the denominator so a
    // stray high-rep entry degrades gracefully instead of Infinity/negative.
    const denom = Math.max(37 - reps, 1);
    return weight * 36 / denom;
  }

  function lombardi(weight, reps) {
    return weight * Math.pow(reps, 0.10);
  }

  function estimate(weight, reps) {
    const e = epley(weight, reps);
    const b = brzycki(weight, reps);
    const l = lombardi(weight, reps);
    const average = (e + b + l) / 3;
    return {
      epley: e,
      brzycki: b,
      lombardi: l,
      average,
      unreliable: reps > RELIABLE_REPS_LIMIT,
    };
  }

  return { epley, brzycki, lombardi, estimate, RELIABLE_REPS_LIMIT };
})();
