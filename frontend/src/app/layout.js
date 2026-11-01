import './base.css';
import styles from './layout.module.css';

export const metadata = { title: 'DassIt!' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className={styles.header}>
          <span className={styles.logo}>DassIt!</span>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          © 2026 DassIt! — Liam Esgueva & Sergio Fernández
        </footer>
      </body>
    </html>
  );
}
