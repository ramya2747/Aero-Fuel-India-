// AERO // FUEL INDIA - Supabase Client Initializer

(function(window) {
  'use strict';

  var clientInstance = null;

  function checkIsConfigured() {
    var config = window.AERO_CONFIG;
    if (!config) return false;
    if (!config.SUPABASE_URL || config.SUPABASE_URL === 'YOUR_SUPABASE_URL') return false;
    if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') return false;
    return true;
  }

  function initClient() {
    if (!checkIsConfigured()) {
      return null;
    }

    if (clientInstance) {
      return clientInstance;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase JS library not loaded.');
      return null;
    }

    try {
      clientInstance = window.supabase.createClient(
        window.AERO_CONFIG.SUPABASE_URL,
        window.AERO_CONFIG.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
      return clientInstance;
    } catch (err) {
      console.error('Error initializing Supabase client:', err);
      return null;
    }
  }

  window.AeroSupabase = {
    isConfigured: checkIsConfigured,
    getClient: function() {
      if (!clientInstance) {
        initClient();
      }
      return clientInstance;
    }
  };
})(window);
