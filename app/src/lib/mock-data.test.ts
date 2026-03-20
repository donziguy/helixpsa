import { describe, it, expect } from 'vitest';
import { tickets, clients, priorityConfig, statusConfig } from './mock-data';

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
});
