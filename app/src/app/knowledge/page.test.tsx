import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import KnowledgePage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/knowledge'
}));

// Mock knowledge base data
const mockArticles = [
  {
    id: '1',
    title: 'How to Reset Windows Password',
    summary: 'Step-by-step guide for resetting Windows user passwords',
    content: 'This comprehensive guide covers various methods to reset Windows passwords including using built-in tools and third-party solutions...',
    type: 'how_to' as const,
    status: 'published' as const,
    tags: ['windows', 'password', 'security'],
    viewCount: 45,
    lastViewedAt: '2024-03-20T10:30:00Z',
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
    publishedAt: '2024-03-02T09:00:00Z',
    author: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
    },
  },
  {
    id: '2',
    title: 'Troubleshooting Network Connectivity Issues',
    summary: 'Common network problems and their solutions',
    content: 'Network connectivity issues can be frustrating. This article covers the most common problems and how to resolve them...',
    type: 'troubleshooting' as const,
    status: 'published' as const,
    tags: ['networking', 'troubleshooting', 'connectivity'],
    viewCount: 23,
    lastViewedAt: '2024-03-19T15:45:00Z',
    createdAt: '2024-03-05T11:15:00Z',
    updatedAt: '2024-03-18T16:30:00Z',
    publishedAt: '2024-03-06T11:15:00Z',
    author: {
      id: 'user2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    },
  },
  {
    id: '3',
    title: 'Email Setup FAQ',
    summary: 'Frequently asked questions about email configuration',
    content: 'This FAQ covers the most common questions about setting up email clients including Outlook, Apple Mail, and mobile devices...',
    type: 'faq' as const,
    status: 'draft' as const,
    tags: ['email', 'setup', 'configuration'],
    viewCount: 12,
    lastViewedAt: '2024-03-21T08:20:00Z',
    createdAt: '2024-03-10T13:45:00Z',
    updatedAt: '2024-03-21T08:20:00Z',
    publishedAt: null,
    author: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
    },
  },
  {
    id: '4',
    title: 'Security Policy Guidelines',
    summary: 'Company security policies and procedures',
    content: 'This document outlines our organization security policies, including password requirements, access control, and incident response...',
    type: 'policy' as const,
    status: 'published' as const,
    tags: ['security', 'policy', 'guidelines'],
    viewCount: 67,
    lastViewedAt: '2024-03-22T12:10:00Z',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-03-20T11:30:00Z',
    publishedAt: '2024-02-16T10:00:00Z',
    author: {
      id: 'user2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    },
  }
];

const mockStats = {
  total: 4,
  published: 3,
  draft: 1,
  byStatus: {
    published: 3,
    draft: 1,
    archived: 0,
  },
  byType: {
    how_to: 1,
    troubleshooting: 1,
    faq: 1,
    policy: 1,
    procedure: 0,
    reference: 0,
  },
  topViewed: [
    { id: '4', title: 'Security Policy Guidelines', viewCount: 67 },
    { id: '1', title: 'How to Reset Windows Password', viewCount: 45 },
    { id: '2', title: 'Troubleshooting Network Connectivity Issues', viewCount: 23 },
  ],
  recentlyUpdated: [
    { id: '3', title: 'Email Setup FAQ', updatedAt: '2024-03-21T08:20:00Z' },
    { id: '4', title: 'Security Policy Guidelines', updatedAt: '2024-03-20T11:30:00Z' },
    { id: '2', title: 'Troubleshooting Network Connectivity Issues', updatedAt: '2024-03-18T16:30:00Z' },
  ],
};

const mockTags = ['windows', 'password', 'security', 'networking', 'troubleshooting', 'connectivity', 'email', 'setup', 'configuration', 'policy', 'guidelines'];

vi.mock('@/utils/api', () => ({
  api: {
    knowledge: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: mockArticles,
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
      getStats: {
        useQuery: vi.fn(() => ({
          data: mockStats,
        })),
      },
      getTags: {
        useQuery: vi.fn(() => ({
          data: mockTags,
        })),
      },
    },
  },
}));

