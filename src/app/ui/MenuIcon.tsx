/** Bouton du menu mobile : deux traits arrondis (une croix quand la feuille est ouverte). Pas de perles ni de pointillés. */
export function MenuIcon({ open }: { open: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{open ? <path d="m5 5 12 12M17 5 5 17"/> : <path d="M4 8h14M4 14h14"/>}</svg>
}
