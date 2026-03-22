'use client';

import { useState } from 'react';
import { api } from '@/utils/api';

interface EmailConfiguration {
  id: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  folderName: string;
  defaultClientId: string | null;
  defaultAssigneeId: string | null;
  defaultPriority: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  autoAssignBySubject: boolean;
  subjectClientMappings: string | null;
  lastProcessedUid: number | null;
  createdAt: Date;
  updatedAt: Date;
  defaultClient?: { id: string; name: string } | null;
  defaultAssignee?: { id: string; firstName: string; lastName: string } | null;
}

interface NewConfigForm {
  name: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  email: string;
  password: string;
  defaultClientId: string;
  defaultAssigneeId: string;
  defaultPriority: 'critical' | 'high' | 'medium' | 'low';
  folderName: string;
  autoAssignBySubject: boolean;
  subjectClientMappings: string;
}

export default function EmailPage() {
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfiguration | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  // API calls
  const { data: configurations, refetch: refetchConfigurations } = api.email.getConfigurations.useQuery();
  const { data: clients } = api.clients.getAll.useQuery();
  const { data: users } = api.users.getAll.useQuery();
  const { data: statistics } = api.email.getStatistics.useQuery();
  const { data: processingLogs } = api.email.getProcessingLogs.useQuery({
    configurationId: selectedConfigId || undefined,
    limit: 20,
  });

  const createConfigMutation = api.email.createConfiguration.useMutation({
    onSuccess: () => {
      refetchConfigurations();
      setShowNewConfigForm(false);
    },
  });

  const updateConfigMutation = api.email.updateConfiguration.useMutation({
    onSuccess: () => {
      refetchConfigurations();
      setEditingConfig(null);
    },
  });

  const deleteConfigMutation = api.email.deleteConfiguration.useMutation({
    onSuccess: () => {
      refetchConfigurations();
    },
  });

  const testConfigMutation = api.email.testConfiguration.useMutation();
  const processEmailsMutation = api.email.processEmails.useMutation();

  const [newConfigForm, setNewConfigForm] = useState<NewConfigForm>({
    name: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    email: '',
    password: '',
    defaultClientId: '',
    defaultAssigneeId: '',
    defaultPriority: 'medium',
    folderName: 'INBOX',
    autoAssignBySubject: false,
    subjectClientMappings: '',
  });

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConfigMutation.mutateAsync(newConfigForm);
      setNewConfigForm({
        name: '',
        imapHost: '',
        imapPort: 993,
        imapSecure: true,
        email: '',
        password: '',
        defaultClientId: '',
        defaultAssigneeId: '',
        defaultPriority: 'medium',
        folderName: 'INBOX',
        autoAssignBySubject: false,
        subjectClientMappings: '',
      });
    } catch (error) {
      console.error('Error creating configuration:', error);
    }
  };

  const handleUpdateConfig = async (config: EmailConfiguration) => {
    try {
      await updateConfigMutation.mutateAsync({
        id: config.id,
        isActive: !config.isActive,
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (confirm('Are you sure you want to delete this email configuration?')) {
      try {
        await deleteConfigMutation.mutateAsync({ id: configId });
      } catch (error) {
        console.error('Error deleting configuration:', error);
      }
    }
  };

  const handleTestConfig = async (configId: string) => {
    try {
      const result = await testConfigMutation.mutateAsync({ id: configId });
      alert(result.message);
    } catch (error) {
      alert('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleProcessEmails = async (configId?: string) => {
    try {
      const result = await processEmailsMutation.mutateAsync({ 
        configurationId: configId 
      });
      alert(result.message);
      refetchConfigurations();
    } catch (error) {
      alert('Processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'duplicate': return 'bg-yellow-100 text-yellow-800';
      case 'filtered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Email Integration
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure IMAP email monitoring to automatically create tickets from incoming emails.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowNewConfigForm(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Add Configuration
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Configurations</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {statistics.totalConfigurations}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Active</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {statistics.activeConfigurations}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Emails Processed</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {statistics.totalEmailsProcessed}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Successful</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
              {statistics.successfullyProcessed}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Failed</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600">
              {statistics.failed}
            </dd>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Configurations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Email Configurations</h3>
              <button
                type="button"
                onClick={() => handleProcessEmails()}
                disabled={processEmailsMutation.isPending}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {processEmailsMutation.isPending ? 'Processing...' : 'Process All'}
              </button>
            </div>

            <div className="space-y-3">
              {configurations?.map((config) => (
                <div
                  key={config.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{config.name}</h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            config.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(config.defaultPriority)}`}
                        >
                          {config.defaultPriority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{config.email}</p>
                      <p className="text-sm text-gray-500">
                        {config.imapHost}:{config.imapPort} • {config.folderName}
                      </p>
                      <div className="mt-1 text-xs text-gray-400">
                        Default: {config.defaultClient?.name || 'No client'} • 
                        {config.defaultAssignee 
                          ? ` ${config.defaultAssignee.firstName} ${config.defaultAssignee.lastName}`
                          : ' Unassigned'
                        }
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedConfigId(config.id)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        Logs
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestConfig(config.id)}
                        disabled={testConfigMutation.isPending}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcessEmails(config.id)}
                        disabled={processEmailsMutation.isPending}
                        className="text-green-600 hover:text-green-900 text-sm"
                      >
                        Process
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateConfig(config)}
                        className="text-yellow-600 hover:text-yellow-900 text-sm"
                      >
                        {config.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!configurations || configurations.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No email configurations configured.</p>
                  <p className="text-xs text-gray-400">Add a configuration to start processing emails automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Logs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Processing Logs</h3>
              {selectedConfigId && (
                <button
                  type="button"
                  onClick={() => setSelectedConfigId(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Show All
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {processingLogs?.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}
                      >
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.processedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      UID: {log.emailUid}
                    </div>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">{log.subject}</p>
                  <p className="text-gray-600 mb-1">From: {log.fromEmail}</p>
                  {log.ticket && (
                    <p className="text-sm text-indigo-600">
                      Ticket: {log.ticket.number} - {log.ticket.title}
                    </p>
                  )}
                  {log.errorMessage && (
                    <p className="text-red-600 text-xs mt-1">{log.errorMessage}</p>
                  )}
                </div>
              ))}

              {(!processingLogs || processingLogs.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No processing logs found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Configuration Modal */}
      {showNewConfigForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowNewConfigForm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <form onSubmit={handleCreateConfig} className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Add Email Configuration</h3>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Configuration Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newConfigForm.name}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      IMAP Server
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="imap.gmail.com"
                      value={newConfigForm.imapHost}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, imapHost: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Port
                    </label>
                    <input
                      type="number"
                      required
                      value={newConfigForm.imapPort}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, imapPort: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newConfigForm.email}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password / App Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newConfigForm.password}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={newConfigForm.folderName}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, folderName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Client
                    </label>
                    <select
                      value={newConfigForm.defaultClientId}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, defaultClientId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select Client</option>
                      {clients?.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Assignee
                    </label>
                    <select
                      value={newConfigForm.defaultAssigneeId}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, defaultAssigneeId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {users?.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Priority
                    </label>
                    <select
                      value={newConfigForm.defaultPriority}
                      onChange={(e) => setNewConfigForm({ 
                        ...newConfigForm, 
                        defaultPriority: e.target.value as 'critical' | 'high' | 'medium' | 'low' 
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={newConfigForm.imapSecure}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, imapSecure: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">
                      Use SSL/TLS (recommended)
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={newConfigForm.autoAssignBySubject}
                      onChange={(e) => setNewConfigForm({ ...newConfigForm, autoAssignBySubject: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">
                      Auto-assign by subject keywords
                    </label>
                  </div>

                  {newConfigForm.autoAssignBySubject && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Subject Client Mappings (JSON)
                      </label>
                      <textarea
                        value={newConfigForm.subjectClientMappings}
                        onChange={(e) => setNewConfigForm({ ...newConfigForm, subjectClientMappings: e.target.value })}
                        placeholder='{"keyword1": "client-id-1", "keyword2": "client-id-2"}'
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewConfigForm(false)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createConfigMutation.isPending}
                    className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}