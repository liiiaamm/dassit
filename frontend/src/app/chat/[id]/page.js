'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getChat, sendMessage } from '@/lib/api';
import styles from './styles.module.css';

export default function ChatRoomPage() {
  const { id } = useParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const bottomRef = useRef(null);

  async function loadChat() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const chat = await getChat(id);
      setChatTitle(chat.title);
      setMessages(chat.messages.filter((m) => m.role !== 'system'));
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') { router.push('/login'); return; }
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChat();
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView();
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const data = await sendMessage(id, userMsg.content);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error getting response. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className={styles.center}><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.retryBtn} onClick={loadChat}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.room}>
      <header className={styles.header}>{chatTitle}</header>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.center}>
            <img src="/bot.png" alt="DassIt! Bot" className={styles.botImg}/>
            <p>Start a conversation!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
            {msg.content}
          </div>
        ))}

        {sending && (
          <div className={`${styles.bubble} ${styles.aiBubble}`}>...</div>
        )}

        <div ref={bottomRef}></div>
      </div>

      <form className={styles.inputArea} onSubmit={handleSend}>
        <input
          className={styles.textInput}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className={styles.sendBtn} disabled={sending || !input.trim()}>
          &gt;
        </button>
      </form>
    </div>
  );
}
