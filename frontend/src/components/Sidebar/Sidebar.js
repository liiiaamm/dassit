'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChats, createChat, deleteChat, logout } from '@/lib/api';
import styles from './styles.module.css';

export default function Sidebar() {
  const router = useRouter();
  const [chats, setChats] = useState([]);

  async function loadChats() {
    try {
      const data = await getChats();
      setChats(data);
    } catch (e) {
      if (e.message === 'SESSION_EXPIRED') router.push('/login');
    }
  }

  useEffect(() => {
    loadChats();
  }, []);

  async function handleNewChat() {
    try {
      const chat = await createChat('New Chat');
      await loadChats();
      router.push(`/chat/${chat.id}`);
    } catch (_) {}
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteChat(id);
      await loadChats();
    } catch (_) {}
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <Link href="/chat" className={styles.navLink}>Chat</Link>
        <Link href="/profile" className={styles.navLink}>Profile</Link>
      </nav>

      <div className={styles.chatSection}>
        <div className={styles.chatHeader}>
          <span>History</span>
          <button className={styles.newBtn} onClick={handleNewChat}>+</button>
        </div>

        <ul className={styles.chatList}>
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link href={`/chat/${chat.id}`} className={styles.chatItem}>
                <span className={styles.chatName}>{chat.title}</span>
                <button className={styles.delBtn} onClick={(e) => handleDelete(e, chat.id)}>x</button>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
    </aside>
  );
}
