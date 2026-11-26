/*
 * Configuration du jeu Loup Garou
 * ---------------------------------------------------------------
 * Le temps réel passe par Supabase Realtime (projet « leone », le même
 * que le site de la résidence). Aucune table n'est utilisée : les
 * parties vivent sur le téléphone de l'hôte et transitent par des
 * canaux de diffusion. La clé « anon » est publique par nature.
 * Si tu changes de projet Supabase, pense aussi à mettre à jour la
 * ligne Content-Security-Policy (connect-src) dans index.html.
 */
window.LG_CONFIG = {
  supabaseUrl: "https://dmcqeivddhosfzuttgzb.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtY3FlaXZkZGhvc2Z6dXR0Z3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNjgxODAsImV4cCI6MjEwOTY0NDE4MH0.OtasSnLUCjHxiW8u8VpEASfc35r8xIvHnCGcphkdc7o",

  // Lien vers le site de la résidence (vide = lien masqué)
  leoneUrl: "https://jk-asfc.github.io/portfolio/"
};
