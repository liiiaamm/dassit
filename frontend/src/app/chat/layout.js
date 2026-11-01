'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import styles from './styles.module.css';

export default function ChatLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
