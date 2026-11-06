// AERO // FUEL INDIA - Analytics and Summary Rollups Module

(function(window) {
  'use strict';

  var AnalyticsManager = {
    computeTotals: function(records) {
      if (!Array.isArray(records) || records.length === 0) {
        return {
          count: 0,
          totalLitres: 0,
          totalSpend: 0,
          avgPricePerLitre: 0,
          avgLitresPerFill: 0
        };
      }

      var totalLitres = 0;
      var totalSpend = 0;

      records.forEach(function(r) {
        totalLitres += Number(r.litres) || 0;
        totalSpend += Number(r.totalAmount) || 0;
      });

      var avgPrice = totalLitres > 0 ? (totalSpend / totalLitres) : 0;
      var avgLitres = records.length > 0 ? (totalLitres / records.length) : 0;

      return {
        count: records.length,
        totalLitres: Number(totalLitres.toFixed(2)),
        totalSpend: Number(totalSpend.toFixed(2)),
        avgPricePerLitre: Number(avgPrice.toFixed(2)),
        avgLitresPerFill: Number(avgLitres.toFixed(2))
      };
    },

    byMonth: function(records) {
      if (!Array.isArray(records) || records.length === 0) {
        return [];
      }

      var monthsMap = {};

      records.forEach(function(r) {
        var monthKey = 'Unknown';
        if (r.date && r.date.length >= 7) {
          monthKey = r.date.substring(0, 7); // YYYY-MM
        }

        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = {
            monthKey: monthKey,
            count: 0,
            litres: 0,
            spend: 0
          };
        }

        monthsMap[monthKey].count++;
        monthsMap[monthKey].litres += Number(r.litres) || 0;
        monthsMap[monthKey].spend += Number(r.totalAmount) || 0;
      });

      var result = Object.keys(monthsMap).map(function(key) {
        var item = monthsMap[key];
        var avgRate = item.litres > 0 ? (item.spend / item.litres) : 0;
        return {
          monthKey: key,
          count: item.count,
          litres: Number(item.litres.toFixed(2)),
          spend: Number(item.spend.toFixed(2)),
          avgRate: Number(avgRate.toFixed(2))
        };
      });

      result.sort(function(a, b) {
        return b.monthKey.localeCompare(a.monthKey);
      });

      return result;
    },

    byFuelType: function(records) {
      if (!Array.isArray(records) || records.length === 0) {
        return [];
      }

      var fuelMap = {};
      var globalLitres = 0;
      var globalSpend = 0;

      records.forEach(function(r) {
        var fuel = r.fuelType || 'Other';
        if (!fuelMap[fuel]) {
          fuelMap[fuel] = {
            fuelType: fuel,
            count: 0,
            litres: 0,
            spend: 0
          };
        }
        var lit = Number(r.litres) || 0;
        var spd = Number(r.totalAmount) || 0;

        fuelMap[fuel].count++;
        fuelMap[fuel].litres += lit;
        fuelMap[fuel].spend += spd;
        globalLitres += lit;
        globalSpend += spd;
      });

      var result = Object.keys(fuelMap).map(function(fuel) {
        var item = fuelMap[fuel];
        var avgRate = item.litres > 0 ? (item.spend / item.litres) : 0;
        var volumeShare = globalLitres > 0 ? ((item.litres / globalLitres) * 100) : 0;
        var spendShare = globalSpend > 0 ? ((item.spend / globalSpend) * 100) : 0;

        return {
          fuelType: fuel,
          count: item.count,
          litres: Number(item.litres.toFixed(2)),
          spend: Number(item.spend.toFixed(2)),
          avgRate: Number(avgRate.toFixed(2)),
          volumeShare: Number(volumeShare.toFixed(1)),
          spendShare: Number(spendShare.toFixed(1))
        };
      });

      result.sort(function(a, b) {
        return b.spend - a.spend;
      });

      return result;
    },

    byCity: function(records) {
      if (!Array.isArray(records) || records.length === 0) {
        return [];
      }

      var cityMap = {};

      records.forEach(function(r) {
        var cityKey = (r.city || 'Unknown').trim();
        var state = (r.state || 'Unknown').trim();
        var fullKey = cityKey + ':::' + state;

        if (!cityMap[fullKey]) {
          cityMap[fullKey] = {
            city: cityKey,
            state: state,
            count: 0,
            litres: 0,
            spend: 0
          };
        }

        cityMap[fullKey].count++;
        cityMap[fullKey].litres += Number(r.litres) || 0;
        cityMap[fullKey].spend += Number(r.totalAmount) || 0;
      });

      var result = Object.keys(cityMap).map(function(key) {
        var item = cityMap[key];
        var avgRate = item.litres > 0 ? (item.spend / item.litres) : 0;
        return {
          city: item.city,
          state: item.state,
          count: item.count,
          litres: Number(item.litres.toFixed(2)),
          spend: Number(item.spend.toFixed(2)),
          avgRate: Number(avgRate.toFixed(2))
        };
      });

      result.sort(function(a, b) {
        return b.spend - a.spend;
      });

      return result;
    },

    byState: function(records) {
      if (!Array.isArray(records) || records.length === 0) {
        return {
          states: [],
          stateMap: {},
          maxSpend: 0,
          maxLitres: 0
        };
      }

      var stateMap = {};
      var maxSpend = 0;
      var maxLitres = 0;

      records.forEach(function(r) {
        var state = (r.state || 'Unknown').trim();
        if (!stateMap[state]) {
          stateMap[state] = {
            state: state,
            count: 0,
            litres: 0,
            spend: 0
          };
        }

        stateMap[state].count++;
        stateMap[state].litres += Number(r.litres) || 0;
        stateMap[state].spend += Number(r.totalAmount) || 0;
      });

      var stateList = Object.keys(stateMap).map(function(name) {
        var item = stateMap[name];
        var litres = Number(item.litres.toFixed(2));
        var spend = Number(item.spend.toFixed(2));
        var avgRate = litres > 0 ? Number((spend / litres).toFixed(2)) : 0;

        if (spend > maxSpend) maxSpend = spend;
        if (litres > maxLitres) maxLitres = litres;

        return {
          state: name,
          count: item.count,
          litres: litres,
          spend: spend,
          avgRate: avgRate
        };
      });

      stateList.sort(function(a, b) {
        return b.spend - a.spend;
      });

      return {
        states: stateList,
        stateMap: stateMap,
        maxSpend: maxSpend,
        maxLitres: maxLitres
      };
    }
  };

  window.AeroAnalytics = AnalyticsManager;
})(window);

