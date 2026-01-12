import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'assignment' | 'homework' | 'coach_assignment' | 'review';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

const LOCAL_STORAGE_KEY = 'marriage_ministry_notifications';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, role, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Persist to localStorage when notifications change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        read: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Set up realtime subscriptions based on role
  useEffect(() => {
    if (!user || !role) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Couples: Listen for new assignments sent to them
    if (role === 'couple' && profile?.id) {
      const assignmentChannel = supabase
        .channel(`couple_assignments_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'assignment_statuses',
            filter: `couple_id=eq.${profile.id}`,
          },
          async (payload) => {
            // Get assignment details
            const { data: assignment } = await supabase
              .from('assignments')
              .select('title, week_number')
              .eq('id', (payload.new as { assignment_id: string }).assignment_id)
              .single();

            if (assignment) {
              addNotification({
                type: 'assignment',
                title: 'New Assignment',
                message: `Week ${assignment.week_number}: ${assignment.title}`,
                link: '/homework',
              });
            }
          }
        )
        .subscribe();

      channels.push(assignmentChannel);
    }

    // Coaches: Listen for new homework submissions
    if (role === 'coach' || role === 'admin') {
      const homeworkChannel = supabase
        .channel('homework_submissions')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'homework_responses',
          },
          async (payload) => {
            const newData = payload.new as {
              is_draft: boolean;
              submitted_at: string | null;
              couple_id: string;
            };
            const oldData = payload.old as {
              is_draft: boolean;
              submitted_at: string | null;
            };

            // Only notify if this is a new submission (was draft, now submitted)
            if (!newData.is_draft && newData.submitted_at && oldData.is_draft) {
              // Get couple details
              const { data: couple } = await supabase
                .from('couples')
                .select('husband_first_name, wife_first_name, husband_last_name')
                .eq('id', newData.couple_id)
                .single();

              if (couple) {
                addNotification({
                  type: 'homework',
                  title: 'Homework Submitted',
                  message: `${couple.husband_first_name} & ${couple.wife_first_name} ${couple.husband_last_name} submitted their homework`,
                  link: '/reviews',
                });
              }
            }
          }
        )
        .subscribe();

      channels.push(homeworkChannel);
    }

    // Coaches: Listen for new couple assignments to them
    if (role === 'coach' && profile?.id) {
      const coupleAssignmentChannel = supabase
        .channel(`coach_couples_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'couples',
          },
          async (payload) => {
            const newData = payload.new as { coach_id: string; husband_first_name: string; wife_first_name: string; husband_last_name: string };
            const oldData = payload.old as { coach_id: string };

            // Get the coach ID associated with the current user
            const { data: coach } = await supabase
              .from('coaches')
              .select('id')
              .eq('user_id', user.id)
              .single();

            // Only notify if this coach was newly assigned
            if (coach && newData.coach_id === coach.id && oldData.coach_id !== coach.id) {
              addNotification({
                type: 'coach_assignment',
                title: 'New Couple Assigned',
                message: `${newData.husband_first_name} & ${newData.wife_first_name} ${newData.husband_last_name} has been assigned to you`,
                link: '/couples',
              });
            }
          }
        )
        .subscribe();

      channels.push(coupleAssignmentChannel);
    }

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [user, role, profile, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
