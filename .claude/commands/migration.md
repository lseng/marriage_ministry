# Database Migration Command

Generate a Supabase migration from a natural language description.

## Input
$ARGUMENTS - Description of the database change needed

## Instructions

1. **Analyze the Request**
   - Understand what data model changes are needed
   - Identify tables, columns, constraints, and relationships
   - Consider indexes for query performance
   - Plan RLS (Row Level Security) policies

2. **Review Existing Schema**
   - Read existing migrations in `supabase/migrations/`
   - Check `src/types/supabase.ts` for current types
   - Ensure changes are compatible and don't break existing data

3. **Generate Migration**

   Create a new migration file:
   ```
   supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
   ```

   Use current timestamp for the filename prefix.

4. **Migration Structure**

   ```sql
   -- Migration: descriptive_name
   -- Description: What this migration does
   -- Author: ADW Agent
   -- Date: YYYY-MM-DD

   -- =============================================
   -- UP MIGRATION
   -- =============================================

   -- Create tables
   CREATE TABLE IF NOT EXISTS table_name (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     -- columns...
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

   -- Add foreign keys
   ALTER TABLE table_name
     ADD CONSTRAINT fk_table_reference
     FOREIGN KEY (column) REFERENCES other_table(id);

   -- Enable RLS
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY "policy_name" ON table_name
     FOR SELECT
     USING (auth.uid() = user_id);

   -- Add triggers
   CREATE TRIGGER update_table_updated_at
     BEFORE UPDATE ON table_name
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();

   -- =============================================
   -- DOWN MIGRATION (as comments for reference)
   -- =============================================
   -- DROP TABLE IF EXISTS table_name;
   ```

5. **Update TypeScript Types**

   After creating the migration, run:
   ```bash
   npm run db:generate-types
   ```

   Or manually update `src/types/supabase.ts` with the new types.

6. **Create Seed Data** (if applicable)

   Add to `supabase/seed.sql`:
   ```sql
   -- Seed data for table_name
   INSERT INTO table_name (column1, column2) VALUES
     ('value1', 'value2'),
     ('value3', 'value4');
   ```

## Best Practices

- Use UUIDs for primary keys
- Always include `created_at` and `updated_at` timestamps
- Add appropriate indexes for common queries
- Enable RLS on all tables
- Create policies for SELECT, INSERT, UPDATE, DELETE
- Use foreign keys for referential integrity
- Add comments to complex SQL

## Example

Input: "Add a notes field to couples for coaches to track conversation history"

Output:
```sql
-- Migration: add_couple_notes
-- Description: Add notes/conversation tracking for couples
-- Author: ADW Agent
-- Date: 2025-01-11

-- Create notes table for tracking coach-couple interactions
CREATE TABLE IF NOT EXISTS couple_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id),
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_couple_notes_couple_id ON couple_notes(couple_id);
CREATE INDEX idx_couple_notes_coach_id ON couple_notes(coach_id);
CREATE INDEX idx_couple_notes_created_at ON couple_notes(created_at DESC);

-- Enable RLS
ALTER TABLE couple_notes ENABLE ROW LEVEL SECURITY;

-- Coaches can view notes for their assigned couples
CREATE POLICY "Coaches can view notes for assigned couples"
  ON couple_notes FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = couple_notes.couple_id
      AND couples.coach_id = auth.uid()
    )
  );

-- Coaches can create notes for their assigned couples
CREATE POLICY "Coaches can create notes for assigned couples"
  ON couple_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = couple_notes.couple_id
      AND couples.coach_id = auth.uid()
    )
  );

-- Coaches can update their own notes
CREATE POLICY "Coaches can update own notes"
  ON couple_notes FOR UPDATE
  USING (coach_id = auth.uid());

-- Coaches can delete their own notes
CREATE POLICY "Coaches can delete own notes"
  ON couple_notes FOR DELETE
  USING (coach_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_couple_notes_updated_at
  BEFORE UPDATE ON couple_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add note_type enum values as comment for reference
COMMENT ON COLUMN couple_notes.note_type IS 'Types: general, meeting, phone_call, email, concern, milestone';
```
