'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import styles from './styles.module.css';

function validatePassword(p) {
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter.';
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const pwdError = validatePassword(password1);
    if (pwdError) { setError(pwdError); return; }
    if (password1 !== password2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const result = await register(username, email, password1, password2);
    setLoading(false);
    if (result.ok) {
      router.push('/chat');
    } else {
      setError(result.error);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.imageCol}>
        <img src="/universe.jpg" alt="Universe" className={styles.img} />
        <p className={styles.tagline}>Join the conversation</p>
      </div>

      <div className={styles.formCol}>
        <h2 className={styles.title}>Create account</h2>
        <p className={styles.subtitle}>Start chatting with AI today</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input type="text" className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input type="password" className={styles.input} value={password1} onChange={(e) => setPassword1(e.target.value)} placeholder="Min. 8 chars, upper & lowercase" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <input type="password" className={styles.input} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Repeat your password" required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link href="/login" className={styles.switchLink}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
