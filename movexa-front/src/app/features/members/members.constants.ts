/**
 * Listes provisoires : elles viendront de l'API quand les entités Plan et Coach existeront.
 * Les noms des formules doivent correspondre à ceux du backend (MemberService.PLAN_DURATION_MONTHS).
 */
export const PLANS = ['Mensuel Essentiel', 'Mensuel Illimité', 'Trimestriel', 'Annuel'];
export const COACHES = ['Malik T.', 'Fatou B.', 'Hugo L.'];

/** Date du jour au format ISO local (AAAA-MM-JJ), sans décalage de fuseau */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** AAAA-MM-JJ → JJ/MM/AAAA */
export function formatIsoDate(iso: string | null | undefined): string {
  return iso ? iso.split('-').reverse().join('/') : '—';
}
