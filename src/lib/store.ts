import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  currentBookId: string;
  setCurrentBookId: (id: string) => void;
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentBookId: "book-business",
      setCurrentBookId: (id) => set({ currentBookId: id }),
      user: null,
      session: null,
      authLoading: true,
      setAuth: (user, session) => set({ user, session, authLoading: false }),
      setAuthLoading: (authLoading) => set({ authLoading }),
    }),
    {
      name: "evochia-app-state",
      partialize: (state) => ({ currentBookId: state.currentBookId }),
    },
  ),
);
