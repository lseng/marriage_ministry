# Bug: Password Sign-in 500 Error

## Bug Description
Users experience a 500 Internal Server Error when attempting to sign in with email and password. The error occurs when calling the Supabase Auth endpoint `POST /auth/v1/token?grant_type=password` with the credentials `admin@test.com` / `password123`. The error is triggered from `AuthContext.tsx:83` in the `signIn` function, which calls `supabase.auth.signInWithPassword()`.

**Symptoms:**
- 500 Internal Server Error from Supabase Auth
- Unable to authenticate with password-based login
- Magic link authentication not tested but likely also affected

**Expected Behavior:**
User should be successfully authenticated and redirected to the dashboard after entering valid credentials.

**Actual Behavior:**
HTTP 500 error returned from Supabase Auth endpoint, preventing user authentication.

## Problem Statement
The admin user was created by directly inserting records into the `auth.users` and `public.profiles` tables using SQL with manually encrypted passwords (`crypt('password123', gen_salt('bf'))`). This approach bypasses Supabase Auth's proper user creation flow, resulting in missing or improperly formatted authentication metadata that causes the auth service to fail during password verification.

## Solution Statement
Create a proper database seed file that uses Supabase Auth's API to create test users instead of directly inserting into `auth.users`. The seed file will programmatically call Supabase's user creation endpoints to ensure all required authentication fields are properly initialized. Additionally, create a health check script to validate the Supabase instance is running and configured correctly before attempting authentication.

## Steps to Reproduce
1. Ensure local Supabase instance is running (`supabase start`)
2. Start the Vite dev server (`npm run dev`)
3. Navigate to http://localhost:5173/
4. Enter credentials: `admin@test.com` / `password123`
5. Click "Sign in" button
6. Observe 500 Internal Server Error in browser console and network tab

## Root Cause Analysis
The root cause is **improper user creation bypassing Supabase Auth's user management system**:

1. **Manual Password Hashing**: The user was created with `crypt('password123', gen_salt('bf'))`, which uses PostgreSQL's bcrypt function. However, Supabase Auth may use a different password hashing algorithm or require additional metadata fields for authentication.

2. **Missing Auth Metadata**: When users are created directly via SQL INSERT into `auth.users`, critical fields are likely missing:
   - `raw_app_meta_data` - Application metadata required by Supabase Auth
   - `raw_user_meta_data` - User metadata
   - `confirmation_token`, `email_confirmed_at` - Email verification fields
   - `aud` (audience) - JWT audience claim
   - `role` - Auth role (typically 'authenticated')

3. **Config Mismatch**: The `supabase/config.toml` has `enable_confirmations = false` for email, but the manually created user may not have proper confirmation state set.

4. **No Seed File**: The `supabase/config.toml` references `./seed.sql` in the `[db.seed]` section, but this file doesn't exist. Without a proper seed file, there's no consistent way to create test users.

5. **Password Format**: Supabase Auth expects passwords to be hashed in its specific format. Direct bcrypt hashing may not match the expected algorithm, salt rounds, or encoding.

## Relevant Files
Use these files to fix the bug:

- **supabase/seed.sql** - Does not exist yet; needs to be created to properly seed test users using Supabase's auth functions or admin API
  - This is the primary file that needs to be created
  - Should use Supabase's internal functions to create users properly
  - Must create both auth.users records and public.profiles records correctly

- **contexts/AuthContext.tsx:82-85** - Contains the `signIn` function that calls `supabase.auth.signInWithPassword()`
  - Currently just passes credentials to Supabase
  - No changes needed - the issue is in the backend/database, not the client code
  - May want to add better error logging temporarily for debugging

- **components/auth/LoginPage.tsx:21-39** - Login form handler that calls `signIn` from AuthContext
  - Handles the form submission and error display
  - Error handling is already present but could be enhanced to show more details
  - No structural changes needed

- **supabase/migrations/20250111000000_initial_schema.sql:8-14** - Defines the `public.profiles` table structure
  - Schema is correct and doesn't need changes
  - The profile record will be created by the seed file for each test user

- **e2e/fixtures/test-data.ts:8-13** - Contains test user data (admin@test.com with password testpassword123, not password123)
  - Note: Mismatch between e2e test data password (testpassword123) and investigation notes (password123)
  - Should align with actual seed file passwords

- **.env.example:1-4** - Environment configuration for Supabase
  - Used to verify local Supabase URL and configuration
  - No changes needed

- **supabase/config.toml:58-63** - Database seed configuration
  - Already configured to run `./seed.sql`
  - The file just needs to be created

### New Files

- **supabase/seed.sql** - Database seed file to create test users properly
  - Will use Supabase's internal auth functions to create users
  - Creates admin and coach test users with proper authentication setup
  - Creates corresponding profile records linked to auth users

- **health_check.py** - Python script to validate Supabase is running and healthy
  - Checks if local Supabase instance is accessible
  - Validates database connection
  - Reports configuration issues

