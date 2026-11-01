'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';
import styles from './styles.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      router.push('/chat');
    } else {
      setError(result.error);
      setPassword('');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.imageCol}>
        <img src="/universe.jpg" alt="Universe" className={styles.img} />
        <p className={styles.tagline}>Your AI chat companion</p>
      </div>

      <div className={styles.formCol}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Log in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input type="password" className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className={styles.switchText}>
          Don't have an account?{' '}
          <Link href="/register" className={styles.switchLink}>Register</Link>
        </p>
      </div>
    </div>
  );
}
