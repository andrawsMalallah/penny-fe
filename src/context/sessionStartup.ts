import { ApiError } from '../api/client';
import type { SessionResponse } from '../api/types';

/** Give a transient API failure one more chance before deciding startup is unverified. */
export async function getStartupSession(
  fetchSession: () => Promise<SessionResponse>,
  retryDelayMs = 250
): Promise<SessionResponse> {
  try {
    return await fetchSession();
  } catch (error) {
    if (!(error instanceof ApiError) || !(error.isServiceUnavailable || error.status >= 500)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return fetchSession();
  }
}
