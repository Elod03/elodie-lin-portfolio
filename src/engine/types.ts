import type { Lang, ObjectId, Theme, View, Viewport } from '../world/types'
import type { Snapshot, TransitionPlan } from '../world/transitions'

export interface HeroTextSpec { lang: Lang; title: string; lines: readonly string[]; morphTail?: string }
export interface ObjectScreenState { id: ObjectId; x: number; y: number; radius: number; labelY: number; visible: boolean }
export interface PoolEngineEvents { objects: readonly ObjectScreenState[]; quality: { dpr: number }; contextlost: void; contextrestored: void; error: Error }
export interface PoolEngineOptions {
  viewport: Viewport; projectSlugs: readonly string[]; theme?: Theme; reducedMotion?: boolean;
  heroText?: HeroTextSpec; snapshot?: Snapshot;
  /** First visit of the session on the home page: the basin starts dry and fills up (see playIntro). */
  arrival?: boolean;
  /** Project slug -> colour (#rrggbb): hovering a project object glides the light of the water toward it. */
  projectColors?: Readonly<Record<string, string>>;
  /** Project slug -> icon URL: a raster artwork (.webp/.png/.jpg) is drawn on the tile once it has loaded. */
  projectFaces?: Readonly<Record<string, string>>;
  /** Light of the hour in Paris (start value; later changes glide slowly through setLight). */
  light?: { warm: number; cool: number };
  /** It rains in Paris: real drops fall on the water (never with reduced motion). */
  rain?: boolean;
}
export interface PoolEngine {
  readonly ready: Promise<void>; readonly objectsReady: Promise<void>;
  transitionTo(plan: TransitionPlan, startedAt: number): void;
  snapTo(view: View, snapshot: Snapshot): void;
  setTheme(theme: Theme, options?: { durationMs?: number }): void;
  setHeroText(spec: HeroTextSpec): Promise<void>;
  setGuestbookLines(lines: readonly string[]): void;
  launchGuestbookLine(line: string): void;
  /** New target for the light of the hour in Paris: the pool glides toward it in about 12 s. */
  setLight(light: { warm: number; cool: number }): void;
  /** Starts or stops the real rain. */
  setRain(on: boolean): void;
  setHovered(id: ObjectId | null): void;
  /** Click feedback: the object sinks ~6 % and comes back in 250 ms with a wave. No-op with reduced motion. */
  /** Plays the click dip; false when nothing was played (reduced motion, hidden frame, unknown object). */
  dive(id: ObjectId): boolean;
  pointer: { move(x: number, y: number): void; leave(): void };
  resize(viewport: Viewport): void;
  playIntro(): Promise<void>;
  /** Jump to the end of the intro / arrival (a click or a key press): the pool is full and everything is in place. */
  skipIntro(): void;
  /** Show the hero text without the line-by-line writing (no intro on this visit). */
  revealHero(): void;
  on<K extends keyof PoolEngineEvents>(kind: K, cb: (payload: PoolEngineEvents[K]) => void): () => void;
  dispose(): void;
}
