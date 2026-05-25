import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_COMPANY_NAME, normalizeCompanyName } from "@/lib/company";
import type { Book, PaymentMethod } from "@/lib/types";

export type SyncState = "synced" | "syncing" | "offline" | "error";

export function bookSlug(books: Book[], bookId: string): string | undefined {
  return books.find((b) => b.id === bookId)?.slug;
}

export function isBusinessBook(books: Book[], bookId: string): boolean {
  return bookSlug(books, bookId) === "business";
}

export function isPersonalBook(books: Book[], bookId: string): boolean {
  return bookSlug(books, bookId) === "personal";
}

interface AppState {
  books: Book[];
  setBooks: (books: Book[]) => void;
  currentBookId: string;
  setCurrentBookId: (id: string) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  defaultVatRate: number;
  setDefaultVatRate: (rate: number) => void;
  defaultPaymentMethod: PaymentMethod;
  setDefaultPaymentMethod: (method: PaymentMethod) => void;
  autoBackupEnabled: boolean;
  setAutoBackupEnabled: (enabled: boolean) => void;
  backupDirectory: string | null;
  setBackupDirectory: (path: string | null) => void;
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  mfaLoading: boolean;
  mfaRequired: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setMfaStatus: (required: boolean, loading: boolean) => void;
  syncState: SyncState;
  lastSyncedAt: string | null;
  pendingCount: number;
  setSyncState: (syncState: SyncState) => void;
  setLastSyncedAt: (lastSyncedAt: string | null) => void;
  setPendingCount: (pendingCount: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      books: [],
      setBooks: (books) => set({ books }),
      currentBookId: "",
      setCurrentBookId: (id) => set({ currentBookId: id }),
      companyName: DEFAULT_COMPANY_NAME,
      setCompanyName: (companyName) => set({ companyName: normalizeCompanyName(companyName) }),
      defaultVatRate: 0.24,
      setDefaultVatRate: (defaultVatRate) => set({ defaultVatRate }),
      defaultPaymentMethod: "Μετρητά",
      setDefaultPaymentMethod: (defaultPaymentMethod) => set({ defaultPaymentMethod }),
      autoBackupEnabled: false,
      setAutoBackupEnabled: (autoBackupEnabled) => set({ autoBackupEnabled }),
      backupDirectory: null,
      setBackupDirectory: (backupDirectory) => set({ backupDirectory }),
      user: null,
      session: null,
      authLoading: true,
      mfaLoading: false,
      mfaRequired: false,
      setAuth: (user, session) =>
        set({
          user,
          session,
          authLoading: false,
          ...(user ? {} : { mfaRequired: false, mfaLoading: false }),
        }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      setMfaStatus: (mfaRequired, mfaLoading) => set({ mfaRequired, mfaLoading }),
      syncState: "synced",
      lastSyncedAt: null,
      pendingCount: 0,
      setSyncState: (syncState) => set({ syncState }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setPendingCount: (pendingCount) => set({ pendingCount }),
    }),
    {
      // Keep the legacy persist key so upgrades retain user settings.
      name: "evochia-app-state",
      partialize: (state) => ({
        currentBookId: state.currentBookId,
        companyName: state.companyName,
        defaultVatRate: state.defaultVatRate,
        defaultPaymentMethod: state.defaultPaymentMethod,
        autoBackupEnabled: state.autoBackupEnabled,
        backupDirectory: state.backupDirectory,
      }),
      merge: (persisted, current) => {
        if (persisted && typeof persisted === "object") {
          return { ...current, ...(persisted as Partial<AppState>) };
        }
        return current as AppState;
      },
    },
  ),
);
