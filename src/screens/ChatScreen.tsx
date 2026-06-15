// src/screens/ChatScreen.tsx
// Uses real robot avatar (assets/ai-avatar.png) for AI messages + header

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGroqChat } from '../hooks/useGroqChat';
import { useStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Real robot avatar image
const AI_AVATAR = require('../../assets/ai-avatar.png');

const QUICK_PROMPTS = [
  { label: 'How urgent? ⏰', text: 'How urgent is this issue?' },
  { label: 'Repair cost 💰', text: 'What does this repair typically cost?' },
  { label: 'DIY possible? 🔧', text: 'Can I fix this myself at home?' },
  { label: 'Safe to drive? 🚗', text: 'Is it safe to keep driving?' },
];

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const { messages, isTyping, sendMessage } = useGroqChat();
  const { currentDiagnosis, groqKey, setGroqKey } = useStore();
  const [input, setInput] = useState('');
  const [showQuicks, setShowQuicks] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem('oto_groq_key').then(k => {
      if (k) setGroqKey(k);
    });
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setShowQuicks(false);
    if (!groqKey) promptForKey(text);
    else sendMessage(text);
  }

  function handleQuick(text: string) {
    setShowQuicks(false);
    if (!groqKey) promptForKey(text);
    else sendMessage(text);
  }

  function promptForKey(pendingMessage?: string) {
    Alert.prompt(
      'Groq API Key',
      'Enter your Groq API key to chat with OTO AI Mechanic.\nGet free at: console.groq.com\n(Keys start with "gsk_")',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save & Chat',
          onPress: (key) => {
            if (!key || !key.trim().startsWith('gsk_')) {
              Alert.alert('Invalid key', 'Groq keys start with "gsk_". Get yours free at console.groq.com');
              return;
            }
            const trimmed = key.trim();
            setGroqKey(trimmed);
            AsyncStorage.setItem('oto_groq_key', trimmed);
            if (pendingMessage) sendMessage(pendingMessage);
          },
        },
      ],
      'plain-text',
      groqKey || ''
    );
  }

  const conf = currentDiagnosis ? Math.round(currentDiagnosis.confidence * 100) : 0;
  const ctxLabel = currentDiagnosis
    ? `${currentDiagnosis.top_class.replace(/_/g, ' ')} · ${conf}% confidence`
    : 'No diagnosis loaded';
  const sevIcon = currentDiagnosis?.severity === 'critical' ? '🚨'
    : currentDiagnosis?.severity === 'warning' ? '⚠️' : '✅';

  // Reusable robot avatar component
  const RobotAvatar = () => (
    <Image source={AI_AVATAR} style={s.avatar} resizeMode="cover" />
  );

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>

        <View style={s.agentInfo}>
          <Image source={AI_AVATAR} style={s.headerAvatar} resizeMode="cover" />
          <View>
            <Text style={s.agentName}>OTO AI Mechanic</Text>
            <Text style={s.agentStatus}>
              {groqKey ? '✅ Groq · llama-3.3-70b' : 'Demo mode — tap 🔑 to connect'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={s.keyBtn} onPress={() => promptForKey()}>
          <Text>🔑</Text>
        </TouchableOpacity>
      </View>

      {/* ── Context strip ── */}
      <View style={s.contextStrip}>
        <Text style={s.contextTxt}>
          {currentDiagnosis
            ? `${sevIcon} ${ctxLabel}`
            : '🎤 Record a sound first for best results'}
        </Text>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome message */}
        <View style={s.botRow}>
          <RobotAvatar />
          <View style={s.botBubble}>
            <Text style={s.msgTxt}>
              I've reviewed your car diagnosis.{'\n\n'}Ask me anything — urgency, repair cost, DIY steps, or whether it's safe to drive.
            </Text>
          </View>
        </View>

        {/* Quick prompts */}
        {showQuicks && messages.length === 0 && (
          <View style={s.quicks}>
            {QUICK_PROMPTS.map(q => (
              <TouchableOpacity key={q.text} style={s.quickBtn} onPress={() => handleQuick(q.text)}>
                <Text style={s.quickTxt}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Chat messages */}
        {messages.map(msg =>
          msg.role === 'user' ? (
            <View key={msg.id} style={s.userRow}>
              <View style={s.userBubble}>
                <Text style={s.userTxt}>{msg.content}</Text>
              </View>
            </View>
          ) : (
            <View key={msg.id} style={s.botRow}>
              <RobotAvatar />
              <View style={s.botBubble}>
                <Text style={s.msgTxt}>{msg.content}</Text>
              </View>
            </View>
          )
        )}

        {/* Typing indicator */}
        {isTyping && (
          <View style={s.botRow}>
            <RobotAvatar />
            <View style={s.botBubble}>
              <View style={s.typingDots}>
                <View style={s.dot} />
                <View style={[s.dot, s.dotMid]} />
                <View style={s.dot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Input bar ── */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about repair, cost, urgency…"
          placeholderTextColor="#9aa3b0"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity style={s.sendBtn} onPress={handleSend} activeOpacity={0.8}>
          <Text style={s.sendTxt}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f4f5f7', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e8ecf0',
  },
  backTxt: { fontSize: 18, color: '#0d1117' },
  agentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Header avatar — slightly larger, rounded
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: '#ff6b00',
  },

  agentName: { fontSize: 14, fontWeight: '700', color: '#0d1117' },
  agentStatus: { fontSize: 11, color: '#9aa3b0', marginTop: 1 },
  keyBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f4f5f7', borderWidth: 1, borderColor: '#e8ecf0',
    alignItems: 'center', justifyContent: 'center',
  },

  contextStrip: {
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e8ecf0',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  contextTxt: { fontSize: 12, color: '#5b6880', fontWeight: '500' },

  messages: { flex: 1 },

  botRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },

  // Message avatar — robot image
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: '#ff6b00',
    flexShrink: 0,
  },

  botBubble: {
    maxWidth: '80%', backgroundColor: '#f4f5f7',
    borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: '#e8ecf0',
  },
  msgTxt: { fontSize: 14, color: '#0d1117', lineHeight: 20 },

  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '80%', backgroundColor: '#ff6b00',
    borderRadius: 18, borderBottomRightRadius: 4, padding: 12,
  },
  userTxt: { fontSize: 14, color: '#fff', lineHeight: 20 },

  // Typing dots
  typingDots: { flexDirection: 'row', gap: 5, padding: 2, alignItems: 'center' },
  dot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#9aa3b0',
  },
  dotMid: { opacity: 0.6 },

  quicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  quickBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  quickTxt: { fontSize: 13, fontWeight: '600', color: '#5b6880' },

  inputBar: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 1, borderTopColor: '#e8ecf0',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, backgroundColor: '#f4f5f7', borderWidth: 1.5, borderColor: '#e8ecf0',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 14, color: '#0d1117',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ff6b00', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ff6b00', shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  sendTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
