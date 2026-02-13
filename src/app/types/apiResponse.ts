// Generic API Response wrapper for consistent structure
export type ApiResponse<T> = {
  data: T | null;
  message: string;
  status: "success" | "error";
};

// Citation type for chat responses
export interface Citation {
  filename: string;
  pageNumber?: number;
  uploadedAt?: string;
}

// Chat response data structure
export interface ChatResponseData {
  answer: string;
  citations: Citation[];
}