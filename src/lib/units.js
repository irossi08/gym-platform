window.App = window.App || {};

App.Units = (function () {
  const KG_TO_LB = 2.20462;

  function convert(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    return fromUnit === 'kg' ? value * KG_TO_LB : value / KG_TO_LB;
  }

  function round(value, decimals) {
    const factor = Math.pow(10, decimals || 0);
    return Math.round(value * factor) / factor;
  }

  return { KG_TO_LB, convert, round };
})();
