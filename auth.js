// AERO // FUEL INDIA - User Authentication & Session Management Module

(function(window) {
  'use strict';

  var currentUser = null;
  var authListeners = [];

  var AuthManager = {
    init: function() {
      this.cacheDom();
      this.bindEvents();
      this.checkSession();
    },

    cacheDom: function() {
      // Header Auth Elements
      this.authControlsGuest = document.getElementById('header-auth-guest');
      this.authControlsUser = document.getElementById('header-auth-user');
      this.userEmailDisplay = document.getElementById('header-user-email');
      this.btnOpenSignIn = document.getElementById('btn-open-signin');
      this.btnOpenSignUp = document.getElementById('btn-open-signup');
      this.btnSignOut = document.getElementById('btn-sign-out');

      // Auth Modal Elements
      this.authModal = document.getElementById('auth-modal');
      this.modalCloseBtn = document.getElementById('auth-modal-close-btn');
      this.authModalTitle = document.getElementById('auth-modal-title');
      this.authTabs = document.querySelectorAll('[data-auth-tab]');
      this.authPanels = document.querySelectorAll('.auth-panel');
      this.authAlert = document.getElementById('auth-alert');

      // Forms
      this.signInForm = document.getElementById('signin-form');
      this.signUpForm = document.getElementById('signup-form');
      this.resetForm = document.getElementById('reset-form');
      this.updatePasswordForm = document.getElementById('update-password-form');
      this.tabBtnUpdatePassword = document.getElementById('tab-btn-update-password');
      this.inputUpdatePasswordNew = document.getElementById('update-password-new');
      this.inputUpdatePasswordConfirm = document.getElementById('update-password-confirm');
      this.btnSubmitUpdatePassword = document.getElementById('btn-submit-update-password');

      // Sync Prompt Modal Elements
      this.syncModal = document.getElementById('sync-prompt-modal');
      this.syncCountText = document.getElementById('sync-count-text');
      this.btnConfirmSync = document.getElementById('btn-confirm-sync');
      this.btnSkipSync = document.getElementById('btn-skip-sync');
      this.syncStatusAlert = document.getElementById('sync-status-alert');
    },

    bindEvents: function() {
      var self = this;

      if (this.btnOpenSignIn) {
        this.btnOpenSignIn.addEventListener('click', function() {
          self.openModal('signin');
        });
      }

      if (this.btnOpenSignUp) {
        this.btnOpenSignUp.addEventListener('click', function() {
          self.openModal('signup');
        });
      }

      if (this.btnSignOut) {
        this.btnSignOut.addEventListener('click', function() {
          self.signOut();
        });
      }

      if (this.modalCloseBtn) {
        this.modalCloseBtn.addEventListener('click', function() {
          self.closeModal();
        });
      }

      // Close modal on backdrop click
      if (this.authModal) {
        this.authModal.addEventListener('click', function(e) {
          if (e.target === self.authModal) {
            self.closeModal();
          }
        });
      }

      // Tab switcher in Auth Modal
      this.authTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var targetTab = tab.getAttribute('data-auth-tab');
          self.switchTab(targetTab);
        });
      });

      // Sign In Submit
      if (this.signInForm) {
        this.signInForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self.handleSignIn();
        });
      }

      // Sign Up Submit
      if (this.signUpForm) {
        this.signUpForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self.handleSignUp();
        });
      }

      // Password Reset Submit
      if (this.resetForm) {
        this.resetForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self.handlePasswordReset();
        });
      }

      // Password Update Submit (Recovery)
      if (this.updatePasswordForm) {
        this.updatePasswordForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self.handlePasswordUpdate();
        });
      }

      // Migration Sync Confirmation
      if (this.btnConfirmSync) {
        this.btnConfirmSync.addEventListener('click', function() {
          self.executeMigration();
        });
      }

      if (this.btnSkipSync) {
        this.btnSkipSync.addEventListener('click', function() {
          if (self.syncModal) self.syncModal.classList.add('hidden');
        });
      }
    },

    checkSession: function() {
      var self = this;
      var supabase = window.AeroSupabase.getClient();

      if (!supabase) {
        this.updateUiState(null);
        return;
      }

      supabase.auth.getSession().then(function(res) {
        if (res.data && res.data.session) {
          currentUser = res.data.session.user;
        } else {
          currentUser = null;
        }
        self.updateUiState(currentUser);
        self.notifyListeners(currentUser);

        // Check if user returned with a password recovery token in URL hash
        if (window.location.hash && (window.location.hash.indexOf('type=recovery') !== -1 || window.location.hash.indexOf('access_token=') !== -1)) {
          self.openModal('update-password');
          self.showAlert('Recovery link confirmed. Please enter your new password below.', 'success');
        }
      }).catch(function(err) {
        console.warn('Session check failed:', err);
        currentUser = null;
        self.updateUiState(null);
      });

      supabase.auth.onAuthStateChange(function(event, session) {
        var prevUser = currentUser;
        currentUser = session ? session.user : null;
        self.updateUiState(currentUser);
        self.notifyListeners(currentUser);

        // Password recovery event emitted by Supabase JS when link is followed
        if (event === 'PASSWORD_RECOVERY') {
          self.openModal('update-password');
          self.showAlert('Recovery link confirmed. Please enter your new password below.', 'success');
        }

        // When a user signs in, check for local records to offer safe sync
        if (event === 'SIGNED_IN' && currentUser && !prevUser) {
          self.checkLocalRecordsForSync();
        }

        // When a user signs out, reload records in guest mode
        if (event === 'SIGNED_OUT') {
          if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
            window.AeroRecords.load();
          }
        }
      });
    },

    updateUiState: function(user) {
      if (user) {
        if (this.authControlsGuest) this.authControlsGuest.classList.add('hidden');
        if (this.authControlsUser) this.authControlsUser.classList.remove('hidden');
        if (this.userEmailDisplay) this.userEmailDisplay.textContent = user.email || 'Account';
      } else {
        if (this.authControlsGuest) this.authControlsGuest.classList.remove('hidden');
        if (this.authControlsUser) this.authControlsUser.classList.add('hidden');
        if (this.userEmailDisplay) this.userEmailDisplay.textContent = '';
      }

      this.updateStorageBanner(user);
    },

    updateStorageBanner: function(user) {
      var noticeBanner = document.getElementById('storage-notice-text-content');
      if (!noticeBanner) return;

      if (user) {
        noticeBanner.innerHTML = '<strong>Cloud Storage Active:</strong> Your fuel records are transmitted over HTTPS to Supabase and stored in your private Postgres database account. Export a JSON backup anytime for an offline copy.';
      } else {
        noticeBanner.innerHTML = '<strong>Local Storage Mode:</strong> Your fuel records stay in this browser on this device (key: <code>aero_fuel_records_v1</code>). Sign in to sync your records to the cloud.';
      }
    },

    openModal: function(tabName) {
      if (!window.AeroSupabase.isConfigured()) {
        window.AeroApp.showToast('Supabase is not configured yet. Insert your Project URL and anon key in js/config.js.', 'info');
      }

      tabName = tabName || 'signin';
      this.switchTab(tabName);
      this.clearAlert();

      if (this.authModal) {
        this.authModal.classList.remove('hidden');
        var firstInput = this.authModal.querySelector('input:not([type="hidden"])');
        if (firstInput) firstInput.focus();
      }
    },

    closeModal: function() {
      if (this.authModal) {
        this.authModal.classList.add('hidden');
      }
      this.clearAlert();
    },

    switchTab: function(tabName) {
      var self = this;
      var tabs = document.querySelectorAll('[data-auth-tab]');
      tabs.forEach(function(t) {
        if (t.getAttribute('data-auth-tab') === tabName) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });

      if (this.tabBtnUpdatePassword) {
        if (tabName === 'update-password') {
          this.tabBtnUpdatePassword.classList.remove('hidden');
        } else {
          this.tabBtnUpdatePassword.classList.add('hidden');
        }
      }

      var panels = document.querySelectorAll('.auth-panel');
      panels.forEach(function(p) {
        if (p.id === 'auth-panel-' + tabName) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });

      if (this.authModalTitle) {
        if (tabName === 'signup') {
          this.authModalTitle.textContent = 'Create Cloud Account';
        } else if (tabName === 'reset') {
          this.authModalTitle.textContent = 'Reset Password';
        } else if (tabName === 'update-password') {
          this.authModalTitle.textContent = 'Set New Password';
        } else {
          this.authModalTitle.textContent = 'Sign In to Account';
        }
      }

      this.clearAlert();
    },

    showAlert: function(message, type) {
      if (!this.authAlert) return;
      this.authAlert.className = 'form-alert ' + (type === 'success' ? 'form-alert-success' : 'form-alert-danger');
      this.authAlert.textContent = message;
      this.authAlert.classList.remove('hidden');
    },

    clearAlert: function() {
      if (!this.authAlert) return;
      this.authAlert.textContent = '';
      this.authAlert.classList.add('hidden');
    },

    handleSignIn: function() {
      var self = this;
      var email = document.getElementById('signin-email').value.trim();
      var password = document.getElementById('signin-password').value;
      var submitBtn = document.getElementById('btn-submit-signin');

      if (!email || !password) {
        self.showAlert('Please enter both email and password.', 'error');
        return;
      }

      var supabase = window.AeroSupabase.getClient();
      if (!supabase) {
        self.showAlert('Supabase credentials are not configured. Check js/config.js.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
      self.clearAlert();

      supabase.auth.signInWithPassword({
        email: email,
        password: password
      }).then(function(res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';

        if (res.error) {
          self.showAlert(res.error.message || 'Failed to sign in. Check email and password.', 'error');
          return;
        }

        self.closeModal();
        window.AeroApp.showToast('Signed in successfully as ' + email, 'success');
        if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
          window.AeroRecords.load();
        }
      }).catch(function(err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        self.showAlert('Unexpected error: ' + err.message, 'error');
      });
    },

    handleSignUp: function() {
      var self = this;
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      var confirmPassword = document.getElementById('signup-confirm').value;
      var submitBtn = document.getElementById('btn-submit-signup');

      if (!email || !password) {
        self.showAlert('Please fill in all required fields.', 'error');
        return;
      }

      if (password.length < 6) {
        self.showAlert('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        self.showAlert('Passwords do not match.', 'error');
        return;
      }

      var supabase = window.AeroSupabase.getClient();
      if (!supabase) {
        self.showAlert('Supabase credentials are not configured. Check js/config.js.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
      self.clearAlert();

      supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.location.origin
        }
      }).then(function(res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        if (res.error) {
          self.showAlert(res.error.message || 'Failed to create account.', 'error');
          return;
        }

        if (res.data && res.data.user && !res.data.session) {
          self.showAlert('Account created. Please check your email inbox to confirm your registration link.', 'success');
        } else {
          self.closeModal();
          window.AeroApp.showToast('Account created and signed in!', 'success');
          if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
            window.AeroRecords.load();
          }
        }
      }).catch(function(err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        self.showAlert('Unexpected error: ' + err.message, 'error');
      });
    },

    handlePasswordReset: function() {
      var self = this;
      var email = document.getElementById('reset-email').value.trim();
      var submitBtn = document.getElementById('btn-submit-reset');

      if (!email) {
        self.showAlert('Please enter your account email address.', 'error');
        return;
      }

      var supabase = window.AeroSupabase.getClient();
      if (!supabase) {
        self.showAlert('Supabase credentials are not configured. Check js/config.js.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending link...';
      self.clearAlert();

      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      }).then(function(res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';

        if (res.error) {
          self.showAlert(res.error.message || 'Could not send reset email.', 'error');
          return;
        }

        self.showAlert('Password reset link sent. Please check your email inbox.', 'success');
      }).catch(function(err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
        self.showAlert('Unexpected error: ' + err.message, 'error');
      });
    },

    handlePasswordUpdate: function() {
      var self = this;
      var newPassword = this.inputUpdatePasswordNew ? this.inputUpdatePasswordNew.value : '';
      var confirmPassword = this.inputUpdatePasswordConfirm ? this.inputUpdatePasswordConfirm.value : '';
      var submitBtn = this.btnSubmitUpdatePassword;

      if (!newPassword || !confirmPassword) {
        self.showAlert('Please fill in both password fields.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        self.showAlert('New password must be at least 6 characters long.', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        self.showAlert('Passwords do not match.', 'error');
        return;
      }

      var supabase = window.AeroSupabase.getClient();
      if (!supabase) {
        self.showAlert('Supabase credentials are not configured. Check js/config.js.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving password...';
      }
      self.clearAlert();

      supabase.auth.updateUser({
        password: newPassword
      }).then(function(res) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save New Password';
        }

        if (res.error) {
          self.showAlert(res.error.message || 'Failed to update password.', 'error');
          return;
        }

        if (self.inputUpdatePasswordNew) self.inputUpdatePasswordNew.value = '';
        if (self.inputUpdatePasswordConfirm) self.inputUpdatePasswordConfirm.value = '';

        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        self.showAlert('Password updated successfully. You are now logged in with your new password.', 'success');
        if (res.data && res.data.user) {
          currentUser = res.data.user;
          self.updateUiState(currentUser);
          self.notifyListeners(currentUser);
        }

        setTimeout(function() {
          self.closeModal();
          window.AeroApp.showToast('Password updated successfully.', 'success');
          if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
            window.AeroRecords.load();
          }
        }, 1500);
      }).catch(function(err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save New Password';
        }
        self.showAlert('Unexpected error: ' + err.message, 'error');
      });
    },

    signOut: function() {
      var self = this;
      var supabase = window.AeroSupabase.getClient();
      if (!supabase) return;

      supabase.auth.signOut().then(function() {
        currentUser = null;
        self.updateUiState(null);
        window.AeroApp.showToast('Signed out. Local guest mode active.', 'info');
        if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
          window.AeroRecords.load();
        }
      }).catch(function(err) {
        console.error('Sign out error:', err);
      });
    },

    checkLocalRecordsForSync: function() {
      var self = this;
      var localRecords = window.AeroStorage.getLocalRecords();
      var unSyncedRecords = localRecords.filter(function(r) { return !r.synced; });

      if (unSyncedRecords.length === 0) return;

      if (this.syncCountText) {
        this.syncCountText.textContent = unSyncedRecords.length;
      }

      if (this.syncStatusAlert) {
        this.syncStatusAlert.className = 'form-alert hidden';
        this.syncStatusAlert.textContent = '';
      }

      if (this.syncModal) {
        this.syncModal.classList.remove('hidden');
      }
    },

    executeMigration: function() {
      var self = this;
      var supabase = window.AeroSupabase.getClient();
      if (!supabase || !currentUser) return;

      var btn = self.btnConfirmSync;
      btn.disabled = true;
      btn.textContent = 'Syncing records...';

      window.AeroStorage.syncLocalRecordsToCloud(function(result) {
        btn.disabled = false;
        btn.textContent = 'Sync to Cloud Account';

        if (result.success) {
          if (self.syncModal) self.syncModal.classList.add('hidden');
          window.AeroApp.showToast(result.message, 'success');
          if (window.AeroRecords && typeof window.AeroRecords.load === 'function') {
            window.AeroRecords.load();
          }
        } else {
          if (self.syncStatusAlert) {
            self.syncStatusAlert.className = 'form-alert form-alert-danger';
            self.syncStatusAlert.textContent = result.message;
            self.syncStatusAlert.classList.remove('hidden');
          }
        }
      });
    },

    getCurrentUser: function() {
      return currentUser;
    },

    isAuthenticated: function() {
      return currentUser !== null;
    },

    onAuthStateChange: function(callback) {
      if (typeof callback === 'function') {
        authListeners.push(callback);
      }
    },

    notifyListeners: function(user) {
      authListeners.forEach(function(fn) {
        try { fn(user); } catch (e) { console.error('Auth listener error:', e); }
      });
    }
  };

  window.AeroAuth = AuthManager;
})(window);
