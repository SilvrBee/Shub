import { useEffect, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (raw: unknown) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      const parsed: unknown = JSON.parse(item);
      if (validate) {
        return validate(parsed);
      }
      return parsed !== null && parsed !== undefined ? (parsed as T) : initialValue;
    } catch {
      return validate ? validate(initialValue) : initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
