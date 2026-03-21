import '@testing-library/jest-dom';

// Mock database modules for tests
vi.mock('../db/index', () => ({
  db: {},
  testConnection: vi.fn(),
  closeConnection: vi.fn(),
}));

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));