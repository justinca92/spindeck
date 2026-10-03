// Minimal React typings for offline typechecking (the real React is Steam's).
declare module "react" {
  export type ReactNode = any;
  export type CSSProperties = { [k: string]: any };
  export function useState<T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
  export function useEffect(fn: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(fn: () => T, deps: readonly any[]): T;
  export function useRef<T>(init: T): { current: T };
  export function useRef<T>(init: T | null): { current: T | null };
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps: readonly any[]): T;
  export function memo<P>(c: (p: P) => any): (p: P & { key?: any }) => any;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export const Fragment: any;
  export const Component: any;
  const React: any;
  export default React;
}
declare namespace JSX {
  interface IntrinsicElements {
    [name: string]: any;
  }
  interface IntrinsicAttributes {
    key?: any;
  }
  type Element = any;
}
interface Window {
  SP_REACT: any;
}
