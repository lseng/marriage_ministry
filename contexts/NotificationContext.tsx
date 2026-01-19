import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
  deleteAllNotifications,
  createNotification as createNotificationService,
  getCategoryIcon,
  type DbNotification,
} from '../services/notifications';

// Interface for notifications used in the UI (combines DB and legacy formats)
export interface Notification {
  id: string;
  type: 'assignment' | 'homework' | 'coach_assignment' | 'review' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
  data?: Record<string, unknown>;
  // Database fields (optional for backward compatibility)
  category?: string | null;
  action_url?: string | null;
  icon?: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Convert database notification to UI notification format
function dbToUiNotification(dbNotification: DbNotification): Notification {
  const type = (dbNotification.category || 'system') as Notification['type'];
  return {
    id: dbNotification.id,
    type,
    title: dbNotification.title,
    message: dbNotification.body,
    read: dbNotification.is_read,
    timestamp: dbNotification.created_at,
    link: dbNotification.action_url || undefined,
    category: dbNotification.category,
    action_url: dbNotification.action_url,
    icon: dbNotification.icon || getCategoryIcon(dbNotification.category),
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, role, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Load notifications from database
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const [notificationsResult, count] = await Promise.all([
        getNotifications(user.id, { limit: 50 }),
        getUnreadCount(user.id),
      ]);

      setNotifications(notificationsResult.notifications.map(dbToUiNotification));
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial load when user changes
  useEffect(() => {
    const userId = user?.id;
    if (userId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadNotifications();
    } else if (!userId) {
      initialLoadDone.current = false;
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [user?.id, loadNotifications]);

  // Refresh function for manual reload
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadNotifications();
  }, [loadNotifications]);

  // Add notification (creates in database and updates local state)
  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
      if (!user?.id) return;

      // Determine category from type
      const category = notification.type === 'system' ? 'system' : notification.type;

      // Create in database
      const dbNotification = await createNotificationService({
        recipient_id: user.id,
        title: notification.title,
        body: notification.message,
        action_url: notification.link || null,
        category,
        icon: getCategoryIcon(category),
        is_read: false,
      });

      if (dbNotification) {
        const uiNotification = dbToUiNotification(dbNotification);
        setNotifications((prev) => [uiNotification, ...prev].slice(0, 50));
        setUnreadCount((prev) => prev + 1);
      }
    },
    [user?.id]
  );

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await markAsReadService(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await markAllAsReadService(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user?.id) return;

    try {
      await deleteAllNotifications(user.id);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user?.id]);

  // Subscribe to real-time database changes for notifications table
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = dbToUiNotification(payload.new as DbNotification);
          setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = dbToUiNotification(payload.new as DbNotification);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          // Recalculate unread count
          getUnreadCount(user.id).then(setUnreadCount);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          // Recalculate unread count
          getUnreadCount(user.id).then(setUnreadCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  // Set up realtime subscriptions for business events (assignments, homework, etc.)
  // These create notifications in the database which then propagate through the channel above
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
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
