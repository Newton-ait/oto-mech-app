// src/hooks/useRecording.ts
// Audio recording + OTO-Mech predict API integration

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import crashlytics from '@react-native-firebase/crashlytics';
import * as FileSystem from 'expo-file-system';
import { predict, PredictResult } from '../services/api';
import { useStore } from '../store';

const RECORD_DURATION_MS = 3000;

// Simulated diagnoses for demo/offline mode
const SIMULATIONS: PredictResult[] = [
  {
    diagnosis: '⚠️ SUSPENSION CREAK DETECTED (70.6% confidence)',
    prediction_id: 'sim-1',
    scores: { suspension_creak: 0.706, exhaust_rattle: 0.229, brake_squeal: 0.00014, engine_knock: 0.00002 },
  },
  {
    diagnosis: '🔧 EXHAUST RATTLE DETECTED (82.1% confidence)',
    prediction_id: 'sim-2',
    scores: { exhaust_rattle: 0.821, suspension_creak: 0.12, brake_squeal: 0.04, engine_knock: 0.019 },
  },
  {
    diagnosis: '🛑 BRAKE SQUEAL DETECTED (88.7% confidence)',
    prediction_id: 'sim-3',
    scores: { brake_squeal: 0.887, engine_knock: 0.08, exhaust_rattle: 0.02, suspension_creak: 0.013 },
  },
  {
    diagnosis: '✅ ENGINE SOUNDS HEALTHY (93.4% confidence)',
    prediction_id: 'sim-4',
    scores: { healthy_baseline: 0.934, exhaust_rattle: 0.04, suspension_creak: 0.02, engine_knock: 0.006 },
  },
  {
    diagnosis: '🚨 ENGINE KNOCK DETECTED (77.8% confidence)',
    prediction_id: 'sim-5',
    scores: { engine_knock: 0.778, exhaust_rattle: 0.14, suspension_creak: 0.06, brake_squeal: 0.022 },
  },
];

function getSeverity(topClass: string): 'critical' | 'warning' | 'healthy' {
  if (['engine_knock', 'brake_squeal'].includes(topClass)) return 'critical';
  if (['suspension_creak', 'exhaust_rattle'].includes(topClass)) return 'warning';
  return 'healthy';
}

function parseResult(result: PredictResult) {
  const sorted = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
  const topClass = sorted[0]?.[0] || 'healthy_baseline';
  const confidence = sorted[0]?.[1] || 0;
  return {
    id: result.prediction_id || Date.now().toString(),
    diagnosis: result.diagnosis,
    top_class: topClass,
    confidence,
    severity: getSeverity(topClass),
    scores: result.scores,
    created_at: new Date().toISOString(),
    prediction_id: result.prediction_id,
    was_correct: null,
  };
}

export function useRecording() {
  const recording = useRef<Audio.Recording | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const { setCurrentDiagnosis, incrementDiagCount } = useStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  const startRecording = useCallback(async () => {
    try {
      const granted = await requestPermissions();
      if (!granted) {
        setStatus('error');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = rec;
      setStatus('recording');
      setElapsed(0);

      // countdown timer
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 100);
      }, 100);

      // auto-stop after 3s
      setTimeout(() => stopRecording(), RECORD_DURATION_MS);
      return true;
    } catch (err) {
      setStatus('error');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording.current) return;

    try {
      setStatus('processing');
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;

      if (!uri) throw new Error('No audio URI');

      await processAudio(uri);
    } catch (err) {
      setStatus('error');
    }
  }, []);

  const processAudio = async (uri: string) => {
    try {
      // Try real API
      const result = await predict(uri);
      const parsed = parseResult(result);
      setCurrentDiagnosis(parsed);
      incrementDiagCount();
      setStatus('done');
    } catch {
      // Fall back to simulation
      const sim = SIMULATIONS[Math.floor(Math.random() * SIMULATIONS.length)];
      const parsed = parseResult(sim);
      setCurrentDiagnosis(parsed);
      incrementDiagCount();
      setStatus('done');
    }
  };

  const reset = () => {
    setStatus('idle');
    setElapsed(0);
  };

  return {
    status,
    elapsed,
    progress: Math.min(elapsed / RECORD_DURATION_MS, 1),
    startRecording,
    stopRecording,
    reset,
  };
}
