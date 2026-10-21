export const AppConfig = {
  apiBaseURL: "https://anassyed-homelab.tail3bc01f.ts.net:4443",
  supabaseURL: "https://anassyed-homelab.tail3bc01f.ts.net:4444",
  /// Public anon key (RLS denies all app tables). Never put service_role or JWT secret here.
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkxNjY2ODUyLCJleHAiOjE5NDkzNDY4NTJ9.4oj4xgkyMV4l4XWG1Jv2FhdqYTSg4Y48XzGqVeyG97k",
  vncHost: "anassyed-homelab.tail3bc01f.ts.net",
  vncPort: 4445,
  packageName: "com.anassyed.elvie",
  googleIOSClientID:
    "932306589160-m48seu68n5ocoehga43j7re1nuv063nj.apps.googleusercontent.com",
  googleWebClientID:
    "932306589160-gr65ata6ls6b2q4in4tggbgoar1jcllq.apps.googleusercontent.com",
  googleHintEmail: "stoicgreek2006@gmail.com",
} as const;
