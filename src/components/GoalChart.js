window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Shared progress chart for goals: a single line of {date, value} points
 * over time, plus a dashed horizontal line marking the goal's target value.
 * Used for both bodyweight-goal and exercise-1RM-goal progress. Kept
 * separate from TrendChart (used by History) so nothing here can affect
 * that page -- the data shape differs (no per-lift grouping, just one
 * series) and this one also needs the target-line overlay TrendChart has
 * no reason to support.
 */
App.Components.GoalChart = (function () {
  function niceStep(roughStep) {
    const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const frac = roughStep / pow10;
    let niceFrac;
    if (frac < 1.5) niceFrac = 1;
    else if (frac < 3) niceFrac = 2;
    else if (frac < 7) niceFrac = 5;
    else niceFrac = 10;
    return niceFrac * pow10;
  }

  function formatShortDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function render(container, opts) {
    const points = (opts.points || []).slice().sort(function (a, b) { return a.date - b.date; });
    const goalValue = opts.goalValue;
    const unit = opts.unit;
    const emptyMessage = opts.emptyMessage || 'Not enough data yet.';

    if (points.length === 0) {
      container.innerHTML = '<p class="empty-hint">' + emptyMessage + '</p>';
      return;
    }

    const W = 480, H = 220;
    const marginLeft = 40, marginRight = 16, marginTop = 14, marginBottom = 26;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

    const values = points.map(function (p) { return p.value; });
    if (goalValue != null) values.push(goalValue);
    const dates = points.map(function (p) { return p.date.getTime(); });

    const xMin = Math.min.apply(null, dates);
    const xMax = Math.max.apply(null, dates);
    const rawMin = Math.min.apply(null, values);
    const rawMax = Math.max.apply(null, values);
    const pad = Math.max((rawMax - rawMin) * 0.15, rawMax * 0.05, 2);
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;

    function xPos(t) { return xMax === xMin ? marginLeft + plotW / 2 : marginLeft + ((t - xMin) / (xMax - xMin)) * plotW; }
    function yPos(v) { return yMax === yMin ? marginTop + plotH / 2 : marginTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH; }

    const step = niceStep((yMax - yMin) / 4 || 1);
    const gridStart = Math.ceil(yMin / step) * step;
    const gridLines = [];
    for (let v = gridStart; v <= yMax; v += step) gridLines.push(v);

    const gridHtml = gridLines.map(function (v) {
      const y = yPos(v);
      return (
        '<line x1="' + marginLeft + '" y1="' + y + '" x2="' + (W - marginRight) + '" y2="' + y + '" class="chart-gridline" />' +
        '<text x="' + (marginLeft - 8) + '" y="' + (y + 4) + '" class="chart-axis-label goal-chart-axis-label" text-anchor="end">' + Math.round(v) + '</text>'
      );
    }).join('');

    const xLabelHtml =
      '<text x="' + marginLeft + '" y="' + (H - 6) + '" class="chart-axis-label goal-chart-xlabel" text-anchor="start">' + formatShortDate(new Date(xMin)) + '</text>' +
      '<text x="' + (W - marginRight) + '" y="' + (H - 6) + '" class="chart-axis-label goal-chart-xlabel" text-anchor="end">' + formatShortDate(new Date(xMax)) + '</text>';

    const baselineHtml = '<line x1="' + marginLeft + '" y1="' + (marginTop + plotH) + '" x2="' + (W - marginRight) + '" y2="' + (marginTop + plotH) + '" class="chart-baseline" />';

    let goalLineHtml = '';
    if (goalValue != null) {
      const gy = yPos(goalValue);
      goalLineHtml =
        '<line x1="' + marginLeft + '" y1="' + gy + '" x2="' + (W - marginRight) + '" y2="' + gy + '" class="goal-chart-target-line" />' +
        '<text x="' + (W - marginRight) + '" y="' + (gy - 6) + '" text-anchor="end" class="goal-chart-target-label">Goal: ' + Math.round(goalValue) + ' ' + unit + '</text>';
    }

    let seriesHtml = '';
    if (points.length > 1) {
      const d = points.map(function (p, i) { return (i === 0 ? 'M ' : 'L ') + xPos(p.date.getTime()) + ' ' + yPos(p.value); }).join(' ');
      seriesHtml += '<path d="' + d + '" class="goal-chart-line" />';
    }
    points.forEach(function (p, i) {
      const cx = xPos(p.date.getTime());
      const cy = yPos(p.value);
      seriesHtml +=
        '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" class="goal-chart-dot">' +
          '<title>' + formatShortDate(p.date) + ': ' + Math.round(p.value) + ' ' + unit + '</title>' +
        '</circle>';
      if (i === points.length - 1) {
        const anchor = cx > W - marginRight - 60 ? 'end' : 'start';
        const lx = anchor === 'end' ? cx - 8 : cx + 8;
        seriesHtml +=
          '<text x="' + lx + '" y="' + (cy - 10) + '" text-anchor="' + anchor + '" class="goal-chart-direct-label">' +
            Math.round(p.value) + ' ' + unit +
          '</text>';
      }
    });

    container.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="goal-chart" role="img" aria-label="Progress over time">' +
        gridHtml + baselineHtml + goalLineHtml + seriesHtml + xLabelHtml +
      '</svg>';
  }

  return { render };
})();
