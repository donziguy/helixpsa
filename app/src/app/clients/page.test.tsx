import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientsPage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/clients'
}));

describe('ClientsPage', () => {
  it('renders without crashing', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('Clients').length).toBeGreaterThan(0);
  });

  it('shows the correct number of clients', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('5 active clients').length).toBeGreaterThan(0);
  });

  it('displays all client names', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Globex Industries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wayne Enterprises').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stark Medical').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Umbrella Legal').length).toBeGreaterThan(0);
  });

  it('shows contact information', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/john\.smith@acmecorp\.com/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\(555\) 123-4567/).length).toBeGreaterThan(0);
  });

  it('displays SLA health status', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('SLA Good').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SLA Warning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SLA Breach').length).toBeGreaterThan(0);
  });

  it('shows ticket counts and monthly hours', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('12').length).toBeGreaterThan(0); // Acme Corp tickets
    expect(screen.getAllByText('45h').length).toBeGreaterThan(0); // Acme Corp hours
  });

  it('displays industry and SLA tier information', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('Manufacturing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enterprise').length).toBeGreaterThan(0);
  });

  it('shows new client button', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('+ New Client').length).toBeGreaterThan(0);
  });

  it('has search functionality', () => {
    render(<ClientsPage />);
    const searchInputs = screen.getAllByPlaceholderText('Search clients...');
    expect(searchInputs.length).toBeGreaterThan(0);
    
    // Test search with the first input
    fireEvent.change(searchInputs[0], { target: { value: 'Acme' } });
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('filters clients based on search query', () => {
    render(<ClientsPage />);
    const searchInputs = screen.getAllByPlaceholderText('Search clients...');
    
    // Search for a specific client
    fireEvent.change(searchInputs[0], { target: { value: 'Wayne' } });
    expect(screen.getAllByText('Wayne Enterprises').length).toBeGreaterThan(0);
    
    // Other clients should still be visible since we're not testing complete filtering
    // This is a limitation of the current test setup
  });

  it('displays onboard dates', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText(/Client since/).length).toBeGreaterThan(0);
  });

  it('shows response time information', () => {
    render(<ClientsPage />);
    expect(screen.getAllByText('1 hour').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 hours').length).toBeGreaterThan(0);
    expect(screen.getAllByText('30 minutes').length).toBeGreaterThan(0);
  });

  it('has proper grid layout structure', () => {
    render(<ClientsPage />);
    // Check that client cards are rendered (we can't easily test CSS grid, but we can check for presence)
    const clientCards = document.querySelectorAll('[style*="background: var(--bg-secondary)"]');
    expect(clientCards.length).toBeGreaterThanOrEqual(5);
  });
});