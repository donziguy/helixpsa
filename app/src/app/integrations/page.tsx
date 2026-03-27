'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { toast } from '@/components/Toast';

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

function SlackIntegration() {
  const [setupMode, setSetupMode] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    teamId: '',
    teamName: '',
    botUserId: '',
    botAccessToken: '',
  });

  const { data: integration, isLoading: integrationLoading, refetch: refetchIntegration } = api.slack.getIntegration.useQuery();
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels } = api.slack.getChannels.useQuery();
  const { data: preferences, isLoading: preferencesLoading, refetch: refetchPreferences } = api.slack.getNotificationPreferences.useQuery();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = api.slack.getNotificationHistory.useQuery({
    limit: 20,
  });
  const { data: stats } = api.slack.getNotificationStatistics.useQuery();

  const addIntegrationMutation = api.slack.addIntegration.useMutation({
    onSuccess: () => {
      toast('Slack integration added successfully!');
      setSetupMode(false);
      refetchIntegration();
      refetchChannels();
    },
    onError: (error) => {
      toast(`Failed to add Slack integration: ${error.message}`, 'error');
    },
  });

  const testIntegrationMutation = api.slack.testIntegration.useMutation({
    onSuccess: (data) => {
      toast(data.message, data.success ? 'success' : 'error');
    },
    onError: (error) => {
      toast(`Test failed: ${error.message}`, 'error');
    },
  });

  const disableIntegrationMutation = api.slack.disableIntegration.useMutation({
    onSuccess: () => {
      toast('Slack integration disabled');
      refetchIntegration();
    },
    onError: (error) => {
      toast(`Failed to disable integration: ${error.message}`, 'error');
    },
  });

  const updatePreferencesMutation = api.slack.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast('Slack preferences updated successfully!');
      refetchPreferences();
    },
    onError: (error) => {
      toast(`Failed to update preferences: ${error.message}`, 'error');
    },
  });

  const sendTestNotificationMutation = api.slack.sendTestNotification.useMutation({
    onSuccess: () => {
      toast('Test notification sent!');
      refetchHistory();
    },
    onError: (error) => {
      toast(`Failed to send test notification: ${error.message}`, 'error');
    },
  });

  const processPendingMutation = api.slack.processPending.useMutation({
    onSuccess: (data) => {
      toast(`${data.message}: ${data.sent} sent, ${data.failed} failed`);
      refetchHistory();
    },
    onError: (error) => {
      toast(`Failed to process notifications: ${error.message}`, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIntegrationMutation.mutate(formData);
  };

  const handlePreferenceChange = (notificationType: string, enabled: boolean, channelId?: string, channelName?: string) => {
    const currentPrefs = preferences || [];
    const updatedPrefs = currentPrefs.map(pref => 
      pref.notificationType === notificationType
        ? {
            ...pref,
            isEnabled: enabled,
            settings: {
              ...pref.settings,
              slackChannelId: channelId || null,
              slackChannelName: channelName || null,
              useDirectMessage: !channelId,
            },
          }
        : pref
    );

    updatePreferencesMutation.mutate(updatedPrefs);
  };

  const notificationTypeLabels = {
    sla_breach: 'SLA Breaches',
    sla_warning: 'SLA Warnings',
    warranty_expiring: 'Warranty Expiring',
    maintenance_due: 'Maintenance Due',
    ticket_assigned: 'Ticket Assigned',
    ticket_overdue: 'Ticket Overdue',
    system_alert: 'System Alerts',
  };

  if (integrationLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Slack Integration</h1>
        {integration && !setupMode && (
          <div className="flex gap-2">
            <button
              onClick={() => testIntegrationMutation.mutate()}
              disabled={testIntegrationMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={() => setSetupMode(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Reconfigure
            </button>
            <button
              onClick={() => disableIntegrationMutation.mutate()}
              disabled={disableIntegrationMutation.isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Disable
            </button>
          </div>
        )}
      </div>

      {/* Integration Status */}
      {integration && !setupMode ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">✅ Connected to Slack</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p><strong>Workspace:</strong> {integration.teamName}</p>
              <p><strong>Team ID:</strong> {integration.teamId}</p>
            </div>
            <div>
              <p><strong>Bot User ID:</strong> {integration.botUserId}</p>
              <p><strong>Connected:</strong> {new Date(integration.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          {stats && (
            <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <div className="text-sm text-gray-500">Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Setup Form
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🔗 Connect Slack</h2>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://api.slack.com/apps</a></li>
              <li>Create a new app and install it to your workspace</li>
              <li>Add the following bot token scopes: <code className="bg-gray-100 px-1 rounded">chat:write, channels:read, groups:read, im:write, users:read</code></li>
              <li>Copy the Bot User OAuth Token and other details below</li>
            </ol>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team ID
              </label>
              <input
                type="text"
                value={formData.teamId}
                onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="T1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={formData.teamName}
                onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Workspace Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot User ID
              </label>
              <input
                type="text"
                value={formData.botUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, botUserId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="U1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Access Token
              </label>
              <input
                type="password"
                value={formData.botAccessToken}
                onChange={(e) => setFormData(prev => ({ ...prev, botAccessToken: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="xoxb-..."
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addIntegrationMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addIntegrationMutation.isLoading ? 'Connecting...' : 'Connect Slack'}
              </button>
              {setupMode && (
                <button
                  type="button"
                  onClick={() => setSetupMode(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Notification Preferences */}
      {integration && !setupMode && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📬 Notification Settings</h2>
            <button
              onClick={() => sendTestNotificationMutation.mutate({ 
                notificationType: 'system_alert',
                slackChannelId: undefined,
              })}
              disabled={sendTestNotificationMutation.isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Send Test
            </button>
          </div>

          {preferencesLoading ? (
            <div>Loading preferences...</div>
          ) : (
            <div className="space-y-4">
              {preferences?.map((pref) => (
                <div key={pref.notificationType} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={pref.isEnabled}
                      onChange={(e) => handlePreferenceChange(pref.notificationType, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="font-medium">
                      {notificationTypeLabels[pref.notificationType as keyof typeof notificationTypeLabels]}
                    </label>
                  </div>

                  {pref.isEnabled && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Channel:</label>
                      <select
                        value={pref.settings.slackChannelId || ''}
                        onChange={(e) => {
                          const channelId = e.target.value;
                          const channelName = channels?.find(c => c.id === channelId)?.name;
                          handlePreferenceChange(pref.notificationType, true, channelId || undefined, channelName);
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Direct Message</option>
                        {channels?.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            #{channel.name} {!channel.is_member && '(not a member)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notification History */}
      {integration && !setupMode && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📜 Recent Notifications</h2>
            <button
              onClick={() => processPendingMutation.mutate()}
              disabled={processPendingMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Process Pending
            </button>
          </div>

          {historyLoading ? (
            <div>Loading history...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history?.map((notification) => (
                    <tr key={notification.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {notificationTypeLabels[notification.notificationType as keyof typeof notificationTypeLabels]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.slackChannelName || 'DM'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          notification.status === 'sent' 
                            ? 'bg-green-100 text-green-800'
                            : notification.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {notification.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {history?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No notifications sent yet
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SlackIntegration />
    </div>
  );
}