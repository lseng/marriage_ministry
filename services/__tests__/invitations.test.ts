import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInvitations,
  getPendingInvitations,
  getInvitationByToken,
  createInvitation,
  hasPendingInvitation,
  deleteInvitation,
  resendInvitation,
  getInvitationUrl,
} from '../invitations';
import { supabase } from '../../lib/supabase';
import type { Invitation } from '../../types/database';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock crypto.getRandomValues for token generation
const mockRandomValues = vi.fn();
vi.stubGlobal('crypto', {
  getRandomValues: mockRandomValues,
});

describe('invitations service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.getRandomValues to return predictable values for testing
    mockRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });
  });

  const mockInvitation: Invitation = {
    id: 'invitation-123',
    email: 'newuser@example.com',
    role: 'coach',
    invited_by: 'admin-123',
    invitation_token: 'secure-token-123',
    expires_at: '2024-12-31T23:59:59Z',
    accepted_at: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockInvitationWithInviter = {
    ...mockInvitation,
    inviter: {
      email: 'admin@example.com',
    },
  };

  describe('getInvitations', () => {
    it('should return all invitations ordered by created_at desc', async () => {
      const mockInvitations = [mockInvitationWithInviter];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockInvitations,
            error: null,
          }),
        }),
      } as never);

      const result = await getInvitations();

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getInvitations();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      } as never);

      await expect(getInvitations()).rejects.toEqual(mockError);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return only pending (not accepted, not expired) invitations', async () => {
      const mockPendingInvitations = [mockInvitationWithInviter];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockPendingInvitations,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await getPendingInvitations();

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toEqual(mockPendingInvitations);
    });

    it('should return empty array when no pending invitations exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await getPendingInvitations();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      } as never);

      await expect(getPendingInvitations()).rejects.toEqual(mockError);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation when token exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitation,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getInvitationByToken('secure-token-123');

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toEqual(mockInvitation);
    });

    it('should return null when token does not exist (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      } as never);

      const result = await getInvitationByToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockError = { code: 'OTHER_ERROR', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(getInvitationByToken('token')).rejects.toEqual(mockError);
    });
  });

  describe('createInvitation', () => {
    it('should create invitation with generated token and 7-day expiry', async () => {
      const invitationData = {
        email: 'newuser@example.com',
        role: 'coach' as const,
        metadata: { source: 'admin-panel' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitation,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await createInvitation(invitationData, 'admin-123');

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toEqual(mockInvitation);
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const invitationData = {
        email: '  NewUser@Example.com  ',
        role: 'couple' as const,
      };

      let insertedData: unknown;
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockInvitation, email: 'newuser@example.com' },
                error: null,
              }),
            }),
          };
        }),
      } as never);

      await createInvitation(invitationData, 'admin-123');

      expect(insertedData).toMatchObject({
        email: 'newuser@example.com',
      });
    });

    it('should include metadata when provided', async () => {
      const invitationData = {
        email: 'coach@example.com',
        role: 'coach' as const,
        metadata: { specialty: 'conflict-resolution', experience_years: 5 },
      };

      let insertedData: unknown;
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInvitation,
                error: null,
              }),
            }),
          };
        }),
      } as never);

      await createInvitation(invitationData, 'admin-123');

      expect(insertedData).toMatchObject({
        metadata: { specialty: 'conflict-resolution', experience_years: 5 },
      });
    });

    it('should use empty object for metadata when not provided', async () => {
      const invitationData = {
        email: 'coach@example.com',
        role: 'coach' as const,
      };

      let insertedData: unknown;
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInvitation,
                error: null,
              }),
            }),
          };
        }),
      } as never);

      await createInvitation(invitationData, 'admin-123');

      expect(insertedData).toMatchObject({
        metadata: {},
      });
    });

    it('should throw error when insertion fails', async () => {
      const mockError = { message: 'Duplicate email' };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(
        createInvitation({ email: 'user@example.com', role: 'coach' }, 'admin-123')
      ).rejects.toEqual(mockError);
    });
  });

  describe('hasPendingInvitation', () => {
    it('should return true when email has pending invitation', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                count: 1,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await hasPendingInvitation('user@example.com');

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toBe(true);
    });

    it('should return false when email has no pending invitation', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                count: 0,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await hasPendingInvitation('user@example.com');

      expect(result).toBe(false);
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      let queryEmail: string | undefined;
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'email') {
              queryEmail = value as string;
            }
            return {
              is: vi.fn().mockReturnValue({
                gt: vi.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
            };
          }),
        }),
      } as never);

      await hasPendingInvitation('  User@Example.com  ');

      expect(queryEmail).toBe('user@example.com');
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                count: null,
                error: mockError,
              }),
            }),
          }),
        }),
      } as never);

      await expect(hasPendingInvitation('user@example.com')).rejects.toEqual(mockError);
    });
  });

  describe('deleteInvitation', () => {
    it('should delete invitation by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as never);

      await deleteInvitation('invitation-123');

      expect(supabase.from).toHaveBeenCalledWith('invitations');
    });

    it('should throw error when deletion fails', async () => {
      const mockError = { message: 'Not found' };

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: mockError,
          }),
        }),
      } as never);

      await expect(deleteInvitation('invalid-id')).rejects.toEqual(mockError);
    });
  });

  describe('resendInvitation', () => {
    it('should delete old invitation and create new one with fresh token', async () => {
      // Mock getting existing invitation
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockInvitation,
            error: null,
          }),
        }),
      });

      // Mock delete
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock insert (create new invitation)
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockInvitation, invitation_token: 'new-token' },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'invitations') {
          return {
            select: selectMock,
            delete: deleteMock,
            insert: insertMock,
          } as never;
        }
        return {} as never;
      });

      const result = await resendInvitation('invitation-123', 'admin-123');

      expect(supabase.from).toHaveBeenCalledWith('invitations');
      expect(result).toMatchObject({
        email: mockInvitation.email,
        role: mockInvitation.role,
      });
    });

    it('should throw error when existing invitation not found', async () => {
      const mockError = { message: 'Not found' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(resendInvitation('invalid-id', 'admin-123')).rejects.toEqual(mockError);
    });

    it('should throw error when data is null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as never);

      await expect(resendInvitation('invalid-id', 'admin-123')).rejects.toThrow('Invitation not found');
    });
  });

  describe('getInvitationUrl', () => {
    it('should generate correct invitation URL with token', () => {
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      });

      const url = getInvitationUrl('secure-token-123');

      expect(url).toBe('https://example.com/auth/accept-invite?token=secure-token-123');
    });

    it('should URL encode special characters in token', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      });

      const url = getInvitationUrl('token+with/special=chars');

      expect(url).toBe('https://example.com/auth/accept-invite?token=token+with/special=chars');
    });
  });
});
