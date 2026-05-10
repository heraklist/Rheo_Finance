import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SyncState = "synced" | "syncing" | "offline" | "error";

interface AppState {
  currentBookId: string;
  setCurrentBookId: (id: string) => void;
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
      currentBookId: "book-business",
      setCurrentBookId: (id) => set({ currentBookId: id }),
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
      name: "evochia-app-state",
      partialize: (state) => ({ currentBookId: state.currentBookId }),
    },
  ),
);
