Deployment to v0 — required environment variables and setup

This project is deployed to v0 and uses Supabase for auth and storage. The application assumes production domain https://kuaminisystems.com.

Required environment variables (set in your v0 project settings):

- NEXT_PUBLIC_SUPABASE_URL
  - Example: https://<your-supabase-project>.supabase.co
  - Public client URL used by browser code.

- NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Supabase anon public key for client-side SDK.

- SUPABASE_SERVICE_ROLE_KEY
  - Supabase service role key (server-only). IMPORTANT: keep this secret and only set in v0 secrets; do not expose to clients.

- NEXT_PUBLIC_API_BASE_URL
  - Optional but recommended. Example: https://kuaminisystems.com/api/agent
  - When set, this value is used by the client and server to generate installer scripts and API calls.
  - If not set, the code falls back to the production domain https://kuaminisystems.com.

- NEXT_PUBLIC_SUPABASE_REDIRECT_URL
  - The callback URL for Supabase email verification / OAuth flows.
  - Must match the callback route in the application and be added to allowed redirect URLs in Supabase Auth settings.
  - Example: https://kuaminisystems.com/securityAgent/auth/callback

Supabase dashboard setup steps:
1. Go to Supabase project → Authentication → Settings.
2. Under "Redirect URLs", add the full callback URL(s) used by the app (e.g., https://kuaminisystems.com/securityAgent/auth/callback).
3. Ensure SMTP/email settings are configured (so verification emails are sent).

Important notes:
- Never publish `SUPABASE_SERVICE_ROLE_KEY` to the client or commit it to the repository.
- The server route `/api/auth/register-existing` uses the service role key to look up users and create `accounts`/`profiles` entries.
- This repo no longer contains any `localhost` fallbacks — ensure your environment variables point to production URLs when deploying.

Quick deploy checklist:

- Add environment variables in v0 project settings (use the values above).
- In Supabase, add the redirect URL(s).
- Push to GitHub; v0 will auto-deploy when the repo updates.
- After deployment, test registration and installer download flows.

Troubleshooting:
- If verification emails still contain `localhost`, check the `NEXT_PUBLIC_SUPABASE_REDIRECT_URL` you set in v0 and the allowed redirect URLs in Supabase.
- If server routes fail with auth errors, confirm `SUPABASE_SERVICE_ROLE_KEY` is present in v0 secrets.

If you want, I can add a short CI/deploy script or a simple health-check endpoint to validate env vars at runtime.