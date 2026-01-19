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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          failed_login_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          failed_login_attempts?: number
          locked_until?: string | null
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
