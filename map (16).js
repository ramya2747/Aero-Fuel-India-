// AERO // FUEL INDIA - India State Choropleth Map Module

(function(window) {
  'use strict';

  var currentMetric = 'spend'; // 'spend' or 'litres'
  var activeStateData = null;

  // Blue monochromatic scale from low to high intensity
  var COLOR_STOPS = [
    '#E0F2FE', // Level 1 (Lowest)
    '#BAE6FD', // Level 2
    '#7DD3FC', // Level 3
    '#38BDF8', // Level 4
    '#0284C7', // Level 5
    '#0369A1', // Level 6
    '#0C4A6E'  // Level 7 (Highest)
  ];
  var EMPTY_COLOR = '#F1F5F9';
  var HOVER_STROKE = '#F59E0B';

  function normalizeStateName(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function getShadeColor(value, maxValue) {
    if (!value || value <= 0 || !maxValue || maxValue <= 0) {
      return EMPTY_COLOR;
    }
    var ratio = value / maxValue;
    var index = Math.min(Math.floor(ratio * COLOR_STOPS.length), COLOR_STOPS.length - 1);
    return COLOR_STOPS[index];
  }

  var MapManager = {
    init: function(containerId, records) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.tooltip = document.getElementById('map-tooltip');
      if (!this.tooltip) {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'map-tooltip';
        this.tooltip.className = 'map-tooltip hidden';
        document.body.appendChild(this.tooltip);
      }

      this.render(records);
    },

    setMetric: function(metric, records) {
      if (metric === 'spend' || metric === 'litres') {
        currentMetric = metric;
        this.render(records);
      }
    },

    getMetric: function() {
      return currentMetric;
    },

    render: function(records) {
      if (!this.container) return;
      if (!window.INDIA_MAP_DATA || !window.INDIA_MAP_DATA.locations) {
        this.container.innerHTML = '<div class="notice-box">Map outline data is not available.</div>';
        return;
      }

      var analytics = window.AeroAnalytics.byState(records || []);
      activeStateData = analytics;

      var stateLookup = {};
      Object.keys(analytics.stateMap).forEach(function(stateName) {
        var norm = normalizeStateName(stateName);
        stateLookup[norm] = analytics.stateMap[stateName];
      });

      var maxValue = currentMetric === 'spend' ? analytics.maxSpend : analytics.maxLitres;
      var locations = window.INDIA_MAP_DATA.locations;
      var viewBox = window.INDIA_MAP_DATA.viewBox || '0 0 612 696';

      var svgHtml = '<svg class="india-svg-element" viewBox="' + viewBox + '" role="img" aria-label="India Fuel Consumption Map">';
      svgHtml += '<g class="states-group">';

      for (var i = 0; i < locations.length; i++) {
        var loc = locations[i];
        var normLoc = normalizeStateName(loc.name);
        var stat = stateLookup[normLoc];

        var value = 0;
        var hasActivity = false;
        if (stat) {
          hasActivity = true;
          value = currentMetric === 'spend' ? stat.spend : stat.litres;
        }

        var fillColor = hasActivity ? getShadeColor(value, maxValue) : EMPTY_COLOR;
        var strokeColor = hasActivity ? '#475569' : '#CBD5E1';

        svgHtml += '<path class="map-state-path' + (hasActivity ? ' has-activity' : '') + '" ' +
          'id="map-state-' + loc.id + '" ' +
          'data-state-name="' + escapeHtml(loc.name) + '" ' +
          'data-has-activity="' + (hasActivity ? 'true' : 'false') + '" ' +
          'd="' + loc.path + '" ' +
          'fill="' + fillColor + '" ' +
          'stroke="' + strokeColor + '" ' +
          'stroke-width="0.85" ' +
          'tabindex="0"></path>';
      }

      svgHtml += '</g></svg>';
      this.container.innerHTML = svgHtml;

      this.bindEvents(stateLookup);
      this.renderLegend(maxValue);
      this.renderStateList(analytics.states);
    },

    bindEvents: function(stateLookup) {
      var self = this;
      var paths = this.container.querySelectorAll('.map-state-path');

      paths.forEach(function(path) {
        var stateName = path.getAttribute('data-state-name');
        var norm = normalizeStateName(stateName);
        var stat = stateLookup[norm];

        path.addEventListener('mouseenter', function(e) {
          self.showTooltip(e, stateName, stat);
          path.classList.add('hovered');
        });

        path.addEventListener('mousemove', function(e) {
          self.positionTooltip(e);
        });

        path.addEventListener('mouseleave', function() {
          self.hideTooltip();
          path.classList.remove('hovered');
        });

        path.addEventListener('click', function() {
          if (window.AeroRecords && typeof window.AeroRecords.filterByState === 'function') {
            window.AeroRecords.filterByState(stateName);
          }
        });

        path.addEventListener('focus', function(e) {
          self.showTooltip(e, stateName, stat);
        });

        path.addEventListener('blur', function() {
          self.hideTooltip();
        });
      });
    },

    showTooltip: function(e, stateName, stat) {
      if (!this.tooltip) return;

      var content = '<div class="tooltip-title">' + escapeHtml(stateName) + '</div>';
      if (stat && stat.count > 0) {
        var avgRate = stat.litres > 0 ? (stat.spend / stat.litres).toFixed(2) : '0.00';
        content += '<div class="tooltip-row"><span>Fill-ups:</span> <strong>' + stat.count + '</strong></div>';
        content += '<div class="tooltip-row"><span>Total Litres:</span> <strong>' + stat.litres.toFixed(2) + ' L</strong></div>';
        content += '<div class="tooltip-row"><span>Total Spend:</span> <strong>₹' + stat.spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</strong></div>';
        content += '<div class="tooltip-row"><span>Average Rate:</span> <strong>₹' + avgRate + ' / L</strong></div>';
        content += '<div class="tooltip-hint">Click state to filter log</div>';
      } else {
        content += '<div class="tooltip-empty">No fuel records recorded for this state.</div>';
      }

      this.tooltip.innerHTML = content;
      this.tooltip.classList.remove('hidden');
      this.positionTooltip(e);
    },

    positionTooltip: function(e) {
      if (!this.tooltip) return;
      var x = e.clientX + 14;
      var y = e.clientY + 14;

      var width = this.tooltip.offsetWidth || 200;
      var height = this.tooltip.offsetHeight || 120;

      if (x + width > window.innerWidth - 10) {
        x = e.clientX - width - 14;
      }
      if (y + height > window.innerHeight - 10) {
        y = e.clientY - height - 14;
      }

      this.tooltip.style.left = x + 'px';
      this.tooltip.style.top = y + 'px';
    },

    hideTooltip: function() {
      if (this.tooltip) {
        this.tooltip.classList.add('hidden');
      }
    },

    renderLegend: function(maxValue) {
      var legendContainer = document.getElementById('map-legend');
      if (!legendContainer) return;

      var metricLabel = currentMetric === 'spend' ? 'Spend (₹)' : 'Volume (L)';
      var maxFormatted = currentMetric === 'spend'
        ? '₹' + (maxValue > 0 ? maxValue.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0')
        : (maxValue > 0 ? maxValue.toFixed(0) : '0') + ' L';

      var html = '<div class="legend-header">';
      html += '<span class="legend-title">Scale: ' + metricLabel + '</span>';
      html += '<span class="legend-range">0 to ' + maxFormatted + '</span>';
      html += '</div>';

      html += '<div class="legend-bar-wrapper">';
      html += '<div class="legend-cell empty" title="No activity recorded"></div>';
      for (var i = 0; i < COLOR_STOPS.length; i++) {
        html += '<div class="legend-cell" style="background-color: ' + COLOR_STOPS[i] + ';"></div>';
      }
      html += '</div>';

      html += '<div class="legend-labels">';
      html += '<span>No records</span>';
      html += '<span>Low</span>';
      html += '<span>High</span>';
      html += '</div>';

      legendContainer.innerHTML = html;
    },

    renderStateList: function(states) {
      var listContainer = document.getElementById('map-state-table-body');
      if (!listContainer) return;

      if (!states || states.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="5" class="table-empty">No state records available yet. Load sample data or add records to view rankings.</td></tr>';
        return;
      }

      var html = '';
      states.forEach(function(s, index) {
        html += '<tr>' +
          '<td><strong>' + (index + 1) + '</strong></td>' +
          '<td><button type="button" class="btn-text-link" data-filter-state="' + escapeHtml(s.state) + '">' + escapeHtml(s.state) + '</button></td>' +
          '<td class="text-right">' + s.count + '</td>' +
          '<td class="text-right font-mono">' + s.litres.toFixed(2) + ' L</td>' +
          '<td class="text-right font-mono">₹' + s.spend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
          '</tr>';
      });

      listContainer.innerHTML = html;

      listContainer.querySelectorAll('[data-filter-state]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var state = btn.getAttribute('data-filter-state');
          if (window.AeroRecords && typeof window.AeroRecords.filterByState === 'function') {
            window.AeroRecords.filterByState(state);
          }
        });
      });
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

  window.AeroMap = MapManager;
})(window);

