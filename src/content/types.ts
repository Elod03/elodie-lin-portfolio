import type { GameLabels } from '../experiments/common'
export type Lang = 'fr' | 'en' | 'zh'
export type ProjectSlug = 'streamflix' | 'yoru' | 'kanpai' | 'carnival'
export interface PlaygroundUi { today: string; play: string; fullscreen: string; exitFullscreen: string; how: string; open: string; replay: string; pause: string; resume: string; controls: string; notes: string; best: string; notPlayed: string; technique: string; keys: string; hint: string; tags: string[]; /** Words drawn inside the game canvas. */ canvas: GameLabels }
export interface ProjectCopy {
  type: string; tagline: string; role: string; duration: string; platform: string;
  problem: string; solution: string;
  process: { icon: string; title: string; text: string }[];
  sections: { id: string; title: string; body: string[]; /** Captures du projet (indices de `shots` dans shared.ts), avec leur texte alternatif. */ media?: { shot: number; alt: string }[] }[];
  alts: Record<string, string>;
}
export interface AboutRow { name: string; role: string; period: string; place?: string; logo?: string; logoTile?: 'dark'; /** Réalisations visibles sans clic, tirées du CV. */ points?: string[]; /** Pastille de mise en avant (carte agrandie). */ badge?: string }
export interface SiteCopy {
  /** Messages d'amorce du livre d'or, affichés tant que le stockage du navigateur est vide. */
  hero: { title: string; lines: string[] };
  labels: { home: string; about: string; playground: string; guestbook: string; close: string; next: string; visit: string; role: string; duration: string; platform: string; tools: string; problem: string; solution: string; process: string; contact: string; code: string; contents: string; allProjects: string };
  about: { title: string; subtitle: string; bio: string[]; experience: string; education: string; languages: string; credits: string; portraitAlt: string; location: string; highlights: string[]; interestsLabel: string; interests: string[]; languageRows: { name: string; level?: string; /** Niveau sur 6 (CECRL A1–C2 ou HSK 1–6). */ rank?: number }[]; strengthsLabel: string; strengths: string[]; experienceRows: AboutRow[]; educationRows: AboutRow[] };
  playground: { title: string; intro: string; instruction: string; markers: string[]; ui: PlaygroundUi; items: { id: string; title: string; description: string; hook: string; technique: string; keys: string; /** Controls for a touch screen. */ touch: string; notes: string }[] };
  projects: Record<ProjectSlug, ProjectCopy>;
}
