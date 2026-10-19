import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack Query Client configured for Zyphor:
 * - refetchOnWindowFocus is disabled by default to prevent unexpected network spikes during exams.
 * - Bounded retries with exponential backoff.
 * - Sane cache and stale times.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Do not retry 401, 403, 404, or 409 conflict errors
        if (error?.status && [401, 403, 404, 409].includes(error.status)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false, // Mutations (e.g. submit exam, save response) should be handled explicitly
    },
  },
});
