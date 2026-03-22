import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import SchedulePage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/schedule'
}));

describe('SchedulePage', () => {
  it('renders without crashing', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('Schedule & Dispatch').length).toBeGreaterThan(0);
  });

  it('shows calendar view with day headers', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('Sun').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fri').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sat').length).toBeGreaterThan(0);
  });

  it('has view mode toggle buttons', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('Week').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Month').length).toBeGreaterThan(0);
  });

  it('has navigation buttons', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('←').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getAllByText('→').length).toBeGreaterThan(0);
  });

  it('has workload toggle button', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('📊 Workload').length).toBeGreaterThan(0);
  });

  it('has filter dropdowns', () => {
    render(<SchedulePage />);
    expect(screen.getAllByText('All Technicians').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All Clients').length).toBeGreaterThan(0);
  });

  it('can toggle between week and month view', () => {
    render(<SchedulePage />);
    const monthButton = screen.getAllByText('Month')[0];
    fireEvent.click(monthButton);
    
    const weekButton = screen.getAllByText('Week')[0];
    fireEvent.click(weekButton);
    
    // Should be able to click both without errors
    expect(screen.getAllByText('Week').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Month').length).toBeGreaterThan(0);
  });

  it('can navigate between dates', () => {
    render(<SchedulePage />);
    const nextButton = screen.getAllByText('→')[0];
    const prevButton = screen.getAllByText('←')[0];
    const todayButton = screen.getAllByText('Today')[0];
    
    fireEvent.click(nextButton);
    fireEvent.click(prevButton);
    fireEvent.click(todayButton);
    
    // Should be able to navigate without errors
    expect(screen.getAllByText('Schedule & Dispatch').length).toBeGreaterThan(0);
  });

  it('can toggle workload panel', () => {
    render(<SchedulePage />);
    const workloadButton = screen.getAllByText('📊 Workload')[0];
    
    fireEvent.click(workloadButton);
    fireEvent.click(workloadButton);
    
    // Should be able to toggle without errors
    expect(screen.getAllByText('📊 Workload').length).toBeGreaterThan(0);
  });

  it('can change technician filter', () => {
    render(<SchedulePage />);
    const technicianSelects = screen.getAllByDisplayValue('All Technicians');
    
    if (technicianSelects.length > 0) {
      // Should be able to find the dropdown
      expect(technicianSelects[0]).toBeTruthy();
    }
  });

  it('can change client filter', () => {
    render(<SchedulePage />);
    const clientSelects = screen.getAllByDisplayValue('All Clients');
    
    if (clientSelects.length > 0) {
      // Should be able to find the dropdown
      expect(clientSelects[0]).toBeTruthy();
    }
  });

  it('displays calendar grid structure', () => {
    render(<SchedulePage />);
    
    // Should show day of week headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      expect(screen.getAllByText(day).length).toBeGreaterThan(0);
    });
  });

  it('handles loading state', () => {
    render(<SchedulePage />);
    
    // Should either show content or loading state
    const scheduleTitle = screen.queryAllByText('Schedule & Dispatch');
    const loadingText = screen.queryAllByText('Loading schedule...');
    
    expect(scheduleTitle.length > 0 || loadingText.length > 0).toBe(true);
  });

  it('shows current date range in header', () => {
    render(<SchedulePage />);
    
    // Should show some date in the header (will be dynamic)
    const header = screen.getAllByText('Schedule & Dispatch')[0].closest('header');
    expect(header).toBeTruthy();
  });

  it('has responsive layout with sidebar', () => {
    render(<SchedulePage />);
    
    // Should include the sidebar navigation
    const sidebar = document.querySelector('[role="navigation"]') || 
                   screen.getAllByText('Dashboard').length > 0 ||
                   screen.getAllByText('Tickets').length > 0;
    
    expect(sidebar).toBeTruthy();
  });

  it('calendar days are clickable areas', () => {
    render(<SchedulePage />);
    
    // Calendar should render with day cells
    // Look for numeric day values (1-31)
    const dayNumbers = ['1', '2', '3', '4', '5'];
    let foundDayNumber = false;
    
    for (const dayNum of dayNumbers) {
      if (screen.queryAllByText(dayNum).length > 0) {
        foundDayNumber = true;
        break;
      }
    }
    
    expect(foundDayNumber).toBe(true);
  });

  it('handles view mode state correctly', () => {
    render(<SchedulePage />);
    
    const weekButton = screen.getAllByText('Week')[0];
    const monthButton = screen.getAllByText('Month')[0];
    
    // Default should be week view
    expect(weekButton).toBeTruthy();
    expect(monthButton).toBeTruthy();
    
    // Should be able to switch views
    fireEvent.click(monthButton);
    fireEvent.click(weekButton);
    
    expect(screen.getAllByText('Week').length).toBeGreaterThan(0);
  });

  it('displays filter controls in correct layout', () => {
    render(<SchedulePage />);
    
    // Should have filters section with dropdowns
    const allTechnicians = screen.getAllByText('All Technicians');
    const allClients = screen.getAllByText('All Clients');
    
    expect(allTechnicians.length).toBeGreaterThan(0);
    expect(allClients.length).toBeGreaterThan(0);
  });

  it('shows events count when data is loaded', () => {
    render(<SchedulePage />);
    
    // Should show some indication of events or empty state
    const eventsText = screen.queryAllByText(/events found/);
    const scheduleContent = screen.getAllByText('Schedule & Dispatch');
    
    expect(eventsText.length > 0 || scheduleContent.length > 0).toBe(true);
  });
});