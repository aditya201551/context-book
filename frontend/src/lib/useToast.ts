import { useState, useCallback } from 'react';

export function useToast(defaultMs = 2600) {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), defaultMs);
  }, [defaultMs]);
  return { toast, showToast };
}