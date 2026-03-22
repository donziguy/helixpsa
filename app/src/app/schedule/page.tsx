"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

// Types for calendar events
type CalendarEvent = {
  id: string;
  type: 'sla_deadline' | 'time_entry';
  title: string;
  description: string;
  start: Date;
  end: Date;
  ticket: {
    id: string;
    number: string;
    title: string;
    priority: string;
    status: string;
  };
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  timeEntryId?: string;
  duration?: number | null;
};

type WorkloadSummary = {
  technician: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  assignedTickets: number;
  openTickets: number;
  hoursLogged: number;
  timeEntries: number;
  upcomingDeadlines: number;
};

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showWorkload, setShowWorkload] = useState(false);
  const toast = useToastHelpers();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Start from Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    if (viewMode === 'week') {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    } else {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
    }
  }, [selectedDate, viewMode]);

  // API calls
  const { data: scheduleData, isLoading } = api.schedule.getSchedule.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    userId: selectedTechnician || undefined,
    clientId: selectedClient || undefined,
  });

  const { data: technicians } = api.schedule.getTechnicians.useQuery();

  const { data: clients } = api.clients.getAll.useQuery();

  const { data: workloadData } = api.schedule.getWorkloadSummary.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  }, {
    enabled: showWorkload,
  });

  const updateAssignmentMutation = api.schedule.updateAssignment.useMutation({
    onSuccess: () => {
      toast.success("Assignment Updated", "Ticket has been reassigned");
    },
    onError: (error) => {
      toast.error("Assignment Failed", error.message);
    },
  });

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    const currentDate = new Date(dateRange.start);
    
    while (currentDate <= dateRange.end) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [dateRange]);

  const handleAssignmentChange = (ticketId: string, assigneeId: string) => {
    updateAssignmentMutation.mutate({
      ticketId,
      assigneeId: assigneeId || undefined,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getEventsForDay = (day: Date) => {
    if (!scheduleData?.events) return [];
    
    return scheduleData.events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'sla_deadline') {
      return '#dc2626'; // Red for SLA deadlines
    }
    return getPriorityColor(event.ticket.priority);
  };

  // Navigation helpers
  const goToPrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
            <div>Loading schedule...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
              Schedule & Dispatch
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={goToPrevious}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ←
              </button>
              <button
                onClick={goToToday}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Today
              </button>
              <button
                onClick={goToNext}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                →
              </button>
              <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginLeft: 8 }}>
                {viewMode === 'week' 
                  ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                  : selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
                }
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* View mode toggle */}
            <div style={{
              display: "flex", borderRadius: 6, overflow: "hidden",
              border: "1px solid var(--border-subtle)",
            }}>
              <button
                onClick={() => setViewMode('week')}
                style={{
                  padding: "6px 12px", border: "none",
                  background: viewMode === 'week' ? "var(--primary)" : "var(--bg-tertiary)",
                  color: viewMode === 'week' ? "white" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                }}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                style={{
                  padding: "6px 12px", border: "none",
                  background: viewMode === 'month' ? "var(--primary)" : "var(--bg-tertiary)",
                  color: viewMode === 'month' ? "white" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                }}
              >
                Month
              </button>
            </div>

            {/* Workload toggle */}
            <button
              onClick={() => setShowWorkload(!showWorkload)}
              style={{
                padding: "6px 12px", borderRadius: 6,
                background: showWorkload ? "var(--primary)" : "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                color: showWorkload ? "white" : "var(--text-secondary)",
                cursor: "pointer", fontFamily: "inherit", fontSize: 13,
              }}
            >
              📊 Workload
            </button>
          </div>
        </header>

        {/* Filters */}
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", gap: 16,
          background: "var(--bg-secondary)",
        }}>
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg)", color: "var(--text-primary)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <option value="">All Technicians</option>
            {technicians?.map(tech => (
              <option key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>

          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg)", color: "var(--text-primary)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <option value="">All Clients</option>
            {clients?.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          {scheduleData?.events && (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {scheduleData.events.length} events found
            </span>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Calendar */}
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: viewMode === 'week' ? "repeat(7, 1fr)" : "repeat(7, 1fr)",
              gap: 1,
              background: "var(--border-subtle)",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{
                  padding: "12px 8px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                  fontSize: 13, fontWeight: 500, textAlign: "center",
                }}>
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map(day => {
                const events = getEventsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div key={day.toISOString()} style={{
                    minHeight: viewMode === 'week' ? 200 : 120,
                    background: "var(--bg)",
                    padding: 8,
                    position: "relative",
                    border: isToday ? "2px solid var(--primary)" : "none",
                  }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500,
                      color: isToday ? "var(--primary)" : "var(--text-primary)",
                      marginBottom: 4,
                    }}>
                      {day.getDate()}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {events.slice(0, viewMode === 'week' ? 10 : 3).map(event => (
                        <div key={event.id} style={{
                          padding: "3px 6px", borderRadius: 4,
                          background: getEventColor(event) + '20',
                          border: `1px solid ${getEventColor(event)}40`,
                          fontSize: 11, lineHeight: 1.3,
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {event.type === 'sla_deadline' && '⚠️ '}
                          {event.type === 'time_entry' && formatTime(new Date(event.start)) + ' '}
                          {event.ticket.number}
                          {viewMode === 'week' && `: ${event.description}`}
                        </div>
                      ))}
                      {events.length > (viewMode === 'week' ? 10 : 3) && (
                        <div style={{
                          fontSize: 11, color: "var(--text-muted)",
                          fontStyle: "italic",
                        }}>
                          +{events.length - (viewMode === 'week' ? 10 : 3)} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workload panel */}
          {showWorkload && workloadData && (
            <div style={{
              width: 350, borderLeft: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)", overflow: "auto",
              padding: 16,
            }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>
                Workload Summary
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {workloadData.map(summary => (
                  <div key={summary.technician.id} style={{
                    padding: 12, borderRadius: 8,
                    background: "var(--bg)",
                    border: "1px solid var(--border-subtle)",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                      {summary.technician.firstName} {summary.technician.lastName}
                      <span style={{ 
                        fontSize: 12, color: "var(--text-muted)", 
                        fontWeight: 400, marginLeft: 4 
                      }}>
                        ({summary.technician.role})
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      <div>
                        <div style={{ color: "var(--text-muted)" }}>Open Tickets</div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {summary.openTickets} / {summary.assignedTickets}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)" }}>Hours Logged</div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {summary.hoursLogged}h
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)" }}>Entries</div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {summary.timeEntries}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-muted)" }}>SLA Deadlines</div>
                        <div style={{ 
                          fontWeight: 500, 
                          color: summary.upcomingDeadlines > 0 ? "var(--danger)" : "var(--text-primary)" 
                        }}>
                          {summary.upcomingDeadlines}
                        </div>
                      </div>
                    </div>

                    {/* Workload indicator */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ 
                        height: 4, borderRadius: 2, background: "var(--border-subtle)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min((summary.openTickets / 10) * 100, 100)}%`,
                          background: summary.openTickets > 8 ? "var(--danger)" :
                                   summary.openTickets > 5 ? "var(--warning)" : "var(--success)",
                          borderRadius: 2,
                        }} />
                      </div>
                      <div style={{ 
                        fontSize: 11, color: "var(--text-muted)", marginTop: 2 
                      }}>
                        Workload: {summary.openTickets > 8 ? 'High' : 
                                  summary.openTickets > 5 ? 'Medium' : 'Low'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}