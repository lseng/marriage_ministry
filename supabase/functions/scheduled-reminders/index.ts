import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RemindersResult {
  reminders_sent: number;
  overdue_marked: number;
  inactive_alerts: number;
}

interface CoupleData {
  id: string;
  husband_first_name: string;
  wife_first_name: string;
  profile_id: string;
}

interface AssignmentData {
  id: string;
  title: string;
  due_date: string;
}

interface CoachData {
  profile_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: RemindersResult = {
      reminders_sent: 0,
      overdue_marked: 0,
      inactive_alerts: 0,
    };

    // 1. Send assignment reminders (2 days before due)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { data: pendingAssignments, error: pendingError } = await supabase
      .from('assignment_statuses')
      .select(`
        id,
        couple_id,
        assignment_id,
        couples!inner (
          id,
          husband_first_name,
          wife_first_name,
          profile_id
        ),
        assignments!inner (
          id,
          title,
          due_date
        )
      `)
      .eq('status', 'sent')
      .gte('assignments.due_date', tomorrow.toISOString())
      .lte('assignments.due_date', twoDaysFromNow.toISOString());

    if (pendingError) {
      console.error('Error fetching pending assignments:', pendingError);
    }

    for (const status of pendingAssignments || []) {
      try {
        const couple = status.couples as CoupleData;
        const assignment = status.assignments as AssignmentData;

        // Check if reminder already sent today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingReminder } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('recipient_id', couple.profile_id)
          .eq('channel', 'email')
          .contains('metadata', { assignment_id: assignment.id })
          .gte('created_at', today)
          .maybeSingle();

        if (!existingReminder && couple.profile_id && assignment.id) {
          // Get recipient profile for preferences
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, phone, notification_preferences')
            .eq('id', couple.profile_id)
            .single();

          if (!profile) continue;

          // Get template
          const { data: template } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('name', 'assignment_reminder')
            .eq('is_active', true)
            .single();

          if (!template) continue;

          const variables = {
            recipient_name: `${couple.husband_first_name} & ${couple.wife_first_name}`,
            assignment_title: assignment.title,
            days_remaining: '2',
          };

          const prefs = profile.notification_preferences || {};
          const channels: Array<'email' | 'sms' | 'in_app'> = ['in_app'];

          // Check user preferences for email
          if (prefs.email_reminders !== false) {
            channels.push('email');
          }

          // Check user preferences for SMS
          if (prefs.sms_reminders === true && profile.phone) {
            channels.push('sms');
          }

          // Queue notifications for each channel
          for (const channel of channels) {
            if (channel === 'sms' && !template.sms_template) continue;
            if (channel === 'email' && !template.email_body_template) continue;

            await supabase.from('notification_queue').insert({
              template_id: template.id,
              recipient_id: couple.profile_id,
              recipient_email: channel === 'email' ? profile.email : null,
              recipient_phone: channel === 'sms' ? profile.phone : null,
              channel,
              variables,
              priority: 5,
              metadata: { assignment_id: assignment.id },
            });

            // For in-app, also create the notification record immediately
            if (channel === 'in_app') {
              const title = interpolate(
                template.in_app_template || template.subject_template || '',
                variables
              );
              const actionUrl = template.in_app_action_url
                ? interpolate(template.in_app_action_url, variables)
                : null;

              await supabase.from('notifications').insert({
                recipient_id: couple.profile_id,
                title,
                body: title,
                action_url: actionUrl,
                category: 'assignment',
                related_entity_type: 'assignment',
                related_entity_id: assignment.id,
              });
            }
          }

          results.reminders_sent++;
        }
      } catch (err) {
        console.error('Error processing reminder:', err);
      }
    }

    // 2. Mark overdue assignments and notify
    const now = new Date().toISOString();
    const { data: overdueAssignments, error: overdueError } = await supabase
      .from('assignment_statuses')
      .select(`
        id,
        couple_id,
        assignment_id,
        couples!inner (
          id,
          husband_first_name,
          wife_first_name,
          profile_id,
          coach_id,
          coaches (
            profile_id
          )
        ),
        assignments!inner (
          id,
          title,
          due_date
        )
      `)
      .eq('status', 'sent')
      .lt('assignments.due_date', now);

    if (overdueError) {
      console.error('Error fetching overdue assignments:', overdueError);
    }

