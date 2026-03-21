"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  selectOptions?: { value: string; label: string }[];
}

export default function InlineEdit({
  value,
  onSave,
  onCancel,
  className = "",
  style = {},
  placeholder = "Click to edit...",
  multiline = false,
  selectOptions,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type !== "select-one") {
        const input = inputRef.current as HTMLInputElement | HTMLTextAreaElement;
        input.setSelectionRange?.(0, input.value.length);
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    if (currentValue.trim() !== value.trim()) {
      onSave(currentValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    const displayValue = selectOptions 
      ? selectOptions.find(opt => opt.value === value)?.label || value 
      : value;

    return (
      <span
        className={className}
        style={{
          ...style,
          cursor: "pointer",
          borderRadius: 4,
          padding: "2px 4px",
          margin: "-2px -4px",
          transition: "background 100ms ease",
          display: "inline-block",
          minWidth: "1em",
          minHeight: "1em",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        title="Click to edit"
      >
        {displayValue || (
          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            {placeholder}
          </span>
        )}
      </span>
    );
  }

  const inputStyle = {
    ...style,
    background: "var(--bg-tertiary)",
    border: "2px solid var(--accent)",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
    color: "var(--text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  if (selectOptions) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
        className={className}
      >
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...inputStyle,
          minHeight: "4em",
          resize: "vertical",
        }}
        className={className}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      style={inputStyle}
      className={className}
      placeholder={placeholder}
    />
  );
}