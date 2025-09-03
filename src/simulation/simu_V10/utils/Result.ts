/**
 * Minimal Result helper (Ok/Err) for config validation
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value } as const;
  },
  err<E>(error: E): Result<never, E> {
    return { ok: false, error } as const;
  }
};

