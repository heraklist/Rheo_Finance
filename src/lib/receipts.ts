import { supabase } from "@/lib/supabase";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";

const RECEIPTS_DIR = "receipts";
const RECEIPT_BUCKET = "receipts";
const MAX_IMAGE_EDGE = 1200;
const JPEG_QUALITY = 0.85;

export interface ReceiptPhotoDraft {
  bytes: Uint8Array;
  previewUrl: string;
  sourcePath: string;
}

function receiptFileName(transactionId: string): string {
  return `${transactionId}.jpg`;
}

export function localReceiptPathForTransaction(transactionId: string): string {
  return `${RECEIPTS_DIR}/${receiptFileName(transactionId)}`;
}

export function storageReceiptPathForTransaction(userId: string, transactionId: string): string {
  return `${userId}/${receiptFileName(transactionId)}`;
}

export function isLocalReceiptPath(path: string): boolean {
  return path.startsWith(`${RECEIPTS_DIR}/`) || path.startsWith(`${RECEIPTS_DIR}\\`);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBlob(bytes: Uint8Array): Blob {
  return new Blob([toArrayBuffer(bytes)], { type: "image/jpeg" });
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function createObjectUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(bytesToBlob(bytes));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Δεν φορτώθηκε η εικόνα απόδειξης."));
    image.src = src;
  });
}

async function compressImage(bytes: Uint8Array): Promise<Uint8Array> {
  const sourceUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)]));

  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Δεν έγινε προετοιμασία της εικόνας απόδειξης.");
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Δεν έγινε συμπίεση της εικόνας απόδειξης."));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    });

    return blobToBytes(blob);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function ensureReceiptsDir(): Promise<void> {
  await mkdir(RECEIPTS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
}

export async function pickReceiptPhoto(): Promise<ReceiptPhotoDraft | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Εικόνες",
        extensions: ["jpg", "jpeg", "png", "webp"],
      },
    ],
  });

  if (!selected || Array.isArray(selected)) return null;

  const originalBytes = await readFile(selected);
  const bytes = await compressImage(originalBytes);

  return {
    bytes,
    previewUrl: createObjectUrl(bytes),
    sourcePath: selected,
  };
}

export async function saveReceiptPhotoForTransaction(
  transactionId: string,
  bytes: Uint8Array,
): Promise<string> {
  await ensureReceiptsDir();
  const path = localReceiptPathForTransaction(transactionId);
  await writeFile(path, bytes, { baseDir: BaseDirectory.AppData });
  return path;
}

export async function deleteLocalReceiptPhoto(path: string | null | undefined): Promise<void> {
  if (!path || !isLocalReceiptPath(path)) return;

  const hasFile = await exists(path, { baseDir: BaseDirectory.AppData });
  if (hasFile) {
    await remove(path, { baseDir: BaseDirectory.AppData });
  }
}

export async function uploadReceiptPhoto(
  userId: string,
  transactionId: string,
  localPath: string | null | undefined,
): Promise<string | null> {
  if (!localPath) return null;
  if (!isLocalReceiptPath(localPath)) return localPath;

  const bytes = await readFile(localPath, { baseDir: BaseDirectory.AppData });
  const storagePath = storageReceiptPathForTransaction(userId, transactionId);
  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storagePath, bytesToBlob(bytes), {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;
  return storagePath;
}

export async function deleteRemoteReceiptPhoto(
  userId: string,
  transactionId: string,
): Promise<void> {
  const storagePath = storageReceiptPathForTransaction(userId, transactionId);
  const { error } = await supabase.storage.from(RECEIPT_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function downloadReceiptPhoto(
  storagePath: string | null | undefined,
  transactionId: string,
): Promise<string | null> {
  if (!storagePath) return null;
  if (isLocalReceiptPath(storagePath)) return storagePath;

  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).download(storagePath);
  if (error) throw error;

  const bytes = await blobToBytes(data);
  return saveReceiptPhotoForTransaction(transactionId, bytes);
}

export async function getReceiptPhotoObjectUrl(
  path: string | null | undefined,
  transactionId?: string,
): Promise<string | null> {
  if (!path) return null;

  const localPath = isLocalReceiptPath(path)
    ? path
    : transactionId
      ? await downloadReceiptPhoto(path, transactionId)
      : null;

  if (!localPath) return null;

  const hasFile = await exists(localPath, { baseDir: BaseDirectory.AppData });
  if (!hasFile) return null;

  const bytes = await readFile(localPath, { baseDir: BaseDirectory.AppData });
  return createObjectUrl(bytes);
}
