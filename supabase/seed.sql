-- Marriage Ministry Database Seed File
-- This file creates test users using Supabase Auth's proper format
-- Users created: admin@test.com, coach@test.com (password: password123)

-- IMPORTANT: This approach uses direct INSERT into auth.users with proper metadata
-- This mimics what Supabase Auth does internally when creating users via the API

-- Generate UUIDs for test users (deterministic for consistency)
DO $$
DECLARE
    admin_user_id UUID := 'a0000000-0000-0000-0000-000000000001';
    coach_user_id UUID := 'c0000000-0000-0000-0000-000000000001';
BEGIN
    -- Delete existing test users if they exist (for idempotent seeding)
    -- Must delete in order: coaches -> profiles -> auth.users
    DELETE FROM public.coaches WHERE email IN ('admin@test.com', 'coach@test.com');
    DELETE FROM public.profiles WHERE id IN (admin_user_id, coach_user_id);
    DELETE FROM auth.users WHERE id IN (admin_user_id, coach_user_id);

    -- Create admin user in auth.users
    -- Password: password123 (hashed using Supabase's format)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        admin_user_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@test.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Admin User"}',
        'authenticated',
        'authenticated',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

    -- Create coach user in auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        coach_user_id,
        '00000000-0000-0000-0000-000000000000',
        'coach@test.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Coach User"}',
        'authenticated',
        'authenticated',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

    -- Update profiles (created automatically by trigger) to set correct roles
    -- The trigger creates profiles with role='couple' by default, so we need to update them
    UPDATE public.profiles SET role = 'admin' WHERE id = admin_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach_user_id;

    -- Create coach record for the coach user
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (
        'c1000000-0000-0000-0000-000000000001',
        coach_user_id,
        'John',
        'Doe',
        'coach@test.com',
        '555-0100',
        'active',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Seed complete: Created admin@test.com and coach@test.com (password: password123)';
END $$;
