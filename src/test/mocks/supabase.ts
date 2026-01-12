import { vi } from 'vitest';
import { http, HttpResponse } from 'msw';

/**
 * Mock Supabase client for unit tests
 */
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn(),
  }),
  rpc: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    }),
  },
};

/**
 * Setup mock Supabase responses for specific tables
 */
export function mockSupabaseTable<T>(table: string, data: T[], error: Error | null = null) {
  const fromMock = mockSupabaseClient.from as ReturnType<typeof vi.fn>;

  fromMock.mockImplementation((tableName: string) => {
    if (tableName === table) {
      return {
        select: vi.fn().mockReturnValue({
          then: vi.fn((resolve: (value: { data: T[] | null; error: Error | null }) => void) =>
            resolve({ data: error ? null : data, error })
          ),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: data[0], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: data[0], error: null }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return mockSupabaseClient.from(tableName);
  });
}

/**
 * MSW handlers for Supabase API
 */
const SUPABASE_URL = 'http://127.0.0.1:54421';

export const supabaseHandlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      },
    });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
    });
  }),

  // REST API endpoints
  http.get(`${SUPABASE_URL}/rest/v1/coaches`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/couples`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/assignments`, () => {
    return HttpResponse.json([]);
  }),
];

export { mockSupabaseClient as supabase };
