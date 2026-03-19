import { useEffect, useRef } from 'react';

export function useDocumentVisibilityOffset() {
  const isPageHiddenRef = useRef(false);
  const hiddenStartTimeRef = useRef(0);
  const hiddenDurationRef = useRef(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isPageHiddenRef.current = true;
        hiddenStartTimeRef.current = performance.now();
        return;
      }

      if (document.visibilityState === 'visible') {
        isPageHiddenRef.current = false;
        const now = performance.now();
        hiddenDurationRef.current += now - hiddenStartTimeRef.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isPageHiddenRef,
    hiddenDurationRef,
  };
}
