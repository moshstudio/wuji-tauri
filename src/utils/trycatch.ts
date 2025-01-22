export interface TryCatchOptions<T> {
  default?: T;
  onCatch?: (e: any) => T | Promise<T>;
}

export function tryCatch<T>(
  fn: (...args: any[]) => Promise<T>,
  options?: TryCatchOptions<T>
): (...args: any[]) => Promise<T | null> {
  return async (...args: any[]): Promise<T | null> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (options?.onCatch) {
        try {
          return await options.onCatch(e);
        } catch (catchError) {
          console.error('Error in onCatch handler:', catchError);
        }
      }
      // Ensure the returned value is of type T or null
      if (options?.default !== undefined) {
        return options.default;
      }
      return null;
    }
  };
}
