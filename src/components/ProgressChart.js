window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Home's 1RM progress chart: unlike TrendChart (History's, capped to 4
 * most-recent exercises, identity carried by an emphasis line-style
 * pattern), this one supports an unbounded number of simultaneous lines,
 * so identity is carried by a distinct color per exercise instead -- a
 * deliberate, scoped exception to the app's black/green theme, since a
 * single accent color can't distinguish an open-ended set of series.
 *
 * Also owns a time-range selector and a searchable, clickable-to-toggle
 * legend. Search and legend-toggle both redraw only the chart SVG (and
 * flip `hidden` on existing legend buttons) rather than rebuilding the
 * whole component, so typing in the search box never rebuilds the input
 * element itself and can't lose focus mid-keystroke. Only the range
 * <select> triggers a full rebuild, since a single 'change' event -- not
 * continuous typing -- can't suffer that problem.
 */
App.Components.ProgressChart = (function () {
  const RANGE_OPTIONS = [
    { value: 'month', label: 'Last Month', months: 1 },
    { value: '3months', label: 'Last 3 Months', months: 3 },
    { value: '6months', label: 'Last 6 Months', months: 6 },
    { value: 'year', label: 'Last Year', months: 12 },
  ];

  const LIFT_ORDER = App.Standards.CATEGORIES.reduce(function (acc, g) { return acc.concat(g.lifts); }, []);

  // Hues spread evenly around the wheel by fixed index (not by how many
  // lifts happen to have data), so a given exercise always gets the same
  // color regardless of which others are active or filtered out.
  function colorForLift(lift) {
    const idx = LIFT_ORDER.indexOf(lift);
    const hue = ((idx >= 0 ? idx : 0) * (360 / LIFT_ORDER.length)) % 360;
    return 'hsl(' + hue.toFixed(1) + ', 70%, 58%)';
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

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

  function buildChartSvg(visibleLifts, byLift, displayUnit, rangeStart, rangeEnd) {
    const W = 600, H = 340;
    const marginLeft = 42, marginRight = 16, marginTop = 12, marginBottom = 26;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

    let allValues = [];
    visibleLifts.forEach(function (lift) {
      byLift[lift].forEach(function (p) { allValues.push(p.value); });
    });

    // The x-axis always spans the selected time range (today minus the
    // chosen window through today), not just the span of actual data
    // points -- otherwise the axis labels wouldn't match the range picker.
    const xMin = rangeStart.getTime();
    const xMax = rangeEnd.getTime();
    const rawMin = Math.min.apply(null, allValues);
    const rawMax = Math.max.apply(null, allValues);
    const pad = Math.max((rawMax - rawMin) * 0.15, rawMax * 0.05, 5);
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
        '<text x="' + (marginLeft - 8) + '" y="' + (y + 4) + '" class="chart-axis-label" text-anchor="end">' + Math.round(v) + '</text>'
      );
    }).join('');

    const xLabelHtml =
      '<text x="' + marginLeft + '" y="' + (H - 6) + '" class="chart-axis-label progress-chart-xlabel" text-anchor="start">' + formatShortDate(new Date(xMin)) + '</text>' +
      '<text x="' + (W - marginRight) + '" y="' + (H - 6) + '" class="chart-axis-label progress-chart-xlabel" text-anchor="end">' + formatShortDate(new Date(xMax)) + '</text>';

    const baselineHtml = '<line x1="' + marginLeft + '" y1="' + (marginTop + plotH) + '" x2="' + (W - marginRight) + '" y2="' + (marginTop + plotH) + '" class="chart-baseline" />';

    let seriesHtml = '';
    visibleLifts.forEach(function (lift) {
      const points = byLift[lift];
      const color = colorForLift(lift);
      const label = App.Standards.LIFT_LABELS[lift];

      if (points.length > 1) {
        const d = points.map(function (p, i) { return (i === 0 ? 'M ' : 'L ') + xPos(p.date.getTime()) + ' ' + yPos(p.value); }).join(' ');
        seriesHtml += '<path d="' + d + '" class="progress-chart-line" style="stroke:' + color + '" />';
      }
      points.forEach(function (p) {
        const cx = xPos(p.date.getTime());
        const cy = yPos(p.value);
        seriesHtml +=
          '<circle cx="' + cx + '" cy="' + cy + '" r="4" class="progress-chart-dot" style="fill:' + color + '">' +
            '<title>' + label + ' — ' + formatShortDate(p.date) + ': ' + Math.round(p.value) + ' ' + displayUnit + '</title>' +
          '</circle>';
      });
    });

    return (
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="progress-chart-svg" role="img" aria-label="Estimated 1RM over time">' +
        gridHtml + baselineHtml + seriesHtml + xLabelHtml +
      '</svg>'
    );
  }

  function render(container, opts) {
    const allEntries = opts.entries || [];
    const displayUnit = opts.displayUnit;

    // Per-mount state stashed on the container itself so it survives the
    // range-select's full rebuild without the caller needing to own it.
    const state = container.__progressChartState || { range: 'month', search: '', hiddenLifts: {} };
    container.__progressChartState = state;

    const rangeCfg = RANGE_OPTIONS.filter(function (r) { return r.value === state.range; })[0] || RANGE_OPTIONS[0];
    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - rangeCfg.months);

    const entries = allEntries.filter(function (e) { return new Date(e.date) >= cutoff; });

    const byLift = {};
    entries.forEach(function (e) {
      if (!byLift[e.lift]) byLift[e.lift] = [];
      byLift[e.lift].push({ date: new Date(e.date), value: App.Units.convert(e.estimated1RM, e.unit, displayUnit) });
    });
    Object.keys(byLift).forEach(function (lift) {
      byLift[lift].sort(function (a, b) { return a.date - b.date; });
    });

    const allLifts = Object.keys(byLift).sort(function (a, b) {
      return byLift[b][byLift[b].length - 1].date - byLift[a][byLift[a].length - 1].date;
    });

    if (allEntries.length === 0) {
      container.innerHTML = '<p class="empty-hint">No sets logged yet.</p>';
      return;
    }

    const rangeSelectHtml =
      '<select class="progress-range-select">' +
        RANGE_OPTIONS.map(function (r) {
          return '<option value="' + r.value + '"' + (r.value === state.range ? ' selected' : '') + '>' + r.label + '</option>';
        }).join('') +
      '</select>';

    const searchHtml = '<input type="text" class="progress-search-input" placeholder="Search exercises…" value="' + escapeAttr(state.search) + '" />';

    // Search is the primary way to find one exercise among all 22; the key
    // itself is capped to a short scrollable strip rather than a big grid so
    // it doesn't dominate the card.
    const legendHtml = allLifts.length === 0 ? '' :
      '<div class="progress-legend-scroll"><div class="progress-legend">' +
        allLifts.map(function (lift) {
          const hidden = !!state.hiddenLifts[lift];
          return (
            '<button type="button" class="progress-legend-item' + (hidden ? ' progress-legend-item--hidden' : '') + '" data-lift="' + lift + '">' +
              '<span class="progress-legend-swatch" style="background:' + colorForLift(lift) + '"></span>' +
              App.Standards.LIFT_LABELS[lift] +
            '</button>'
          );
        }).join('') +
      '</div></div>';

    container.innerHTML =
      '<div class="progress-controls">' + rangeSelectHtml + searchHtml + '</div>' +
      legendHtml +
      '<div class="progress-chart-wrap"></div>';

    const chartWrapEl = container.querySelector('.progress-chart-wrap');
    const legendButtons = Array.prototype.slice.call(container.querySelectorAll('.progress-legend-item'));

    function visibleLiftsNow() {
      const searchLower = state.search.trim().toLowerCase();
      return allLifts.filter(function (lift) {
        const matches = !searchLower || App.Standards.LIFT_LABELS[lift].toLowerCase().indexOf(searchLower) !== -1;
        return matches && !state.hiddenLifts[lift];
      });
    }

    function redrawChart() {
      if (allLifts.length === 0) {
        chartWrapEl.innerHTML = '<p class="empty-hint">No sets logged in this time range.</p>';
        return;
      }
      const visible = visibleLiftsNow();
      chartWrapEl.innerHTML = visible.length === 0
        ? '<p class="empty-hint">No exercises match — adjust your search or the key above.</p>'
        : buildChartSvg(visible, byLift, displayUnit, cutoff, now);
    }

    function applySearchToLegend() {
      const searchLower = state.search.trim().toLowerCase();
      legendButtons.forEach(function (btn) {
        const lift = btn.dataset.lift;
        const matches = !searchLower || App.Standards.LIFT_LABELS[lift].toLowerCase().indexOf(searchLower) !== -1;
        btn.hidden = !matches;
      });
    }

    container.querySelector('.progress-range-select').addEventListener('change', function (e) {
      state.range = e.target.value;
      render(container, opts);
    });

    const searchInput = container.querySelector('.progress-search-input');
    searchInput.addEventListener('input', function (e) {
      state.search = e.target.value;
      applySearchToLegend();
      redrawChart();
    });

    legendButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const lift = btn.dataset.lift;
        state.hiddenLifts[lift] = !state.hiddenLifts[lift];
        btn.classList.toggle('progress-legend-item--hidden', state.hiddenLifts[lift]);
        redrawChart();
      });
    });

    applySearchToLegend();
    redrawChart();
  }

  return { render };
})();
