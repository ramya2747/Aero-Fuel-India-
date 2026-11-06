// AERO // FUEL INDIA - CSV Importer, Validator, and Exporter Module

(function(window) {
  'use strict';

  function parseCSVLine(line) {
    var result = [];
    var current = '';
    var insideQuotes = false;

    for (var i = 0; i < line.length; i++) {
      var char = line[i];

      if (char === '"') {
        if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function normalizeHeader(header) {
    return header.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function mapHeaderIndex(headers) {
    var mapping = {
      date: -1,
      state: -1,
      city: -1,
      vehicleType: -1,
      fuelType: -1,
      litres: -1,
      pricePerLitre: -1,
      notes: -1
    };

    headers.forEach(function(h, idx) {
      var norm = normalizeHeader(h);
      if (norm === 'date' || norm === 'filldate' || norm === 'purchasedate') {
        mapping.date = idx;
      } else if (norm === 'state' || norm === 'province' || norm === 'region') {
        mapping.state = idx;
      } else if (norm === 'city' || norm === 'town' || norm === 'location') {
        mapping.city = idx;
      } else if (norm === 'vehicletype' || norm === 'vehicle' || norm === 'category') {
        mapping.vehicleType = idx;
      } else if (norm === 'fueltype' || norm === 'fuel' || norm === 'type') {
        mapping.fuelType = idx;
      } else if (norm === 'litres' || norm === 'liters' || norm === 'quantity' || norm === 'volume' || norm === 'qty') {
        mapping.litres = idx;
      } else if (norm === 'priceperlitre' || norm === 'price' || norm === 'rate' || norm === 'rateperlitre' || norm === 'costperlitre') {
        mapping.pricePerLitre = idx;
      } else if (norm === 'notes' || norm === 'note' || norm === 'remark' || norm === 'remarks' || norm === 'comment') {
        mapping.notes = idx;
      }
    });

    return mapping;
  }

  var CsvManager = {
    parseAndValidate: function(csvContent) {
      if (!csvContent || typeof csvContent !== 'string') {
        return { success: false, error: 'Empty or invalid file content.' };
      }

      var lines = csvContent.split(/\r?\n/).filter(function(line) {
        return line.trim().length > 0;
      });

      if (lines.length < 2) {
        return {
          success: false,
          error: 'The CSV file must contain a header row and at least one data row.'
        };
      }

      var headerRow = parseCSVLine(lines[0]);
      var mapping = mapHeaderIndex(headerRow);

      var missingHeaders = [];
      if (mapping.date === -1) missingHeaders.push('Date');
      if (mapping.state === -1) missingHeaders.push('State');
      if (mapping.city === -1) missingHeaders.push('City');
      if (mapping.litres === -1) missingHeaders.push('Litres');
      if (mapping.pricePerLitre === -1) missingHeaders.push('Price per Litre');

      if (missingHeaders.length > 0) {
        return {
          success: false,
          error: 'Required column(s) not found: ' + missingHeaders.join(', ') + '. Expected headers: Date, State, City, Vehicle, Fuel, Litres, Price/Litre.'
        };
      }

      var previewRows = [];
      var validCount = 0;
      var invalidCount = 0;

      for (var i = 1; i < lines.length; i++) {
        var rowValues = parseCSVLine(lines[i]);
        var rowNumber = i + 1;

        var rawDate = mapping.date !== -1 ? (rowValues[mapping.date] || '') : '';
        var rawState = mapping.state !== -1 ? (rowValues[mapping.state] || '') : '';
        var rawCity = mapping.city !== -1 ? (rowValues[mapping.city] || '') : '';
        var rawVehicle = mapping.vehicleType !== -1 ? (rowValues[mapping.vehicleType] || 'Car') : 'Car';
        var rawFuel = mapping.fuelType !== -1 ? (rowValues[mapping.fuelType] || 'Petrol') : 'Petrol';
        var rawLitres = mapping.litres !== -1 ? (rowValues[mapping.litres] || '') : '';
        var rawPrice = mapping.pricePerLitre !== -1 ? (rowValues[mapping.pricePerLitre] || '') : '';
        var rawNotes = mapping.notes !== -1 ? (rowValues[mapping.notes] || '') : '';

        // Normalize date if written as DD-MM-YYYY or DD/MM/YYYY
        var normalizedDate = rawDate;
        var dmyMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          var day = dmyMatch[1].padStart(2, '0');
          var month = dmyMatch[2].padStart(2, '0');
          var year = dmyMatch[3];
          normalizedDate = year + '-' + month + '-' + day;
        }

        var candidateRecord = {
          date: normalizedDate,
          state: rawState,
          city: rawCity,
          vehicleType: rawVehicle || 'Car',
          fuelType: rawFuel || 'Petrol',
          litres: parseFloat(rawLitres),
          pricePerLitre: parseFloat(rawPrice),
          notes: rawNotes
        };

        var check = window.AeroStorage.validateRecord(candidateRecord);

        if (check.isValid) {
          var sanitized = window.AeroStorage.sanitizeRecord(candidateRecord);
          previewRows.push({
            rowNumber: rowNumber,
            isValid: true,
            errors: [],
            record: sanitized
          });
          validCount++;
        } else {
          previewRows.push({
            rowNumber: rowNumber,
            isValid: false,
            errors: check.errors,
            record: candidateRecord
          });
          invalidCount++;
        }
      }

      return {
        success: true,
        totalRows: lines.length - 1,
        validCount: validCount,
        invalidCount: invalidCount,
        rows: previewRows
      };
    },

    commitValidRows: function(parsedResult) {
      if (!parsedResult || !Array.isArray(parsedResult.rows)) {
        return { success: false, count: 0 };
      }

      var validItems = [];
      parsedResult.rows.forEach(function(row) {
        if (row.isValid && row.record) {
          validItems.push(row.record);
        }
      });

      if (validItems.length === 0) {
        return { success: false, count: 0, error: 'No valid rows to commit.' };
      }

      var current = window.AeroStorage.getAll();
      var combined = validItems.concat(current);

      // Sort descending by date
      combined.sort(function(a, b) {
        return b.date.localeCompare(a.date);
      });

      var saved = window.AeroStorage.saveAll(combined);
      return {
        success: saved,
        count: validItems.length,
        totalStored: combined.length
      };
    },

    generateCSV: function(records) {
      var headers = [
        'Date',
        'State',
        'City',
        'Vehicle Type',
        'Fuel Type',
        'Litres',
        'Price Per Litre',
        'Total Amount',
        'Notes'
      ];

      var rows = [headers.join(',')];

      function escapeCell(val) {
        if (val === null || val === undefined) return '""';
        var str = String(val);
        if (str.search(/("|,|\n)/g) >= 0) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }

      records.forEach(function(r) {
        var row = [
          escapeCell(r.date),
          escapeCell(r.state),
          escapeCell(r.city),
          escapeCell(r.vehicleType),
          escapeCell(r.fuelType),
          escapeCell(r.litres.toFixed(2)),
          escapeCell(r.pricePerLitre.toFixed(2)),
          escapeCell(r.totalAmount.toFixed(2)),
          escapeCell(r.notes || '')
        ];
        rows.push(row.join(','));
      });

      return rows.join('\r\n');
    },

    downloadFile: function(filename, content, mimeType) {
      var blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8;' });
      var link = document.createElement('a');
      if (link.download !== undefined) {
        var url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  window.AeroCSV = CsvManager;
})(window);

