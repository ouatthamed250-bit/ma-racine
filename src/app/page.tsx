'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import splashStyles from './Splash.module.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/jeu');
    } else if (localStorage.getItem('maRacineOnboardingVu') !== 'true') {
      router.replace('/presentation');
    } else {
      router.replace('/connexion');
    }
  }, [loading, user, router]);

  return (
    <main className={splashStyles.splash}>
      <div className={splashStyles.badge}>MR</div>
      <div className={splashStyles.title}>MA RACINE</div>
      <div className={splashStyles.dots}>
        <span className={splashStyles.dot} />
        <span className={splashStyles.dot} />
        <span className={splashStyles.dot} />
      </div>
    </main>
  );
}

