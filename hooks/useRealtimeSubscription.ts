import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface PostgresChangesFilter {
  event: PostgresChangeEvent;
  schema?: string;
  table: string;
  filter?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimePayload = RealtimePostgresChangesPayload<any>;
type PostgresChangesCallback = (payload: RealtimePayload) => void;

interface UseRealtimeSubscriptionOptions {
  channel: string;
  filter: PostgresChangesFilter;
  callback: PostgresChangesCallback;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  channel: channelName,
  filter,
  callback,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const setupSubscription = useCallback(() => {
    if (!enabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Build the channel with proper typing
    const channel = supabase.channel(channelName);

    // Use type assertion to work around the strict typing
    const subscriptionConfig = {
      event: filter.event,
      schema: filter.schema || 'public',
      table: filter.table,
      filter: filter.filter,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any).on(
      'postgres_changes',
      subscriptionConfig,
      (payload: RealtimePayload) => {
        callbackRef.current(payload);
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, filter.event, filter.schema, filter.table, filter.filter, enabled]);

  useEffect(() => {
    return setupSubscription();
  }, [setupSubscription]);
}

// Convenience hooks for common subscriptions

export function useAssignmentStatusChanges(
  coupleId: string | null,
  callback: PostgresChangesCallback
) {
  useRealtimeSubscription({
    channel: `assignment_status_${coupleId}`,
    filter: {
      event: '*',
      table: 'assignment_statuses',
      filter: coupleId ? `couple_id=eq.${coupleId}` : undefined,
    },
    callback,
    enabled: !!coupleId,
  });
}

export function useHomeworkResponseChanges(
  coachId: string | null,
  callback: PostgresChangesCallback
) {
  useRealtimeSubscription({
    channel: `homework_responses_${coachId || 'all'}`,
    filter: {
      event: '*',
      table: 'homework_responses',
    },
    callback,
    enabled: true,
  });
}

export function useCoupleChanges(callback: PostgresChangesCallback) {
  useRealtimeSubscription({
    channel: 'couples_changes',
    filter: {
      event: '*',
      table: 'couples',
    },
    callback,
    enabled: true,
  });
}

export function useCoachChanges(callback: PostgresChangesCallback) {
  useRealtimeSubscription({
    channel: 'coaches_changes',
    filter: {
      event: '*',
      table: 'coaches',
    },
    callback,
    enabled: true,
  });
}
