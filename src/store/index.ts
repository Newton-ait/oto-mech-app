// src/store/index.ts
// Zustand global state — auth, current diagnosis, vehicle

import { create } from 'zustand';

export interface DiagnosisResult {
  id: string;
  diagnosis: string;
  top_class: string;
  confidence: number;
  severity: 'critical' | 'warning' | 'healthy';
  scores: Record<string, number>;
  created_at: string;
  was_correct?: boolean | null;
  prediction_id?: string;
}

export interface Vehicle {
  make: string;
  model: string;
  year: string;
  mileage?: string;
}

interface OtoState {
  // Auth
  isLoggedIn: boolean;
  userEmail: string | null;
  setLoggedIn: (val: boolean, email?: string) => void;

  // Current diagnosis (passed between Record → Results → Chat)
  currentDiagnosis: DiagnosisResult | null;
  setCurrentDiagnosis: (d: DiagnosisResult | null) => void;

  // Vehicle
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;

  // Groq key
  groqKey: string | null;
  setGroqKey: (key: string | null) => void;

  // Recording state
  isRecording: boolean;
  setIsRecording: (val: boolean) => void;

  // Diagnosis count (for upgrade prompt)
  diagCount: number;
  incrementDiagCount: () => void;
}

export const useStore = create<OtoState>((set) => ({
  isLoggedIn: false,
  userEmail: null,
  setLoggedIn: (val, email) => set({ isLoggedIn: val, userEmail: email || null }),

  currentDiagnosis: null,
  setCurrentDiagnosis: (d) => set({ currentDiagnosis: d }),

  vehicle: null,
  setVehicle: (v) => set({ vehicle: v }),

  groqKey: null,
  setGroqKey: (key) => set({ groqKey: key }),

  isRecording: false,
  setIsRecording: (val) => set({ isRecording: val }),

  diagCount: 0,
  incrementDiagCount: () => set((s) => ({ diagCount: s.diagCount + 1 })),
}));
