import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getCategoryIcon,
} from '../notifications';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('notifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUnreadCount', () => {
    it('should return unread count when successful', async () => {
      const mockResponse = { count: 5, error: null };
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue(mockResponse);

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as never);

      mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: mockEq }) });

      const count = await getUnreadCount('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(count).toBe(5);
    });

    it('should return 0 when there is an error', async () => {
      const mockResponse = { count: null, error: { message: 'DB error' } };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockResponse),
          }),
        }),
      } as never);

      const count = await getUnreadCount('user-123');

      expect(count).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getNotifications', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        recipient_id: 'user-123',
        title: 'Test Notification',
        body: 'Test body',
        action_url: '/test',
        icon: '📋',
        category: 'assignment',
        is_read: false,
        read_at: null,
        related_entity_type: null,
        related_entity_id: null,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should return notifications with total count', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockNotifications,
              count: 1,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getNotifications('user-123');

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.total).toBe(1);
    });

    it('should apply limit and offset options', async () => {
      const mockLimit = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockNotifications,
        count: 1,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit,
              range: mockRange,
            }),
          }),
        }),
      } as never);

      mockLimit.mockReturnValue({ range: mockRange });

      await getNotifications('user-123', { limit: 10, offset: 5 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockRange).toHaveBeenCalledWith(5, 14);
    });

    it('should filter unread only when option is set', async () => {
      const mockEqIsRead = vi.fn().mockResolvedValue({
        data: mockNotifications,
        count: 1,
        error: null,
      });

      const mockOrder = vi.fn().mockReturnValue({
        eq: mockEqIsRead,
      });

      const mockEqRecipient = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEqRecipient,
        }),
      } as never);

      await getNotifications('user-123', { unreadOnly: true });

      expect(mockEqRecipient).toHaveBeenCalledWith('recipient_id', 'user-123');
      expect(mockEqIsRead).toHaveBeenCalledWith('is_read', false);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              count: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      } as never);

      const result = await getNotifications('user-123');

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('markAsRead', () => {
    it('should update notification to read status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      await markAsRead('notif-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({
        is_read: true,
        read_at: expect.any(String),
      });
    });

    it('should throw error when update fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      } as never);

      await expect(markAsRead('notif-123')).rejects.toEqual({ message: 'Update failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for user', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      await markAllAsRead('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({
        is_read: true,
        read_at: expect.any(String),
      });
    });

    it('should throw error when update fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          }),
        }),
      } as never);

      await expect(markAllAsRead('user-123')).rejects.toEqual({ message: 'Update failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by id', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as never);

      await deleteNotification('notif-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      } as never);

      await expect(deleteNotification('notif-123')).rejects.toEqual({ message: 'Delete failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for a user', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as never);

      await deleteAllNotifications('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should throw error when delete fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      } as never);

      await expect(deleteAllNotifications('user-123')).rejects.toEqual({ message: 'Delete failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('createNotification', () => {
    const mockNotification = {
      recipient_id: 'user-123',
      title: 'Test Notification',
      body: 'Test body',
      action_url: '/test',
      category: 'assignment',
      icon: '📋',
      is_read: false,
    };

    it('should create notification and return it', async () => {
      const createdNotification = { id: 'notif-new', ...mockNotification, created_at: '2024-01-01' };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdNotification,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await createNotification(mockNotification);

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(result).toEqual(createdNotification);
    });

    it('should return null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      } as never);

      const result = await createNotification(mockNotification);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('getNotificationPreferences', () => {
    const mockPreferences = {
      email_assignments: true,
      email_reminders: true,
      sms_assignments: false,
    };

    it('should return notification preferences', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { notification_preferences: mockPreferences },
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getNotificationPreferences('user-123');

      expect(result).toEqual(mockPreferences);
    });

    it('should return null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Fetch failed' },
            }),
          }),
        }),
      } as never);

      const result = await getNotificationPreferences('user-123');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const mockCurrentPrefs = { email_assignments: true, sms_assignments: false };
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { notification_preferences: mockCurrentPrefs },
                  error: null,
                }),
              }),
            }),
            update: mockUpdate,
          } as never;
        }
        return {} as never;
      });

      await updateNotificationPreferences('user-123', { email_reminders: true });

      expect(mockUpdate).toHaveBeenCalledWith({
        notification_preferences: {
          ...mockCurrentPrefs,
          email_reminders: true,
        },
      });
    });

    it('should throw error when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Fetch failed' },
            }),
          }),
        }),
      } as never);

      await expect(
        updateNotificationPreferences('user-123', { email_reminders: true })
      ).rejects.toEqual({ message: 'Fetch failed' });
      consoleSpy.mockRestore();
    });
  });

  describe('getCategoryIcon', () => {
    it('should return correct icons for each category', () => {
      expect(getCategoryIcon('assignment')).toBe('📋');
      expect(getCategoryIcon('homework')).toBe('📝');
      expect(getCategoryIcon('coach_assignment')).toBe('👥');
      expect(getCategoryIcon('review')).toBe('✅');
      expect(getCategoryIcon('system')).toBe('⚙️');
      expect(getCategoryIcon(null)).toBe('🔔');
      expect(getCategoryIcon('unknown')).toBe('🔔');
    });
  });
});