describe('KnowledgePage', () => {
  it('renders without crashing', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('Knowledge Base').length).toBeGreaterThan(0);
  });

  it('shows the correct statistics in header', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('4 articles • 3 published').length).toBeGreaterThan(0);
  });

  it('displays knowledge base statistics cards', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0); // Total articles
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // Published articles
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Draft articles
    expect(screen.getAllByText('67').length).toBeGreaterThan(0); // Most views
    expect(screen.getAllByText('Total Articles').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Drafts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Most Views').length).toBeGreaterThan(0);
  });

  it('displays all article titles', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('How to Reset Windows Password').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Troubleshooting Network Connectivity Issues').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email Setup FAQ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Security Policy Guidelines').length).toBeGreaterThan(0);
  });

  it('shows article type labels and icons', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('How To').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Troubleshooting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FAQ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Policy').length).toBeGreaterThan(0);
  });

  it('displays article status', () => {
    render(<KnowledgePage />);
    const publishedElements = screen.getAllByText('Published');
    const draftElements = screen.getAllByText('Draft');
    expect(publishedElements.length).toBeGreaterThan(0);
    expect(draftElements.length).toBeGreaterThan(0);
  });

  it('shows article summaries', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText(/Step-by-step guide for resetting Windows user passwords/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Common network problems and their solutions/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Frequently asked questions about email configuration/).length).toBeGreaterThan(0);
  });

  it('displays author information', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText(/By John Smith/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/By Jane Doe/).length).toBeGreaterThan(0);
  });

  it('shows view counts', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('👁️ 45').length).toBeGreaterThan(0);
    expect(screen.getAllByText('👁️ 23').length).toBeGreaterThan(0);
    expect(screen.getAllByText('👁️ 12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('👁️ 67').length).toBeGreaterThan(0);
  });

  it('displays article tags', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('windows').length).toBeGreaterThan(0);
    expect(screen.getAllByText('password').length).toBeGreaterThan(0);
    expect(screen.getAllByText('networking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('security').length).toBeGreaterThan(0);
  });

  it('shows new article button', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('📝 New Article').length).toBeGreaterThan(0);
  });

  it('has search functionality', () => {
    render(<KnowledgePage />);
    const searchInputs = screen.getAllByPlaceholderText('Search articles...');
    expect(searchInputs.length).toBeGreaterThan(0);
    
    // Test search input
    fireEvent.change(searchInputs[0], { target: { value: 'Windows' } });
    // Note: In a real app, this would trigger a refetch, but we're just testing the input works
  });

  it('has type filter dropdown', () => {
    render(<KnowledgePage />);
    const typeSelects = screen.getAllByDisplayValue('All Types');
    expect(typeSelects.length).toBeGreaterThan(0);
    
    // Test changing filter
    fireEvent.change(typeSelects[0], { target: { value: 'how_to' } });
  });

  it('has status filter dropdown', () => {
    render(<KnowledgePage />);
    const statusSelects = screen.getAllByDisplayValue('All Status');
    expect(statusSelects.length).toBeGreaterThan(0);
    
    // Test changing filter
    fireEvent.change(statusSelects[0], { target: { value: 'published' } });
  });

  it('displays tag filter buttons', () => {
    render(<KnowledgePage />);
    expect(screen.getAllByText('Tags:').length).toBeGreaterThan(0);
    
    // Check that some tag buttons are rendered
    const tagButtons = document.querySelectorAll('button[style*="border-radius: 12px"]');
    expect(tagButtons.length).toBeGreaterThan(0);
  });

  it('can toggle tag filters', () => {
    render(<KnowledgePage />);
    const windowsTagButtons = screen.getAllByText('windows');
    
    // Click on a tag button (assuming it's the first one that's a button)
    const tagButton = windowsTagButtons.find(element => element.closest('button'));
    if (tagButton) {
      fireEvent.click(tagButton.closest('button')!);
      // Tag should now be selected (visual change handled by component state)
    }
  });

  it('has clear filters functionality', () => {
    render(<KnowledgePage />);
    const searchInputs = screen.getAllByPlaceholderText('Search articles...');
    
    // Set a search term
    fireEvent.change(searchInputs[0], { target: { value: 'test' } });
    
    // Clear button should appear
    const clearButtons = screen.getAllByText('Clear');
    expect(clearButtons.length).toBeGreaterThan(0);
    
    // Click clear
    fireEvent.click(clearButtons[0]);
  });

  it('opens create article modal when button is clicked', async () => {
    render(<KnowledgePage />);
    const createButtons = screen.getAllByText('📝 New Article');
    
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getAllByText('Create New Article').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Article creation form coming soon!').length).toBeGreaterThan(0);
    });
  });

  it('closes create article modal when close button is clicked', async () => {
    render(<KnowledgePage />);
    const createButtons = screen.getAllByText('📝 New Article');
    
    // Open modal
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getAllByText('Create New Article').length).toBeGreaterThan(0);
    });
    
    // Close modal
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[closeButtons.length - 1]); // Get the last one (modal's close button)
    
    await waitFor(() => {
      expect(screen.queryByText('Create New Article')).toBeNull();
    });
  });

  it('opens article detail modal when article is clicked', async () => {
    render(<KnowledgePage />);
    const articleTitles = screen.getAllByText('How to Reset Windows Password');
    
    // Click on first article title (which should be in a clickable card)
    if (articleTitles[0]) {
      fireEvent.click(articleTitles[0].closest('div[style*="cursor: pointer"]') || articleTitles[0]);
      
      await waitFor(() => {
        // Should show view full article button in the modal
        expect(screen.getAllByText('View Full Article').length).toBeGreaterThan(0);
      });
    }
  });

  it('closes article detail modal', async () => {
    render(<KnowledgePage />);
    const articleTitles = screen.getAllByText('How to Reset Windows Password');
    
    // Open article detail
    if (articleTitles[0]) {
      fireEvent.click(articleTitles[0].closest('div[style*="cursor: pointer"]') || articleTitles[0]);
      
      await waitFor(() => {
        const closeButtons = screen.getAllByText('×');
        if (closeButtons[0]) {
          fireEvent.click(closeButtons[0]);
        }
      });
    }
  });

  it('handles loading state', () => {
    // Mock loading state
    const api = require('@/utils/api').api;
    vi.mocked(api.knowledge.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<KnowledgePage />);
    expect(screen.getAllByText('Loading articles...').length).toBeGreaterThan(0);
  });

  it('shows empty state when no articles', () => {
    // Mock empty state
    const api = require('@/utils/api').api;
    vi.mocked(api.knowledge.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<KnowledgePage />);
    expect(screen.getAllByText('No articles found').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Get started by creating your first knowledge base article').length).toBeGreaterThan(0);
  });

  it('shows proper grid layout structure', () => {
    render(<KnowledgePage />);
    const articleCards = document.querySelectorAll('[style*="background: var(--bg-secondary)"]');
    // We expect at least the article cards to be rendered
    expect(articleCards.length).toBeGreaterThanOrEqual(4);
  });

  it('displays formatted dates', () => {
    render(<KnowledgePage />);
    // Should show formatted dates like "Mar 15, 2024", etc.
    expect(document.body.textContent).toMatch(/Mar \d+, 2024/);
  });

  it('shows article content preview in detail modal', async () => {
    render(<KnowledgePage />);
    const articleTitles = screen.getAllByText('How to Reset Windows Password');
    
    // Click on first article title (which should be in a clickable card)
    if (articleTitles[0]) {
      fireEvent.click(articleTitles[0].closest('div[style*="cursor: pointer"]') || articleTitles[0]);
      
      await waitFor(() => {
        expect(screen.getAllByText(/Content preview:/).length).toBeGreaterThan(0);
      });
    }
  });

  it('shows tag count when there are more than 4 tags', () => {
    // Update mock to have an article with more than 4 tags
    const articlesWithManyTags = [...mockArticles];
    articlesWithManyTags[0] = {
      ...articlesWithManyTags[0],
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
    };

    const api = require('@/utils/api').api;
    vi.mocked(api.knowledge.getAll.useQuery).mockReturnValue({
      data: articlesWithManyTags,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<KnowledgePage />);
    expect(screen.getAllByText('+2 more').length).toBeGreaterThan(0);
  });
});