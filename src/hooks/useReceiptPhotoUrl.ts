import { useEffect, useRef, useState } from "react";
import { getReceiptPhotoObjectUrl } from "@/lib/receipts";

export function useReceiptPhotoUrl(
  path: string | null | undefined,
  transactionId?: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Revoke previous URL before loading a new one
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setUrl(null);

    if (!path) {
      return () => {
        active = false;
      };
    }

    async function loadPhotoUrl() {
      try {
        const value = await getReceiptPhotoObjectUrl(path, transactionId);
        if (active) {
          urlRef.current = value;
          setUrl(value);
        } else if (value) {
          URL.revokeObjectURL(value);
        }
      } catch (err) {
        console.error("Failed to load receipt photo:", err);
      }
    }

    void loadPhotoUrl();

    return () => {
      active = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [path, transactionId]);

  return url;
}
