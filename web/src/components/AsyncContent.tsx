import type { ReactNode } from 'react';
import type { ApiState } from '../useApi.ts';

/** Renders loading and error states consistently, and the content once data has arrived. */
export function AsyncContent<T>({ state, children }: { state: ApiState<T>; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <p className="notice">Loading…</p>;
  if (state.status === 'error') return <p role="alert" className="alert">{state.message}</p>;
  return <>{children(state.data)}</>;
}
