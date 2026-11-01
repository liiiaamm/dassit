import styles from './styles.module.css';

export default function ChatPage() {
  return (
    <div className={styles.empty}>
      <img src="/bot.png" alt="DassIt! Bot" className={styles.emptyImg} />
      <p className={styles.emptyTitle}>DassIt! Bot</p>
      <p className={styles.emptyText}>Select a chat or create a new one</p>
    </div>
  );
}
