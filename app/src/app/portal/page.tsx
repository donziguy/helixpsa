"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

// Types for portal data
type PortalSession = {
  clientId: string;
  contactEmail: string;
  contactName: string;
  clientName: string;
  sessionToken: string;
};

type Ticket = {
  id: string;
  number: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  estimatedHours: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: Date;
  }>;
};

export default function ClientPortal() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<'tickets' | 'new-ticket' | 'ticket-detail'>('tickets');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToastHelpers();

  // Mutations
  const authenticateMutation = api.portal.authenticate.useMutation();
  const submitTicketMutation = api.portal.submitTicket.useMutation();
  const addTicketNoteMutation = api.portal.addTicketNote.useMutation();
  
  // Utils for imperative queries
  const utils = api.useUtils();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    clientId: '',
    contactEmail: '',
  });

  // New ticket form state
  const [newTicketForm, setNewTicketForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });

  // Note form state
  const [noteForm, setNoteForm] = useState({
    content: '',
  });

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('portal-session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setSession(parsedSession);
        loadTickets(parsedSession);
      } catch (e) {
        localStorage.removeItem('portal-session');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.clientId || !loginForm.contactEmail) {
      toast.error("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateMutation.mutateAsync({
        clientId: loginForm.clientId,
        contactEmail: loginForm.contactEmail,
      });

      const newSession: PortalSession = {
        clientId: loginForm.clientId,
        contactEmail: loginForm.contactEmail,
        contactName: result.contact.name,
        clientName: result.contact.clientName,
        sessionToken: result.sessionToken,
      };

      setSession(newSession);
      localStorage.setItem('portal-session', JSON.stringify(newSession));
      toast.success("Success", `Welcome, ${result.contact.name}!`);
      
      // Load tickets after successful login
      await loadTickets(newSession);
    } catch (error: any) {
      toast.error("Login Failed", error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTickets = async (sessionData: PortalSession) => {
    try {
      const ticketList = await utils.portal.getClientTickets.fetch({
        clientId: sessionData.clientId,
        contactEmail: sessionData.contactEmail,
      });
      setTickets(ticketList);
    } catch (error: any) {
      toast.error("Error", "Failed to load tickets");
    }
  };

  const handleNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newTicketForm.title || !newTicketForm.description) {
      toast.error("Error", "Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const newTicket = await submitTicketMutation.mutateAsync({
        clientId: session.clientId,
        contactEmail: session.contactEmail,
        title: newTicketForm.title,
        description: newTicketForm.description,
        priority: newTicketForm.priority,
      });

      toast.success("Ticket Created", `${newTicket.number} - ${newTicket.title}`);
      setNewTicketForm({ title: '', description: '', priority: 'medium' });
      setView('tickets');
      
      // Reload tickets
      await loadTickets(session);
    } catch (error: any) {
      toast.error("Error", "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    if (!session) return;

    try {
      const ticketDetail = await utils.portal.getTicketById.fetch({
        ticketId,
        clientId: session.clientId,
        contactEmail: session.contactEmail,
      });
      setSelectedTicket(ticketDetail);
      setView('ticket-detail');
    } catch (error: any) {
      toast.error("Error", "Failed to load ticket details");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedTicket || !noteForm.content) {
      toast.error("Error", "Please enter a note");
      return;
    }

    setIsLoading(true);
    try {
      const newNote = await addTicketNoteMutation.mutateAsync({
        ticketId: selectedTicket.id,
        clientId: session.clientId,
        contactEmail: session.contactEmail,
        content: noteForm.content,
      });

      // Update the selected ticket with the new note
      setSelectedTicket(prev => prev ? {
        ...prev,
        notes: [...(prev.notes || []), newNote]
      } : null);
      
      setNoteForm({ content: '' });
      toast.success("Success", "Note added successfully");
    } catch (error: any) {
      toast.error("Error", "Failed to add note");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setTickets([]);
    setSelectedTicket(null);
    setView('tickets');
    localStorage.removeItem('portal-session');
    toast.success("Success", "Logged out successfully");
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'waiting': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Login screen
  if (!session) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '400px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#1f2937',
              marginBottom: '0.5rem' 
            }}>
              Client Portal
            </div>
            <div style={{ color: '#6b7280' }}>
              Access your support tickets
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem' 
              }}>
                Client ID
              </label>
              <input
                type="text"
                value={loginForm.clientId}
                onChange={(e) => setLoginForm({ ...loginForm, clientId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; }}
                placeholder="Enter your client ID"
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem' 
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={loginForm.contactEmail}
                onChange={(e) => setLoginForm({ ...loginForm, contactEmail: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; }}
                placeholder="Enter your email address"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#3b82f6';
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main portal interface
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
            Client Portal
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {session.clientName} • {session.contactName}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setView('tickets')}
            style={{
              padding: '0.5rem 1rem',
              background: view === 'tickets' ? '#3b82f6' : 'transparent',
              color: view === 'tickets' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            My Tickets
          </button>
          <button
            onClick={() => setView('new-ticket')}
            style={{
              padding: '0.5rem 1rem',
              background: view === 'new-ticket' ? '#3b82f6' : 'transparent',
              color: view === 'new-ticket' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            New Ticket
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '2rem' }}>
        {view === 'tickets' && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '2rem' 
            }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Your Tickets
              </h1>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => loadTicketDetail(ticket.id)}
                  style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem' 
                  }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      color: '#3b82f6' 
                    }}>
                      {ticket.number}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: getPriorityColor(ticket.priority) + '20',
                        color: getPriorityColor(ticket.priority),
                        fontWeight: '500',
                      }}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: getStatusColor(ticket.status) + '20',
                        color: getStatusColor(ticket.status),
                        fontWeight: '500',
                      }}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                  }}>
                    {ticket.title}
                  </div>

                  {ticket.description && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      marginBottom: '1rem',
                      maxHeight: '3rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ticket.description}
                    </div>
                  )}

                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>Created: {formatDate(ticket.createdAt)}</span>
                    <span>Updated: {formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                  <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No tickets yet</div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Submit your first ticket to get started
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'new-ticket' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2rem' }}>
              Submit New Ticket
            </h1>

            <form onSubmit={handleNewTicket} style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem' 
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newTicketForm.title}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem' 
                }}>
                  Priority
                </label>
                <select
                  value={newTicketForm.priority}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    background: 'white',
                  }}
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="medium">Medium - Normal support</option>
                  <option value="high">High - Urgent issue</option>
                  <option value="critical">Critical - System down</option>
                </select>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem' 
                }}>
                  Description *
                </label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  placeholder="Please provide detailed information about the issue, including steps to reproduce, error messages, etc."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setView('tickets')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: isLoading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'ticket-detail' && selectedTicket && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button
                onClick={() => setView('tickets')}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                ← Back
              </button>
              <div>
                <h1 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  margin: 0 
                }}>
                  {selectedTicket.number}
                </h1>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Ticket Details
                </div>
              </div>
            </div>

            {/* Ticket Info Card */}
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: getPriorityColor(selectedTicket.priority) + '20',
                  color: getPriorityColor(selectedTicket.priority),
                  fontWeight: '500',
                }}>
                  {selectedTicket.priority.toUpperCase()}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: getStatusColor(selectedTicket.status) + '20',
                  color: getStatusColor(selectedTicket.status),
                  fontWeight: '500',
                }}>
                  {selectedTicket.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem',
              }}>
                {selectedTicket.title}
              </h2>

              {selectedTicket.description && (
                <div style={{
                  fontSize: '1rem',
                  color: '#374151',
                  lineHeight: 1.6,
                  marginBottom: '1rem',
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedTicket.description}
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280',
              }}>
                <div>Created: {formatDate(selectedTicket.createdAt)}</div>
                <div>Updated: {formatDate(selectedTicket.updatedAt)}</div>
                {selectedTicket.estimatedHours && (
                  <div>Estimated: {selectedTicket.estimatedHours} hours</div>
                )}
                {selectedTicket.resolvedAt && (
                  <div>Resolved: {formatDate(selectedTicket.resolvedAt)}</div>
                )}
              </div>
            </div>

            {/* Notes/Comments */}
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1.5rem',
              }}>
                Comments
              </h3>

              {/* Existing notes */}
              <div style={{ marginBottom: '2rem' }}>
                {selectedTicket.notes && selectedTicket.notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      lineHeight: 1.6,
                      marginBottom: '0.5rem',
                    }}>
                      {note.content}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                    }}>
                      {formatDate(note.createdAt)}
                    </div>
                  </div>
                ))}

                {(!selectedTicket.notes || selectedTicket.notes.length === 0) && (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  }}>
                    No comments yet
                  </div>
                )}
              </div>

              {/* Add new note form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleAddNote}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem' 
                    }}>
                      Add Comment
                    </label>
                    <textarea
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ content: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                      placeholder="Add a comment to this ticket..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !noteForm.content}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: isLoading || !noteForm.content ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: isLoading || !noteForm.content ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? 'Adding...' : 'Add Comment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}