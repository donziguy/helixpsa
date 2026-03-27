"use client";

import { useIsMobile } from "@/hooks/useMediaQuery";

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
  mobileHidden?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  loading?: boolean;
}

export default function ResponsiveTable({ 
  columns, 
  data, 
  onRowClick, 
  loading = false 
}: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: "40px",
        color: "var(--text-muted)" 
      }}>
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: "40px",
        color: "var(--text-muted)" 
      }}>
        No data available
      </div>
    );
  }

  if (isMobile) {
    // Mobile: Card layout
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.map((row, index) => (
          <div
            key={index}
            onClick={() => onRowClick && onRowClick(row)}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: 16,
              cursor: onRowClick ? "pointer" : "default",
              transition: "all 100ms ease",
            }}
            onMouseEnter={(e) => {
              if (onRowClick) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.borderColor = "var(--border)";
              }
            }}
            onMouseLeave={(e) => {
              if (onRowClick) {
                e.currentTarget.style.background = "var(--bg-secondary)";
                e.currentTarget.style.borderColor = "var(--border-subtle)";
              }
            }}
          >
            {columns
              .filter(col => !col.mobileHidden)
              .map((column) => {
                const value = row[column.key];
                const displayValue = column.render ? column.render(value, row) : value;
                
                return (
                  <div key={column.key} style={{ marginBottom: 8 }}>
                    <div style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {column.label}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: "var(--text)",
                      lineHeight: 1.4
                    }}>
                      {displayValue}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  width: column.width,
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {columns.map((column) => {
                const value = row[column.key];
                const displayValue = column.render ? column.render(value, row) : value;
                
                return (
                  <td
                    key={column.key}
                    style={{
                      padding: "16px",
                      fontSize: 14,
                      color: "var(--text)",
                      verticalAlign: "middle",
                    }}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}