"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type DateRange = "7d" | "30d" | "90d" | "1y";
type ChartType = "volume" | "resolution" | "revenue";

const dateRangeOptions: { label: string; value: DateRange; days: number }[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 3 months", value: "90d", days: 90 },
  { label: "Last year", value: "1y", days: 365 },
];

const chartTypeOptions = [
  { label: "Ticket Volume", value: "volume" as ChartType, icon: "📊" },
  { label: "Resolution Time", value: "resolution" as ChartType, icon: "⏱️" },
  { label: "Revenue Analysis", value: "revenue" as ChartType, icon: "💰" },
];

// Color palette for consistent charts
const colors = {
  primary: "#3b82f6",
  secondary: "#8b5cf6", 
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#6b7280",
  accent: "#06b6d4",
};

const priorityColors = {
  critical: colors.danger,
  high: colors.warning,
  medium: colors.primary,
  low: colors.success,
};

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [activeChart, setActiveChart] = useState<ChartType>("volume");
  const [resolutionGroupBy, setResolutionGroupBy] = useState<"priority" | "client" | "assignee">("priority");
  const [revenueGroupBy, setRevenueGroupBy] = useState<"month" | "quarter" | "client" | "year">("month");
  
  const toast = useToastHelpers();

  // Calculate date range
  const getDateRange = (range: DateRange) => {
    const endDate = new Date();
    const startDate = new Date();
    const selectedRange = dateRangeOptions.find(r => r.value === range);
    startDate.setDate(endDate.getDate() - (selectedRange?.days || 30));
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange(dateRange);

  // API queries
  const { data: dashboardStats, isLoading: dashboardLoading } = api.reports.getDashboardStats.useQuery({
    startDate,
    endDate,
  });

  const { data: ticketVolumeData, isLoading: volumeLoading } = api.reports.getTicketVolume.useQuery({
    startDate,
    endDate,
    groupBy: dateRange === "7d" ? "day" : dateRange === "30d" ? "week" : "month",
  }, {
    enabled: activeChart === "volume",
  });

  const { data: resolutionData, isLoading: resolutionLoading } = api.reports.getResolutionTime.useQuery({
    startDate,
    endDate,
    groupBy: resolutionGroupBy,
  }, {
    enabled: activeChart === "resolution",
  });

  const { data: revenueData, isLoading: revenueLoading } = api.reports.getRevenue.useQuery({
    startDate,
    endDate,
    groupBy: revenueGroupBy,
  }, {
    enabled: activeChart === "revenue",
  });

  const { data: topClients } = api.reports.getTopClients.useQuery({
    startDate,
    endDate,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      notation: amount > 1000 ? 'compact' : 'standard',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (dateStr.includes('W')) {
      // Week format: "2026-W12"
      return `Week ${dateStr.split('W')[1]}`;
    }
    if (dateStr.includes('Q')) {
      // Quarter format: "2026-Q1"
      return `Q${dateStr.split('Q')[1]} ${dateStr.split('-')[0]}`;
    }
    if (dateStr.match(/^\d{4}$/)) {
      // Year format: "2026"
      return dateStr;
    }
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      // Month format: "2026-03"
      const [year, month] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Day format: "2026-03-22"
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    return dateStr;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              margin: "2px 0", 
              color: entry.color,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 600 }}>
                {entry.name?.includes('Revenue') || entry.name?.includes('$') 
                  ? formatCurrency(entry.value)
                  : entry.name?.includes('Hours') || entry.name?.includes('Time')
                  ? `${entry.value}h`
                  : entry.value
                }
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderVolumeChart = () => {
    if (volumeLoading) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading chart...</div>;
    }

    if (!ticketVolumeData || ticketVolumeData.length === 0) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No data available</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={ticketVolumeData}>
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis 
            dataKey="period" 
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={formatDate}
          />
          <YAxis stroke="var(--text-muted)" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="totalTickets"
            stroke={colors.primary}
            fillOpacity={1}
            fill="url(#totalGradient)"
            name="Total Tickets"
          />
          <Area
            type="monotone"
            dataKey="resolvedTickets"
            stroke={colors.success}
            fillOpacity={1}
            fill="url(#resolvedGradient)"
            name="Resolved Tickets"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderResolutionChart = () => {
    if (resolutionLoading) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading chart...</div>;
    }

    if (!resolutionData || resolutionData.length === 0) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No data available</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={resolutionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis 
            dataKey="category" 
            stroke="var(--text-muted)"
            fontSize={12}
          />
          <YAxis stroke="var(--text-muted)" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="avgResolutionHours" 
            fill={colors.primary}
            name="Avg Resolution Time (hours)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderRevenueChart = () => {
    if (revenueLoading) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading chart...</div>;
    }

    if (!revenueData || revenueData.length === 0) {
      return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No data available</div>;
    }

    if (revenueGroupBy === 'client') {
      // Client revenue pie chart
      const clientData = revenueData as { category: string; revenue: number; invoiceCount: number; avgInvoice: number; }[];
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={clientData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.category}: ${formatCurrency(entry.revenue)}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="revenue"
            >
              {clientData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(colors)[index % Object.values(colors).length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Time-based revenue area chart
    const timeData = revenueData as { period: string; date: string; revenue: number; invoiceCount: number; avgInvoice: number; }[];
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={timeData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis 
            dataKey="period" 
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={formatDate}
          />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={colors.success}
            fillOpacity={1}
            fill="url(#revenueGradient)"
            name="Revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

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
                📈 Reports & Analytics
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                Data insights for ticket volume, resolution time, and revenue
              </p>
            </div>
            
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
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
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Stats */}
          {dashboardStats && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {dashboardStats.tickets.total}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Tickets</div>
                <div style={{ fontSize: 10, color: dashboardStats.tickets.resolutionRate > 80 ? "var(--accent)" : "var(--text-muted)" }}>
                  {dashboardStats.tickets.resolutionRate}% resolved
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {dashboardStats.time.totalHours}h
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Hours Tracked</div>
                <div style={{ fontSize: 10, color: dashboardStats.time.billableRate > 75 ? "var(--accent)" : "var(--text-muted)" }}>
                  {dashboardStats.time.billableRate}% billable
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                  {formatCurrency(dashboardStats.revenue.paid)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Revenue (Paid)</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {dashboardStats.revenue.totalInvoices} invoices
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: dashboardStats.tickets.critical > 0 ? "#ef4444" : "var(--text)", marginBottom: 2 }}>
                  {dashboardStats.tickets.critical}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Critical Open</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {dashboardStats.tickets.open} total open
                </div>
              </div>
            </div>
          )}

          {/* Chart Type Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {chartTypeOptions.map(option => {
              const isActive = activeChart === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setActiveChart(option.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    background: isActive ? "var(--accent)" : "var(--bg-secondary)",
                    color: isActive ? "white" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--bg-hover)";
                      e.currentTarget.style.color = "var(--text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Content */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 240px)" 
        }}>
          <div style={{ display: "flex", gap: 24 }}>
            {/* Main Chart */}
            <div style={{
              flex: "2",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: "20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--text)" }}>
                  {chartTypeOptions.find(c => c.value === activeChart)?.label}
                </h2>
                
                {/* Chart Options */}
                {activeChart === "resolution" && (
                  <select
                    value={resolutionGroupBy}
                    onChange={(e) => setResolutionGroupBy(e.target.value as any)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 12,
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="priority">By Priority</option>
                    <option value="client">By Client</option>
                    <option value="assignee">By Assignee</option>
                  </select>
                )}
                
                {activeChart === "revenue" && (
                  <select
                    value={revenueGroupBy}
                    onChange={(e) => setRevenueGroupBy(e.target.value as any)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 12,
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="month">By Month</option>
                    <option value="quarter">By Quarter</option>
                    <option value="year">By Year</option>
                    <option value="client">By Client</option>
                  </select>
                )}
              </div>

              {activeChart === "volume" && renderVolumeChart()}
              {activeChart === "resolution" && renderResolutionChart()}
              {activeChart === "revenue" && renderRevenueChart()}
            </div>

            {/* Top Clients Sidebar */}
            <div style={{
              flex: "1",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: "20px",
              maxHeight: "600px",
              overflow: "auto",
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text)" }}>
                🏆 Top Clients
              </h3>
              
              {topClients && topClients.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topClients.slice(0, 8).map((client, index) => (
                    <div
                      key={client.id}
                      style={{
                        padding: "10px",
                        background: "var(--bg)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--accent)",
                          background: "var(--accent-muted)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          minWidth: 20,
                          textAlign: "center",
                        }}>
                          #{index + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                          {client.name}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                        Revenue: <span style={{ fontWeight: 500, color: "var(--accent)" }}>
                          {formatCurrency(client.revenue)}
                        </span>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
                        <div>{client.ticketCount} tickets</div>
                        <div>{client.totalHours}h logged</div>
                      </div>
                      
                      {client.avgResolutionHours && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          Avg resolution: {client.avgResolutionHours}h
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}>
                  No client data available
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}