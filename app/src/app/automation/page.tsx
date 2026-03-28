'use client'

import { useState } from 'react'
import { api } from '@/utils/api'
import { 
  Clock,
  Play,
  Settings,
  Plus,
  Edit,
  Trash2,
  Activity,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Minus,
  X,
  Link,
  ExternalLink,
  DollarSign,
  MessageCircle
} from 'lucide-react'
import type { AutomationCondition, AutomationAction } from '@/lib/automation/AutomationService'
import { useToastHelpers } from '@/lib/toast-context'

interface AutomationRuleFormData {
  name: string
  description: string
  ruleType: 'auto_assign' | 'auto_close' | 'auto_escalate' | 'auto_notify'
  priority: number
  conditions: AutomationCondition[]
  actions: AutomationAction[]
}

const initialFormData: AutomationRuleFormData = {
  name: '',
  description: '',
  ruleType: 'auto_assign',
  priority: 1,
  conditions: [{
    type: 'client_match',
    operator: 'equals',
    value: ''
  }],
  actions: [{
    type: 'assign_user',
    value: ''
  }]
}

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState('rules')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AutomationRuleFormData>(initialFormData)
  const [editingRule, setEditingRule] = useState<string | null>(null)

  const { success, error } = useToastHelpers()

  const { data: rules = [], refetch: refetchRules } = api.automation.getAll.useQuery()
  const { data: stats } = api.automation.getStats.useQuery()
  const { data: executions = [] } = api.automation.getExecutions.useQuery({ limit: 20 })
  const { data: users = [] } = api.users.getAll.useQuery()

  const createRuleMutation = api.automation.create.useMutation({
    onSuccess: () => {
      success('Success', 'Automation rule created successfully')
      setIsCreateDialogOpen(false)
      setFormData(initialFormData)
      refetchRules()
    },
    onError: (err) => {
      error('Error', `Error creating rule: ${err.message}`)
    },
  })

  const updateRuleMutation = api.automation.update.useMutation({
    onSuccess: () => {
      success('Success', 'Automation rule updated successfully')
      setEditingRule(null)
      refetchRules()
    },
    onError: (err) => {
      error('Error', `Error updating rule: ${err.message}`)
    },
  })

  const deleteRuleMutation = api.automation.delete.useMutation({
    onSuccess: () => {
      success('Success', 'Automation rule deleted successfully')
      refetchRules()
    },
    onError: (err) => {
      error('Error', `Error deleting rule: ${err.message}`)
    },
  })

  const executeAutoCloseMutation = api.automation.executeAutoClose.useMutation({
    onSuccess: (result) => {
      success('Auto-close Complete', `${result.ticketsClosed} tickets closed${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`)
      refetchRules()
    },
    onError: (err) => {
      error('Error', `Error executing auto-close rules: ${err.message}`)
    },
  })

  const handleCreateRule = async () => {
    // Validate form data
    const hasValidConditions = formData.conditions.every(c => c.value !== '' && c.value !== 0)
    const hasValidActions = formData.actions.every(a => a.value !== '')
    
    if (!hasValidConditions) {
      error('Validation Error', 'All conditions must have a value')
      return
    }
    
    if (!hasValidActions) {
      error('Validation Error', 'All actions must have a value')
      return
    }

    await createRuleMutation.mutateAsync(formData)
  }

  const isFormValid = () => {
    return formData.name.trim() !== '' && 
           formData.conditions.every(c => c.value !== '' && c.value !== 0) &&
           formData.actions.every(a => a.value !== '')
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    await updateRuleMutation.mutateAsync({ id: ruleId, isActive })
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this automation rule?')) {
      await deleteRuleMutation.mutateAsync({ id: ruleId })
    }
  }

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { type: 'client_match', operator: 'equals', value: '' }]
    }))
  }

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const updateCondition = (index: number, field: keyof AutomationCondition, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }))
  }

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'assign_user', value: '' }]
    }))
  }

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  const updateAction = (index: number, field: keyof AutomationAction, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }))
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation Rules</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automate ticket assignment and workflow processes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => executeAutoCloseMutation.mutate()}
            disabled={executeAutoCloseMutation.isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run Auto-Close
          </button>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total Rules</div>
              <Settings className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.totalRules}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Active Rules</div>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.activeRules}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Executions</div>
              <Play className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.totalExecutions}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Success Rate</div>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.successRate}%</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Successful</div>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.successfulExecutions}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rules
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Execution History
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Integrations
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{rule.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          rule.ruleType === 'auto_assign' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.ruleType.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          rule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                      <button className="p-2 text-gray-500 hover:text-gray-700">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Conditions</h4>
                      <div className="space-y-1">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            {condition.type.replace('_', ' ')} {condition.operator} "{condition.value}"
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Actions</h4>
                      <div className="space-y-1">
                        {rule.actions.map((action, index) => (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            {action.type.replace('_', ' ')}: {action.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Priority: {rule.priority} | Triggered: {rule.triggerCount} times
                    </div>
                    <div className="text-sm text-gray-500">
                      {rule.lastTriggered ? (
                        <>Last run: {new Date(rule.lastTriggered).toLocaleDateString()}</>
                      ) : (
                        'Never run'
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No automation rules found. Create your first rule to get started.
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Executions</h2>
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {execution.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{execution.rule?.name}</div>
                        <div className="text-sm text-gray-500">
                          {execution.rule?.ruleType.replace('_', ' ')}
                          {execution.ticketId && ` • Ticket ${execution.ticketId}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {new Date(execution.executedAt).toLocaleString()}
                      </div>
                      {execution.errorMessage && (
                        <div className="text-xs text-red-500">{execution.errorMessage}</div>
                      )}
                    </div>
                  </div>
                ))}
                {executions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No execution history found
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <IntegrationsPanel />
          )}
        </div>
      </div>

      {/* Create Rule Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Automation Rule</h2>
              <button
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setFormData(initialFormData)
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Rule name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="ruleType" className="block text-sm font-medium mb-2">Rule Type</label>
                  <select
                    id="ruleType"
                    value={formData.ruleType}
                    onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto_assign">Auto Assign</option>
                    <option value="auto_close">Auto Close</option>
                    <option value="auto_escalate">Auto Escalate</option>
                    <option value="auto_notify">Auto Notify</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-2">Priority (1-100)</label>
                <input
                  id="priority"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Conditions</h3>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Condition
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            value={condition.type}
                            onChange={(e) => updateCondition(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="client_match">Client Match</option>
                            <option value="priority_match">Priority Match</option>
                            <option value="status_match">Status Match</option>
                            <option value="time_elapsed">Time Elapsed</option>
                            <option value="subject_contains">Subject Contains</option>
                            <option value="category_match">Category Match</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Operator</label>
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not Equals</option>
                            <option value="contains">Contains</option>
                            <option value="not_contains">Not Contains</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Value</label>
                          {condition.type === 'priority_match' ? (
                            <select
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select priority</option>
                              <option value="critical">Critical</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          ) : condition.type === 'status_match' ? (
                            <select
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select status</option>
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="waiting">Waiting</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          ) : condition.type === 'time_elapsed' ? (
                            <input
                              type="number"
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value) || 0)}
                              placeholder="Days"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              placeholder="Value"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                        <div className="flex items-end">
                          {formData.conditions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCondition(index)}
                              className="p-2 text-red-500 hover:text-red-700 border border-red-300 rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Actions</h3>
                  <button
                    type="button"
                    onClick={addAction}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Action
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.actions.map((action, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            value={action.type}
                            onChange={(e) => updateAction(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="assign_user">Assign User</option>
                            <option value="change_status">Change Status</option>
                            <option value="change_priority">Change Priority</option>
                            <option value="add_note">Add Note</option>
                            <option value="send_notification">Send Notification</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Value</label>
                          {action.type === 'assign_user' ? (
                            <select
                              value={action.value}
                              onChange={(e) => updateAction(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select user</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName}
                                </option>
                              ))}
                            </select>
                          ) : action.type === 'change_status' ? (
                            <select
                              value={action.value}
                              onChange={(e) => updateAction(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select status</option>
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="waiting">Waiting</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          ) : action.type === 'change_priority' ? (
                            <select
                              value={action.value}
                              onChange={(e) => updateAction(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select priority</option>
                              <option value="critical">Critical</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={action.value}
                              onChange={(e) => updateAction(index, 'value', e.target.value)}
                              placeholder="Value"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                        <div className="flex items-end">
                          {formData.actions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAction(index)}
                              className="p-2 text-red-500 hover:text-red-700 border border-red-300 rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setFormData(initialFormData)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRule}
                  disabled={createRuleMutation.isLoading || !isFormValid()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {createRuleMutation.isLoading ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Integrations Panel Component
function IntegrationsPanel() {
  const { success, error } = useToastHelpers()
  
  // QuickBooks integration
  const { data: qbIntegration, refetch: refetchQB } = api.quickbooks.getIntegration.useQuery()
  const testQBMutation = api.quickbooks.testConnection.useMutation({
    onSuccess: (result) => {
      success('Success', `Connected to ${result.companyName}`)
    },
    onError: (err) => {
      error('Error', `Connection failed: ${err.message}`)
    }
  })
  
  // Slack integration  
  const { data: slackIntegration, refetch: refetchSlack } = api.slack.getIntegration.useQuery()
  const testSlackMutation = api.slack.testConnection.useMutation({
    onSuccess: () => {
      success('Success', 'Slack connection verified')
    },
    onError: (err) => {
      error('Error', `Slack test failed: ${err.message}`)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">External Integrations</h2>
        <p className="text-sm text-gray-500">
          Connect HelixPSA with external tools to automate workflows
        </p>
      </div>

      {/* QuickBooks Integration */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">QuickBooks Online</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Sync billable time entries to QuickBooks as invoices
              </p>
              {qbIntegration && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      qbIntegration.isActive && qbIntegration.hasValidTokens 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} />
                    <span>
                      {qbIntegration.isActive && qbIntegration.hasValidTokens 
                        ? 'Connected' 
                        : 'Connection issues'}
                    </span>
                    {qbIntegration.sandbox && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Sandbox
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Company ID: {qbIntegration.companyId}
                  </div>
                  {qbIntegration.lastSyncAt && (
                    <div className="text-xs text-gray-500">
                      Last sync: {new Date(qbIntegration.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                  {qbIntegration.syncErrors && qbIntegration.syncErrors.length > 0 && (
                    <div className="text-xs text-red-600">
                      Recent errors: {qbIntegration.syncErrors.slice(0, 1).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {qbIntegration && (
              <button
                onClick={() => testQBMutation.mutate()}
                disabled={testQBMutation.isLoading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                {testQBMutation.isLoading ? 'Testing...' : 'Test Connection'}
              </button>
            )}
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              {qbIntegration ? 'Manage' : 'Connect'}
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {!qbIntegration && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Connect your QuickBooks Online account to automatically create invoices from billable time entries.
              This integration allows you to sync client billing data and streamline your accounting workflow.
            </p>
          </div>
        )}
      </div>

      {/* Slack Integration */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Slack</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Send automated notifications to Slack channels and direct messages
              </p>
              {slackIntegration && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      slackIntegration.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span>
                      {slackIntegration.isActive ? 'Connected' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Workspace: {slackIntegration.teamName}
                  </div>
                  <div className="text-xs text-gray-500">
                    Bot ID: {slackIntegration.botUserId}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slackIntegration && (
              <button
                onClick={() => testSlackMutation.mutate()}
                disabled={testSlackMutation.isLoading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                {testSlackMutation.isLoading ? 'Testing...' : 'Test Connection'}
              </button>
            )}
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              {slackIntegration ? 'Manage' : 'Connect'}
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {!slackIntegration && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Connect your Slack workspace to receive real-time notifications about SLA breaches, 
              ticket assignments, asset maintenance, and other important events.
            </p>
          </div>
        )}
      </div>

      {/* Available Integrations */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded border">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">Microsoft Teams</div>
                <div className="text-sm text-gray-500">Team notifications</div>
              </div>
            </div>
            <span className="text-sm text-gray-400">Coming Soon</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded border">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">Zapier</div>
                <div className="text-sm text-gray-500">Workflow automation</div>
              </div>
            </div>
            <span className="text-sm text-gray-400">Coming Soon</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded border">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">Xero</div>
                <div className="text-sm text-gray-500">Accounting sync</div>
              </div>
            </div>
            <span className="text-sm text-gray-400">Coming Soon</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded border">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">ConnectWise</div>
                <div className="text-sm text-gray-500">PSA migration</div>
              </div>
            </div>
            <span className="text-sm text-gray-400">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}