import { paginate } from './pagination';

describe('paginate', () => {
  it('returns full array by default', () => {
    const items = [1, 2, 3];
    expect(paginate(items, {})).toEqual([1, 2, 3]);
  });

  it('returns object slice when page/limit provided', () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, { page: 2, limit: 2 })).toEqual({
      data: [3, 4],
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });
});