## Step by Step Tasks

### 1. Research Supabase Auth User Creation
- Read Supabase documentation on proper user creation methods
- Identify the correct approach for creating users in seed files (auth.users vs using Supabase Admin API functions)
- Determine if we should use SQL functions like `auth.uid()` or direct inserts with proper metadata
- Check if Supabase provides internal functions for user creation in migrations/seeds

### 2. Create Health Check Script
- Create `health_check.py` in the project root
- Implement checks for:
  - Supabase local instance running (check API endpoint connectivity)
  - Database connection working (query a test table)
  - Auth service responding (check /auth/v1/health endpoint if available)
  - Environment variables are set correctly
- Output clear error messages for any failures
- Make the script executable and add usage instructions

### 3. Create Database Seed File
- Create `supabase/seed.sql` with proper user creation
- Use the correct Supabase approach for creating auth users (likely using Supabase's internal functions or the correct INSERT format with all required fields)
- Create test users:
  - Admin user: `admin@test.com` / `password123` (to match the bug report)
  - Coach user: `coach@test.com` / `password123` (for testing different roles)
- For each user, ensure:
  - Proper password hashing using Supabase's expected format
  - All required auth.users fields are populated (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, etc.)
  - Email is marked as confirmed (since enable_confirmations = false locally)
  - Corresponding public.profiles record is created with matching UUID and role
- Add clear comments explaining the approach

### 4. Reset and Reseed Database
- Run `supabase db reset` to drop and recreate the database
- Verify migrations run successfully
- Verify seed file executes without errors
- Check that users are created in both auth.users and public.profiles tables

### 5. Test Password Authentication
- Start the dev server (`npm run dev`)
- Navigate to http://localhost:5173/
- Test sign-in with `admin@test.com` / `password123`
- Verify successful authentication and redirect to dashboard
- Check that profile data loads correctly
- Verify user role is set to 'admin'

### 6. Test Magic Link Authentication
- Sign out from the application
- Switch to magic link authentication mode
- Enter `admin@test.com`
- Verify magic link email is sent (check Inbucket at http://127.0.0.1:54424)
- Click magic link and verify authentication works

### 7. Update E2E Test Fixtures for Consistency
- Review `e2e/fixtures/test-data.ts`
- Ensure test passwords match the seed file (currently uses 'testpassword123' but bug report uses 'password123')
- Update if necessary to maintain consistency between seed data and test data
- Document the test credentials clearly

### 8. Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any TypeScript errors, linting issues, or test failures
- Verify build completes successfully

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `python health_check.py` - Run health check to validate Supabase is running and configured
- `supabase status` - Verify Supabase services are running
- `supabase db reset` - Reset database with migrations and seed file
- `npm run dev` - Start dev server and manually test authentication at http://localhost:5173
  - Sign in with `admin@test.com` / `password123`
  - Verify successful authentication
  - Verify redirect to dashboard
  - Verify profile loads with correct role
  - Sign out and test magic link flow
- `npm run build` - Build the project to check for TypeScript errors
- `npm run lint` - Run linting to check for code quality issues
- `npm run test` - Run unit tests if any exist
- Manual verification: Query database to confirm user exists with proper structure
  - `supabase db psql` then `SELECT id, email, email_confirmed_at, aud, role FROM auth.users WHERE email = 'admin@test.com';`
  - Verify profile exists: `SELECT * FROM public.profiles WHERE email = 'admin@test.com';`

## Notes

1. **Password Consistency**: There's a mismatch between the bug report (password123) and e2e test fixtures (testpassword123). We should standardize on one password for all test users to avoid confusion. Recommend using `password123` to match the bug report.

2. **Supabase Auth Approach**: The proper way to create users in Supabase is through the auth API, not direct SQL inserts. For seed files, we'll need to either:
   - Use Supabase's auth.users INSERT with all proper fields and metadata
   - Create a separate script that uses the Supabase client library to create users via API
   - Use SQL that mimics what Supabase Auth does internally

3. **Email Confirmation**: The local config has `enable_confirmations = false`, so we need to ensure seed users have `email_confirmed_at` set to a timestamp (not NULL) to avoid confirmation-related auth failures.

4. **UUID Generation**: User IDs must be valid UUIDs and must match between `auth.users.id` and `public.profiles.id`. Use `gen_random_uuid()` or `uuid_generate_v4()`.

5. **Additional Test Users**: Consider creating multiple test users for different scenarios:
   - Admin user for full access testing
   - Coach user for coach-specific features
   - Couple user for couple-specific features (though couples might not need auth login)

6. **Documentation**: Update README.md with instructions on running the seed file and resetting the database if needed.

7. **Magic Link Testing**: The local Inbucket email testing server runs on port 54424. Magic link emails will appear there for local testing.

8. **RLS Policies**: Ensure Row Level Security policies from migration `20250112000000_rls_policies.sql` work correctly with the seeded users.
