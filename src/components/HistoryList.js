window.App = window.App || {};
App.Components = App.Components || {};

App.Components.HistoryList = (function () {
  function buildFilters() {
    const all = [{ value: 'all', label: 'All' }];
    const rest = App.ExerciseLibrary.categories().reduce(function (acc, group) {
      return acc.concat(group.lifts.map(function (l) { return { value: l, label: App.ExerciseLibrary.label(l) }; }));
    }, []);
    return all.concat(rest);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function detailLine(e) {
    if (e.addedWeight != null) {
      const addedPart = e.addedWeight > 0 ? ' + ' + e.addedWeight + ' ' + e.unit + ' added' : ' (bodyweight only)';
      return 'BW' + addedPart + ' &times; ' + e.reps + ' reps &bull; ' + formatDate(e.date);
    }
    return e.weight + ' ' + e.unit + ' &times; ' + e.reps + ' reps &bull; ' + formatDate(e.date);
  }

  function render(container, state) {
    const entries = state.entries || [];
    const filter = state.filter || 'all';
    const displayUnit = state.displayUnit;
    const onFilterChange = state.onFilterChange;
    const onDelete = state.onDelete;

    const filterHtml =
      '<div class="filter-row" role="tablist" aria-label="Filter history by exercise">' +
        buildFilters().map(function (f) {
          const active = f.value === filter ? ' filter-chip--active' : '';
          return '<button type="button" class="filter-chip' + active + '" data-filter="' + f.value + '">' + f.label + '</button>';
        }).join('') +
      '</div>';

    if (entries.length === 0) {
      container.innerHTML =
        '<h2 class="section-title">History</h2>' +
        '<div class="empty-state">' +
          '<p class="empty-hint">No sets logged yet. Log your first set on the 1 Rep Max page to start building your history.</p>' +
        '</div>';
      return;
    }

    const filtered = entries
      .filter(function (e) { return filter === 'all' || e.lift === filter; })
      .slice()
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    let listHtml;
    if (filtered.length === 0) {
      listHtml = '<div class="empty-state"><p class="empty-hint">No ' + App.ExerciseLibrary.label(filter) + ' sets logged yet.</p></div>';
    } else {
      listHtml =
        '<ul class="history-list">' +
          filtered.map(function (e) {
            const estDisplay = App.Units.round(App.Units.convert(e.estimated1RM, e.unit, displayUnit), 0);
            const liftLabel = App.ExerciseLibrary.label(e.lift);
            return (
              '<li class="history-item" data-id="' + e.id + '">' +
                '<div class="history-item-main">' +
                  '<p class="history-item-lift">' + liftLabel + '</p>' +
                  '<p class="history-item-detail">' + detailLine(e) + '</p>' +
                '</div>' +
                '<div class="history-item-side">' +
                  '<p class="history-item-est">' + estDisplay + ' ' + displayUnit + '</p>' +
                  '<button type="button" class="delete-btn" data-id="' + e.id + '" aria-label="Delete this entry">Delete</button>' +
                '</div>' +
              '</li>'
            );
          }).join('') +
        '</ul>';
    }

    container.innerHTML = '<h2 class="section-title">History</h2>' + filterHtml + listHtml;

    container.querySelectorAll('.filter-chip').forEach(function (btn) {
      btn.addEventListener('click', function () { onFilterChange(btn.dataset.filter); });
    });

    container.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.confirming === 'true') {
          onDelete(btn.dataset.id);
        } else {
          btn.dataset.confirming = 'true';
          btn.textContent = 'Confirm?';
          btn.classList.add('delete-btn--confirming');
          setTimeout(function () {
            btn.dataset.confirming = 'false';
            btn.textContent = 'Delete';
            btn.classList.remove('delete-btn--confirming');
          }, 3000);
        }
      });
    });
  }

  return { render, buildFilters };
})();
