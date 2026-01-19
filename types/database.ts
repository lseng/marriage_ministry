export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'coach' | 'couple';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: UserRole
          failed_login_attempts: number
          locked_until: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          failed_login_attempts?: number
          locked_until?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          failed_login_attempts?: number
          locked_until?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      coaches: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      couples: {
        Row: {
          id: string
          user_id: string | null
          husband_first_name: string
          husband_last_name: string
          wife_first_name: string
          wife_last_name: string
          email: string
          phone: string | null
          coach_id: string | null
          status: 'active' | 'inactive' | 'completed'
          wedding_date: string | null
          enrollment_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          husband_first_name: string
          husband_last_name: string
          wife_first_name: string
          wife_last_name: string
          email: string
          phone?: string | null
          coach_id?: string | null
          status?: 'active' | 'inactive' | 'completed'
          wedding_date?: string | null
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          husband_first_name?: string
          husband_last_name?: string
          wife_first_name?: string
          wife_last_name?: string
          email?: string
          phone?: string | null
          coach_id?: string | null
          status?: 'active' | 'inactive' | 'completed'
          wedding_date?: string | null
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          title: string
          description: string | null
          content: string
          week_number: number
          due_date: string | null
          form_template_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content: string
          week_number: number
          due_date?: string | null
          form_template_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content?: string
          week_number?: number
          due_date?: string | null
          form_template_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignment_responses: {
        Row: {
          id: string
          assignment_id: string
          couple_id: string
          response_text: string
          submitted_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          couple_id: string
          response_text: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          couple_id?: string
          response_text?: string
          submitted_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
        }
      }
      assignment_statuses: {
        Row: {
          id: string
          assignment_id: string
          couple_id: string
          status: 'pending' | 'sent' | 'completed' | 'overdue'
          sent_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          couple_id: string
          status?: 'pending' | 'sent' | 'completed' | 'overdue'
          sent_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          couple_id?: string
          status?: 'pending' | 'sent' | 'completed' | 'overdue'
          sent_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      form_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          fields: Json
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          fields: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          fields?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      homework_responses: {
        Row: {
          id: string
          assignment_status_id: string
          couple_id: string
          responses: Json
          draft_responses: Json | null
          is_draft: boolean
          submitted_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_status_id: string
          couple_id: string
          responses: Json
          draft_responses?: Json | null
          is_draft?: boolean
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_status_id?: string
          couple_id?: string
          responses?: Json
          draft_responses?: Json | null
          is_draft?: boolean
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          email: string
          role: UserRole
          invited_by: string | null
          invitation_token: string
          expires_at: string
          accepted_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role: UserRole
          invited_by?: string | null
          invitation_token: string
          expires_at: string
          accepted_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          invited_by?: string | null
          invitation_token?: string
          expires_at?: string
          accepted_at?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      notification_templates: {
        Row: {
          id: string
          name: string
          event_type: string
          subject_template: string | null
          email_body_template: string | null
          sms_template: string | null
          in_app_template: string | null
          in_app_action_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          event_type: string
          subject_template?: string | null
          email_body_template?: string | null
          sms_template?: string | null
          in_app_template?: string | null
          in_app_action_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          event_type?: string
          subject_template?: string | null
          email_body_template?: string | null
          sms_template?: string | null
          in_app_template?: string | null
          in_app_action_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notification_queue: {
        Row: {
          id: string
          template_id: string | null
          recipient_id: string
          recipient_email: string | null
          recipient_phone: string | null
          channel: 'email' | 'sms' | 'in_app' | 'push'
          variables: Json
          priority: number
          status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_for: string
          attempts: number
          max_attempts: number
          last_attempt_at: string | null
          sent_at: string | null
          delivered_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          recipient_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          channel: 'email' | 'sms' | 'in_app' | 'push'
          variables?: Json
          priority?: number
          status?: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_for?: string
          attempts?: number
          max_attempts?: number
          last_attempt_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          recipient_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          channel?: 'email' | 'sms' | 'in_app' | 'push'
          variables?: Json
          priority?: number
          status?: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_for?: string
          attempts?: number
          max_attempts?: number
          last_attempt_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          title: string
          body: string
          action_url: string | null
          icon: string | null
          category: string | null
          is_read: boolean
          read_at: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          title: string
          body: string
          action_url?: string | null
          icon?: string | null
          category?: string | null
          is_read?: boolean
          read_at?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          title?: string
          body?: string
          action_url?: string | null
          icon?: string | null
          category?: string | null
          is_read?: boolean
          read_at?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
      }
      notification_delivery_log: {
        Row: {
          id: string
          notification_queue_id: string | null
          event: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          channel: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          notification_queue_id?: string | null
          event: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          channel: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          notification_queue_id?: string | null
          event?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          channel?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Coach = Database['public']['Tables']['coaches']['Row'];
export type Couple = Database['public']['Tables']['couples']['Row'];
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type AssignmentResponse = Database['public']['Tables']['assignment_responses']['Row'];
export type AssignmentStatus = Database['public']['Tables']['assignment_statuses']['Row'];
export type FormTemplateRow = Database['public']['Tables']['form_templates']['Row'];
export type HomeworkResponseRow = Database['public']['Tables']['homework_responses']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert'];
export type InvitationUpdate = Database['public']['Tables']['invitations']['Update'];

// Account lockout types
export interface LockoutStatus {
  is_locked: boolean;
  locked_until: string | null;
  failed_attempts: number;
  remaining_attempts: number;
}

// Notification types
export type NotificationTemplate = Database['public']['Tables']['notification_templates']['Row'];
export type NotificationTemplateInsert = Database['public']['Tables']['notification_templates']['Insert'];
export type NotificationTemplateUpdate = Database['public']['Tables']['notification_templates']['Update'];

export type NotificationQueueRow = Database['public']['Tables']['notification_queue']['Row'];
export type NotificationQueueInsert = Database['public']['Tables']['notification_queue']['Insert'];
export type NotificationQueueUpdate = Database['public']['Tables']['notification_queue']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationDeliveryLog = Database['public']['Tables']['notification_delivery_log']['Row'];
export type NotificationDeliveryLogInsert = Database['public']['Tables']['notification_delivery_log']['Insert'];

// Notification preferences type (matches JSONB structure in database)
export interface NotificationPreferences {
  email_assignments: boolean;
  email_reminders: boolean;
  email_reviews: boolean;
  email_digest: boolean;
  sms_assignments: boolean;
  sms_reminders: boolean;
  sms_reviews: boolean;
  in_app_all: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_day: string;
  digest_time: string;
}

// Notification channel type
export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';

// Notification queue status type
export type NotificationQueueStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';

// Notification delivery event type
export type NotificationDeliveryEvent = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
