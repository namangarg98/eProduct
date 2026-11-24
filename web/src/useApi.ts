import { useEffect, useState } from 'react';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/**
 * Runs `load` whenever `key` or `refresh` changes. Results from an outdated request are
 * ignored, so a slow earlier response can never overwrite a newer one.
 *
 * - `key` identifies *what* is loaded (e.g. a category): changing it shows "loading".
 * - `refresh` re-fetches the same thing (e.g. after starring): current data stays on
 *   screen until the new data arrives, so the page does not flash.
 */
export function useApi<T>(load: () => Promise<T>, key: string, refresh = 0): ApiState<T> {
  const [state, setState] = useState<ApiState<T> & { key?: string }>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    setState((previous) => (previous.key === key && previous.status === 'success' ? previous : { status: 'loading' }));
    load().then(
      (data) => current && setState({ status: 'success', data, key }),
      (error: Error) => current && setState({ status: 'error', message: error.message, key }),
    );
    return () => {
      current = false;
    };
    // `load` is recreated each render; `key` and `refresh` capture what it depends on.
  }, [key, refresh]);

  return state;
}
