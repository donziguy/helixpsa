'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { toast } from './Toast';

interface NotificationPreference {
  notificationType: 'sla_breach' | 'sla_warning' | 'warranty_expiring' | 'maintenance_due' | 'ticket_assigned' | 'ticket_overdue' | 'system_alert';
  channel: 'email' | 'sms' | 'webhook' | 'internal';
  isEnabled: boolean;
  settings?: {
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours?: { start: string; end: string };
    assignedOnly?: boolean;
    escalationLevel?: 'all' | 'high_priority' | 'critical_only';
    clientFilter?: string[];
    digest?: boolean;
    reminderInterval?: number;
  };
  id?: string;
}

const notificationTypeLabels = {
  sla_breach: 'SLA Breach Alerts',
  sla_warning: 'SLA Warning Notifications', 
  warranty_expiring: 'Warranty Expiration Alerts',
  maintenance_due: 'Maintenance Due Reminders',
  ticket_assigned: 'Ticket Assignment Notifications',
  ticket_overdue: 'Overdue Ticket Alerts',
  system_alert: 'System Alerts',
};

const notificationDescriptions = {
  sla_breach: 'Immediate alerts when tickets exceed SLA deadlines',
  sla_warning: 'Early warnings when tickets approach SLA deadlines',
  warranty_expiring: 'Notifications for assets with warranties expiring soon',
  maintenance_due: 'Reminders for scheduled asset maintenance',
  ticket_assigned: 'Notifications when tickets are assigned to you',
  ticket_overdue: 'Alerts for tickets that are overdue',
  system_alert: 'Important system-wide notifications',
};

const frequencyOptions = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Hourly Digest' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' },
];

