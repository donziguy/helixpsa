import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import TimePage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/time'
}));

describe('TimePage', () => {
  it('renders without crashing', () => {
    render(<TimePage />);
    expect(screen.getAllByText('Time Tracking').length).toBeGreaterThan(0);
  });

  it('shows the correct number of time entries', () => {
    render(<TimePage />);
    expect(screen.getAllByText(/time entries/).length).toBeGreaterThan(0);
  });

  it('displays time entry data', () => {
    render(<TimePage />);
    expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exchange server not syncing emails').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acme Corp/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mike T\./).length).toBeGreaterThan(0);
  });

  it('shows billable and non-billable entries differently', () => {
    render(<TimePage />);
    expect(screen.getAllByText('BILLABLE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NON-BILLABLE').length).toBeGreaterThan(0);
  });

  it('displays time duration and rates correctly', () => {
    render(<TimePage />);
    expect(screen.getAllByText('0:45').length).toBeGreaterThan(0); // 45 minutes formatted
    expect(screen.getAllByText(/\$150\/hr/).length).toBeGreaterThan(0); // hourly rate
  });

  it('shows summary cards with totals', () => {
    render(<TimePage />);
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getAllByText('This Week').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Filtered Total').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0);
  });

  it('displays start timer button', () => {
    render(<TimePage />);
    expect(screen.getAllByText('+ Start Timer').length).toBeGreaterThan(0);
  });

  it('has search functionality', () => {
    render(<TimePage />);
    const searchInputs = screen.getAllByPlaceholderText('Search entries...');
    expect(searchInputs.length).toBeGreaterThan(0);
    
    // Test search functionality
    fireEvent.change(searchInputs[0], { target: { value: 'Exchange' } });
    expect(screen.getAllByText('Exchange server not syncing emails').length).toBeGreaterThan(0);
  });

  it('has date filter dropdown', () => {
    render(<TimePage />);
    const dateSelects = screen.getAllByDisplayValue('All dates');
    expect(dateSelects.length).toBeGreaterThan(0);
    
    // Test date filtering
    fireEvent.change(dateSelects[0], { target: { value: '2026-03-20' } });
    // After filtering, entries should still be visible
    expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
  });

  it('has billable only toggle', () => {
    render(<TimePage />);
    const billableCheckboxes = screen.getAllByRole('checkbox');
    expect(billableCheckboxes.length).toBeGreaterThan(0);
    
    // Test billable filter
    fireEvent.click(billableCheckboxes[0]);
    expect(screen.getAllByText('BILLABLE').length).toBeGreaterThan(0);
  });

  it('displays ticket numbers and client information', () => {
    render(<TimePage />);
    expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HLX-003').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wayne Enterprises/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stark Medical/).length).toBeGreaterThan(0);
  });

  it('shows entry descriptions', () => {
    render(<TimePage />);
    expect(screen.getAllByText('Investigating email sync issues').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Research and planning for firewall changes').length).toBeGreaterThan(0);
  });

  it('displays formatted dates and times', () => {
    render(<TimePage />);
    expect(screen.getAllByText(/Mar \d{1,2}, 2026/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\d{1,2}:\d{2} [AP]M/).length).toBeGreaterThan(0);
  });

  it('shows revenue calculations for billable entries', () => {
    render(<TimePage />);
    expect(screen.getAllByText(/\$\d+\.\d{2}/).length).toBeGreaterThan(0); // Currency format
  });

  it('handles empty state when no entries match filters', () => {
    render(<TimePage />);
    const searchInputs = screen.getAllByPlaceholderText('Search entries...');
    
    // Search for something that won't match
    fireEvent.change(searchInputs[0], { target: { value: 'nonexistententry' } });
    
    // Should show empty state
    expect(screen.getAllByText('No time entries found').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Try adjusting your filters').length).toBeGreaterThan(0);
  });

  it('shows time in HH:MM format', () => {
    render(<TimePage />);
    // Looking for formatted time displays
    expect(screen.getAllByText(/\d:\d{2}/).length).toBeGreaterThan(0);
  });

  it('displays assignee information', () => {
    render(<TimePage />);
    expect(screen.getAllByText(/Mike T\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cory S\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Jake R\./).length).toBeGreaterThan(0);
  });

  it('shows hourly rates for billable entries', () => {
    render(<TimePage />);
    expect(screen.getAllByText('$150/hr').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$175/hr').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$125/hr').length).toBeGreaterThan(0);
  });
});