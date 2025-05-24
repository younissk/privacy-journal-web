import { useRef, useCallback } from "react";
import { useDebounce } from "./useDebounce";

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave({
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions) {
  const lastSavePromiseRef = useRef<Promise<void> | null>(null);

  const debouncedSave = useDebounce(
    useCallback(async () => {
      if (!enabled) return;

      // Cancel any previous save in progress
      if (lastSavePromiseRef.current) {
        // We'll let the previous save complete but start a new one
      }

      try {
        const savePromise = onSave();
        lastSavePromiseRef.current = savePromise;
        await savePromise;
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        lastSavePromiseRef.current = null;
      }
    }, [onSave, enabled]),
    delay
  );

  return { triggerAutoSave: debouncedSave };
}
