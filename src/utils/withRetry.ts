export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimited = error.code === "rate_limited" || error.status === 429;
      // Check if it's a connection error
      const isNetworkError = ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(error.code);

      if (isRateLimited || isNetworkError) {
        const waitTime = isRateLimited
          ? (parseInt(error.headers?.["retry-after"]) || delayMs * attempt)
          : delayMs * attempt;

        console.warn(`[Retry] Attempt ${attempt}/${maxRetries} after ${waitTime}ms`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      // For other errors, don't retry
      throw error;
    }
  }
  // If all retries failed, throw the last error
  throw lastError;
}
