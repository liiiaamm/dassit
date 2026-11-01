'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getProfile, getUsage, updateProfile, changePassword } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import styles from './styles.module.css';

function validatePassword(p) {
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter.';
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState(null);

  const [newUsername, setNewUsername] = useState('');
  const [nameMsg, setNameMsg] = useState({ text: '', ok: false });

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', ok: false });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    async function load() {
      try {
        const p = await getProfile();
        setProfile(p);
        setNewUsername(p.username);
      } catch {
        router.replace('/login');
      }
      try {
        const u = await getUsage();
        setUsage(u);
      } catch {}
    }
    load();
  }, []);

  async function handleSaveName(e) {
    e.preventDefault();
    setNameMsg({ text: '', ok: false });
    try {
      const updated = await updateProfile({ username: newUsername });
      setProfile(updated);
      setNameMsg({ text: 'Username updated!', ok: true });
    } catch (e) {
      setNameMsg({ text: e.message, ok: false });
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg({ text: '', ok: false });
    const pwdError = validatePassword(newPwd);
    if (pwdError) { setPwdMsg({ text: pwdError, ok: false }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ text: 'Passwords do not match.', ok: false }); return; }
    setPwdLoading(true);
    try {
      await changePassword(currentPwd, newPwd);
      setPwdMsg({ text: 'Password changed successfully!', ok: true });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      setPwdMsg({ text: e.message, ok: false });
    } finally {
      setPwdLoading(false);
    }
  }

  if (!profile) {
    return (
      <div className={styles.layout}>
        <Sidebar />
        <div className={styles.center}><p>Loading...</p></div>
      </div>
    );
  }

  const usedPct = usage ? Math.round((usage.messages_used / usage.messages_limit) * 100) : 0;

  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.main}>
        <h1 className={styles.title}>Profile</h1>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Your Info</p>
          <p className={styles.infoText}>Email: {profile.email}</p>
          <form onSubmit={handleSaveName} className={styles.row}>
            <input className={styles.input} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
            <button type="submit" className={styles.saveBtn}>Save</button>
          </form>
          {nameMsg.text && <p className={nameMsg.ok ? styles.success : styles.error}>{nameMsg.text}</p>}
        </div>

        {usage && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>Usage</p>
            <p className={styles.infoText}>{usage.messages_used} / {usage.messages_limit} messages used</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${usedPct}%` }}></div>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <p className={styles.cardTitle}>Change Password</p>
          <form onSubmit={handleChangePassword} className={styles.form}>
            <input type="password" className={styles.input} placeholder="Current password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
            <input type="password" className={styles.input} placeholder="New password (min. 8 chars, upper & lowercase)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
            <input type="password" className={styles.input} placeholder="Confirm new password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
            {pwdMsg.text && <p className={pwdMsg.ok ? styles.success : styles.error}>{pwdMsg.text}</p>}
            <button type="submit" className={styles.saveBtn} disabled={pwdLoading}>
              {pwdLoading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
