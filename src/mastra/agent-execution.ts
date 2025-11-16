class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.maxConcurrent <= 0) {
      return fn();
    }

    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running += 1;
    try {
      return await fn();
    } finally {
      this.running -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 2,
  baseDelayMs: 250,
  isRetryable: defaultIsRetryable,
};

function defaultIsRetryable(error: unknown): boolean {
  const err = error as any;
  const status =
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    err?.data?.status;

  if (typeof status === "number" && (status === 429 || status >= 500)) {
    return true;
  }

  const code = err?.code;
  if (typeof code === "string") {
    if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "EAI_AGAIN") {
      return true;
    }
  }

  const message = String(err?.message ?? "");
  return /rate limit|timeout|temporarily unavailable/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const defaultConcurrency = Number(process.env.AGENT_CONCURRENCY || "50");

export const defaultAgentLimiter = new ConcurrencyLimiter(
  Number.isFinite(defaultConcurrency) && defaultConcurrency > 0
    ? defaultConcurrency
    : 5,
);

export async function runWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const merged = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
    isRetryable: options.isRetryable ?? DEFAULT_RETRY_OPTIONS.isRetryable,
  };

  let attempt = 0;

  // First attempt plus N retries on retryable errors
  // with simple exponential backoff.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > merged.retries || !merged.isRetryable(error)) {
        throw error;
      }
      const delay = merged.baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

export function runAgentOperation<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  return defaultAgentLimiter.run(() => runWithRetry(fn, options));
}

export { ConcurrencyLimiter };
