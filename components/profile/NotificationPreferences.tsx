import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { Select, SelectOption } from '../ui/select';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useAuth } from '../../contexts/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences as NotificationPrefsType,
} from '../../services/notifications';
import { Bell, Mail, MessageSquare, Clock, Check } from 'lucide-react';

// Default preferences matching database defaults
const defaultPreferences: NotificationPrefsType = {
  email_assignments: true,
  email_reminders: true,
  email_reviews: true,
  email_digest: true,
  sms_assignments: false,
  sms_reminders: false,
  sms_reviews: false,
  in_app_all: true,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  digest_day: 'monday',
  digest_time: '09:00',
};

const dayOptions: SelectOption[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const quietHoursStartOptions: SelectOption[] = [
  { value: '', label: 'Disabled' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
];

const quietHoursEndOptions: SelectOption[] = [
  { value: '', label: 'Disabled' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
];

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const preferences = await getNotificationPreferences(user.id);
      setPrefs(preferences || defaultPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPrefs(defaultPreferences);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id, loadPreferences]);

  const updatePref = useCallback(
    async (key: keyof NotificationPrefsType, value: boolean | string | null) => {
      if (!user?.id || !prefs) return;

      // Optimistically update local state
      const newPrefs = { ...prefs, [key]: value };
      setPrefs(newPrefs);
      setSaving(true);
      setSavedKey(null);

      try {
        await updateNotificationPreferences(user.id, { [key]: value });
        setSavedKey(key);
        // Clear saved indicator after 2 seconds
        setTimeout(() => setSavedKey(null), 2000);
      } catch (error) {
        console.error('Failed to update preference:', error);
        // Revert on error
        setPrefs(prefs);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, prefs]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!prefs) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Email Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Email Notifications</h3>
          </div>

          <div className="space-y-4">
            <PreferenceRow
              title="New Assignments"
              description="Receive email when new assignments are shared with you"
              checked={prefs.email_assignments}
              onCheckedChange={(checked) => updatePref('email_assignments', checked)}
              showSaved={savedKey === 'email_assignments'}
            />

            <PreferenceRow
              title="Reminders"
              description="Receive reminders before assignments are due"
              checked={prefs.email_reminders}
              onCheckedChange={(checked) => updatePref('email_reminders', checked)}
              showSaved={savedKey === 'email_reminders'}
            />

            <PreferenceRow
              title="Review Notifications"
              description="Receive email when your submissions are reviewed"
              checked={prefs.email_reviews}
              onCheckedChange={(checked) => updatePref('email_reviews', checked)}
              showSaved={savedKey === 'email_reviews'}
            />

            <PreferenceRow
              title="Weekly Digest"
              description="Receive a weekly summary of activity"
              checked={prefs.email_digest}
              onCheckedChange={(checked) => updatePref('email_digest', checked)}
              showSaved={savedKey === 'email_digest'}
            />

            {prefs.email_digest && (
              <div className="ml-6 pl-4 border-l-2 border-muted pt-2">
                <label className="text-sm text-muted-foreground block mb-2">
                  Digest schedule
                </label>
                <Select
                  options={dayOptions}
                  value={prefs.digest_day}
                  onChange={(e) => updatePref('digest_day', e.target.value)}
                  className="max-w-[160px]"
                />
              </div>
            )}
          </div>
        </Card>

        {/* SMS Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">SMS Notifications</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Text message notifications require a verified phone number.
          </p>

          <div className="space-y-4">
            <PreferenceRow
              title="New Assignments"
              description="Receive text when new assignments are shared"
              checked={prefs.sms_assignments}
              onCheckedChange={(checked) => updatePref('sms_assignments', checked)}
              showSaved={savedKey === 'sms_assignments'}
            />

            <PreferenceRow
              title="Reminders"
              description="Receive text reminders before due dates"
              checked={prefs.sms_reminders}
              onCheckedChange={(checked) => updatePref('sms_reminders', checked)}
              showSaved={savedKey === 'sms_reminders'}
            />

            <PreferenceRow
              title="Review Notifications"
              description="Receive text when submissions are reviewed"
              checked={prefs.sms_reviews}
              onCheckedChange={(checked) => updatePref('sms_reviews', checked)}
              showSaved={savedKey === 'sms_reviews'}
            />
          </div>
        </Card>

        {/* In-App Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">In-App Notifications</h3>
          </div>

          <div className="space-y-4">
            <PreferenceRow
              title="All In-App Notifications"
              description="Show notifications in the notification bell"
              checked={prefs.in_app_all}
              onCheckedChange={(checked) => updatePref('in_app_all', checked)}
              showSaved={savedKey === 'in_app_all'}
            />
          </div>
        </Card>

        {/* Quiet Hours */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Quiet Hours</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Pause non-urgent notifications during these hours. Notifications will be delivered after quiet hours end.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[140px]">
              <Select
                label="Start time"
                options={quietHoursStartOptions}
                value={prefs.quiet_hours_start || ''}
                onChange={(e) => updatePref('quiet_hours_start', e.target.value || null)}
              />
            </div>
            <span className="text-muted-foreground pt-6">to</span>
            <div className="flex-1 min-w-[140px]">
              <Select
                label="End time"
                options={quietHoursEndOptions}
                value={prefs.quiet_hours_end || ''}
                onChange={(e) => updatePref('quiet_hours_end', e.target.value || null)}
              />
            </div>
          </div>

          {prefs.quiet_hours_start && prefs.quiet_hours_end && (
            <p className="text-sm text-muted-foreground mt-3">
              Quiet hours are active from {formatTime(prefs.quiet_hours_start)} to{' '}
              {formatTime(prefs.quiet_hours_end)}.
            </p>
          )}
        </Card>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-card border shadow-lg rounded-lg px-4 py-2 flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm">Saving...</span>
        </div>
      )}
    </div>
  );
}

interface PreferenceRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  showSaved?: boolean;
}

function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
  showSaved,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          {showSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
