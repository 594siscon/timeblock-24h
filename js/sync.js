(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});

  const SYNC_CONFIG_KEY = 'timeblock_24h_firebase_cfg_v1';
  const CLIENT_ID_KEY = 'timeblock_24h_client_id_v1';
  const COLLECTION_NAME = 'schedules';

  function getOrCreateClientId() {
    let cid = global.localStorage.getItem(CLIENT_ID_KEY);
    if (!cid) {
      cid = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      global.localStorage.setItem(CLIENT_ID_KEY, cid);
    }
    return cid;
  }

  /**
   * Smartly parses either valid JSON or the JS object snippet copied directly from Firebase Console
   * (e.g. `const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "..." };`)
   */
  function parseFirebaseConfigInput(rawText) {
    const text = (rawText || '').trim();
    if (!text) return null;

    // Try direct JSON first
    try {
      const obj = JSON.parse(text);
      if (obj && obj.apiKey && obj.projectId) return normalizeConfig(obj);
    } catch (_) {}

    // Extract key: "value" or key: 'value' pairs from JS snippet
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const extracted = {};
    for (const key of keys) {
      const re = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
      const match = text.match(re);
      if (match) extracted[key] = match[1].trim();
    }
    if (extracted.apiKey && extracted.projectId) {
      return normalizeConfig(extracted);
    }
    return null;
  }

  function normalizeConfig(obj) {
    const projectId = (obj.projectId || '').trim();
    return {
      apiKey: (obj.apiKey || '').trim(),
      authDomain: (obj.authDomain || (projectId ? `${projectId}.firebaseapp.com` : '')).trim(),
      projectId,
      storageBucket: (obj.storageBucket || '').trim(),
      messagingSenderId: (obj.messagingSenderId || '').trim(),
      appId: (obj.appId || '').trim()
    };
  }

  class CloudSyncManager {
    constructor() {
      this.clientId = getOrCreateClientId();
      this.app = null;
      this.auth = null;
      this.db = null;
      this.user = null;
      this.unsubSnapshot = null;
      this.unsubAuth = null;
      this.pushTimer = null;
      this.isApplyingRemote = false;
      this.status = 'disconnected'; // disconnected | connecting | synced | syncing | offline | error
      this.lastSyncedAt = null;
      this.lastError = '';
      this.listeners = new Set();

      this.config = this.loadConfig();
    }

    loadConfig() {
      // 1. Check URL param (?fb_cfg=base64) for 1-click iPhone setup
      try {
        const params = new URLSearchParams(global.location.search);
        const encoded = params.get('fb_cfg');
        if (encoded) {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
          if (decoded?.apiKey && decoded?.projectId) {
            const norm = normalizeConfig(decoded);
            global.localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(norm));
            const cleanUrl = global.location.origin + global.location.pathname;
            global.history.replaceState({}, '', cleanUrl);
            return norm;
          }
        }
      } catch (_) {}

      // 2. Check localStorage saved config
      try {
        const raw = global.localStorage.getItem(SYNC_CONFIG_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.apiKey && parsed?.projectId) return normalizeConfig(parsed);
        }
      } catch (_) {}

      // 3. Fallback to js/sync-config.js prefilled config
      const pre = global.TIMEFLOW_FIREBASE_CONFIG || {};
      return normalizeConfig(pre);
    }

    saveConfig(cfgObj) {
      this.config = normalizeConfig(cfgObj);
      global.localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(this.config));
    }

    hasConfig() {
      return Boolean(this.config.apiKey && this.config.projectId && this.config.authDomain);
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    setStatus(status, errorMsg = '') {
      this.status = status;
      this.lastError = errorMsg;
      for (const fn of this.listeners) fn(this.getStatusInfo());
    }

    getStatusInfo() {
      return {
        status: this.status,
        user: this.user,
        lastSyncedAt: this.lastSyncedAt,
        lastError: this.lastError,
        hasConfig: this.hasConfig(),
        sdkLoaded: Boolean(global.firebase && global.firebase.initializeApp)
      };
    }

    async init() {
      // Listen to local store mutations -> schedule debounced push to Firestore
      TF.store.subscribe((reason) => {
        if (this.isApplyingRemote) return;
        if (['date', 'filter', 'selection', 'zoom', 'remote-sync'].includes(reason)) return;
        if (this.user && this.db) {
          this.schedulePush();
        }
      });

      // Re-sync cleanly when iPhone PWA returns from background or reconnects
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.user && this.db) {
          this.pullFromCloud({ silent: true });
        }
      });

      global.addEventListener('online', () => {
        if (this.user && this.db) {
          this.pullFromCloud({ silent: true });
        }
      });

      global.addEventListener('offline', () => {
        if (this.user) this.setStatus('offline');
      });

      if (this.hasConfig()) {
        await this.connectClient();
      } else {
        this.setStatus('disconnected');
      }
    }

    async connectClient() {
      if (!this.hasConfig()) {
        this.setStatus('disconnected');
        return false;
      }
      if (!global.firebase || !global.firebase.initializeApp) {
        this.setStatus('offline', '尚未載入 Firebase SDK（可能處於離線狀態）');
        return false;
      }

      this.setStatus('connecting');
      try {
        this.cleanupListeners();

        // Reuse or recreate named Firebase app so re-saving config works cleanly without reload
        const existing = global.firebase.apps.find((a) => a.name === 'timeflow');
        if (existing) {
          await existing.delete();
        }

        this.app = global.firebase.initializeApp(this.config, 'timeflow');
        this.auth = this.app.auth();
        this.db = this.app.firestore();

        // Persist auth session across iPhone Safari / PWA restarts
        try {
          await this.auth.setPersistence(global.firebase.auth.Auth.Persistence.LOCAL);
        } catch (_) {}

        // Complete any pending redirect sign-in if one was triggered
        this.auth.getRedirectResult().catch((err) => {
          if (err && err.code) {
            console.warn('Google Redirect 登入狀態：', err);
            this.setStatus('error', `${err.code}: ${err.message || 'Google 登入失敗'}`);
          }
        });

        this.unsubAuth = this.auth.onAuthStateChanged(async (user) => {
          if (user) {
            if (!this.user || this.user.uid !== user.uid) {
              await this.handleSignedIn(user);
            }
          } else {
            this.cleanupSnapshot();
            this.user = null;
            this.setStatus('disconnected');
          }
        });

        return true;
      } catch (err) {
        console.error('Firebase 初始化失敗：', err);
        this.setStatus('error', err.message || 'Firebase 設定有誤');
        return false;
      }
    }

    async handleSignedIn(user) {
      this.user = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      };
      this.setStatus('syncing');

      const pulled = await this.pullFromCloud({ initialLogin: true });
      if (pulled === 'empty') {
        await this.pushToCloud();
      }
      this.startRealtimeListener();
    }

    async signInWithGoogle() {
      if (!this.auth) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先貼上正確的 Firebase 設定（firebaseConfig）');
      }

      const provider = new global.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Always prefer signInWithPopup first — on iOS Safari 16+, cross-domain signInWithRedirect
      // (github.io -> firebaseapp.com) is silently dropped by Apple ITP third-party storage partitioning,
      // whereas signInWithPopup uses window.opener messaging and succeeds cleanly!
      const result = await this.auth.signInWithPopup(provider);
      if (result?.user) {
        await this.handleSignedIn(result.user);
      }
      return result?.user || null;
    }

    async signInWithEmail(email, password) {
      if (!this.auth) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先貼上正確的 Firebase 設定（firebaseConfig）');
      }
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      if (result?.user) {
        await this.handleSignedIn(result.user);
      }
      return result?.user || null;
    }

    async signUpWithEmail(email, password) {
      if (!this.auth) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先貼上正確的 Firebase 設定（firebaseConfig）');
      }
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      if (result?.user) {
        await this.handleSignedIn(result.user);
      }
      return result?.user || null;
    }

    async signOut() {
      this.cleanupSnapshot();
      if (this.auth) {
        await this.auth.signOut();
      }
      this.user = null;
      this.setStatus('disconnected');
    }

    getDocRef() {
      if (!this.db || !this.user) return null;
      return this.db.collection(COLLECTION_NAME).doc(this.user.uid);
    }

    schedulePush() {
      clearTimeout(this.pushTimer);
      this.setStatus('syncing');
      this.pushTimer = setTimeout(() => {
        this.pushToCloud();
      }, 450);
    }

    buildSyncPayload() {
      return {
        categories: TF.store.state.categories,
        templates: TF.store.state.templates,
        dayTemplates: TF.store.state.dayTemplates || [],
        blocksByDate: TF.store.state.blocksByDate,
        settings: TF.store.state.settings
      };
    }

    async pushToCloud() {
      const ref = this.getDocRef();
      if (!ref) return false;
      if (!navigator.onLine) {
        this.setStatus('offline', '目前離線，恢復連線後將自動同步');
        return false;
      }

      this.setStatus('syncing');
      try {
        await ref.set({
          payload: this.buildSyncPayload(),
          clientId: this.clientId,
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: Date.now()
        });
        this.lastSyncedAt = new Date();
        this.setStatus('synced');
        return true;
      } catch (err) {
        console.error('Firestore 上傳失敗：', err);
        this.setStatus('error', err.message || '同步上傳失敗，請確認 Firestore 規則');
        return false;
      }
    }

    async pullFromCloud({ initialLogin = false, silent = false } = {}) {
      const ref = this.getDocRef();
      if (!ref) return 'no-auth';
      if (!navigator.onLine) {
        this.setStatus('offline');
        return 'offline';
      }

      if (!silent) this.setStatus('syncing');
      try {
        const snap = await ref.get();
        if (!snap.exists) {
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          return 'empty';
        }

        const data = snap.data();
        if (!data?.payload || !Array.isArray(data.payload.categories)) {
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          return 'empty';
        }

        if (!initialLogin && data.clientId === this.clientId) {
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          return 'same';
        }

        this.applyRemotePayload(data.payload);
        this.lastSyncedAt = new Date();
        this.setStatus('synced');
        return 'updated';
      } catch (err) {
        console.error('Firestore 讀取失敗：', err);
        this.setStatus('error', err.message || '讀取雲端資料失敗');
        return 'error';
      }
    }

    startRealtimeListener() {
      this.cleanupSnapshot();
      const ref = this.getDocRef();
      if (!ref) return;

      let firstEvent = true;
      this.unsubSnapshot = ref.onSnapshot(
        (snap) => {
          if (firstEvent) {
            firstEvent = false;
            return;
          }
          if (!snap.exists) return;
          if (snap.metadata.hasPendingWrites) return;

          const data = snap.data();
          if (!data?.payload || data.clientId === this.clientId) return;

          this.applyRemotePayload(data.payload);
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          TF.ui?.showToast('☁️ 已即時同步來自其他裝置的更新');
        },
        (err) => {
          console.error('Firestore 即時監聽錯誤：', err);
          this.setStatus('error', err.message || '即時同步連線中斷');
        }
      );
    }

    applyRemotePayload(payload) {
      if (!payload || !Array.isArray(payload.categories) || !Array.isArray(payload.templates)) return;
      this.isApplyingRemote = true;
      try {
        TF.store.state.categories = payload.categories;
        TF.store.state.templates = payload.templates;
        if (Array.isArray(payload.dayTemplates)) {
          TF.store.state.dayTemplates = payload.dayTemplates;
        }
        TF.store.state.blocksByDate = payload.blocksByDate || {};
        if (payload.settings) {
          TF.store.state.settings = {
            ...TF.store.state.settings,
            ...payload.settings
          };
        }
        TF.store.notify('remote-sync');
      } finally {
        this.isApplyingRemote = false;
      }
    }

    cleanupSnapshot() {
      if (this.unsubSnapshot) {
        try { this.unsubSnapshot(); } catch (_) {}
        this.unsubSnapshot = null;
      }
    }

    cleanupListeners() {
      this.cleanupSnapshot();
      if (this.unsubAuth) {
        try { this.unsubAuth(); } catch (_) {}
        this.unsubAuth = null;
      }
    }

    getQuickShareLink() {
      if (!this.hasConfig()) return '';
      const base = global.location.origin + global.location.pathname;
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.config))));
      return `${base}?fb_cfg=${encodeURIComponent(encoded)}`;
    }
  }

  TF.parseFirebaseConfigInput = parseFirebaseConfigInput;
  TF.sync = new CloudSyncManager();
})(window);
