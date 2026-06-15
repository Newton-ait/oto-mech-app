// src/hooks/useGroqChat.ts
// Groq LLM chat integration — llama-3.3-70b-versatile

import { useState, useCallback } from 'react';
import crashlytics from '@react-native-firebase/crashlytics';
import { useStore, DiagnosisResult } from '../store';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const DEMO_REPLIES: Record<string, string> = {
  urgent: "Based on the diagnosis, I'd rate this as moderate urgency. Get it inspected within 1-2 weeks. The sound pattern suggests the issue is progressing but isn't an immediate safety concern unless it worsens.",
  cost: "Typical repair range for this issue: $150–$450 depending on your location and whether you go to a dealer vs independent shop. Get 2–3 quotes. Dealer markup is usually 20–40% higher.",
  diy: "This one is borderline DIY. If you have basic tools and have done brake or suspension work before — yes, you can tackle it. If not, the labor cost is worth it for safety-critical components.",
  safe: "You can drive carefully to a mechanic, but avoid aggressive maneuvers. If the sound gets significantly louder or you feel it in the steering wheel, pull over and call a tow.",
  default: "That's a good question. Based on the AI diagnosis, the most likely root cause is worn mechanical components producing the detected sound pattern. A hands-on inspection by a mechanic will confirm it and rule out anything secondary.",
};

function getDemoReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('urgent') || q.includes('serious') || q.includes('bad')) return DEMO_REPLIES.urgent;
  if (q.includes('cost') || q.includes('price') || q.includes('much')) return DEMO_REPLIES.cost;
  if (q.includes('diy') || q.includes('myself') || q.includes('home')) return DEMO_REPLIES.diy;
  if (q.includes('safe') || q.includes('drive')) return DEMO_REPLIES.safe;
  return DEMO_REPLIES.default;
}

function buildSystemPrompt(diag: DiagnosisResult | null, vehicle: any): string {
  const vehicleCtx = vehicle
    ? `User's vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.mileage ? ` (${vehicle.mileage} miles)` : ''}.`
    : 'Vehicle details not provided.';

  const diagCtx = diag
    ? `Current diagnosis: ${diag.diagnosis}. Top class: ${diag.top_class}. Confidence: ${Math.round(diag.confidence * 100)}%. Severity: ${diag.severity}. All scores: ${JSON.stringify(diag.scores)}.`
    : 'No diagnosis context.';

  return `You are OTO, an expert automotive mechanic AI assistant. Be direct, practical, and concise. Always include: urgency level, rough cost estimate in USD, whether DIY is feasible, and safety guidance. Max 3 short paragraphs. ${vehicleCtx} ${diagCtx}`;
}

export function useGroqChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { groqKey, currentDiagnosis, vehicle } = useStore();

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = { id: Date.now().toString(), role, content };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setIsTyping(true);

    try {
      if (!groqKey) {
        // Demo mode
        await new Promise(r => setTimeout(r, 1200));
        addMessage('assistant', getDemoReply(text));
        return;
      }

      const systemPrompt = buildSystemPrompt(currentDiagnosis, vehicle);
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: text },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Groq API error ${response.status}`);
      }

      const data = await response.json();
      addMessage('assistant', data.choices[0].message.content);
    } catch (err) {
      crashlytics().recordError(err as Error);
      addMessage('assistant', getDemoReply(text));
    } finally {
      setIsTyping(false);
    }
  }, [groqKey, currentDiagnosis, vehicle, messages]);

  const clearMessages = () => setMessages([]);

  return { messages, isTyping, sendMessage, clearMessages };
}
