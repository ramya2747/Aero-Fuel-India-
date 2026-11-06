// AERO // FUEL INDIA - Main Application Coordinator

(function(window) {
  'use strict';

  var parsedCsvState = null;

  var App = {
    init: function() {
      this.cacheDom();
      this.bindNavigation();
      this.bindActions();

      // Automatically load demo records on first visit if storage is empty
      var initialized = false;
      try {
        initialized = localStorage.getItem('aero_fuel_initialized_v1');
      } catch (e) {}

      if (!initialized) {
        if (window.AeroStorage.getAll().length === 0) {
          window.AeroStorage.loadSampleData();
        }
        try {
          localStorage.setItem('aero_fuel_initialized_v1', 'true');
        } catch (e) {}
      }

      this.initModules();
      this.refresh();
    },

    cacheDom: function() {
      // Metric KPI cards
      this.kpiTotalLitres = document.getElementById('kpi-total-litres');
      this.kpiTotalSpend = document.getElementById('kpi-total-spend');
      this.kpiAvgPrice = document.getElementById('kpi-avg-price');
      this.kpiTotalCount = document.getElementById('kpi-total-count');

      // Summary containers
      this.monthlySummaryBody = document.getElementById('monthly-summary-body');
      this.fuelSummaryBody = document.getElementById('fuel-summary-body');
      this.citySummaryBody = document.getElementById('city-summary-body');

      // Top action buttons
      this.btnAddRecord = document.getElementById('btn-add-record');
      this.btnLoadSample = document.getElementById('btn-load-sample');
      this.btnClearData = document.getElementById('btn-clear-data');
      this.btnExportCsv = document.getElementById('btn-export-csv');
      this.btnExportJson = document.getElementById('btn-export-json');
      this.btnOpenImportModal = document.getElementById('btn-open-import-modal');

      // CSV Import modal elements
      this.csvModal = document.getElementById('csv-modal');
      this.csvFileInput = document.getElementById('csv-file-input');
      this.csvDropzone = document.getElementById('csv-dropzone');
      this.csvPreviewArea = document.getElementById('csv-preview-area');
      this.csvSummaryText = document.getElementById('csv-summary-text');
      this.csvPreviewTableBody = document.getElementById('csv-preview-table-body');
      this.btnCommitCsv = document.getElementById('btn-commit-csv');
      this.btnCancelCsv = document.getElementById('btn-cancel-csv');
      this.csvModalCloseBtn = document.getElementById('csv-modal-close-btn');

      // JSON Restore elements
      this.jsonRestoreInput = document.getElementById('json-restore-input');

      // Map metric toggle buttons
      this.btnMapMetricSpend = document.getElementById('btn-map-spend');
      this.btnMapMetricLitres = document.getElementById('btn-map-litres');

      // Launch checklist modal
      this.launchChecklistModal = document.getElementById('checklist-modal');
      this.btnOpenChecklist = document.getElementById('btn-open-checklist');
      this.btnCloseChecklist = document.getElementById('btn-close-checklist');

      // Toast notification container
      this.toastContainer = document.getElementById('toast-container');
    },

    bindNavigation: function() {
      var tabButtons = document.querySelectorAll('[data-tab-target]');
      var tabPanels = document.querySelectorAll('.tab-panel');

      tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var targetId = btn.getAttribute('data-tab-target');

          tabButtons.forEach(function(b) { b.classList.remove('active'); });
          tabPanels.forEach(function(p) { p.classList.add('hidden'); });

          btn.classList.add('active');
          var targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            targetPanel.classList.remove('hidden');
          }

          if (targetId === 'tab-map' && window.AeroMap) {
            var records = window.AeroRecords ? window.AeroRecords.getFilteredRecords() : [];
            window.AeroMap.render(records);
          }
        });
      });
    },

    bindActions: function() {
      var self = this;

      if (this.btnAddRecord) {
        this.btnAddRecord.addEventListener('click', function() {
          window.AeroRecords.openAddModal();
        });
      }

      if (this.btnLoadSample) {
        this.btnLoadSample.addEventListener('click', function() {
          self.loadSampleData();
        });
      }

      if (this.btnClearData) {
        this.btnClearData.addEventListener('click', function() {
          var records = window.AeroStorage.getAll();
          if (records.length === 0) {
            self.showToast('No fuel records to clear.', 'info');
            return;
          }
          var confirmed = window.confirm('Are you sure you want to delete all ' + records.length + ' stored fuel records? This action cannot be undone unless you have a JSON backup.');
          if (confirmed) {
            window.AeroStorage.clearAll();
            self.refresh();
            self.showToast('All fuel records have been cleared from local storage.', 'info');
          }
        });
      }

      // Export CSV
      if (this.btnExportCsv) {
        this.btnExportCsv.addEventListener('click', function() {
          var records = window.AeroRecords.getFilteredRecords();
          if (records.length === 0) {
            self.showToast('No records available to export.', 'error');
            return;
          }
          var csvString = window.AeroCSV.generateCSV(records);
          var today = new Date().toISOString().substring(0, 10);
          window.AeroCSV.downloadFile('aero-fuel-india-' + today + '.csv', csvString, 'text/csv');
          self.showToast('Exported ' + records.length + ' records to CSV.', 'success');
        });
      }

      // Export JSON Backup
      if (this.btnExportJson) {
        this.btnExportJson.addEventListener('click', function() {
          var jsonString = window.AeroStorage.exportJsonBackup();
          var today = new Date().toISOString().substring(0, 10);
          window.AeroCSV.downloadFile('aero-fuel-backup-' + today + '.json', jsonString, 'application/json');
          self.showToast('JSON backup exported successfully.', 'success');
        });
      }

      // JSON Restore
      if (this.jsonRestoreInput) {
        this.jsonRestoreInput.addEventListener('change', function(e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;

          var reader = new FileReader();
          reader.onload = function(event) {
            var content = event.target.result;
            var mode = window.confirm('Click OK to replace all current records, or Cancel to merge incoming records with existing records.') ? 'replace' : 'merge';
            var result = window.AeroStorage.restoreJsonBackup(content, mode);

            if (result.success) {
              self.refresh();
              self.showToast('Restored ' + result.restoredCount + ' records from backup. Total records: ' + result.totalStored + '.', 'success');
            } else {
              self.showToast('Restore failed: ' + (result.errors || []).join(' '), 'error');
            }
            self.jsonRestoreInput.value = '';
          };
          reader.readAsText(file);
        });
      }

      // CSV Import modal triggers
      if (this.btnOpenImportModal) {
        this.btnOpenImportModal.addEventListener('click', function() {
          self.openCsvModal();
        });
      }

      if (this.csvModalCloseBtn) {
        this.csvModalCloseBtn.addEventListener('click', function() {
          self.closeCsvModal();
        });
      }

      if (this.btnCancelCsv) {
        this.btnCancelCsv.addEventListener('click', function() {
          self.closeCsvModal();
        });
      }

      // File drag-and-drop
      if (this.csvDropzone) {
        this.csvDropzone.addEventListener('dragover', function(e) {
          e.preventDefault();
          self.csvDropzone.classList.add('drag-active');
        });
        this.csvDropzone.addEventListener('dragleave', function() {
          self.csvDropzone.classList.remove('drag-active');
        });
        this.csvDropzone.addEventListener('drop', function(e) {
          e.preventDefault();
          self.csvDropzone.classList.remove('drag-active');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            self.processSelectedCsvFile(e.dataTransfer.files[0]);
          }
        });
      }

      if (this.csvFileInput) {
        this.csvFileInput.addEventListener('change', function(e) {
          if (e.target.files && e.target.files[0]) {
            self.processSelectedCsvFile(e.target.files[0]);
          }
        });
      }

      if (this.btnCommitCsv) {
        this.btnCommitCsv.addEventListener('click', function() {
          if (!parsedCsvState) return;
          var commit = window.AeroCSV.commitValidRows(parsedCsvState);
          if (commit.success) {
            self.closeCsvModal();
            self.refresh();
            self.showToast('Successfully imported ' + commit.count + ' valid fuel records.', 'success');
          } else {
            self.showToast('Failed to commit records: ' + (commit.error || 'Unknown error'), 'error');
          }
        });
      }

      // Map metric toggles
      if (this.btnMapMetricSpend) {
        this.btnMapMetricSpend.addEventListener('click', function() {
          self.btnMapMetricSpend.classList.add('active');
          if (self.btnMapMetricLitres) self.btnMapMetricLitres.classList.remove('active');
          var records = window.AeroRecords.getFilteredRecords();
          window.AeroMap.setMetric('spend', records);
        });
      }

      if (this.btnMapMetricLitres) {
        this.btnMapMetricLitres.addEventListener('click', function() {
          self.btnMapMetricLitres.classList.add('active');
          if (self.btnMapMetricSpend) self.btnMapMetricSpend.classList.remove('active');
          var records = window.AeroRecords.getFilteredRecords();
          window.AeroMap.setMetric('litres', records);
        });
      }

      // Launch checklist modal handlers
      if (this.btnOpenChecklist) {
        this.btnOpenChecklist.addEventListener('click', function() {
          if (self.launchChecklistModal) self.launchChecklistModal.classList.remove('hidden');
        });
      }

      if (this.btnCloseChecklist) {
        this.btnCloseChecklist.addEventListener('click', function() {
          if (self.launchChecklistModal) self.launchChecklistModal.classList.add('hidden');
        });
      }
    },

    initModules: function() {
      if (window.AeroAuth && typeof window.AeroAuth.init === 'function') {
        window.AeroAuth.init();
      }
      window.AeroRecords.init();
      var filtered = window.AeroRecords.getFilteredRecords();
      window.AeroMap.init('india-map-container', filtered);
    },

    loadSampleData: function() {
      var result = window.AeroStorage.loadSampleData();
      if (result.success) {
        this.refresh();
        this.showToast('Loaded ' + result.count + ' demonstration records successfully.', 'success');
      } else {
        this.showToast('Failed to load sample dataset: ' + (result.errors || []).join(' '), 'error');
      }
    },

    refresh: function() {
      window.AeroRecords.load();
    },

    refreshViews: function(filteredRecords, allRecords) {
      this.updateKpis(filteredRecords);
      this.updateSummaries(filteredRecords);
      window.AeroMap.render(filteredRecords);
    },

    updateKpis: function(records) {
      var totals = window.AeroAnalytics.computeTotals(records);

      if (this.kpiTotalLitres) {
        this.kpiTotalLitres.textContent = totals.totalLitres.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
      }
      if (this.kpiTotalSpend) {
        this.kpiTotalSpend.textContent = '₹' + totals.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (this.kpiAvgPrice) {
        this.kpiAvgPrice.textContent = '₹' + totals.avgPricePerLitre.toFixed(2) + ' / L';
      }
      if (this.kpiTotalCount) {
        this.kpiTotalCount.textContent = totals.count + ' fill-ups';
      }
    },

    updateSummaries: function(records) {
      this.renderMonthlySummary(records);
      this.renderFuelSummary(records);
      this.renderCitySummary(records);
    },

    renderMonthlySummary: function(records) {
      if (!this.monthlySummaryBody) return;

      var monthly = window.AeroAnalytics.byMonth(records);
      if (monthly.length === 0) {
        this.monthlySummaryBody.innerHTML = '<tr><td colspan="5" class="table-empty">No monthly data available.</td></tr>';
        return;
      }

      var html = '';
      monthly.forEach(function(m) {
        html += '<tr>' +
          '<td class="font-mono font-bold">' + escapeHtml(m.monthKey) + '</td>' +
          '<td class="text-right">' + m.count + '</td>' +
          '<td class="text-right font-mono">' + m.litres.toFixed(2) + ' L</td>' +
          '<td class="text-right font-mono">₹' + m.spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
          '<td class="text-right font-mono">₹' + m.avgRate.toFixed(2) + '</td>' +
          '</tr>';
      });

      this.monthlySummaryBody.innerHTML = html;
    },

    renderFuelSummary: function(records) {
      if (!this.fuelSummaryBody) return;

      var fuels = window.AeroAnalytics.byFuelType(records);
      if (fuels.length === 0) {
        this.fuelSummaryBody.innerHTML = '<tr><td colspan="6" class="table-empty">No fuel type records available.</td></tr>';
        return;
      }

      var html = '';
      fuels.forEach(function(f) {
        html += '<tr>' +
          '<td><span class="badge badge-fuel badge-' + escapeHtml(f.fuelType.toLowerCase().replace(/[^a-z]/g, '')) + '">' + escapeHtml(f.fuelType) + '</span></td>' +
          '<td class="text-right">' + f.count + '</td>' +
          '<td class="text-right font-mono">' + f.litres.toFixed(2) + ' L (' + f.volumeShare + '%)</td>' +
          '<td class="text-right font-mono">₹' + f.spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' (' + f.spendShare + '%)</td>' +
          '<td class="text-right font-mono">₹' + f.avgRate.toFixed(2) + '</td>' +
          '<td class="progress-col"><div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + f.spendShare + '%;"></div></div></td>' +
          '</tr>';
      });

      this.fuelSummaryBody.innerHTML = html;
    },

    renderCitySummary: function(records) {
      if (!this.citySummaryBody) return;

      var cities = window.AeroAnalytics.byCity(records);
      if (cities.length === 0) {
        this.citySummaryBody.innerHTML = '<tr><td colspan="6" class="table-empty">No city records available.</td></tr>';
        return;
      }

      var html = '';
      var topCities = cities.slice(0, 12);
      topCities.forEach(function(c, idx) {
        html += '<tr>' +
          '<td><strong>' + (idx + 1) + '</strong></td>' +
          '<td><strong>' + escapeHtml(c.city) + '</strong></td>' +
          '<td>' + escapeHtml(c.state) + '</td>' +
          '<td class="text-right">' + c.count + '</td>' +
          '<td class="text-right font-mono">' + c.litres.toFixed(2) + ' L</td>' +
          '<td class="text-right font-mono">₹' + c.spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
          '</tr>';
      });

      this.citySummaryBody.innerHTML = html;
    },

    openCsvModal: function() {
      parsedCsvState = null;
      if (this.csvFileInput) this.csvFileInput.value = '';
      if (this.csvPreviewArea) this.csvPreviewArea.classList.add('hidden');
      if (this.btnCommitCsv) this.btnCommitCsv.disabled = true;
      if (this.csvModal) this.csvModal.classList.remove('hidden');
    },

    closeCsvModal: function() {
      if (this.csvModal) this.csvModal.classList.add('hidden');
      parsedCsvState = null;
    },

    processSelectedCsvFile: function(file) {
      var self = this;
      if (!file.name.toLowerCase().endsWith('.csv')) {
        self.showToast('Please select a valid .csv file.', 'error');
        return;
      }

      var reader = new FileReader();
      reader.onload = function(e) {
        var content = e.target.result;
        var parsed = window.AeroCSV.parseAndValidate(content);

        if (!parsed.success) {
          self.showToast('CSV Error: ' + parsed.error, 'error');
          return;
        }

        parsedCsvState = parsed;
        self.renderCsvPreview(parsed);
      };
      reader.readAsText(file);
    },

    renderCsvPreview: function(parsed) {
      if (!this.csvPreviewArea) return;

      this.csvPreviewArea.classList.remove('hidden');
      this.csvSummaryText.innerHTML = 'Analyzed <strong>' + parsed.totalRows + ' rows</strong>. Found <strong class="text-success">' + parsed.validCount + ' valid rows</strong> and <strong class="text-danger">' + parsed.invalidCount + ' invalid rows</strong>.';

      if (this.btnCommitCsv) {
        this.btnCommitCsv.disabled = (parsed.validCount === 0);
        this.btnCommitCsv.textContent = 'Import ' + parsed.validCount + ' Valid Rows';
      }

      var html = '';
      var previewSample = parsed.rows.slice(0, 50);

      previewSample.forEach(function(row) {
        var statusBadge = row.isValid
          ? '<span class="badge badge-success">Valid</span>'
          : '<span class="badge badge-danger">Invalid</span>';

        var issues = row.isValid ? '-' : row.errors.join('; ');
        var rec = row.record || {};

        html += '<tr class="' + (row.isValid ? 'row-valid' : 'row-invalid') + '">' +
          '<td>' + row.rowNumber + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td class="font-mono text-nowrap">' + escapeHtml(rec.date || '') + '</td>' +
          '<td>' + escapeHtml(rec.city || '') + ', ' + escapeHtml(rec.state || '') + '</td>' +
          '<td>' + escapeHtml(rec.vehicleType || '') + '</td>' +
          '<td>' + escapeHtml(rec.fuelType || '') + '</td>' +
          '<td class="text-right font-mono">' + (rec.litres ? rec.litres.toFixed(2) : '-') + '</td>' +
          '<td class="text-right font-mono">' + (rec.pricePerLitre ? rec.pricePerLitre.toFixed(2) : '-') + '</td>' +
          '<td class="text-danger small">' + escapeHtml(issues) + '</td>' +
          '</tr>';
      });

      if (parsed.rows.length > 50) {
        html += '<tr><td colspan="9" class="table-empty">Showing first 50 rows of ' + parsed.rows.length + ' total rows.</td></tr>';
      }

      this.csvPreviewTableBody.innerHTML = html;
    },

    showToast: function(message, type) {
      type = type || 'info';
      if (!this.toastContainer) return;

      var toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.textContent = message;

      this.toastContainer.appendChild(toast);

      setTimeout(function() {
        toast.classList.add('show');
      }, 10);

      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 4000);
    }
  };

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.AeroApp = App;

  document.addEventListener('DOMContentLoaded', function() {
    window.AeroApp.init();
  });
})(window);

