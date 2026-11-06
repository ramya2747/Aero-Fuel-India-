// AERO // FUEL INDIA - Persistence, Validation & Cloud Storage Module
// Manages dual-mode persistence: Browser LocalStorage (Guest) & Supabase Postgres (Authenticated)

(function(window) {
  'use strict';

  var STORAGE_KEY = 'aero_fuel_records_v1';
  var memoryCache = [];

  var VALID_VEHICLES = [
    'Car',
    'Two-Wheeler',
    'Commercial Van',
    'Truck',
    'Bus',
    'Fleet / Other'
  ];

  var VALID_FUELS = [
    'Petrol',
    'Diesel',
    'CNG',
    'Auto LPG'
  ];

  var INDIAN_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli',
    'Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];

  var STATE_CITIES = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Kadapa', 'Anantapur'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Durg', 'Jagdalpur'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Bharuch', 'Vapi'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Baddi'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari', 'Kalaburagi', 'Shivamogga', 'Tumakuru', 'Udupi'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Amravati', 'Nanded'],
    'Manipur': ['Imphal', 'Churachandpur', 'Thoubal'],
    'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar'],
    'Sikkim': ['Gangtok', 'Namchi', 'Geyzing'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Tirunelveli', 'Thoothukudi'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar'],
    'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Greater Noida', 'Ghaziabad', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Bareilly', 'Aligarh', 'Gorakhpur'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Nainital'],
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda', 'Kharagpur'],
    'Andaman and Nicobar Islands': ['Port Blair'],
    'Chandigarh': ['Chandigarh'],
    'Dadra and Nagar Haveli': ['Silvassa'],
    'Daman and Diu': ['Daman', 'Diu'],
    'Delhi': ['Delhi', 'New Delhi', 'Connaught Place', 'Dwarka', 'Rohini', 'Saket', 'Okhla', 'Janakpuri'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua'],
    'Ladakh': ['Leh', 'Kargil'],
    'Lakshadweep': ['Kavaratti'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
  };

  function getCitiesForState(stateName) {
    if (stateName && STATE_CITIES[stateName]) {
      return STATE_CITIES[stateName].slice();
    }
    return [
      'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad',
      'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow',
      'Kochi', 'Indore', 'Bhopal', 'Chandigarh', 'Coimbatore',
      'Visakhapatnam', 'Surat', 'Nagpur', 'Patna', 'Guwahati'
    ];
  }

  function generateId() {
    var timestamp = Date.now().toString(36);
    var randomStr = Math.random().toString(36).substring(2, 7);
    return 'rec_' + timestamp + '_' + randomStr;
  }

  function validateRecordFields(record) {
    var errors = [];

    if (!record) {
      return { isValid: false, errors: ['Record object is required.'] };
    }

    if (!record.date || typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date.trim())) {
      errors.push('Date must be in YYYY-MM-DD format.');
    }

    if (!record.city || typeof record.city !== 'string' || record.city.trim().length === 0) {
      errors.push('City name is required.');
    }

    if (!record.state || typeof record.state !== 'string' || record.state.trim().length === 0) {
      errors.push('State name is required.');
    }

    if (!record.vehicleType || typeof record.vehicleType !== 'string' || record.vehicleType.trim().length === 0) {
      errors.push('Vehicle type is required.');
    }

    if (!record.fuelType || typeof record.fuelType !== 'string' || record.fuelType.trim().length === 0) {
      errors.push('Fuel type is required.');
    }

    var litres = parseFloat(record.litres);
    if (isNaN(litres) || litres <= 0) {
      errors.push('Litres consumed must be a positive number.');
    }

    var price = parseFloat(record.pricePerLitre);
    if (isNaN(price) || price <= 0) {
      errors.push('Price per litre must be a positive number.');
    }

    // Mathematical consistency check
    if (!isNaN(litres) && !isNaN(price)) {
      var expectedTotal = Number((litres * price).toFixed(2));
      var actualTotal = parseFloat(record.totalAmount);
      if (!isNaN(actualTotal) && Math.abs(actualTotal - expectedTotal) >= 0.02) {
        errors.push('Total amount (' + actualTotal + ') does not match litres (' + litres + ') multiplied by price per litre (' + price + ').');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function sanitizeRecord(rawRecord) {
    var litres = parseFloat(rawRecord.litres) || 0;
    var pricePerLitre = parseFloat(rawRecord.pricePerLitre) || 0;
    var totalAmount = parseFloat((litres * pricePerLitre).toFixed(2));

    return {
      id: rawRecord.id ? String(rawRecord.id) : generateId(),
      date: String(rawRecord.date || '').trim(),
      state: String(rawRecord.state || '').trim(),
      city: String(rawRecord.city || '').trim(),
      vehicleType: String(rawRecord.vehicleType || 'Car').trim(),
      fuelType: String(rawRecord.fuelType || 'Petrol').trim(),
      litres: Number(litres.toFixed(2)),
      pricePerLitre: Number(pricePerLitre.toFixed(2)),
      totalAmount: totalAmount,
      notes: rawRecord.notes ? String(rawRecord.notes).trim() : '',
      synced: Boolean(rawRecord.synced),
      createdAt: rawRecord.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function mapDbRowToRecord(row) {
    return {
      id: row.id,
      localId: row.local_id || null,
      date: row.date,
      state: row.state,
      city: row.city,
      vehicleType: row.vehicle_type,
      fuelType: row.fuel_type,
      litres: Number(row.litres),
      pricePerLitre: Number(row.price_per_litre),
      totalAmount: Number(row.total_amount),
      notes: row.notes || '',
      synced: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  var StorageManager = {
    STORAGE_KEY: STORAGE_KEY,
    VALID_VEHICLES: VALID_VEHICLES,
    VALID_FUELS: VALID_FUELS,
    INDIAN_STATES: INDIAN_STATES,
    STATE_CITIES: STATE_CITIES,
    getCitiesForState: getCitiesForState,

    getLocalRecords: function() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error reading fuel records from localStorage:', e);
        return [];
      }
    },

    saveLocalRecords: function(records) {
      try {
        if (!Array.isArray(records)) return false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
      } catch (e) {
        console.error('Error saving fuel records to localStorage:', e);
        return false;
      }
    },

    // Synchronous read of currently active records from cache
    getAll: function() {
      return memoryCache.slice();
    },

    // Async loader that loads from Supabase when authenticated, or localStorage when guest
    loadAll: function(callback) {
      callback = callback || function() {};
      var self = this;
      var supabase = window.AeroSupabase.getClient();
      var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();

      if (isAuth && supabase) {
        supabase.from('fuel_records')
          .select('*')
          .order('date', { ascending: false })
          .then(function(res) {
            if (res.error) {
              console.error('Error loading records from Supabase:', res.error);
              memoryCache = [];
              callback([], { isCloud: true, error: res.error.message });
              return;
            }

            var mapped = (res.data || []).map(mapDbRowToRecord);
            memoryCache = mapped;
            callback(memoryCache, { isCloud: true, error: null });
          })
          .catch(function(err) {
            console.error('Supabase query network failure:', err);
            memoryCache = [];
            callback([], { isCloud: true, error: err.message });
          });
      } else {
        memoryCache = self.getLocalRecords();
        callback(memoryCache, { isCloud: false, error: null });
      }
    },

    add: function(recordData, callback) {
      callback = callback || function() {};
      var self = this;
      var validation = validateRecordFields(recordData);
      if (!validation.isValid) {
        var errRes = { success: false, errors: validation.errors };
        callback(errRes);
        return errRes;
      }

      var sanitized = sanitizeRecord(recordData);
      var supabase = window.AeroSupabase.getClient();
      var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();

      if (isAuth && supabase) {
        var user = window.AeroAuth.getCurrentUser();
        var rowToInsert = {
          user_id: user.id,
          date: sanitized.date,
          state: sanitized.state,
          city: sanitized.city,
          vehicle_type: sanitized.vehicleType,
          fuel_type: sanitized.fuelType,
          litres: sanitized.litres,
          price_per_litre: sanitized.pricePerLitre,
          total_amount: sanitized.totalAmount,
          notes: sanitized.notes || ''
        };

        supabase.from('fuel_records')
          .insert([rowToInsert])
          .select()
          .then(function(res) {
            if (res.error) {
              callback({ success: false, errors: [res.error.message] });
              return;
            }
            var insertedRecord = mapDbRowToRecord(res.data[0]);
            memoryCache.unshift(insertedRecord);
            callback({ success: true, record: insertedRecord });
          })
          .catch(function(err) {
            callback({ success: false, errors: [err.message] });
          });

        return { pending: true };
      } else {
        // Guest mode: save to localStorage
        var localRecords = self.getLocalRecords();
        localRecords.unshift(sanitized);
        var saved = self.saveLocalRecords(localRecords);
        memoryCache = localRecords.slice();

        var localRes = {
          success: saved,
          record: sanitized,
          errors: saved ? [] : ['Could not write to localStorage. Storage may be full.']
        };
        callback(localRes);
        return localRes;
      }
    },

    update: function(id, recordData, callback) {
      callback = callback || function() {};
      var self = this;
      var validation = validateRecordFields(recordData);
      if (!validation.isValid) {
        var errRes = { success: false, errors: validation.errors };
        callback(errRes);
        return errRes;
      }

      var supabase = window.AeroSupabase.getClient();
      var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();

      if (isAuth && supabase) {
        var updatePayload = {
          date: recordData.date,
          state: recordData.state,
          city: recordData.city,
          vehicle_type: recordData.vehicleType,
          fuel_type: recordData.fuelType,
          litres: Number(recordData.litres),
          price_per_litre: Number(recordData.pricePerLitre),
          total_amount: Number((recordData.litres * recordData.pricePerLitre).toFixed(2)),
          notes: recordData.notes || ''
        };

        supabase.from('fuel_records')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .then(function(res) {
            if (res.error) {
              callback({ success: false, errors: [res.error.message] });
              return;
            }
            if (!res.data || res.data.length === 0) {
              callback({ success: false, errors: ['Record not found or access denied.'] });
              return;
            }
            var updated = mapDbRowToRecord(res.data[0]);
            var idx = memoryCache.findIndex(function(r) { return r.id === id; });
            if (idx !== -1) memoryCache[idx] = updated;

            // Also keep local storage entry in sync if this record was synced from local
            var localRecords = self.getLocalRecords();
            var localIdx = localRecords.findIndex(function(r) { return r.id === id || (updated.localId && r.id === updated.localId); });
            if (localIdx !== -1) {
              localRecords[localIdx] = Object.assign({}, localRecords[localIdx], {
                date: updated.date,
                state: updated.state,
                city: updated.city,
                vehicleType: updated.vehicleType,
                fuelType: updated.fuelType,
                litres: updated.litres,
                pricePerLitre: updated.pricePerLitre,
                totalAmount: updated.totalAmount,
                notes: updated.notes,
                synced: true,
                syncedAt: new Date().toISOString(),
                updatedAt: updated.updatedAt
              });
              self.saveLocalRecords(localRecords);
            }

            callback({ success: true, record: updated });
          })
          .catch(function(err) {
            callback({ success: false, errors: [err.message] });
          });

        return { pending: true };
      } else {
        // Guest mode
        var records = self.getLocalRecords();
        var index = records.findIndex(function(r) { return r.id === id; });
        if (index === -1) {
          var notFound = { success: false, errors: ['Record not found.'] };
          callback(notFound);
          return notFound;
        }

        var existing = records[index];
        // When editing a local record, reset synced to false so changes are never silently ignored
        var merged = Object.assign({}, existing, recordData, {
          id: id,
          synced: false,
          syncedAt: null,
          updatedAt: new Date().toISOString()
        });
        var sanitized = sanitizeRecord(merged);
        sanitized.synced = false;
        delete sanitized.syncedAt;

        records[index] = sanitized;
        var saved = self.saveLocalRecords(records);
        memoryCache = records.slice();

        var resObj = {
          success: saved,
          record: sanitized,
          errors: saved ? [] : ['Failed to update record in localStorage.']
        };
        callback(resObj);
        return resObj;
      }
    },

    remove: function(id, callback) {
      callback = callback || function() {};
      var self = this;
      var supabase = window.AeroSupabase.getClient();
      var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();

      if (isAuth && supabase) {
        supabase.from('fuel_records')
          .delete()
          .eq('id', id)
          .then(function(res) {
            if (res.error) {
              callback({ success: false, errors: [res.error.message] });
              return;
            }
            memoryCache = memoryCache.filter(function(r) { return r.id !== id; });
            callback({ success: true });
          })
          .catch(function(err) {
            callback({ success: false, errors: [err.message] });
          });
        return { pending: true };
      } else {
        var records = self.getLocalRecords();
        var filtered = records.filter(function(r) { return r.id !== id; });
        var saved = self.saveLocalRecords(filtered);
        memoryCache = filtered.slice();
        var resObj = { success: saved };
        callback(resObj);
        return resObj;
      }
    },

    clearAll: function() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('aero_fuel_initialized_v1');
        memoryCache = [];
        return true;
      } catch (e) {
        console.error('Error clearing storage:', e);
        return false;
      }
    },

    loadSampleData: function() {
      if (!window.AERO_SAMPLE_RECORDS || !Array.isArray(window.AERO_SAMPLE_RECORDS)) {
        return { success: false, errors: ['Sample dataset file is not available.'] };
      }

      var sanitizedSamples = window.AERO_SAMPLE_RECORDS.map(function(item) {
        return sanitizeRecord(item);
      });

      var saved = this.saveLocalRecords(sanitizedSamples);
      if (saved) {
        memoryCache = sanitizedSamples.slice();
      }
      return {
        success: saved,
        count: sanitizedSamples.length
      };
    },

    // Safe, repeatable local-to-cloud migration using upsert with duplicate ignore
    syncLocalRecordsToCloud: function(callback) {
      callback = callback || function() {};
      var self = this;
      var supabase = window.AeroSupabase.getClient();
      var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();

      if (!isAuth || !supabase) {
        callback({ success: false, message: 'You must be signed in to sync records to the cloud.' });
        return;
      }

      var user = window.AeroAuth.getCurrentUser();
      var localRecords = self.getLocalRecords();
      var unSyncedRecords = localRecords.filter(function(r) { return !r.synced; });

      if (unSyncedRecords.length === 0) {
        callback({ success: true, count: 0, message: 'All local records are already synced.' });
        return;
      }

      // Map local record ID to local_id; omit 'id' so Supabase generates UUID
      var payload = unSyncedRecords.map(function(r) {
        var lit = Number(r.litres);
        var prc = Number(r.pricePerLitre);
        var total = Number((lit * prc).toFixed(2));

        return {
          user_id: user.id,
          local_id: r.id,
          date: r.date,
          state: r.state,
          city: r.city,
          vehicle_type: r.vehicleType,
          fuel_type: r.fuelType,
          litres: lit,
          price_per_litre: prc,
          total_amount: total,
          notes: r.notes || ''
        };
      });

      // Execute upsert targeting uq_fuel_records_user_local_id
      // Do not use ignoreDuplicates: true, so Postgres performs ON CONFLICT DO UPDATE
      // and updates existing rows with edited values instead of silently ignoring changes
      supabase.from('fuel_records')
        .upsert(payload, {
          onConflict: 'user_id,local_id'
        })
        .select()
        .then(function(res) {
          if (res.error) {
            callback({
              success: false,
              syncedCount: 0,
              failedCount: unSyncedRecords.length,
              message: 'Sync could not be completed: ' + res.error.message + '. All local records remain safe on your device.'
            });
            return;
          }

          // Mark successfully confirmed records as synced in localStorage without deleting them
          var confirmedLocalIds = {};
          payload.forEach(function(item) {
            confirmedLocalIds[item.local_id] = true;
          });

          var updatedLocal = localRecords.map(function(r) {
            if (confirmedLocalIds[r.id]) {
              return Object.assign({}, r, { synced: true, syncedAt: new Date().toISOString() });
            }
            return r;
          });

          self.saveLocalRecords(updatedLocal);

          callback({
            success: true,
            syncedCount: payload.length,
            failedCount: 0,
            message: 'Successfully synced ' + payload.length + ' record(s) to your cloud account. Local copies remain preserved in this browser.'
          });
        })
        .catch(function(err) {
          callback({
            success: false,
            syncedCount: 0,
            failedCount: unSyncedRecords.length,
            message: 'Network error during sync: ' + err.message + '. Local records remain safe on your device.'
          });
        });
    },

    exportJsonBackup: function() {
      var records = this.getAll();
      var backupPayload = {
        application: 'AERO // FUEL INDIA',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        recordCount: records.length,
        records: records
      };
      return JSON.stringify(backupPayload, null, 2);
    },

    restoreJsonBackup: function(jsonString, mode, callback) {
      callback = callback || function() {};
      mode = mode || 'replace';
      var self = this;

      try {
        var parsed = JSON.parse(jsonString);
        var incomingRecords = [];

        if (Array.isArray(parsed)) {
          incomingRecords = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          incomingRecords = parsed.records;
        } else {
          var errObj = { success: false, errors: ['Invalid backup structure. Expected array or records property.'] };
          callback(errObj);
          return errObj;
        }

        var validRecords = [];
        var skippedCount = 0;

        for (var i = 0; i < incomingRecords.length; i++) {
          var item = incomingRecords[i];
          var check = validateRecordFields(item);
          if (check.isValid) {
            validRecords.push(sanitizeRecord(item));
          } else {
            skippedCount++;
          }
        }

        if (validRecords.length === 0) {
          var emptyErr = {
            success: false,
            errors: ['No valid records found in the backup file. Checked ' + incomingRecords.length + ' rows.']
          };
          callback(emptyErr);
          return emptyErr;
        }

        var isAuth = window.AeroAuth && window.AeroAuth.isAuthenticated();
        var supabase = window.AeroSupabase.getClient();

        if (isAuth && supabase) {
          var user = window.AeroAuth.getCurrentUser();
          var dbRows = validRecords.map(function(r) {
            return {
              user_id: user.id,
              date: r.date,
              state: r.state,
              city: r.city,
              vehicle_type: r.vehicleType,
              fuel_type: r.fuelType,
              litres: r.litres,
              price_per_litre: r.pricePerLitre,
              total_amount: r.totalAmount,
              notes: r.notes || ''
            };
          });

          supabase.from('fuel_records')
            .insert(dbRows)
            .then(function(res) {
              if (res.error) {
                callback({ success: false, errors: [res.error.message] });
                return;
              }
              self.loadAll(function() {
                callback({
                  success: true,
                  restoredCount: validRecords.length,
                  skippedCount: skippedCount,
                  totalStored: memoryCache.length
                });
              });
            })
            .catch(function(err) {
              callback({ success: false, errors: [err.message] });
            });

          return { pending: true };
        } else {
          var finalRecords = [];
          if (mode === 'merge') {
            var current = self.getLocalRecords();
            var existingIds = {};
            current.forEach(function(r) { existingIds[r.id] = true; });

            finalRecords = current.slice();
            validRecords.forEach(function(r) {
              if (!existingIds[r.id]) {
                finalRecords.push(r);
                existingIds[r.id] = true;
              }
            });
          } else {
            finalRecords = validRecords;
          }

          finalRecords.sort(function(a, b) {
            return b.date.localeCompare(a.date);
          });

          var saved = self.saveLocalRecords(finalRecords);
          memoryCache = finalRecords.slice();

          var resultObj = {
            success: saved,
            restoredCount: validRecords.length,
            skippedCount: skippedCount,
            totalStored: finalRecords.length
          };
          callback(resultObj);
          return resultObj;
        }
      } catch (e) {
        var parseErr = { success: false, errors: ['Could not parse JSON file: ' + e.message] };
        callback(parseErr);
        return parseErr;
      }
    },

    validateRecord: validateRecordFields,
    sanitizeRecord: sanitizeRecord
  };

  window.AeroStorage = StorageManager;
})(window);