const escalationOptions = [
  { value: 'all', label: 'All notifications' },
  { value: 'high_priority', label: 'High priority and above' },
  { value: 'critical_only', label: 'Critical only' },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());

  const { data: preferencesData, isLoading, refetch, error } = api.notifications.getPreferences.useQuery();

  // Update preferences when data changes
  useEffect(() => {
    if (preferencesData) {
      setPreferences(preferencesData);
    }
  }, [preferencesData]);

  // Handle error
  useEffect(() => {
    if (error) {
      toast('Failed to load notification preferences', 'error');
    }
  }, [error]);

  const { data: clients } = api.clients.getAll.useQuery();

  const updatePreferencesMutation = api.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast('Notification preferences updated successfully');
      refetch();
    },
    onError: (error) => {
      toast(`Failed to update preferences: ${error.message}`, 'error');
    },
  });

  const testNotificationMutation = api.notifications.sendTestNotification.useMutation({
    onSuccess: () => {
      toast('Test notification sent successfully');
    },
    onError: (error) => {
      toast(`Failed to send test notification: ${error.message}`, 'error');
    },
  });

  const handleTogglePreference = (notificationType: string, isEnabled: boolean) => {
    const updatedPreferences = preferences.map(pref => 
      pref.notificationType === notificationType 
        ? { ...pref, isEnabled }
        : pref
    );
    setPreferences(updatedPreferences);
  };

  const handleUpdatePreferenceSetting = (notificationType: string, settingKey: string, value: any) => {
    const updatedPreferences = preferences.map(pref => 
      pref.notificationType === notificationType 
        ? { 
            ...pref, 
            settings: { 
              ...pref.settings, 
              [settingKey]: value 
            } 
          }
        : pref
    );
    setPreferences(updatedPreferences);
  };

  const handleToggleExpandedSettings = (notificationType: string) => {
    const newExpanded = new Set(expandedSettings);
    if (newExpanded.has(notificationType)) {
      newExpanded.delete(notificationType);
    } else {
      newExpanded.add(notificationType);
    }
    setExpandedSettings(newExpanded);
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferencesMutation.mutateAsync(preferences);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleTestNotification = (notificationType: NotificationPreference['notificationType']) => {
    testNotificationMutation.mutate({ notificationType });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded" data-testid="loading-skeleton">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure which notifications you want to receive via email
        </p>
      </div>

      <div className="p-6 space-y-6">
        {preferences.map((preference) => (
          <div
            key={preference.notificationType}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden"
          >
            {/* Main preference row */}
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {notificationTypeLabels[preference.notificationType]}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notificationDescriptions[preference.notificationType]}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleToggleExpandedSettings(preference.notificationType)}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                  disabled={!preference.isEnabled}
                >
                  Settings
                </button>

                <button
                  onClick={() => handleTestNotification(preference.notificationType)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                  disabled={testNotificationMutation.isLoading || !preference.isEnabled}
                >
                  Test
                </button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preference.isEnabled}
                    onChange={(e) => 
                      handleTogglePreference(preference.notificationType, e.target.checked)
                    }
                    className="sr-only peer"
                    aria-label={`Enable ${notificationTypeLabels[preference.notificationType]}`}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Expanded settings */}
            {expandedSettings.has(preference.notificationType) && preference.isEnabled && (
              <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Frequency Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery Frequency
                    </label>
                    <select
                      value={preference.settings?.frequency || 'immediate'}
                      onChange={(e) => handleUpdatePreferenceSetting(
                        preference.notificationType, 
                        'frequency', 
                        e.target.value
                      )}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                      {frequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Escalation Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={preference.settings?.escalationLevel || 'all'}
                      onChange={(e) => handleUpdatePreferenceSetting(
                        preference.notificationType, 
                        'escalationLevel', 
                        e.target.value
                      )}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                      {escalationOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quiet Hours */}
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!preference.settings?.quietHours}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleUpdatePreferenceSetting(
                              preference.notificationType, 
                              'quietHours', 
                              { start: '22:00', end: '08:00' }
                            );
                          } else {
                            handleUpdatePreferenceSetting(
                              preference.notificationType, 
                              'quietHours', 
                              undefined
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable quiet hours
                      </span>
                    </label>
                    
                    {preference.settings?.quietHours && (
                      <div className="mt-2 flex items-center space-x-4">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Start
                          </label>
                          <input
                            type="time"
                            value={preference.settings.quietHours.start}
                            onChange={(e) => handleUpdatePreferenceSetting(
                              preference.notificationType, 
                              'quietHours', 
                              { 
                                ...preference.settings!.quietHours!, 
                                start: e.target.value 
                              }
                            )}
                            className="block rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            End
                          </label>
                          <input
                            type="time"
                            value={preference.settings.quietHours.end}
                            onChange={(e) => handleUpdatePreferenceSetting(
                              preference.notificationType, 
                              'quietHours', 
                              { 
                                ...preference.settings!.quietHours!, 
                                end: e.target.value 
                              }
                            )}
                            className="block rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assignment Filter for ticket notifications */}
                  {(preference.notificationType === 'ticket_assigned' || 
                    preference.notificationType === 'ticket_overdue') && (
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preference.settings?.assignedOnly || false}
                          onChange={(e) => handleUpdatePreferenceSetting(
                            preference.notificationType, 
                            'assignedOnly', 
                            e.target.checked
                          )}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Only notify for tickets assigned to me
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Client Filter */}
                  {clients && clients.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Client Filter (leave empty for all clients)
                      </label>
                      <select
                        multiple
                        value={preference.settings?.clientFilter || []}
                        onChange={(e) => {
                          const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                          handleUpdatePreferenceSetting(
                            preference.notificationType, 
                            'clientFilter', 
                            selectedValues.length > 0 ? selectedValues : undefined
                          );
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm h-32"
                      >
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Hold Ctrl/Cmd to select multiple clients
                      </p>
                    </div>
                  )}

                  {/* Digest Mode */}
                  {(preference.settings?.frequency === 'daily' || preference.settings?.frequency === 'weekly') && (
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preference.settings?.digest || false}
                          onChange={(e) => handleUpdatePreferenceSetting(
                            preference.notificationType, 
                            'digest', 
                            e.target.checked
                          )}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Send as digest summary
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                        Combine multiple notifications into a single summary email
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 border-t bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Changes take effect immediately after saving
          </p>
          <button
            onClick={handleSavePreferences}
            disabled={updatePreferencesMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updatePreferencesMutation.isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationPreferences;