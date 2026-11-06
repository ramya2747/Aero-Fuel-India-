// AERO // FUEL INDIA - Records Management, Filtering, and Form Controller

(function(window) {
  'use strict';

  var currentRecords = [];
  var filteredRecords = [];
  var currentPage = 1;
  var pageSize = 15;
  var editingRecordId = null;
  var cloudLoadError = null;

  var currentFilters = {
    dateFrom: '',
    dateTo: '',
    state: '',
    city: '',
    fuelType: ''
  };

  var RecordsManager = {
    init: function() {
      this.cacheDom();
      this.populateDropdowns();
      this.bindEvents();
      this.load();
    },

    cacheDom: function() {
      this.tableBody = document.getElementById('records-table-body');
      this.tableCount = document.getElementById('records-count');
      this.paginationContainer = document.getElementById('table-pagination');

      // Filters
      this.filterDateFrom = document.getElementById('filter-date-from');
      this.filterDateTo = document.getElementById('filter-date-to');
      this.filterState = document.getElementById('filter-state');
      this.filterCity = document.getElementById('filter-city');
      this.filterCityList = document.getElementById('filter-city-list');
      this.filterFuel = document.getElementById('filter-fuel');
      this.filterResetBtn = document.getElementById('filter-reset-btn');

      // Modal elements
      this.recordModal = document.getElementById('record-modal');
      this.modalTitle = document.getElementById('modal-title');
      this.recordForm = document.getElementById('record-form');
      this.modalCloseBtn = document.getElementById('modal-close-btn');
      this.modalCancelBtn = document.getElementById('modal-cancel-btn');
      this.modalSubmitBtn = document.getElementById('modal-submit-btn');

      // Form inputs
      this.inputDate = document.getElementById('record-date');
      this.inputState = document.getElementById('record-state');
      this.inputCity = document.getElementById('record-city');
      this.recordCityList = document.getElementById('record-city-list');
      this.inputVehicle = document.getElementById('record-vehicle');
      this.inputFuel = document.getElementById('record-fuel');
      this.inputLitres = document.getElementById('record-litres');
      this.inputPrice = document.getElementById('record-price');
      this.inputTotal = document.getElementById('record-total');
      this.inputNotes = document.getElementById('record-notes');
      this.formErrors = document.getElementById('record-form-errors');
    },

    populateCityOptions: function(datalistEl, inputEl, stateName) {
      if (!datalistEl) return;
      var cities = window.AeroStorage.getCitiesForState(stateName);
      var html = '';
      cities.forEach(function(cityName) {
        html += '<option value="' + escapeHtml(cityName) + '">';
      });
      datalistEl.innerHTML = html;

      if (inputEl) {
        if (stateName) {
          inputEl.placeholder = 'Select or type city in ' + stateName;
        } else {
          inputEl.placeholder = 'Select or type city';
        }
      }
    },

    populateDropdowns: function() {
      var self = this;

      // Populate States in filter and modal
      var states = window.AeroStorage.INDIAN_STATES;

      if (this.filterState) {
        this.filterState.innerHTML = '<option value="">All States / UTs</option>';
        states.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          self.filterState.appendChild(opt);
        });
      }

      if (this.inputState) {
        this.inputState.innerHTML = '<option value="">Select Indian State</option>';
        states.forEach(function(s) {
          var opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          self.inputState.appendChild(opt);
        });
      }

      // Populate City Datalists with default major cities
      this.populateCityOptions(this.filterCityList, this.filterCity, '');
      this.populateCityOptions(this.recordCityList, this.inputCity, '');

      // Populate Vehicle Types
      var vehicles = window.AeroStorage.VALID_VEHICLES;
      if (this.inputVehicle) {
        this.inputVehicle.innerHTML = '<option value="">Select Vehicle Category</option>';
        vehicles.forEach(function(v) {
          var opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          self.inputVehicle.appendChild(opt);
        });
      }

      // Populate Fuel Types
      var fuels = window.AeroStorage.VALID_FUELS;
      if (this.filterFuel) {
        this.filterFuel.innerHTML = '<option value="">All Fuel Types</option>';
        fuels.forEach(function(f) {
          var opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          self.filterFuel.appendChild(opt);
        });
      }

      if (this.inputFuel) {
        this.inputFuel.innerHTML = '<option value="">Select Fuel Type</option>';
        fuels.forEach(function(f) {
          var opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          self.inputFuel.appendChild(opt);
        });
      }
    },

    bindEvents: function() {
      var self = this;

      // Filter events
      if (this.filterDateFrom) this.filterDateFrom.addEventListener('change', function() { self.applyFilters(); });
      if (this.filterDateTo) this.filterDateTo.addEventListener('change', function() { self.applyFilters(); });
      if (this.filterState) {
        this.filterState.addEventListener('change', function() {
          self.populateCityOptions(self.filterCityList, self.filterCity, self.filterState.value);
          self.applyFilters();
        });
      }
      if (this.filterCity) this.filterCity.addEventListener('input', function() { self.applyFilters(); });
      if (this.filterFuel) this.filterFuel.addEventListener('change', function() { self.applyFilters(); });

      // Modal State dropdown changes -> dynamically populate City datalist
      if (this.inputState) {
        this.inputState.addEventListener('change', function() {
          var selectedState = self.inputState.value;
          self.populateCityOptions(self.recordCityList, self.inputCity, selectedState);
          if (self.inputCity && !editingRecordId) {
            self.inputCity.value = '';
          }
        });
      }

      if (this.filterResetBtn) {
        this.filterResetBtn.addEventListener('click', function() {
          self.resetFilters();
        });
      }

      // Live calculation in record form
      var updateCalculatedTotal = function() {
        var litres = parseFloat(self.inputLitres.value) || 0;
        var price = parseFloat(self.inputPrice.value) || 0;
        var total = litres * price;
        self.inputTotal.value = total > 0 ? total.toFixed(2) : '0.00';
      };

      if (this.inputLitres) {
        this.inputLitres.addEventListener('input', updateCalculatedTotal);
      }
      if (this.inputPrice) {
        this.inputPrice.addEventListener('input', updateCalculatedTotal);
      }

      // Modal form submit
      if (this.recordForm) {
        this.recordForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self.handleFormSubmit();
        });
      }

      // Modal close buttons
      if (this.modalCloseBtn) {
        this.modalCloseBtn.addEventListener('click', function() { self.closeModal(); });
      }
      if (this.modalCancelBtn) {
        this.modalCancelBtn.addEventListener('click', function() { self.closeModal(); });
      }

      // Modal backdrop click
      if (this.recordModal) {
        this.recordModal.addEventListener('click', function(e) {
          if (e.target === self.recordModal) {
            self.closeModal();
          }
        });
      }

      // Keyboard Esc key to close modal
      window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && self.recordModal && !self.recordModal.classList.contains('hidden')) {
          self.closeModal();
        }
      });
    },

    load: function(onComplete) {
      var self = this;
      window.AeroStorage.loadAll(function(records, status) {
        if (status && status.error) {
          cloudLoadError = status.error;
          currentRecords = [];
          filteredRecords = [];
          if (window.AeroApp && typeof window.AeroApp.showToast === 'function') {
            window.AeroApp.showToast('Could not load cloud records: ' + status.error, 'danger');
          }
        } else {
          cloudLoadError = null;
          currentRecords = records || [];
        }
        self.applyFilters();
        if (typeof onComplete === 'function') onComplete(currentRecords, status);
      });
    },

    applyFilters: function() {
      currentFilters.dateFrom = this.filterDateFrom ? this.filterDateFrom.value.trim() : '';
      currentFilters.dateTo = this.filterDateTo ? this.filterDateTo.value.trim() : '';
      currentFilters.state = this.filterState ? this.filterState.value.trim() : '';
      currentFilters.city = this.filterCity ? this.filterCity.value.trim().toLowerCase() : '';
      currentFilters.fuelType = this.filterFuel ? this.filterFuel.value.trim() : '';

      filteredRecords = currentRecords.filter(function(r) {
        if (currentFilters.dateFrom && r.date < currentFilters.dateFrom) return false;
        if (currentFilters.dateTo && r.date > currentFilters.dateTo) return false;
        if (currentFilters.state && r.state !== currentFilters.state) return false;
        if (currentFilters.fuelType && r.fuelType !== currentFilters.fuelType) return false;
        if (currentFilters.city) {
          var cityNorm = (r.city || '').toLowerCase();
          if (cityNorm.indexOf(currentFilters.city) === -1) return false;
        }
        return true;
      });

      currentPage = 1;
      this.render();

      // Trigger app level updates (analytics, summaries, map)
      if (window.AeroApp && typeof window.AeroApp.refreshViews === 'function') {
        window.AeroApp.refreshViews(filteredRecords, currentRecords);
      }
    },

    resetFilters: function() {
      if (this.filterDateFrom) this.filterDateFrom.value = '';
      if (this.filterDateTo) this.filterDateTo.value = '';
      if (this.filterState) this.filterState.value = '';
      if (this.filterCity) this.filterCity.value = '';
      if (this.filterFuel) this.filterFuel.value = '';

      this.populateCityOptions(this.filterCityList, this.filterCity, '');
      this.applyFilters();
    },

    filterByState: function(stateName) {
      if (this.filterState) {
        this.filterState.value = stateName;
        this.populateCityOptions(this.filterCityList, this.filterCity, stateName);
      }
      this.applyFilters();

      // Switch to records log view or scroll table into view
      var recordsTabBtn = document.querySelector('[data-tab-target="tab-records"]');
      if (recordsTabBtn) {
        recordsTabBtn.click();
      }
      var recordsSection = document.getElementById('records-section');
      if (recordsSection) {
        recordsSection.scrollIntoView({ behavior: 'smooth' });
      }
    },

    render: function() {
      this.renderTable();
      this.renderPagination();
      this.updateCounters();
    },

    updateCounters: function() {
      if (this.tableCount) {
        if (cloudLoadError) {
          this.tableCount.textContent = 'Error loading cloud records';
          return;
        }
        var total = currentRecords.length;
        var shown = filteredRecords.length;
        if (shown === total) {
          this.tableCount.textContent = 'Showing all ' + total + ' records';
        } else {
          this.tableCount.textContent = 'Showing ' + shown + ' of ' + total + ' records (filtered)';
        }
      }
    },

    renderTable: function() {
      if (!this.tableBody) return;

      if (cloudLoadError) {
        this.tableBody.innerHTML = '<tr><td colspan="9" class="table-empty">' +
          '<p class="empty-title" style="color: var(--color-danger);">Unable to Load Cloud Fuel Records</p>' +
          '<p class="empty-subtitle">An error occurred while fetching your records from Supabase: ' + escapeHtml(cloudLoadError) + '. Local guest records are not displayed to prevent account data confusion.</p>' +
          '<div class="empty-actions">' +
          '<button type="button" class="btn btn-secondary" onclick="AeroRecords.load()">Retry Connection</button>' +
          '</div>' +
          '</td></tr>';
        return;
      }

      if (filteredRecords.length === 0) {
        if (currentRecords.length === 0) {
          this.tableBody.innerHTML = '<tr><td colspan="9" class="table-empty">' +
            '<p class="empty-title">No fuel records logged yet.</p>' +
            '<p class="empty-subtitle">Get started by logging your first fill-up or loading the demo sample dataset.</p>' +
            '<div class="empty-actions">' +
            '<button type="button" class="btn btn-primary" onclick="AeroRecords.openAddModal()">Add First Record</button> ' +
            '<button type="button" class="btn btn-secondary" onclick="AeroApp.loadSampleData()">Load Demo Dataset</button>' +
            '</div>' +
            '</td></tr>';
        } else {
          this.tableBody.innerHTML = '<tr><td colspan="9" class="table-empty">' +
            '<p class="empty-title">No records matched your active filters.</p>' +
            '<p class="empty-subtitle">Try adjusting your date range, city search, or state filter.</p>' +
            '<button type="button" class="btn btn-secondary" onclick="AeroRecords.resetFilters()">Clear All Filters</button>' +
            '</td></tr>';
        }
        return;
      }

      var startIndex = (currentPage - 1) * pageSize;
      var pageItems = filteredRecords.slice(startIndex, startIndex + pageSize);
      var html = '';

      pageItems.forEach(function(r) {
        html += '<tr data-record-id="' + r.id + '">' +
          '<td class="font-mono text-nowrap">' + escapeHtml(r.date) + '</td>' +
          '<td><strong>' + escapeHtml(r.city) + '</strong>, ' + escapeHtml(r.state) + '</td>' +
          '<td><span class="badge badge-subtle">' + escapeHtml(r.vehicleType) + '</span></td>' +
          '<td><span class="badge badge-fuel badge-' + escapeHtml(r.fuelType.toLowerCase().replace(/[^a-z]/g, '')) + '">' + escapeHtml(r.fuelType) + '</span></td>' +
          '<td class="text-right font-mono">' + r.litres.toFixed(2) + ' L</td>' +
          '<td class="text-right font-mono">₹' + r.pricePerLitre.toFixed(2) + '</td>' +
          '<td class="text-right font-mono font-bold">₹' + r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
          '<td class="text-truncate notes-cell" title="' + escapeHtml(r.notes || '') + '">' + escapeHtml(r.notes || '-') + '</td>' +
          '<td class="text-center table-actions text-nowrap">' +
          '<button type="button" class="btn-action btn-edit" title="Edit entry" onclick="AeroRecords.openEditModal(\'' + r.id + '\')">Edit</button>' +
          '<button type="button" class="btn-action btn-delete" title="Delete entry" onclick="AeroRecords.deleteRecord(\'' + r.id + '\')">Delete</button>' +
          '</td>' +
          '</tr>';
      });

      this.tableBody.innerHTML = html;
    },

    renderPagination: function() {
      if (!this.paginationContainer) return;

      var totalPages = Math.ceil(filteredRecords.length / pageSize);
      if (totalPages <= 1) {
        this.paginationContainer.innerHTML = '';
        return;
      }

      var html = '<div class="pagination-wrapper">';
      html += '<button type="button" class="btn btn-secondary btn-sm" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="AeroRecords.setPage(' + (currentPage - 1) + ')">Previous</button>';
      html += '<span class="pagination-status">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '<button type="button" class="btn btn-secondary btn-sm" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="AeroRecords.setPage(' + (currentPage + 1) + ')">Next</button>';
      html += '</div>';

      this.paginationContainer.innerHTML = html;
    },

    setPage: function(page) {
      var totalPages = Math.ceil(filteredRecords.length / pageSize);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        this.renderTable();
        this.renderPagination();
      }
    },

    openAddModal: function() {
      editingRecordId = null;
      if (this.modalTitle) this.modalTitle.textContent = 'Add Fuel Record';
      if (this.modalSubmitBtn) {
        this.modalSubmitBtn.disabled = false;
        this.modalSubmitBtn.textContent = 'Save Record';
      }
      if (this.recordForm) this.recordForm.reset();
      if (this.formErrors) {
        this.formErrors.innerHTML = '';
        this.formErrors.classList.add('hidden');
      }

      // Default date to today
      var today = new Date().toISOString().substring(0, 10);
      if (this.inputDate) this.inputDate.value = today;
      if (this.inputVehicle) this.inputVehicle.value = 'Car';
      if (this.inputFuel) this.inputFuel.value = 'Petrol';
      if (this.inputTotal) this.inputTotal.value = '0.00';
      this.populateCityOptions(this.recordCityList, this.inputCity, this.inputState ? this.inputState.value : '');

      if (this.recordModal) {
        this.recordModal.classList.remove('hidden');
        if (this.inputDate) this.inputDate.focus();
      }
    },

    openEditModal: function(id) {
      var record = currentRecords.find(function(r) { return r.id === id; });
      if (!record) {
        window.AeroApp.showToast('Record not found.', 'error');
        return;
      }

      editingRecordId = id;
      if (this.modalTitle) this.modalTitle.textContent = 'Edit Fuel Record';
      if (this.modalSubmitBtn) {
        this.modalSubmitBtn.disabled = false;
        this.modalSubmitBtn.textContent = 'Save Record';
      }
      if (this.formErrors) {
        this.formErrors.innerHTML = '';
        this.formErrors.classList.add('hidden');
      }

      if (this.inputDate) this.inputDate.value = record.date;
      if (this.inputState) this.inputState.value = record.state;
      this.populateCityOptions(this.recordCityList, this.inputCity, record.state);
      if (this.inputCity) this.inputCity.value = record.city;
      if (this.inputVehicle) this.inputVehicle.value = record.vehicleType;
      if (this.inputFuel) this.inputFuel.value = record.fuelType;
      if (this.inputLitres) this.inputLitres.value = record.litres;
      if (this.inputPrice) this.inputPrice.value = record.pricePerLitre;
      if (this.inputTotal) this.inputTotal.value = record.totalAmount.toFixed(2);
      if (this.inputNotes) this.inputNotes.value = record.notes || '';

      if (this.recordModal) {
        this.recordModal.classList.remove('hidden');
      }
    },

    closeModal: function() {
      if (this.recordModal) {
        this.recordModal.classList.add('hidden');
      }
      if (this.modalSubmitBtn) {
        this.modalSubmitBtn.disabled = false;
        this.modalSubmitBtn.textContent = 'Save Record';
      }
      editingRecordId = null;
    },

    handleFormSubmit: function() {
      var self = this;
      var dateVal = this.inputDate ? this.inputDate.value.trim() : '';
      var stateVal = this.inputState ? this.inputState.value.trim() : '';
      var cityVal = this.inputCity ? this.inputCity.value.trim() : '';
      var vehicleVal = this.inputVehicle ? this.inputVehicle.value.trim() : '';
      var fuelVal = this.inputFuel ? this.inputFuel.value.trim() : '';
      var litresVal = this.inputLitres ? parseFloat(this.inputLitres.value) : NaN;
      var priceVal = this.inputPrice ? parseFloat(this.inputPrice.value) : NaN;
      var notesVal = this.inputNotes ? this.inputNotes.value.trim() : '';

      var totalVal = (!isNaN(litresVal) && !isNaN(priceVal))
        ? Number((litresVal * priceVal).toFixed(2))
        : 0;

      var candidate = {
        date: dateVal,
        state: stateVal,
        city: cityVal,
        vehicleType: vehicleVal,
        fuelType: fuelVal,
        litres: litresVal,
        pricePerLitre: priceVal,
        totalAmount: totalVal,
        notes: notesVal
      };

      var check = window.AeroStorage.validateRecord(candidate);
      if (!check.isValid) {
        this.showFormErrors(check.errors);
        if (window.AeroApp && typeof window.AeroApp.showToast === 'function') {
          window.AeroApp.showToast('Please fix the form errors: ' + check.errors[0], 'error');
        }
        return;
      }

      if (this.formErrors) {
        this.formErrors.innerHTML = '';
        this.formErrors.classList.add('hidden');
      }

      if (this.modalSubmitBtn) {
        this.modalSubmitBtn.disabled = true;
        this.modalSubmitBtn.textContent = 'Saving...';
      }

      var onFinish = function(result) {
        if (self.modalSubmitBtn) {
          self.modalSubmitBtn.disabled = false;
          self.modalSubmitBtn.textContent = 'Save Record';
        }

        if (result && result.success) {
          var wasEditing = Boolean(editingRecordId);
          self.closeModal();
          self.load();
          var msg = wasEditing ? 'Fuel record updated successfully.' : 'New fuel record added successfully.';
          if (window.AeroApp && typeof window.AeroApp.showToast === 'function') {
            window.AeroApp.showToast(msg, 'success');
          }
        } else {
          var errorList = (result && result.errors && result.errors.length)
            ? result.errors
            : ['Storage operation failed. Please check form details.'];
          self.showFormErrors(errorList);
          if (window.AeroApp && typeof window.AeroApp.showToast === 'function') {
            window.AeroApp.showToast('Could not save fuel record: ' + errorList.join(', '), 'error');
          }
        }
      };

      if (editingRecordId) {
        window.AeroStorage.update(editingRecordId, candidate, onFinish);
      } else {
        window.AeroStorage.add(candidate, onFinish);
      }
    },

    showFormErrors: function(errors) {
      if (!this.formErrors) return;
      var html = '<ul>';
      errors.forEach(function(err) {
        html += '<li>' + escapeHtml(err) + '</li>';
      });
      html += '</ul>';
      this.formErrors.innerHTML = html;
      this.formErrors.classList.remove('hidden');
    },

    deleteRecord: function(id) {
      var self = this;
      var record = currentRecords.find(function(r) { return r.id === id; });
      var detail = record ? (record.date + ' in ' + record.city + ' (' + record.litres + ' L)') : 'this entry';

      var confirmed = window.confirm('Are you sure you want to delete ' + detail + '? This action cannot be undone.');
      if (!confirmed) return;

      window.AeroStorage.remove(id, function(result) {
        if (result.success) {
          self.load();
          window.AeroApp.showToast('Fuel record deleted.', 'info');
        } else {
          window.AeroApp.showToast('Failed to delete fuel record.', 'error');
        }
      });
    },

    getFilteredRecords: function() {
      return filteredRecords;
    },

    getAllRecords: function() {
      return currentRecords;
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

  window.AeroRecords = RecordsManager;
})(window);

