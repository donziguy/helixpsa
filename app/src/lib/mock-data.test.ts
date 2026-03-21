import { describe, it, expect } from 'vitest';
import { tickets, clients, priorityConfig, statusConfig, timeEntries } from './mock-data';

describe('Mock Data', () => {
  it('has tickets', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('every ticket has required fields', () => {
    for (const t of tickets) {
      expect(t.id).toBeTruthy();
      expect(t.number).toMatch(/^HLX-\d+$/);
      expect(t.title).toBeTruthy();
      expect(t.client).toBeTruthy();
      expect(t.assignee).toBeTruthy();
      expect(t.priority).toBeTruthy();
      expect(t.status).toBeTruthy();
      expect(typeof t.timeSpent).toBe('number');
    }
  });

  it('every ticket has a valid priority', () => {
    for (const t of tickets) {
      expect(priorityConfig).toHaveProperty(t.priority);
    }
  });

  it('every ticket has a valid status', () => {
    for (const t of tickets) {
      expect(statusConfig).toHaveProperty(t.status);
    }
  });

  it('every ticket references a known client', () => {
    const clientNames = clients.map(c => c.name);
    for (const t of tickets) {
      expect(clientNames).toContain(t.client);
    }
  });

  it('ticket numbers are unique', () => {
    const numbers = tickets.map(t => t.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('clients have required fields', () => {
    for (const c of clients) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
    }
  });

  it('priority config has color and label for each priority', () => {
    for (const [, config] of Object.entries(priorityConfig)) {
      expect(config.color).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.bg).toBeTruthy();
    }
  });

  it('status config has color and label for each status', () => {
    for (const [, config] of Object.entries(statusConfig)) {
      expect(config.color).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.bg).toBeTruthy();
    }
  });

  it('has time entries', () => {
    expect(timeEntries.length).toBeGreaterThan(0);
  });

  it('every time entry has required fields', () => {
    for (const entry of timeEntries) {
      expect(entry.id).toBeTruthy();
      expect(entry.ticketId).toBeTruthy();
      expect(entry.ticketNumber).toMatch(/^HLX-\d+$/);
      expect(entry.ticketTitle).toBeTruthy();
      expect(entry.client).toBeTruthy();
      expect(entry.assignee).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.startTime).toBeTruthy();
      expect(typeof entry.duration).toBe('number');
      expect(typeof entry.billable).toBe('boolean');
      expect(typeof entry.hourlyRate).toBe('number');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('every time entry references a known ticket', () => {
    const ticketIds = tickets.map(t => t.id);
    for (const entry of timeEntries) {
      expect(ticketIds).toContain(entry.ticketId);
    }
  });

  it('every time entry references a known client', () => {
    const clientNames = clients.map(c => c.name);
    for (const entry of timeEntries) {
      expect(clientNames).toContain(entry.client);
    }
  });

  it('time entry IDs are unique', () => {
    const ids = timeEntries.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hourly rates are reasonable positive numbers', () => {
    for (const entry of timeEntries) {
      expect(entry.hourlyRate).toBeGreaterThan(0);
      expect(entry.hourlyRate).toBeLessThan(1000); // Sanity check
    }
  });

  it('durations are positive numbers', () => {
    for (const entry of timeEntries) {
      expect(entry.duration).toBeGreaterThan(0);
    }
  });
});
