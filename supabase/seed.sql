-- Marriage Ministry Database Seed File
-- Comprehensive seed data for testing and demonstration
--
-- Test Users:
--   Admin:   admin@test.com / password123
--   Coach 1: coach@test.com / password123
--   Coach 2: coach2@test.com / password123
--   Coach 3: coach3@test.com / password123
--   Coach 4: coach4@test.com / password123
--   Couple:  couple1@test.com / password123

DO $$
DECLARE
    -- User IDs (deterministic for consistency)
    admin_user_id UUID := 'a0000000-0000-0000-0000-000000000001';
    coach1_user_id UUID := 'c0000000-0000-0000-0000-000000000001';
    coach2_user_id UUID := 'c0000000-0000-0000-0000-000000000002';
    coach3_user_id UUID := 'c0000000-0000-0000-0000-000000000003';
    coach4_user_id UUID := 'c0000000-0000-0000-0000-000000000004';
    coach5_user_id UUID := 'c0000000-0000-0000-0000-000000000005';
    couple1_user_id UUID := 'c0010000-0000-0000-0000-000000000001';

    -- Coach record IDs
    coach1_id UUID := 'c1000000-0000-0000-0000-000000000001';
    coach2_id UUID := 'c1000000-0000-0000-0000-000000000002';
    coach3_id UUID := 'c1000000-0000-0000-0000-000000000003';
    coach4_id UUID := 'c1000000-0000-0000-0000-000000000004';
    coach5_id UUID := 'c1000000-0000-0000-0000-000000000005';

    -- Couple IDs
    couple1_id UUID := 'c0200000-0000-0000-0000-000000000001';
    couple2_id UUID := 'c0200000-0000-0000-0000-000000000002';
    couple3_id UUID := 'c0200000-0000-0000-0000-000000000003';
    couple4_id UUID := 'c0200000-0000-0000-0000-000000000004';
    couple5_id UUID := 'c0200000-0000-0000-0000-000000000005';
    couple6_id UUID := 'c0200000-0000-0000-0000-000000000006';
    couple7_id UUID := 'c0200000-0000-0000-0000-000000000007';
    couple8_id UUID := 'c0200000-0000-0000-0000-000000000008';
    couple9_id UUID := 'c0200000-0000-0000-0000-000000000009';
    couple10_id UUID := 'c0200000-0000-0000-0000-000000000010';
    couple11_id UUID := 'c0200000-0000-0000-0000-000000000011';
    couple12_id UUID := 'c0200000-0000-0000-0000-000000000012';

    -- Form Template IDs
    form1_id UUID := 'f0000000-0000-0000-0000-000000000001';
    form2_id UUID := 'f0000000-0000-0000-0000-000000000002';
    form3_id UUID := 'f0000000-0000-0000-0000-000000000003';

    -- Assignment IDs
    assign1_id UUID := 'a5000000-0000-0000-0000-000000000001';
    assign2_id UUID := 'a5000000-0000-0000-0000-000000000002';
    assign3_id UUID := 'a5000000-0000-0000-0000-000000000003';
    assign4_id UUID := 'a5000000-0000-0000-0000-000000000004';
    assign5_id UUID := 'a5000000-0000-0000-0000-000000000005';
    assign6_id UUID := 'a5000000-0000-0000-0000-000000000006';

    -- Assignment Status IDs (will be generated as needed)

    -- Date calculations
    today DATE := CURRENT_DATE;
    week_ago DATE := CURRENT_DATE - INTERVAL '7 days';
    two_weeks_ago DATE := CURRENT_DATE - INTERVAL '14 days';
    three_weeks_ago DATE := CURRENT_DATE - INTERVAL '21 days';
    month_ago DATE := CURRENT_DATE - INTERVAL '30 days';
    next_week DATE := CURRENT_DATE + INTERVAL '7 days';
    two_weeks_later DATE := CURRENT_DATE + INTERVAL '14 days';

