'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MaRacinePuzzle from '@/components/MaRacinePuzzle';

export default function Jeu() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/connexion');
  }, [loading, user, router]);

  if (loading || !user) {
    return <main style={{ background: '#FBF1DE', minHeight: '100vh' }} />;
  }

  return (
    <main style={{ padding: '24px 12px', minHeight: '100vh' }}>
      <MaRacinePuzzle />
    </main>
  );
}
