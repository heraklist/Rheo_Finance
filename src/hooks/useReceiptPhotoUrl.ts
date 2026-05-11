import { getReceiptPhotoObjectUrl } from "@/lib/receipts";
import { useEffect, useState } from "react";

export function useReceiptPhotoUrl(
  path: string | null | undefined,
  transactionId?: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;

    setUrl(null);

    if (!path) {
      return () => {
        active = false;
      };
    }

    void getReceiptPhotoObjectUrl(path, transactionId)
      .then((value) => {
        nextUrl = value;
        if (active) {
          setUrl(value);
        } else if (value) {
          URL.revokeObjectURL(value);
        }
      })
      .catch((err) => {
        console.error("Failed to load receipt photo:", err);
      });

    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [path, transactionId]);

  return url;
}
