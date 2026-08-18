'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './presentation.module.css';

const SLIDES = [
  {
    icon: '🍌',
    gradient: 'radial-gradient(circle at 35% 30%, #ffffff, #ffe9a8)',
    title: 'Aligne 3 ingrédients ou plus',
    text: "Échange deux ingrédients voisins pour créer des alignements et marquer des points.",
  },
  {
    icon: '🗺️',
    gradient: 'radial-gradient(circle at 35% 30%, #ffffff, #dcc2ae)',
    title: 'Voyage de ville en ville',
    text: "Chaque ville a ses propres ingrédients, liés à ce qu'elle produit vraiment — d'Abidjan à Addis Abeba.",
  },
  {
    icon: '💣',
    gradient: 'radial-gradient(circle at 35% 30%, #ffffff, #fbcfc7)',
    title: 'Boosters & bonus quotidien',
    text: "Bombes, éclairs, mélanges... et un bonus gratuit à réclamer chaque jour.",
  },
];

export default function Presentation() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  const finish = () => {
    localStorage.setItem('maRacineOnboardingVu', 'true');
    router.replace('/connexion');
  };

  const next = () => {
    if (index < SLIDES.length - 1) setIndex(index + 1);
    else finish();
  };

  const slide = SLIDES[index];

  return (
    <main className={styles.page}>
      <div className={styles.bands} />
      <button type="button" className={styles.skip} onClick={finish}>
        Passer
      </button>

      <div className={styles.slide}>
        <div className={styles.icon} style={{ background: slide.gradient }}>
          {slide.icon}
        </div>
        <h1 className={styles.title}>{slide.title}</h1>
        <p className={styles.text}>{slide.text}</p>
      </div>

      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Diapositive ${i + 1}`}
          />
        ))}
      </div>

      <button type="button" className={styles.cta} onClick={next}>
        {index < SLIDES.length - 1 ? 'Suivant' : 'Commencer'}
      </button>
    </main>
  );
}
