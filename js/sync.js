(function (global) {
  'use strict';

  const TF = (global.TimeFlow = global.TimeFlow || {});

  const SYNC_CONFIG_KEY = 'timeblock_24h_supabase_cfg_v1';
  const CLIENT_ID_KEY = 'timeblock_24h_client_id_v1';
  const TABLE_NAME = 'user_schedules';

  function getOrCreateClientId() {
    let cid = global.localStorage.getItem(CLIENT_ID_KEY);
    if (!cid) {
      cid = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      global.localStorage.setItem(CLIENT_ID_KEY, cid);
    }
    return cid;
  }

  class CloudSyncManager {
    constructor() {
      this.clientId = getOrCreateClientId();
      this.supabase = null;
      this.user = null;
      this.channel = null;
      this.pushTimer = null;
      this.isApplyingRemote = false;
      this.status = 'disconnected'; // disconnected | connecting | synced | syncing | offline | error
      this.lastSyncedAt = null;
      this.lastError = '';
      this.listeners = new Set();

      this.config = this.loadConfig();
    }

    loadConfig() {
      // 1. Check URL params (?sb_url=...&sb_key=...) for quick device pairing
      try {
        const params = new URLSearchParams(global.location.search);
        const paramUrl = params.get('sb_url');
        const paramKey = params.get('sb_key');
        if (paramUrl && paramKey) {
          const cfg = { url: paramUrl.trim(), anonKey: paramKey.trim() };
          global.localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg));
          // Clean URL bar so key isn't left in browser history
          const cleanUrl = global.location.origin + global.location.pathname;
          global.history.replaceState({}, '', cleanUrl);
          return cfg;
        }
      } catch (_) {}

      // 2. Check localStorage saved config
      try {
        const raw = global.localStorage.getItem(SYNC_CONFIG_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.url && parsed?.anonKey) return parsed;
        }
      } catch (_) {}

      // 3. Fallback to js/sync-config.js prefilled config
      const pre = global.TIMEFLOW_SUPABASE_CONFIG || {};
      return {
        url: (pre.url || '').trim(),
        anonKey: (pre.anonKey || '').trim()
      };
    }

    saveConfig(url, anonKey) {
      this.config = {
        url: (url || '').trim().replace(/\/+$/, ''),
        anonKey: (anonKey || '').trim()
      };
      global.localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(this.config));
    }

    hasConfig() {
      return Boolean(this.config.url && this.config.anonKey);
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
        sdkLoaded: Boolean(global.supabase && global.supabase.createClient)
      };
    }

    async init() {
      // Listen to local store edits -> schedule debounced push
      TF.store.subscribe((reason) => {
        if (this.isApplyingRemote) return;
        if (['date', 'filter', 'selection', 'zoom', 'remote-sync'].includes(reason)) return;
        if (this.user && this.supabase) {
          this.schedulePush();
        }
      });

      // Re-sync when iPhone PWA wakes up from background or network reconnects
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.user && this.supabase) {
          this.pullFromCloud({ silent: true });
          this.ensureRealtimeSubscription();
        }
      });

      global.addEventListener('online', () => {
        if (this.user && this.supabase) {
          this.pullFromCloud({ silent: true });
          this.ensureRealtimeSubscription();
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
      if (!global.supabase || !global.supabase.createClient) {
        this.setStatus('offline', '尚未載入 Supabase SDK（可能處於離線狀態）');
        return false;
      }

      this.setStatus('connecting');
      try {
        this.cleanupRealtime();
        this.supabase = global.supabase.createClient(this.config.url, this.config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        const { data, error } = await this.supabase.auth.getSession();
        if (error) throw error;

        if (data?.session?.user) {
          // Clean OAuth callback tokens/code from URL bar after redirect
          if (global.location.hash.includes('access_token') || global.location.search.includes('code=')) {
            const cleanUrl = global.location.origin + global.location.pathname;
            global.history.replaceState({}, '', cleanUrl);
          }
          await this.handleSignedIn(data.session.user);
        } else {
          this.user = null;
          this.setStatus('disconnected');
        }

        this.supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            if (!this.user || this.user.id !== session.user.id) {
              await this.handleSignedIn(session.user);
            }
          } else if (event === 'SIGNED_OUT') {
            this.cleanupRealtime();
            this.user = null;
            this.setStatus('disconnected');
          }
        });

        return true;
      } catch (err) {
        console.error('Supabase 連線失敗:', err);
        this.setStatus('error', err.message || '連線設定有誤');
        return false;
      }
    }

    async handleSignedIn(user) {
      this.user = user;
      this.setStatus('syncing');
      const pulled = await this.pullFromCloud({ initialLogin: true });
      if (pulled === 'empty') {
        // Brand new cloud account -> upload current local schedule to cloud
        await this.pushToCloud();
      }
      this.ensureRealtimeSubscription();
    }

    async signInWithGoogle() {
      if (!this.supabase) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先設定正確的 Supabase URL 與 Anon Key');
      }
      const redirectTo = global.location.origin + global.location.pathname;
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    }

    async signUp(email, password) {
      if (!this.supabase) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先設定正確的 Supabase URL 與 Anon Key');
      }
      const { data, error } = await this.supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data?.session?.user) {
        await this.handleSignedIn(data.session.user);
        return { needsConfirm: false };
      }
      return { needsConfirm: true };
    }

    async signIn(email, password) {
      if (!this.supabase) {
        const ok = await this.connectClient();
        if (!ok) throw new Error('請先設定正確的 Supabase URL 與 Anon Key');
      }
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        await this.handleSignedIn(data.user);
      }
    }

    async signOut() {
      this.cleanupRealtime();
      if (this.supabase) {
        await this.supabase.auth.signOut();
      }
      this.user = null;
      this.setStatus('disconnected');
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
        blocksByDate: TF.store.state.blocksByDate,
        settings: TF.store.state.settings
      };
    }

    async pushToCloud() {
      if (!this.supabase || !this.user) return false;
      if (!navigator.onLine) {
        this.setStatus('offline', '目前離線，恢復連線後將自動同步');
        return false;
      }

      this.setStatus('syncing');
      try {
        const payload = this.buildSyncPayload();
        const nowIso = new Date().toISOString();
        const { error } = await this.supabase
          .from(TABLE_NAME)
          .upsert({
            user_id: this.user.id,
            payload,
            client_id: this.clientId,
            updated_at: nowIso
          }, { onConflict: 'user_id' });

        if (error) throw error;
        this.lastSyncedAt = new Date();
        this.setStatus('synced');
        return true;
      } catch (err) {
        console.error('雲端上傳失敗:', err);
        this.setStatus('error', err.message || '同步上傳失敗');
        return false;
      }
    }

    async pullFromCloud({ initialLogin = false, silent = false } = {}) {
      if (!this.supabase || !this.user) return 'no-auth';
      if (!navigator.onLine) {
        this.setStatus('offline');
        return 'offline';
      }

      if (!silent) this.setStatus('syncing');
      try {
        const { data, error } = await this.supabase
          .from(TABLE_NAME)
          .select('payload, client_id, updated_at')
          .eq('user_id', this.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data || !data.payload || !Array.isArray(data.payload.categories)) {
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          return 'empty';
        }

        // Skip applying if it's our own latest write unless initial login
        if (!initialLogin && data.client_id === this.clientId) {
          this.lastSyncedAt = new Date();
          this.setStatus('synced');
          return 'same';
        }

        this.applyRemotePayload(data.payload);
        this.lastSyncedAt = new Date();
        this.setStatus('synced');
        return 'updated';
      } catch (err) {
        console.error('雲端讀取失敗:', err);
        this.setStatus('error', err.message || '讀取雲端資料失敗');
        return 'error';
      }
    }

    applyRemotePayload(payload) {
      if (!payload || !Array.isArray(payload.categories) || !Array.isArray(payload.templates)) return;
      this.isApplyingRemote = true;
      try {
        TF.store.state.categories = payload.categories;
        TF.store.state.templates = payload.templates;
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

    ensureRealtimeSubscription() {
      if (!this.supabase || !this.user) return;
      if (this.channel) {
        const state = this.channel.state;
        if (state === 'joined' || state === 'joining') return;
        this.cleanupRealtime();
      }

      this.channel = this.supabase
        .channel(`schedule_${this.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLE_NAME,
            filter: `user_id=eq.${this.user.id}`
          },
          (change) => {
            const row = change.new;
            if (!row || !row.payload) return;
            // Ignore echo from our own device
            if (row.client_id === this.clientId) return;
            this.applyRemotePayload(row.payload);
            this.lastSyncedAt = new Date();
            this.setStatus('synced');
            TF.ui?.showToast('☁️ 已即時同步來自其他裝置的更新');
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('synced');
          }
        });
    }

    cleanupRealtime() {
      if (this.channel && this.supabase) {
        try {
          this.supabase.removeChannel(this.channel);
        } catch (_) {}
      }
      this.channel = null;
    }

    getQuickShareLink() {
      if (!this.hasConfig()) return '';
      const base = global.location.origin + global.location.pathname;
      const params = new URLSearchParams({
        sb_url: this.config.url,
        sb_key: this.config.anonKey
      });
      return `${base}?${params.toString()}`;
    }
  }

  TF.sync = new CloudSyncManager();
})(window);
