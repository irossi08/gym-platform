window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.History = (function () {
  function render(container, opts) {
    const user = opts.user;
    const settings = App.Storage.getSettings(user.id);

    const state = {
      displayUnit: settings.displayUnit || 'kg',
      filter: 'all',
    };

    container.innerHTML =
      '<section class="page page-history">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">History</h1><div id="history-streak-badge"></div></div>' +
          '<div class="unit-toggle" id="unit-toggle" role="group" aria-label="Display unit">' +
            '<button type="button" class="unit-toggle-btn" data-unit="kg">kg</button>' +
            '<button type="button" class="unit-toggle-btn" data-unit="lb">lb</button>' +
          '</div>' +
        '</div>' +
        '<div id="history-quick-links"></div>' +
        '<div class="card" id="history-container"></div>' +
        '<div class="card" id="chart-container"></div>' +
      '</section>';

    const els = {
      history: container.querySelector('#history-container'),
      chart: container.querySelector('#chart-container'),
      unitToggle: container.querySelector('#unit-toggle'),
    };

    App.Components.StreakBadge.render(container.querySelector('#history-streak-badge'), user);
    App.Components.QuickLinks.render(container.querySelector('#history-quick-links'), user, 'history');

    function saveSettings() {
      App.Storage.saveSettings(user.id, Object.assign({}, App.Storage.getSettings(user.id), { displayUnit: state.displayUnit }));
    }

    function renderHistory() {
      const entries = App.Storage.getHistory(user.id);
      App.Components.HistoryList.render(els.history, {
        entries: entries,
        filter: state.filter,
        displayUnit: state.displayUnit,
        onFilterChange: function (f) { state.filter = f; renderHistory(); renderChart(); },
        onDelete: function (id) { App.Storage.deleteEntry(user.id, id); renderHistory(); renderChart(); },
      });
    }

    function renderChart() {
      const entries = App.Storage.getHistory(user.id);
      App.Components.TrendChart.render(els.chart, { entries: entries, displayUnit: state.displayUnit, filter: state.filter });
    }

    function wireUnitToggle() {
      const buttons = els.unitToggle.querySelectorAll('.unit-toggle-btn');
      function refresh() {
        buttons.forEach(function (btn) {
          btn.classList.toggle('unit-toggle-btn--active', btn.dataset.unit === state.displayUnit);
        });
      }
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.dataset.unit === state.displayUnit) return;
          state.displayUnit = btn.dataset.unit;
          saveSettings();
          refresh();
          renderHistory();
          renderChart();
        });
      });
      refresh();
    }

    wireUnitToggle();
    renderHistory();
    renderChart();
  }

  return { render };
})();
