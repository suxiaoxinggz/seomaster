import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Custom event name for local storage changes within the same window
const LOCAL_STORAGE_EVENT = 'local-storage-change';

interface LocalStorageEventDetail<T> {
  key: string;
  newValue: T;
}

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage', error);
      return initialValue;
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        // Dispatch custom event for same-tab synchronization
        window.dispatchEvent(new CustomEvent<LocalStorageEventDetail<T>>(LOCAL_STORAGE_EVENT, {
          detail: { key, newValue: valueToStore }
        }));
      }
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  };

  useEffect(() => {
    // Handle changes from other tabs (native storage event)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (e.newValue) {
            setStoredValue(JSON.parse(e.newValue));
          } else {
            setStoredValue(initialValue);
          }
        } catch (error) {
          console.error('Error parsing storage change', error);
        }
      }
    };

    // Handle changes from the same tab (custom event)
    const handleCustomEvent = (e: CustomEvent<LocalStorageEventDetail<T>>) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Cast to EventListener because CustomEvent types can be tricky with window.addEventListener
    window.addEventListener(LOCAL_STORAGE_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(LOCAL_STORAGE_EVENT, handleCustomEvent as EventListener);
    };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;