BEGIN
    -- ============================================================
    -- CLEANUP: Delete existing seed data (respecting foreign keys)
    -- ============================================================

    -- Delete homework_responses first
    DELETE FROM public.homework_responses WHERE couple_id IN (
        couple1_id, couple2_id, couple3_id, couple4_id, couple5_id, couple6_id,
        couple7_id, couple8_id, couple9_id, couple10_id, couple11_id, couple12_id
    );

    -- Delete assignment_responses
    DELETE FROM public.assignment_responses WHERE couple_id IN (
        couple1_id, couple2_id, couple3_id, couple4_id, couple5_id, couple6_id,
        couple7_id, couple8_id, couple9_id, couple10_id, couple11_id, couple12_id
    );

    -- Delete assignment_statuses
    DELETE FROM public.assignment_statuses WHERE couple_id IN (
        couple1_id, couple2_id, couple3_id, couple4_id, couple5_id, couple6_id,
        couple7_id, couple8_id, couple9_id, couple10_id, couple11_id, couple12_id
    );

    -- Delete assignments
    DELETE FROM public.assignments WHERE id IN (
        assign1_id, assign2_id, assign3_id, assign4_id, assign5_id, assign6_id
    );

    -- Delete form_templates
    DELETE FROM public.form_templates WHERE id IN (form1_id, form2_id, form3_id);

    -- Delete couples
    DELETE FROM public.couples WHERE id IN (
        couple1_id, couple2_id, couple3_id, couple4_id, couple5_id, couple6_id,
        couple7_id, couple8_id, couple9_id, couple10_id, couple11_id, couple12_id
    );

    -- Delete coaches
    DELETE FROM public.coaches WHERE id IN (coach1_id, coach2_id, coach3_id, coach4_id, coach5_id);

    -- Delete profiles
    DELETE FROM public.profiles WHERE id IN (
        admin_user_id, coach1_user_id, coach2_user_id, coach3_user_id,
        coach4_user_id, coach5_user_id, couple1_user_id
    );

    -- Delete auth users
    DELETE FROM auth.users WHERE id IN (
        admin_user_id, coach1_user_id, coach2_user_id, coach3_user_id,
        coach4_user_id, coach5_user_id, couple1_user_id
    );

    -- ============================================================
    -- AUTH USERS
    -- ============================================================

    -- Admin user
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        admin_user_id, '00000000-0000-0000-0000-000000000000',
        'admin@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Admin User"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Coach 1: John Doe
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        coach1_user_id, '00000000-0000-0000-0000-000000000000',
        'coach@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "John Doe"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Coach 2: Sarah Johnson
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        coach2_user_id, '00000000-0000-0000-0000-000000000000',
        'coach2@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Sarah Johnson"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Coach 3: Michael Brown
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        coach3_user_id, '00000000-0000-0000-0000-000000000000',
        'coach3@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Michael Brown"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Coach 4: Emily Davis
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        coach4_user_id, '00000000-0000-0000-0000-000000000000',
        'coach4@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Emily Davis"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Coach 5: David Wilson (inactive)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        coach5_user_id, '00000000-0000-0000-0000-000000000000',
        'coach5@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "David Wilson"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- Couple 1 user (for couple login testing)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        couple1_user_id, '00000000-0000-0000-0000-000000000000',
        'couple1@test.com', crypt('password123', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "James & Lisa Smith"}', 'authenticated', 'authenticated',
        NOW(), NOW(), '', '', '', ''
    );

    -- ============================================================
    -- PROFILES (set roles - trigger creates them with default role)
    -- ============================================================

    UPDATE public.profiles SET role = 'admin' WHERE id = admin_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach1_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach2_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach3_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach4_user_id;
    UPDATE public.profiles SET role = 'coach' WHERE id = coach5_user_id;
    UPDATE public.profiles SET role = 'couple' WHERE id = couple1_user_id;

    -- ============================================================
    -- COACHES
    -- ============================================================

    -- Coach 1: John Doe (active, 3 couples)
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (coach1_id, coach1_user_id, 'John', 'Doe', 'coach@test.com', '555-0100', 'active', month_ago, NOW());

    -- Coach 2: Sarah Johnson (active, 3 couples)
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (coach2_id, coach2_user_id, 'Sarah', 'Johnson', 'coach2@test.com', '555-0101', 'active', month_ago, NOW());

    -- Coach 3: Michael Brown (active, 3 couples)
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (coach3_id, coach3_user_id, 'Michael', 'Brown', 'coach3@test.com', '555-0102', 'active', month_ago, NOW());

    -- Coach 4: Emily Davis (active, 2 couples)
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (coach4_id, coach4_user_id, 'Emily', 'Davis', 'coach4@test.com', '555-0103', 'active', two_weeks_ago, NOW());

    -- Coach 5: David Wilson (inactive)
    INSERT INTO public.coaches (id, user_id, first_name, last_name, email, phone, status, created_at, updated_at)
    VALUES (coach5_id, coach5_user_id, 'David', 'Wilson', 'coach5@test.com', '555-0104', 'inactive', month_ago, NOW());

    -- ============================================================
    -- COUPLES (12 total: 9 active, 2 completed, 1 inactive)
    -- ============================================================

    -- Coach 1's couples (3)
    INSERT INTO public.couples (id, user_id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple1_id, couple1_user_id, 'James', 'Smith', 'Lisa', 'Smith', 'couple1@test.com', '555-1001', coach1_id, 'active', '2020-06-15', week_ago, week_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple2_id, 'Robert', 'Garcia', 'Maria', 'Garcia', 'garcia.family@email.com', '555-1002', coach1_id, 'active', '2019-09-20', three_weeks_ago, three_weeks_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple3_id, 'William', 'Martinez', 'Jennifer', 'Martinez', 'martinez.couple@email.com', '555-1003', coach1_id, 'completed', '2018-04-10', month_ago, month_ago, NOW());

    -- Coach 2's couples (3)
    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple4_id, 'David', 'Anderson', 'Sarah', 'Anderson', 'anderson.home@email.com', '555-1004', coach2_id, 'active', '2021-08-05', two_weeks_ago, two_weeks_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple5_id, 'Michael', 'Taylor', 'Emily', 'Taylor', 'taylor.family@email.com', '555-1005', coach2_id, 'active', '2022-02-14', three_weeks_ago, three_weeks_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple6_id, 'Christopher', 'Thomas', 'Jessica', 'Thomas', 'thomas.pair@email.com', '555-1006', coach2_id, 'active', '2020-11-28', month_ago, month_ago, NOW());

    -- Coach 3's couples (3)
    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple7_id, 'Daniel', 'Jackson', 'Amanda', 'Jackson', 'jackson.duo@email.com', '555-1007', coach3_id, 'active', '2019-07-22', three_weeks_ago, three_weeks_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple8_id, 'Matthew', 'White', 'Ashley', 'White', 'white.couple@email.com', '555-1008', coach3_id, 'active', '2021-03-18', two_weeks_ago, two_weeks_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple9_id, 'Andrew', 'Harris', 'Stephanie', 'Harris', 'harris.family@email.com', '555-1009', coach3_id, 'completed', '2017-12-01', month_ago, month_ago, NOW());

    -- Coach 4's couples (2)
    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple10_id, 'Joshua', 'Clark', 'Nicole', 'Clark', 'clark.pair@email.com', '555-1010', coach4_id, 'active', '2022-05-30', week_ago, week_ago, NOW());

    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple11_id, 'Kevin', 'Lewis', 'Rachel', 'Lewis', 'lewis.home@email.com', '555-1011', coach4_id, 'inactive', '2020-01-25', month_ago, month_ago, NOW());

    -- Unassigned couple (new enrollment)
    INSERT INTO public.couples (id, husband_first_name, husband_last_name, wife_first_name, wife_last_name, email, phone, coach_id, status, wedding_date, enrollment_date, created_at, updated_at)
    VALUES (couple12_id, 'Brandon', 'Robinson', 'Megan', 'Robinson', 'robinson.new@email.com', '555-1012', NULL, 'active', '2023-09-10', today, today, NOW());

    -- ============================================================
    -- FORM TEMPLATES
    -- ============================================================

    -- Form 1: Weekly Reflection
    INSERT INTO public.form_templates (id, name, description, fields, is_active, created_by, created_at, updated_at)
    VALUES (
        form1_id,
        'Weekly Reflection',
        'A standard weekly reflection form for couples to share their progress and thoughts.',
        '[
            {"id": "highlights", "type": "textarea", "label": "What were the highlights of your week together?", "required": true, "placeholder": "Share the positive moments..."},
            {"id": "challenges", "type": "textarea", "label": "What challenges did you face this week?", "required": true, "placeholder": "Describe any difficulties..."},
            {"id": "communication_rating", "type": "select", "label": "How would you rate your communication this week?", "required": true, "options": ["1 - Poor", "2 - Below Average", "3 - Average", "4 - Good", "5 - Excellent"]},
            {"id": "goals", "type": "textarea", "label": "What are your goals for next week?", "required": false, "placeholder": "Set some intentions..."},
            {"id": "prayer_request", "type": "textarea", "label": "Any prayer requests?", "required": false, "placeholder": "Optional..."}
        ]'::jsonb,
        true,
        admin_user_id,
        month_ago,
        NOW()
    );

    -- Form 2: Communication Assessment
    INSERT INTO public.form_templates (id, name, description, fields, is_active, created_by, created_at, updated_at)
    VALUES (
        form2_id,
        'Communication Assessment',
        'Assess your communication patterns and identify areas for growth.',
        '[
            {"id": "listening_score", "type": "scale", "label": "I actively listen when my spouse speaks", "required": true, "min": 1, "max": 10},
            {"id": "expressing_score", "type": "scale", "label": "I express my feelings clearly and respectfully", "required": true, "min": 1, "max": 10},
            {"id": "conflict_style", "type": "select", "label": "When we disagree, I typically:", "required": true, "options": ["Avoid the topic", "Get defensive", "Listen first", "Seek compromise", "Express calmly"]},
            {"id": "improvement_area", "type": "checkbox", "label": "Areas I want to improve:", "required": false, "options": ["Listening more", "Speaking more kindly", "Being more patient", "Sharing feelings", "Resolving conflicts faster"]},
            {"id": "commitment", "type": "textarea", "label": "One specific thing I commit to improving:", "required": true, "placeholder": "Be specific..."}
        ]'::jsonb,
        true,
        admin_user_id,
        three_weeks_ago,
        NOW()
    );

    -- Form 3: Date Night Planning
    INSERT INTO public.form_templates (id, name, description, fields, is_active, created_by, created_at, updated_at)
    VALUES (
        form3_id,
        'Date Night Planning',
        'Plan your intentional time together and reflect on your connection.',
        '[
            {"id": "date_type", "type": "select", "label": "What type of date did you plan?", "required": true, "options": ["Dinner out", "Movie night", "Outdoor activity", "At-home date", "Adventure/New experience", "Other"]},
            {"id": "date_description", "type": "textarea", "label": "Describe your date night:", "required": true, "placeholder": "What did you do together?"},
            {"id": "quality_time_rating", "type": "scale", "label": "Rate the quality of your time together", "required": true, "min": 1, "max": 5},
            {"id": "next_date_idea", "type": "text", "label": "Idea for your next date:", "required": false, "placeholder": "What would you like to try?"}
        ]'::jsonb,
        true,
        admin_user_id,
        two_weeks_ago,
        NOW()
    );

    -- ============================================================
    -- ASSIGNMENTS
    -- ============================================================

    -- Week 1: Getting Started (past due, most completed)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign1_id,
        'Getting Started',
        'Introduction to the marriage ministry program and initial reflection.',
        E'# Welcome to Marriage Ministry!\n\nThis first week is about setting the foundation for your journey together.\n\n## Your Tasks:\n1. Read through the ministry handbook together\n2. Discuss your hopes for this program\n3. Complete the reflection questions below\n\n## Reflection:\n- Why did you decide to join this ministry?\n- What do you hope to gain from this experience?\n- What is one strength you see in your marriage?\n- What is one area you would like to grow in?',
        1,
        three_weeks_ago,
        form1_id,
        admin_user_id,
        month_ago,
        NOW()
    );

    -- Week 2: Communication Foundations (past due, mostly completed)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign2_id,
        'Communication Foundations',
        'Building strong communication habits in your marriage.',
        E'# Communication Foundations\n\nEffective communication is the cornerstone of a healthy marriage.\n\n## This Week''s Focus:\n- Practice active listening daily\n- Use "I" statements when sharing feelings\n- Set aside 15 minutes each day for uninterrupted conversation\n\n## Exercise:\nTake turns sharing about your day while the other person practices active listening without interrupting.',
        2,
        two_weeks_ago,
        form2_id,
        admin_user_id,
        month_ago,
        NOW()
    );

    -- Week 3: Conflict Resolution (past due, mixed statuses)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign3_id,
        'Conflict Resolution',
        'Learning healthy ways to navigate disagreements.',
        E'# Conflict Resolution\n\nEvery couple experiences conflict. The key is how you handle it.\n\n## Principles:\n1. **Cool Down First** - Take a break if emotions are high\n2. **Listen to Understand** - Not just to respond\n3. **Focus on the Issue** - Not attacking the person\n4. **Seek Win-Win Solutions** - Compromise when possible\n\n## This Week''s Challenge:\nIdentify a recurring disagreement and practice using these principles to discuss it.',
        3,
        week_ago,
        form1_id,
        admin_user_id,
        three_weeks_ago,
        NOW()
    );

    -- Week 4: Date Night Challenge (current week)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign4_id,
        'Date Night Challenge',
        'Prioritizing quality time together.',
        E'# Date Night Challenge\n\nIntentional time together strengthens your bond.\n\n## The Challenge:\nPlan and execute a meaningful date night this week. It doesn''t have to be expensive!\n\n## Ideas:\n- Cook a special meal together at home\n- Take a walk and talk about your dreams\n- Try a new activity neither of you has done\n- Recreate your first date\n\n## Requirements:\n- No phones during the date\n- Take turns planning (one plans this week, one next)\n- Share your experience using the form below',
        4,
        today,
        form3_id,
        admin_user_id,
        two_weeks_ago,
        NOW()
    );

    -- Week 5: Gratitude Practice (upcoming)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign5_id,
        'Gratitude Practice',
        'Cultivating appreciation in your relationship.',
        E'# Gratitude Practice\n\nGratitude transforms how we see our spouse and our marriage.\n\n## Daily Practice:\nEach day this week, share three things you appreciate about your spouse.\n\n## The Challenge:\n- Write a gratitude letter to your spouse\n- Read it to them at the end of the week\n- Keep a gratitude journal together\n\n## Reflection:\nHow does expressing gratitude change the atmosphere in your home?',
        5,
        next_week,
        form1_id,
        admin_user_id,
        week_ago,
        NOW()
    );

    -- Week 6: Looking Forward (future)
    INSERT INTO public.assignments (id, title, description, content, week_number, due_date, form_template_id, created_by, created_at, updated_at)
    VALUES (
        assign6_id,
        'Looking Forward',
        'Setting goals and vision for your marriage.',
        E'# Looking Forward\n\nAs we wrap up this session, let''s look to the future.\n\n## Vision Casting:\n1. Where do you see your marriage in 1 year? 5 years? 10 years?\n2. What traditions do you want to establish?\n3. How will you continue growing together?\n\n## Action Items:\n- Create a marriage mission statement together\n- Set 3 goals for the next quarter\n- Plan how you will stay connected with your coach',
        6,
        two_weeks_later,
        form1_id,
        admin_user_id,
        today,
        NOW()
    );

    -- ============================================================
    -- ASSIGNMENT STATUSES (distributing assignments to active couples)
    -- Using numbered IDs for tracking
    -- ============================================================

    -- Helper variables for status IDs
    DECLARE
        status_counter INT := 1;
    BEGIN
        -- Assignment 1 (Week 1) - All active couples, mostly completed
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign1_id, couple1_id, 'completed', month_ago, three_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign1_id, couple2_id, 'completed', month_ago, three_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign1_id, couple4_id, 'completed', month_ago, three_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign1_id, couple5_id, 'completed', month_ago, three_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign1_id, couple6_id, 'completed', month_ago, three_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign1_id, couple7_id, 'completed', month_ago, two_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign1_id, couple8_id, 'completed', month_ago, two_weeks_ago, month_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign1_id, couple10_id, 'overdue', month_ago, NULL, month_ago);
        status_counter := status_counter + 8;

        -- Assignment 2 (Week 2) - Most completed, some overdue
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign2_id, couple1_id, 'completed', three_weeks_ago, two_weeks_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign2_id, couple2_id, 'completed', three_weeks_ago, two_weeks_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign2_id, couple4_id, 'completed', three_weeks_ago, two_weeks_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign2_id, couple5_id, 'completed', three_weeks_ago, week_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign2_id, couple6_id, 'overdue', three_weeks_ago, NULL, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign2_id, couple7_id, 'completed', three_weeks_ago, week_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign2_id, couple8_id, 'completed', three_weeks_ago, week_ago, three_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign2_id, couple10_id, 'overdue', three_weeks_ago, NULL, three_weeks_ago);
        status_counter := status_counter + 8;

        -- Assignment 3 (Week 3) - Mixed: some completed, some pending
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign3_id, couple1_id, 'completed', two_weeks_ago, week_ago, two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign3_id, couple2_id, 'completed', two_weeks_ago, week_ago, two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign3_id, couple4_id, 'completed', two_weeks_ago, today - INTERVAL '2 days', two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign3_id, couple5_id, 'overdue', two_weeks_ago, NULL, two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign3_id, couple6_id, 'completed', two_weeks_ago, today - INTERVAL '3 days', two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign3_id, couple7_id, 'overdue', two_weeks_ago, NULL, two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign3_id, couple8_id, 'completed', two_weeks_ago, today - INTERVAL '1 day', two_weeks_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign3_id, couple10_id, 'pending', two_weeks_ago, NULL, two_weeks_ago);
        status_counter := status_counter + 8;

        -- Assignment 4 (Week 4 - current) - Mix of completed and pending
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign4_id, couple1_id, 'completed', week_ago, today - INTERVAL '1 day', week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign4_id, couple2_id, 'pending', week_ago, NULL, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign4_id, couple4_id, 'completed', week_ago, today, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign4_id, couple5_id, 'pending', week_ago, NULL, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign4_id, couple6_id, 'pending', week_ago, NULL, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign4_id, couple7_id, 'pending', week_ago, NULL, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign4_id, couple8_id, 'sent', week_ago, NULL, week_ago),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign4_id, couple10_id, 'sent', week_ago, NULL, week_ago);
        status_counter := status_counter + 8;

        -- Assignment 5 (Week 5 - upcoming) - Mostly pending/sent
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign5_id, couple1_id, 'sent', today, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign5_id, couple2_id, 'sent', today, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign5_id, couple4_id, 'sent', today, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign5_id, couple5_id, 'sent', today, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign5_id, couple6_id, 'sent', today, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign5_id, couple7_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign5_id, couple8_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign5_id, couple10_id, 'pending', NULL, NULL, today);
        status_counter := status_counter + 8;

        -- Assignment 6 (Week 6 - future) - All pending
        INSERT INTO public.assignment_statuses (id, assignment_id, couple_id, status, sent_at, completed_at, created_at)
        VALUES
            (('50000000-0000-0000-0000-' || LPAD(status_counter::text, 12, '0'))::uuid, assign6_id, couple1_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+1)::text, 12, '0'))::uuid, assign6_id, couple2_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+2)::text, 12, '0'))::uuid, assign6_id, couple4_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+3)::text, 12, '0'))::uuid, assign6_id, couple5_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+4)::text, 12, '0'))::uuid, assign6_id, couple6_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+5)::text, 12, '0'))::uuid, assign6_id, couple7_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+6)::text, 12, '0'))::uuid, assign6_id, couple8_id, 'pending', NULL, NULL, today),
            (('50000000-0000-0000-0000-' || LPAD((status_counter+7)::text, 12, '0'))::uuid, assign6_id, couple10_id, 'pending', NULL, NULL, today);
    END;

    -- ============================================================
    -- ASSIGNMENT RESPONSES (for completed statuses)
    -- ============================================================

    -- Week 1 responses
    INSERT INTO public.assignment_responses (assignment_id, couple_id, response_text, submitted_at, reviewed_by, reviewed_at, notes)
    VALUES
        (assign1_id, couple1_id, 'We joined because we want to strengthen our marriage and learn from others. We hope to improve our communication and deepen our spiritual connection. Our strength is our commitment to each other. We want to grow in patience.', three_weeks_ago, coach1_user_id, two_weeks_ago, 'Great start! Looking forward to seeing your growth.'),
        (assign1_id, couple2_id, 'Looking to build a stronger foundation. We want practical tools for our relationship. We complement each other well. Need to work on listening.', three_weeks_ago, coach1_user_id, two_weeks_ago, 'Good reflections. Focus on the listening exercises this week.'),
        (assign1_id, couple4_id, 'Excited to be part of this ministry! We want to invest in our marriage. Our friendship is strong. We want to handle conflict better.', three_weeks_ago, coach2_user_id, two_weeks_ago, NULL),
        (assign1_id, couple5_id, 'We believe in continuous growth. Hope to connect with other couples too. We laugh a lot together. Working on quality time.', three_weeks_ago, coach2_user_id, two_weeks_ago, 'Wonderful attitude!'),
        (assign1_id, couple6_id, 'Ready to learn and grow. Want to build healthy habits. We support each other''s dreams. Need to communicate feelings better.', three_weeks_ago, coach2_user_id, two_weeks_ago, NULL),
        (assign1_id, couple7_id, 'Looking forward to this journey. Want stronger spiritual connection. We prioritize family. Growth area: daily prayer together.', two_weeks_ago, coach3_user_id, week_ago, 'Great goals!'),
        (assign1_id, couple8_id, 'Grateful for this opportunity. Hope to learn conflict resolution. We trust each other. Want to be more intentional with time.', two_weeks_ago, coach3_user_id, week_ago, NULL);

    -- Week 2 responses
    INSERT INTO public.assignment_responses (assignment_id, couple_id, response_text, submitted_at, reviewed_by, reviewed_at, notes)
    VALUES
        (assign2_id, couple1_id, 'The active listening exercise was challenging but helpful. We noticed we often interrupt each other. Made good progress by day 5.', two_weeks_ago, coach1_user_id, week_ago, 'Excellent awareness!'),
        (assign2_id, couple2_id, 'Using I statements felt awkward at first but reduced defensiveness. We will continue practicing.', two_weeks_ago, coach1_user_id, week_ago, NULL),
        (assign2_id, couple4_id, 'The 15-minute daily talks became something we look forward to. No phones was key!', two_weeks_ago, coach2_user_id, week_ago, 'Love this commitment!'),
        (assign2_id, couple5_id, 'This week showed us how much we assume instead of asking. Communication is improving.', week_ago, NULL, NULL, NULL),
        (assign2_id, couple7_id, 'Active listening is harder than expected. We made a lot of progress though. Will keep practicing.', week_ago, coach3_user_id, today - INTERVAL '2 days', 'Keep it up!'),
        (assign2_id, couple8_id, 'We created a "talk time" ritual after dinner. It has been wonderful for our connection.', week_ago, NULL, NULL, NULL);

    -- Week 3 responses
    INSERT INTO public.assignment_responses (assignment_id, couple_id, response_text, submitted_at, reviewed_by, reviewed_at, notes)
    VALUES
        (assign3_id, couple1_id, 'We applied the cool down principle to a disagreement about finances. It really helped us stay calm and find a solution.', week_ago, coach1_user_id, today - INTERVAL '2 days', 'Finances are a common area. Great application!'),
        (assign3_id, couple2_id, 'Focusing on the issue not the person changed everything. We resolved our recurring chore debate!', week_ago, NULL, NULL, NULL),
        (assign3_id, couple4_id, 'The win-win approach helped us compromise on vacation plans. Both feel heard now.', today - INTERVAL '2 days', NULL, NULL, NULL),
        (assign3_id, couple6_id, 'We practiced with a small disagreement first. Ready to tackle bigger issues with these tools.', today - INTERVAL '3 days', coach2_user_id, today - INTERVAL '1 day', 'Smart approach!'),
        (assign3_id, couple8_id, 'Listening to understand instead of respond was the game changer for us this week.', today - INTERVAL '1 day', NULL, NULL, NULL);

    -- Week 4 responses (recent - this week)
    INSERT INTO public.assignment_responses (assignment_id, couple_id, response_text, submitted_at, reviewed_by, reviewed_at, notes)
    VALUES
        (assign4_id, couple1_id, 'We had a picnic at the park where we got engaged. No phones for 3 hours! It was wonderful to just be present together.', today - INTERVAL '1 day', NULL, NULL, NULL),
        (assign4_id, couple4_id, 'Cooked a new recipe together and had a candlelit dinner at home. Kids were at grandma''s. Much needed reconnection!', today, NULL, NULL, NULL);

    -- ============================================================
    -- HOMEWORK RESPONSES (JSONB format for form-based assignments)
    -- ============================================================

    -- Get the assignment_status IDs for inserting homework_responses
    -- Week 1 homework responses (using form1 - Weekly Reflection)
    INSERT INTO public.homework_responses (assignment_status_id, couple_id, responses, is_draft, submitted_at, reviewed_by, reviewed_at, review_notes)
    SELECT
        ast.id,
        ast.couple_id,
        CASE
            WHEN ast.couple_id = couple1_id THEN '{"highlights": "Had a wonderful anniversary dinner", "challenges": "Balancing work and quality time", "communication_rating": "4 - Good", "goals": "Schedule weekly date nights", "prayer_request": "Patience with each other"}'::jsonb
            WHEN ast.couple_id = couple2_id THEN '{"highlights": "Family game night was a hit", "challenges": "Different parenting styles", "communication_rating": "3 - Average", "goals": "Align on parenting approach", "prayer_request": ""}'::jsonb
            WHEN ast.couple_id = couple4_id THEN '{"highlights": "Started morning coffee ritual together", "challenges": "Managing in-law relationships", "communication_rating": "4 - Good", "goals": "Set boundaries together", "prayer_request": "Wisdom in family decisions"}'::jsonb
            ELSE '{"highlights": "General positive week", "challenges": "Time management", "communication_rating": "3 - Average", "goals": "Be more present", "prayer_request": ""}'::jsonb
        END,
        false,
        ast.completed_at,
        CASE WHEN ast.couple_id IN (couple1_id, couple2_id) THEN coach1_user_id WHEN ast.couple_id = couple4_id THEN coach2_user_id ELSE NULL END,
        CASE WHEN ast.couple_id IN (couple1_id, couple2_id, couple4_id) THEN ast.completed_at + INTERVAL '2 days' ELSE NULL END,
        CASE WHEN ast.couple_id = couple1_id THEN 'Great reflection! Keep up the date nights.' ELSE NULL END
    FROM public.assignment_statuses ast
    WHERE ast.assignment_id = assign1_id AND ast.status = 'completed';

    -- Week 2 homework responses (using form2 - Communication Assessment)
    INSERT INTO public.homework_responses (assignment_status_id, couple_id, responses, is_draft, submitted_at, reviewed_by, reviewed_at, review_notes)
    SELECT
        ast.id,
        ast.couple_id,
        CASE
            WHEN ast.couple_id = couple1_id THEN '{"listening_score": 7, "expressing_score": 6, "conflict_style": "Seek compromise", "improvement_area": ["Listening more", "Being more patient"], "commitment": "I will pause before responding when we disagree"}'::jsonb
            WHEN ast.couple_id = couple2_id THEN '{"listening_score": 6, "expressing_score": 7, "conflict_style": "Listen first", "improvement_area": ["Speaking more kindly"], "commitment": "I will use softer words when frustrated"}'::jsonb
            WHEN ast.couple_id = couple4_id THEN '{"listening_score": 8, "expressing_score": 7, "conflict_style": "Express calmly", "improvement_area": ["Sharing feelings", "Resolving conflicts faster"], "commitment": "I will share my feelings daily even when everything seems fine"}'::jsonb
            ELSE '{"listening_score": 5, "expressing_score": 5, "conflict_style": "Get defensive", "improvement_area": ["Listening more"], "commitment": "I will work on not interrupting"}'::jsonb
        END,
        false,
        ast.completed_at,
        CASE WHEN ast.couple_id IN (couple1_id, couple2_id) THEN coach1_user_id WHEN ast.couple_id = couple4_id THEN coach2_user_id ELSE NULL END,
        CASE WHEN ast.couple_id IN (couple1_id, couple2_id, couple4_id) THEN ast.completed_at + INTERVAL '3 days' ELSE NULL END,
        CASE WHEN ast.couple_id = couple1_id THEN 'Good self-awareness on the listening score. The commitment is specific and actionable!' ELSE NULL END
    FROM public.assignment_statuses ast
    WHERE ast.assignment_id = assign2_id AND ast.status = 'completed';

    -- Week 4 homework responses (using form3 - Date Night Planning)
    INSERT INTO public.homework_responses (assignment_status_id, couple_id, responses, is_draft, submitted_at, reviewed_by, reviewed_at, review_notes)
    SELECT
        ast.id,
        ast.couple_id,
        CASE
            WHEN ast.couple_id = couple1_id THEN '{"date_type": "Outdoor activity", "date_description": "We went back to the park where we got engaged and had a sunset picnic. Brought our old photo album and reminisced about our journey together.", "quality_time_rating": 5, "next_date_idea": "Try that new Italian restaurant downtown"}'::jsonb
            WHEN ast.couple_id = couple4_id THEN '{"date_type": "At-home date", "date_description": "Cooked together - tried a Thai recipe from YouTube. Kids were at grandparents. Lit candles and ate at the dining table for once!", "quality_time_rating": 4, "next_date_idea": "Hiking at the state park"}'::jsonb
            ELSE '{"date_type": "Dinner out", "date_description": "Went to our favorite restaurant", "quality_time_rating": 4, "next_date_idea": "Movie night"}'::jsonb
        END,
        false,
        ast.completed_at,
        NULL,
        NULL,
        NULL
    FROM public.assignment_statuses ast
    WHERE ast.assignment_id = assign4_id AND ast.status = 'completed';

    -- Add a draft response for an in-progress assignment
    INSERT INTO public.homework_responses (assignment_status_id, couple_id, responses, draft_responses, is_draft, submitted_at)
    SELECT
        ast.id,
        ast.couple_id,
        '{}'::jsonb,
        '{"date_type": "Adventure/New experience", "date_description": "Planning to try escape room..."}'::jsonb,
        true,
        NULL
    FROM public.assignment_statuses ast
    WHERE ast.assignment_id = assign4_id AND ast.couple_id = couple2_id AND ast.status = 'pending'
    LIMIT 1;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SEED COMPLETE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Test Users Created:';
    RAISE NOTICE '  Admin:   admin@test.com / password123';
    RAISE NOTICE '  Coach 1: coach@test.com / password123';
    RAISE NOTICE '  Coach 2: coach2@test.com / password123';
    RAISE NOTICE '  Coach 3: coach3@test.com / password123';
    RAISE NOTICE '  Coach 4: coach4@test.com / password123';
    RAISE NOTICE '  Couple:  couple1@test.com / password123';
    RAISE NOTICE '';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '  Coaches: 5 (4 active, 1 inactive)';
    RAISE NOTICE '  Couples: 12 (9 active, 2 completed, 1 inactive)';
    RAISE NOTICE '  Form Templates: 3';
    RAISE NOTICE '  Assignments: 6 (Weeks 1-6)';
    RAISE NOTICE '  Assignment Statuses: 48';
    RAISE NOTICE '===========================================';
END $$;