    for (const status of overdueAssignments || []) {
      try {
        const couple = status.couples as CoupleData;
        const assignment = status.assignments as AssignmentData;
        const coach = couple.coaches as CoachData | null;

        // Update status to overdue
        await supabase
          .from('assignment_statuses')
          .update({ status: 'overdue' })
          .eq('id', status.id);

        // Get template
        const { data: template } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('name', 'assignment_overdue')
          .eq('is_active', true)
          .single();

        if (!template) continue;

        // Notify couple
        if (couple.profile_id) {
          const { data: coupleProfile } = await supabase
            .from('profiles')
            .select('email, phone, notification_preferences')
            .eq('id', couple.profile_id)
            .single();

          if (coupleProfile) {
            const variables = {
              recipient_name: `${couple.husband_first_name} & ${couple.wife_first_name}`,
              assignment_title: assignment.title,
            };

            const prefs = coupleProfile.notification_preferences || {};
            const channels: Array<'email' | 'sms' | 'in_app'> = ['in_app'];

            if (prefs.email_assignments !== false) {
              channels.push('email');
            }

            for (const channel of channels) {
              if (channel === 'email' && !template.email_body_template) continue;

              await supabase.from('notification_queue').insert({
                template_id: template.id,
                recipient_id: couple.profile_id,
                recipient_email: channel === 'email' ? coupleProfile.email : null,
                recipient_phone: null,
                channel,
                variables,
                priority: 5,
                metadata: { assignment_id: assignment.id },
              });

              if (channel === 'in_app') {
                const title = interpolate(
                  template.in_app_template || template.subject_template || '',
                  variables
                );
                const actionUrl = template.in_app_action_url
                  ? interpolate(template.in_app_action_url, variables)
                  : null;

                await supabase.from('notifications').insert({
                  recipient_id: couple.profile_id,
                  title,
                  body: title,
                  action_url: actionUrl,
                  category: 'assignment',
                  related_entity_type: 'assignment',
                  related_entity_id: assignment.id,
                });
              }
            }
          }
        }

        // Notify coach
        if (coach?.profile_id) {
          const { data: coachProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', coach.profile_id)
            .single();

          const variables = {
            recipient_name: coachProfile
              ? `${coachProfile.first_name} ${coachProfile.last_name}`
              : 'Coach',
            couple_names: `${couple.husband_first_name} & ${couple.wife_first_name}`,
            assignment_title: assignment.title,
          };

          await supabase.from('notification_queue').insert({
            template_id: template.id,
            recipient_id: coach.profile_id,
            recipient_email: null,
            recipient_phone: null,
            channel: 'in_app',
            variables,
            priority: 5,
            metadata: { assignment_id: assignment.id, couple_id: couple.id },
          });

          const title = interpolate(
            template.in_app_template || template.subject_template || '',
            variables
          );
          const actionUrl = template.in_app_action_url
            ? interpolate(template.in_app_action_url, variables)
            : null;

          await supabase.from('notifications').insert({
            recipient_id: coach.profile_id,
            title,
            body: title,
            action_url: actionUrl,
            category: 'assignment',
            related_entity_type: 'assignment',
            related_entity_id: assignment.id,
          });
        }

        results.overdue_marked++;
      } catch (err) {
        console.error('Error processing overdue assignment:', err);
      }
    }

    // 3. Check for inactive couples (2+ weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: inactiveCouples, error: inactiveError } = await supabase
      .from('couples')
      .select(`
        id,
        husband_first_name,
        wife_first_name,
        profile_id,
        coach_id,
        updated_at,
        coaches (
          profile_id
        )
      `)
      .eq('status', 'active')
      .lt('updated_at', twoWeeksAgo.toISOString());

    if (inactiveError) {
      console.error('Error fetching inactive couples:', inactiveError);
    }

    for (const couple of inactiveCouples || []) {
      try {
        const coach = couple.coaches as CoachData | null;
        if (!coach?.profile_id) continue;

        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(couple.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get template
        const { data: template } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('name', 'couple_inactive')
          .eq('is_active', true)
          .single();

        if (!template) continue;

        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, notification_preferences')
          .eq('id', coach.profile_id)
          .single();

        if (!coachProfile) continue;

        const variables = {
          recipient_name: `${coachProfile.first_name} ${coachProfile.last_name}`,
          couple_names: `${couple.husband_first_name} & ${couple.wife_first_name}`,
          days_inactive: daysSinceActivity.toString(),
          couple_id: couple.id,
        };

        const prefs = coachProfile.notification_preferences || {};
        const channels: Array<'email' | 'in_app'> = ['in_app'];

        if (prefs.email_assignments !== false) {
          channels.push('email');
        }

        for (const channel of channels) {
          if (channel === 'email' && !template.email_body_template) continue;

          await supabase.from('notification_queue').insert({
            template_id: template.id,
            recipient_id: coach.profile_id,
            recipient_email: channel === 'email' ? coachProfile.email : null,
            recipient_phone: null,
            channel,
            variables,
            priority: 5,
            metadata: { couple_id: couple.id },
          });

          if (channel === 'in_app') {
            const title = interpolate(
              template.in_app_template || template.subject_template || '',
              variables
            );
            const actionUrl = template.in_app_action_url
              ? interpolate(template.in_app_action_url, variables)
              : null;

            await supabase.from('notifications').insert({
              recipient_id: coach.profile_id,
              title,
              body: title,
              action_url: actionUrl,
              category: 'couple',
              related_entity_type: 'couple',
              related_entity_id: couple.id,
            });
          }
        }

        results.inactive_alerts++;
      } catch (err) {
        console.error('Error processing inactive couple:', err);
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in scheduled-reminders function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        reminders_sent: 0,
        overdue_marked: 0,
        inactive_alerts: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Interpolate {{variables}} in a template string
 */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}
