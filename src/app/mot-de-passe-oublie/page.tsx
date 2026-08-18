'use client';

import Link from 'next/link';
import styles from '../auth.module.css';

// TODO: remplace par ton numéro WhatsApp au format international SANS '+' (ex. 2250700000000)
const WHATSAPP_NUMBER = 'NUMERO_WHATSAPP';

export default function MotDePasseOublie() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <main className={styles.page}>
      <div className={styles.bands} />
      <div className={styles.logo}>MR</div>
      <p className={styles.message}>
        Contacte-nous sur WhatsApp avec ton numéro de téléphone, on réinitialise
        ton mot de passe manuellement.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cta}
        style={{
          textAlign: 'center',
          textDecoration: 'none',
          display: 'block',
          width: 'min(100%, 320px)',
        }}
      >
        Ouvrir WhatsApp
      </a>
      <p className={styles.switch}>
        <Link href="/connexion">← Retour à la connexion</Link>
      </p>
    </main>
  );
}
