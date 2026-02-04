import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  sessionCode: string | null;
  setSession: (id: string, code: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  sessionCode: null,
  setSession: (id, code) => set({ sessionId: id, sessionCode: code }),
  clearSession: () => set({ sessionId: null, sessionCode: null }),
}));
