"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { timeEntries } from "@/lib/mock-data";

export default function TimePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [showBillableOnly, setShowBillableOnly] = useState(false);

  // Generate date filter options
  const uniqueDates = [...new Set(timeEntries.map(entry => entry.date))].sort().reverse();
  
  // Filter time entries
  const filteredEntries = timeEntries.filter(entry => {
    const matchesSearch = 
      entry.ticketTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = selectedDate === "all" || entry.date === selectedDate;
    const matchesBillable = !showBillableOnly || entry.billable;
    
    return matchesSearch && matchesDate && matchesBillable;
  });

  // Calculate totals
  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const totalRevenue = filteredEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.duration / 60 * entry.hourlyRate), 0);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimePeriod = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const formatTimeOnly = (date: Date) => 
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (!endTime) {
      return `Started ${formatTimeOnly(start)}`;
    }
    
    const end = new Date(endTime);
    return `${formatTimeOnly(start)} - ${formatTimeOnly(end)}`;
  };

  // Get today's entries for daily summary
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = timeEntries.filter(entry => entry.date === today);
  const todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const todayBillable = todayEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0) / 60;

  // Get this week's entries
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const weekStart = getWeekStart(new Date());
  const weekEntries = timeEntries.filter(entry => entry.date >= weekStart);
  const weekHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const weekBillable = weekEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0) / 60;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      
      <main style={{ flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h1 style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                margin: 0,
                color: "var(--text)"
              }}>
                Time Tracking
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                {filteredEntries.length} time entries
              </p>
            </div>
            
            <button style={{
              background: "var(--accent)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              + Start Timer
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 16,
            maxWidth: 600
          }}>
            <div style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                {todayHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Today</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {todayBillable.toFixed(1)}h billable
              </div>
            </div>

            <div style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                {weekHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>This Week</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {weekBillable.toFixed(1)}h billable
              </div>
            </div>

            <div style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                {totalHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Filtered Total</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {billableHours.toFixed(1)}h billable
              </div>
            </div>

            <div style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                {formatCurrency(totalRevenue)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Revenue</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                From filtered entries
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "var(--bg-secondary)",
                  color: "var(--text)",
                }}
              />
              <span style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                color: "var(--text-muted)",
              }}>
                🔍
              </span>
            </div>

            {/* Date Filter */}
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              <option value="all">All dates</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>

            {/* Billable Toggle */}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "var(--text-secondary)",
              cursor: "pointer"
            }}>
              <input
                type="checkbox"
                checked={showBillableOnly}
                onChange={(e) => setShowBillableOnly(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Billable only
            </label>
          </div>
        </div>

        {/* Time Entry List */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 280px)" 
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 100ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--accent)",
                        background: "var(--accent-muted)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}>
                        {entry.ticketNumber}
                      </span>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text)"
                      }}>
                        {entry.ticketTitle}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>
                      {entry.client} • {entry.assignee}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {entry.description}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 2
                    }}>
                      {formatTime(entry.duration)}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: entry.billable ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: entry.billable ? 500 : 400
                    }}>
                      {entry.billable ? formatCurrency(entry.duration / 60 * entry.hourlyRate) : "Non-billable"}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: 12,
                  color: "var(--text-muted)"
                }}>
                  <div>
                    {formatDate(entry.date)} • {formatTimePeriod(entry.startTime, entry.endTime)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {entry.billable && (
                      <span style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 500
                      }}>
                        ${entry.hourlyRate}/hr
                      </span>
                    )}
                    <span style={{
                      background: entry.billable ? "var(--accent-muted)" : "var(--bg-hover)",
                      color: entry.billable ? "var(--accent)" : "var(--text-muted)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 500
                    }}>
                      {entry.billable ? "BILLABLE" : "NON-BILLABLE"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredEntries.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "var(--text-muted)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏱️</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                No time entries found
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {searchQuery || selectedDate !== "all" || showBillableOnly ? 
                  "Try adjusting your filters" : 
                  "Start tracking time on tickets to see entries here"
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}