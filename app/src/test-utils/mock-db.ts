import { vi } from 'vitest';

export function createMockDb() {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockLeftJoin = vi.fn();
  const mockInnerJoin = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockOffset = vi.fn();
  const mockInsert = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockDelete = vi.fn();

  const db = {
    select: mockSelect.mockReturnValue({
      from: mockFrom.mockReturnValue({
        where: mockWhere.mockResolvedValue([]),
        leftJoin: mockLeftJoin.mockReturnValue({
          where: mockWhere.mockResolvedValue([]),
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockResolvedValue([]),
          }),
        }),
        innerJoin: mockInnerJoin.mockReturnValue({
          where: mockWhere.mockResolvedValue([]),
        }),
        orderBy: mockOrderBy.mockReturnValue({
          limit: mockLimit.mockResolvedValue([]),
        }),
        limit: mockLimit.mockResolvedValue([]),
      }),
    }),
    insert: mockInsert.mockReturnValue({
      values: mockValues.mockReturnValue({
        returning: mockReturning.mockResolvedValue([]),
      }),
    }),
    update: mockUpdate.mockReturnValue({
      set: mockSet.mockReturnValue({
        where: mockWhere.mockResolvedValue([]),
      }),
    }),
    delete: mockDelete.mockReturnValue({
      where: mockWhere.mockResolvedValue([]),
    }),
  };

  return {
    db,
    mockSelect,
    mockFrom,
    mockWhere,
    mockLeftJoin,
    mockInnerJoin,
    mockOrderBy,
    mockLimit,
    mockInsert,
    mockValues,
    mockReturning,
    mockUpdate,
    mockSet,
    mockDelete,
    reset: () => {
      vi.clearAllMocks();
    },
  };
}

export function mockQueryResult(data = []) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

export function mockMutationResult() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    isError: false,
    error: null,
  };
}
