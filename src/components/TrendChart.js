window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Multi-exercise trend chart using an "emphasis" encoding rather than a
 * generated multi-hue categorical palette: with 13 possible exercises there
 * is no fixed set of hues that stays distinguishable (and safe for color
 * vision deficiency) at that count, so instead the most recently logged
 * exercise is drawn in the brand accent (green) and up to three older
 * exercises are drawn as de-emphasized grayscale context lines,
 * differentiated from each other by line style (solid/dashed/dotted) and
 * direct end-labels rather than by hue. Selecting a single exercise via the
 * History filter always shows just that one line in the accent color.
 */
App.Components.TrendChart = (function () {
  const CONTEXT_STYLES = [
    { colorVar: '--text-secondary', dash: null },
    { colorVar: '--text-muted', dash: '7 5' },
    { colorVar: '--chart-context-3', dash: '2 6' },
  ];

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

  function render(container, state) {
    const allEntries = state.entries || [];
    const displayUnit = state.displayUnit;
    const filter = state.filter || 'all';

    const relevantEntries = filter === 'all' ? allEntries : allEntries.filter(function (e) { return e.lift === filter; });

    if (relevantEntries.length === 0) {
      const msg = filter === 'all'
        ? 'Log a few sets to see your estimated 1RM trend over time.'
        : 'No ' + App.Standards.LIFT_LABELS[filter] + ' history yet — log a set to start this trend line.';
      container.innerHTML =
        '<h2 class="section-title">Trend</h2>' +
        '<div class="empty-state"><p class="empty-hint">' + msg + '</p></div>';
      return;
    }

    const byLift = {};
    relevantEntries.forEach(function (e) {
      if (!byLift[e.lift]) byLift[e.lift] = [];
      byLift[e.lift].push({ date: new Date(e.date), value: App.Units.convert(e.estimated1RM, e.unit, displayUnit) });
    });
    Object.keys(byLift).forEach(function (lift) {
      byLift[lift].sort(function (a, b) { return a.date - b.date; });
    });

    let orderedLifts;
    let overflowNote = '';
    if (filter !== 'all') {
      orderedLifts = [filter];
    } else {
      orderedLifts = Object.keys(byLift).sort(function (a, b) {
        const lastA = byLift[a][byLift[a].length - 1].date;
        const lastB = byLift[b][byLift[b].length - 1].date;
        return lastB - lastA;
      });
      if (orderedLifts.length > 4) {
        overflowNote = 'Showing your 4 most recently logged exercises — filter above to view any exercise individually.';
        orderedLifts = orderedLifts.slice(0, 4);
      }
    }

    let allValues = [];
    let allDates = [];
    orderedLifts.forEach(function (lift) {
      byLift[lift].forEach(function (p) { allValues.push(p.value); allDates.push(p.date.getTime()); });
    });

    const xMin = Math.min.apply(null, allDates);
    const xMax = Math.max.apply(null, allDates);
    const rawMin = Math.min.apply(null, allValues);
    const rawMax = Math.max.apply(null, allValues);
    const valuePad = Math.max((rawMax - rawMin) * 0.15, rawMax * 0.05, 5);
    const yMin = Math.max(0, rawMin - valuePad);
    const yMax = rawMax + valuePad;

    const W = 600, H = 300;
    const marginLeft = 44, marginRight = 20, marginTop = 16, marginBottom = 30;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

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
        '<text x="' + (marginLeft - 8) + '" y="' + (y + 4) + '" class="chart-axis-label" text-anchor="end">' + Math.round(v) + '</text>'
      );
    }).join('');

    const xLabelHtml =
      '<text x="' + marginLeft + '" y="' + (H - 8) + '" class="chart-axis-label" text-anchor="start">' + formatShortDate(new Date(xMin)) + '</text>' +
      '<text x="' + (W - marginRight) + '" y="' + (H - 8) + '" class="chart-axis-label" text-anchor="end">' + formatShortDate(new Date(xMax)) + '</text>';

    const baselineHtml = '<line x1="' + marginLeft + '" y1="' + (marginTop + plotH) + '" x2="' + (W - marginRight) + '" y2="' + (marginTop + plotH) + '" class="chart-baseline" />';

    let seriesHtml = '';
    let legendHtml = '';

    orderedLifts.forEach(function (lift, idx) {
      const points = byLift[lift];
      const isPrimary = idx === 0;
      const style = isPrimary ? null : CONTEXT_STYLES[(idx - 1) % CONTEXT_STYLES.length];
      const colorVar = isPrimary ? '--accent' : style.colorVar;
      const dash = isPrimary ? null : style.dash;
      const strokeWidth = isPrimary ? 3 : 2;
      const liftLabel = App.Standards.LIFT_LABELS[lift];

      if (points.length > 1) {
        const d = points.map(function (p, i) { return (i === 0 ? 'M ' : 'L ') + xPos(p.date.getTime()) + ' ' + yPos(p.value); }).join(' ');
        seriesHtml += '<path d="' + d + '" class="chart-line" style="stroke:var(' + colorVar + ');stroke-width:' + strokeWidth + (dash ? ';stroke-dasharray:' + dash : '') + '" />';
      }

      points.forEach(function (p, i) {
        const cx = xPos(p.date.getTime());
        const cy = yPos(p.value);
        const isLast = i === points.length - 1;
        const r = isPrimary ? 5 : 4;
        seriesHtml +=
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="chart-dot" style="fill:var(' + colorVar + ')">' +
            '<title>' + liftLabel + ' — ' + formatShortDate(p.date) + ': ' + Math.round(p.value) + ' ' + displayUnit + '</title>' +
          '</circle>';
        if (isLast) {
          const labelY = cy - 10 - (idx % 2) * 14;
          const anchor = cx > W - marginRight - 70 ? 'end' : 'start';
          const labelX = anchor === 'end' ? cx - 8 : cx + 8;
          seriesHtml +=
            '<text x="' + labelX + '" y="' + labelY + '" text-anchor="' + anchor + '" class="chart-direct-label' + (isPrimary ? ' chart-direct-label--primary' : '') + '" style="fill:var(' + colorVar + ')">' +
              liftLabel + ' ' + Math.round(p.value) +
            '</text>';
        }
      });

      if (orderedLifts.length >= 2) {
        legendHtml +=
          '<span class="legend-item">' +
            '<svg class="legend-swatch" width="18" height="10" aria-hidden="true"><line x1="0" y1="5" x2="18" y2="5" stroke="var(' + colorVar + ')" stroke-width="' + strokeWidth + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' /></svg>' +
            liftLabel +
          '</span>';
      }
    });

    container.innerHTML =
      '<h2 class="section-title">Trend</h2>' +
      (legendHtml ? '<div class="chart-legend">' + legendHtml + '</div>' : '') +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="trend-chart" role="img" aria-label="Estimated 1RM over time by exercise">' +
        gridHtml + baselineHtml + seriesHtml + xLabelHtml +
      '</svg>' +
      (overflowNote ? '<p class="chart-note">' + overflowNote + '</p>' : '');
  }

  return { render };
})();
