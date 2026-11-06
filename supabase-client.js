"use strict";

(function () {
  const config = {
    url: "https://zskoboksscjvenqxmzgd.supabase.co",
    publishableKey: "sb_publishable_YbCz2jc_QzBCRPlCliUOwA_4VpCSA6m",
  };

  if (!window.supabase?.createClient) {
    window.onyxSupabaseError =
      "Supabase could not load. Check your internet connection and reload.";
    return;
  }

  window.onyxSupabase = window.supabase.createClient(
    config.url,
    config.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );
})();
