// Supabase project config. Fill in these two values from your Supabase dashboard:
//   Project Settings → API → "Project URL" and "anon / public" key.
// Both are designed for client-side use; RLS policies on the Supabase side
// gate the actual data access.
window.SUPABASE_CONFIG = {
  // Turnpage organization → rewind-tariffs project
  url: "https://eorvwzbvsgxillflanae.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcnZ3emJ2c2d4aWxsZmxhbmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTExOTcsImV4cCI6MjA4Nzc4NzE5N30.QrSauz78wXffXmA8zXQ3_y6-K_zjtKU2-KL9k5m7gbk",
  // Allowed email(s). Sign-in requests from any other address are rejected
  // client-side AND must be enforced server-side via Supabase Auth user table.
  allowedEmails: ["ag@turnpagedigital.com"],
};
