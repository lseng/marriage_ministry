# RLS Policy Command

Generate Row Level Security policies for Supabase tables.

## Input
$ARGUMENTS - Table name and access requirements

## Instructions

1. **Analyze Requirements**
   - Which table needs policies
   - Who can SELECT (read)
   - Who can INSERT (create)
   - Who can UPDATE (modify)
   - Who can DELETE (remove)

2. **Understand User Roles**

   For Marriage Ministry app:
   - **Admin**: Full access to all data
   - **Coach**: Access to own profile + assigned couples
   - **Couple**: Access to own data only
   - **Anonymous**: No access (must be authenticated)

3. **Generate Policies**

   Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_rls_[table]_policies.sql`

## Policy Templates

### Template 1: Users Own Data
```sql
-- Users can only access their own records
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

### Template 2: Role-Based Access
```sql
-- Check user role from profiles table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Admins have full access
CREATE POLICY "Admins have full access"
  ON table_name FOR ALL
  USING (get_user_role() = 'admin');

-- Coaches can view assigned data
CREATE POLICY "Coaches can view assigned data"
  ON table_name FOR SELECT
  USING (
    get_user_role() = 'coach'
    AND coach_id = auth.uid()
  );
```

### Template 3: Hierarchical Access
```sql
-- Coaches can access their assigned couples
CREATE POLICY "Coaches can view assigned couples"
  ON couples FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### Template 4: Public Read, Auth Write
```sql
-- Anyone can read (for public data)
CREATE POLICY "Public read access"
  ON table_name FOR SELECT
  USING (true);

-- Only authenticated users can write
CREATE POLICY "Authenticated users can insert"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

## Marriage Ministry Specific Policies

### Coaches Table
```sql
-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admin_full_access_coaches"
  ON coaches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Coaches can view all coaches (for assignment purposes)
CREATE POLICY "coaches_can_view_coaches"
  ON coaches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Coaches can update their own profile
CREATE POLICY "coaches_can_update_own"
  ON coaches FOR UPDATE
  USING (user_id = auth.uid());
```

### Couples Table
```sql
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "admin_full_access_couples"
  ON couples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Coaches can view and update assigned couples
CREATE POLICY "coaches_can_view_assigned_couples"
  ON couples FOR SELECT
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "coaches_can_update_assigned_couples"
  ON couples FOR UPDATE
  USING (
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );
```

### Assignment Responses Table
```sql
ALTER TABLE assignment_responses ENABLE ROW LEVEL SECURITY;

-- Couples can view and submit their own responses
CREATE POLICY "couples_own_responses"
  ON assignment_responses FOR ALL
  USING (couple_id = auth.uid());

-- Coaches can view responses from assigned couples
CREATE POLICY "coaches_view_assigned_responses"
  ON assignment_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = assignment_responses.couple_id
      AND couples.coach_id IN (
        SELECT id FROM coaches WHERE user_id = auth.uid()
      )
    )
  );
```

## Testing Policies

After creating policies, test them:

```sql
-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-here';
SET request.jwt.claim.role = 'authenticated';

-- Try to select
SELECT * FROM table_name;

-- Reset
RESET request.jwt.claim.sub;
RESET request.jwt.claim.role;
```

## Security Checklist

- [ ] RLS is enabled on the table
- [ ] Default deny (no policy = no access)
- [ ] Policies cover all CRUD operations
- [ ] No policy allows access to all data unintentionally
- [ ] Functions used in policies are SECURITY DEFINER
- [ ] Policies are tested with different user roles
- [ ] Edge cases are handled (null values, missing relations)

## Output

1. Create migration file with policies
2. Document the access matrix
3. Provide test queries to verify policies
