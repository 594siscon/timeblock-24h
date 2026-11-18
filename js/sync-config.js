/**
 * 選填：若將你的 Supabase Project URL 與 Publishable (Anon) Key 填在這裡並推送到 GitHub，
 * 在電腦與 iPhone 開啟網頁時就會自動套用，不需在每台裝置手動貼上金鑰。
 * （搭配 supabase_setup.sql 的 RLS 權限規則，Anon Key 設計上可安全公開於前端）
 */
window.TIMEFLOW_SUPABASE_CONFIG = {
  url: '',      // 例如：'https://xxxxxxxxxxxx.supabase.co'
  anonKey: ''   // 例如：'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
