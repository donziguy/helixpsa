'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
import NotificationPreferences from '@/components/NotificationPreferences';
import { toast } from '@/components/Toast';

function NotificationHistory() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'sent' | 'failed' | 'bounced' | undefined>();
  const [typeFilter, setTypeFilter] = useState<'sla_breach' | 'sla_warning' | 'warranty_expiring' | 'maintenance_due' | 'ticket_assigned' | 'ticket_overdue' | 'system_alert' | undefined>();

  const { data: history, isLoading: historyLoading, refetch } = api.notifications.getEmailHistory.useQuery({
    limit: 20,
    status: statusFilter,
    notificationType: typeFilter,
  });

  const { data: stats } = api.notifications.getStatistics.useQuery();

  const triggerChecksMutation = api.notifications.triggerChecks.useMutation({
    onSuccess: (data) => {
      toast(data.message);
      refetch();
    },
    onError: (error) => {
      toast(`Failed to trigger checks: ${error.message}`, 'error');
    },
  });

  const processPendingMutation = api.notifications.processPending.useMutation({
    onSuccess: (data) => {
      toast(`${data.message}: ${data.sent} sent, ${data.failed} failed`);
      refetch();
    },
    onError: (error) => {
      toast(`Failed to process notifications: ${error.message}`, 'error');
    },
  });

  const retryFailedMutation = api.notifications.retryFailed.useMutation({
    onSuccess: (data) => {
      toast(`Retry completed: ${data.sent} sent, ${data.failed} failed`);
      refetch();
    },
    onError: (error) => {
      toast(`Failed to retry notifications: ${error.message}`, 'error');
    },
  });

  const handleTriggerChecks = (checkType: 'sla' | 'warranty' | 'maintenance' | 'all') => {
    triggerChecksMutation.mutate({ checkType });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      bounced: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || styles.pending}`;
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      sla_breach: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      sla_warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      warranty_expiring: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      maintenance_due: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      ticket_assigned: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      ticket_overdue: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      system_alert: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${styles[type as keyof typeof styles] || styles.system_alert}`;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notification Management
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTriggerChecks('all')}
            disabled={triggerChecksMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {triggerChecksMutation.isLoading ? 'Checking...' : 'Trigger All Checks'}
          </button>
          <button
            onClick={() => handleTriggerChecks('sla')}
            disabled={triggerChecksMutation.isLoading}
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            Check SLAs
          </button>
          <button
            onClick={() => handleTriggerChecks('warranty')}
            disabled={triggerChecksMutation.isLoading}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            Check Warranties
          </button>
          <button
            onClick={() => handleTriggerChecks('maintenance')}
            disabled={triggerChecksMutation.isLoading}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Check Maintenance
          </button>
          <button
            onClick={() => processPendingMutation.mutate()}
            disabled={processPendingMutation.isLoading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {processPendingMutation.isLoading ? 'Processing...' : 'Process Pending'}
          </button>
          <button
            onClick={() => retryFailedMutation.mutate({})}
            disabled={retryFailedMutation.isLoading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {retryFailedMutation.isLoading ? 'Retrying...' : 'Retry Failed'}
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification History
          </h3>
          
          {/* Filters */}
          <div className="mt-4 flex gap-4">
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="bounced">Bounced</option>
            </select>
            
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value as any || undefined)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
            >
              <option value="">All Types</option>
              <option value="sla_breach">SLA Breach</option>
              <option value="sla_warning">SLA Warning</option>
              <option value="warranty_expiring">Warranty Expiring</option>
              <option value="maintenance_due">Maintenance Due</option>
              <option value="ticket_assigned">Ticket Assigned</option>
              <option value="ticket_overdue">Ticket Overdue</option>
              <option value="system_alert">System Alert</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {history?.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {notification.recipient?.firstName} {notification.recipient?.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {notification.recipient?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getTypeBadge(notification.notificationType)}>
                        {notification.notificationType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {notification.subject}
                      </div>
                      {notification.errorMessage && (
                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate">
                          {notification.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(notification.status)}>
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {history && history.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No notifications found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'preferences' | 'history'>('preferences');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your notification preferences and view notification history
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            History & Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'preferences' ? <NotificationPreferences /> : <NotificationHistory />}
    </div>
  );
}