import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDistanceToNow,
  formatDate,
  formatDateTime,
  getStartOfWeek,
  getEndOfWeek,
} from './date';

describe('date utilities', () => {
  describe('formatDistanceToNow', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for recent times', () => {
      const now = new Date('2025-01-15T11:59:30Z').toISOString();
      expect(formatDistanceToNow(now)).toBe('just now');
    });

    it('should return minutes ago for times within an hour', () => {
      const thirtyMinsAgo = new Date('2025-01-15T11:30:00Z').toISOString();
      expect(formatDistanceToNow(thirtyMinsAgo)).toBe('30m ago');
    });

    it('should return hours ago for times within a day', () => {
      const fiveHoursAgo = new Date('2025-01-15T07:00:00Z').toISOString();
      expect(formatDistanceToNow(fiveHoursAgo)).toBe('5h ago');
    });

    it('should return days ago for times within a week', () => {
      const threeDaysAgo = new Date('2025-01-12T12:00:00Z').toISOString();
      expect(formatDistanceToNow(threeDaysAgo)).toBe('3d ago');
    });

    it('should return weeks ago for times within a month', () => {
      const twoWeeksAgo = new Date('2025-01-01T12:00:00Z').toISOString();
      expect(formatDistanceToNow(twoWeeksAgo)).toBe('2w ago');
    });
  });

  describe('formatDate', () => {
    it('should format date in readable format', () => {
      // Use a specific timestamp to avoid timezone issues
      const date = '2025-01-15T12:00:00';
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2025');
    });

    it('should handle ISO date strings', () => {
      const date = '2025-12-25T12:00:00';
      const formatted = formatDate(date);
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('2025');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const datetime = '2025-01-15T14:30:00Z';
      const formatted = formatDateTime(datetime);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });
  });

  describe('getStartOfWeek', () => {
    it('should return Monday of the current week', () => {
      // Wednesday January 15, 2025
      const date = new Date('2025-01-15T12:00:00Z');
      const startOfWeek = getStartOfWeek(date);

      expect(startOfWeek.getDay()).toBe(1); // Monday
      expect(startOfWeek.getDate()).toBe(13);
    });

    it('should handle Sunday correctly', () => {
      // Sunday January 19, 2025
      const date = new Date('2025-01-19T12:00:00Z');
      const startOfWeek = getStartOfWeek(date);

      expect(startOfWeek.getDay()).toBe(1); // Monday
      expect(startOfWeek.getDate()).toBe(13);
    });

    it('should set time to midnight', () => {
      const date = new Date('2025-01-15T15:30:45Z');
      const startOfWeek = getStartOfWeek(date);

      expect(startOfWeek.getHours()).toBe(0);
      expect(startOfWeek.getMinutes()).toBe(0);
      expect(startOfWeek.getSeconds()).toBe(0);
    });
  });

  describe('getEndOfWeek', () => {
    it('should return Sunday of the current week', () => {
      // Wednesday January 15, 2025
      const date = new Date('2025-01-15T12:00:00Z');
      const endOfWeek = getEndOfWeek(date);

      expect(endOfWeek.getDay()).toBe(0); // Sunday
      expect(endOfWeek.getDate()).toBe(19);
    });

    it('should set time to end of day', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const endOfWeek = getEndOfWeek(date);

      expect(endOfWeek.getHours()).toBe(23);
      expect(endOfWeek.getMinutes()).toBe(59);
      expect(endOfWeek.getSeconds()).toBe(59);
    });
  });
});
