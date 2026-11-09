import { PaginationDto } from '../dtos/pagination.dto';

export interface Paged<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Default (no page/limit) returns the full array — preserves current frontend contract.
 * With ?page=&limit= returns { data, page, limit, total, totalPages } slice.
 */
export function paginate<T>(items: T[], query: PaginationDto): T[] | Paged<T> {
  const page = query.page;
  const limit = query.limit;
  if (page === undefined && limit === undefined) return items;

  const pageNum = Math.max(1, Math.floor(page ?? 1));
  const limitNum = Math.max(1, Math.floor(limit ?? 50));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const start = (pageNum - 1) * limitNum;
  return {
    data: items.slice(start, start + limitNum),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
  };
}
