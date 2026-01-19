import { supabase } from '../lib/supabase';
import type {
  Notification,
  NotificationInsert,
  NotificationPreferences,
} from '../types/database';

// Re-export types for convenience
export type { NotificationPreferences };

// Type for notification returned from the database
export type DbNotification = Notification;

// Options for fetching notifications
export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

// Response type for getNotifications
export interface GetNotificationsResponse {
  notifications: DbNotification[];
  total: number;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  options?: GetNotificationsOptions
): Promise<GetNotificationsResponse> {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [], total: 0 };
  }

  return {
    notifications: data || [],
    total: count || 0,
  };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_id', userId);

  if (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
}

/**
 * Create a new in-app notification
 * This is primarily used by the NotificationContext for real-time events
 */
export async function createNotification(
  notification: Omit<NotificationInsert, 'id' | 'created_at'>
): Promise<DbNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data;
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }

  return data?.notification_preferences as NotificationPreferences | null;
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  // First get current preferences
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching current preferences:', fetchError);
    throw fetchError;
  }

  const currentPrefs = (profile?.notification_preferences || {}) as NotificationPreferences;
  const newPrefs = { ...currentPrefs, ...preferences };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ notification_preferences: newPrefs })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating notification preferences:', updateError);
    throw updateError;
  }
}

/**
 * Map category to icon for display
 */
export function getCategoryIcon(category: string | null): string {
  switch (category) {
    case 'assignment':
      return '📋';
    case 'homework':
      return '📝';
    case 'coach_assignment':
      return '👥';
    case 'review':
      return '✅';
    case 'system':
      return '⚙️';
    default:
      return '🔔';
  }
}
