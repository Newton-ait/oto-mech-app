// src/services/api.ts
// OTO-Mech API — all 7 Supabase Edge Function endpoints

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://jaqyrnbfthkxkddegzse.supabase.co/functions/v1/oto-mech';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('oto_access_token');
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── GET /health (public) ──────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ── GET /classes (public) ─────────────────────────────────
export async function getClasses(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/classes`);
    const data = await res.json();
    return data.classes || [];
  } catch {
    return ['exhaust_rattle', 'suspension_creak', 'brake_squeal', 'engine_knock'];
  }
}

// ── POST /predict (auth + audio file) ────────────────────
export interface PredictResult {
  diagnosis: string;
  prediction_id: string;
  scores: Record<string, number>;
}

export async function predict(audioUri: string): Promise<PredictResult> {
  const headers = await authHeaders();
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/wav',
    name: 'oto_recording.wav',
  } as any);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error(`Predict failed: ${res.status}`);
  return res.json();
}

// ── GET /history (auth) ───────────────────────────────────
export async function getHistory(): Promise<{
  total: number;
  predictions: any[];
}> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/history`, { headers });
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

// ── GET /stats (auth) ─────────────────────────────────────
export async function getStats(): Promise<{
  total_predictions: number;
  top_fault: string;
  average_confidence: number;
}> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/stats`, { headers });
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

// ── GET /recordings (auth) ────────────────────────────────
export async function getRecordings(): Promise<{ recordings: any[] }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/recordings`, { headers });
  if (!res.ok) throw new Error('Failed to load recordings');
  return res.json();
}

// ── POST /feedback (auth) ────────────────────────────────
export async function sendFeedback(
  prediction_id: string,
  was_correct: boolean,
  actual_issue?: string,
  confidence_rating = 5
): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prediction_id,
      was_correct,
      actual_issue,
      confidence_rating,
    }),
  });
}
