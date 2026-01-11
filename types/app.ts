// Core application types for Marriage Ministry

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'coach' | 'couple';
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  assigned_couples_count: number;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  husband_first_name: string;
  husband_last_name: string;
  wife_first_name: string;
  wife_last_name: string;
  email: string;
  phone?: string;
  coach_id?: string;
  status: 'active' | 'inactive' | 'completed';
  wedding_date?: string;
  enrollment_date: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  content: string;
  week_number: number;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentResponse {
  id: string;
  assignment_id: string;
  couple_id: string;
  response_text: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
}

export interface AssignmentStatus {
  id: string;
  assignment_id: string;
  couple_id: string;
  status: 'pending' | 'sent' | 'completed' | 'overdue';
  sent_at?: string;
  completed_at?: string;
}

export type ViewMode = 'list' | 'grid' | 'kanban';
