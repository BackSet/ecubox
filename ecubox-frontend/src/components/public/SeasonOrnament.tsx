import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { SeasonOrnamento } from '@/data/seasons';

const EMOJIS: Record<SeasonOrnamento, string[]> = {
  flores: ['🌸', '🌷', '💐', '🌹'],
  corazones: ['💖', '💗', '❤️'],
  estrellas: ['⭐', '✨', '🌟'],
  confeti: ['🎉', '🎊', '✨'],
  nieve: ['❄️', '🌨️', '⛄'],
  fuegos: ['🎆', '🎇', '✨'],
  globos: ['🎈', '🎉', '🧸'],
  banderas: ['🇪🇨', '🎉', '⭐'],
  calabazas: ['🎃', '👻', '🦇'],
};

const PARTICULAS = 16;

export interface SeasonOrnamentProps {
  ornamento: SeasonOrnamento;
}

/**
 * Capa decorativa puramente estética para el tema de temporada: emojis que caen
 * suavemente sobre la zona superior del landing. No es interactiva
 * (`aria-hidden`, `pointer-events: none`) y se oculta con `prefers-reduced-motion`.
 */
export function SeasonOrnament({ ornamento }: SeasonOrnamentProps) {
  const particulas = useMemo(() => {
    const set = EMOJIS[ornamento];
    return Array.from({ length: PARTICULAS }, (_, i) => {
      // Distribución determinista para evitar saltos entre renders.
      const left = (i * 61.8) % 100;
      const delay = (i * 0.97) % 12;
      const dur = 11 + ((i * 7) % 9);
      const size = 0.9 + ((i * 13) % 10) / 10;
      return {
        emoji: set[i % set.length],
        style: {
          left: `${left}%`,
          '--season-delay': `${delay}s`,
          '--season-dur': `${dur}s`,
          '--season-size': `${size}rem`,
        } as CSSProperties,
      };
    });
  }, [ornamento]);

  return (
    <div className="season-ornament" aria-hidden="true">
      {particulas.map((p, i) => (
        <span key={i} style={p.style}>
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
