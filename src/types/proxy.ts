export interface ApiProxyResponse {
  id: number;
  name: string;
  uri: string;
  description: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface PageableResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
} 