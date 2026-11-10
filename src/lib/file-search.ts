/** Predictable substring matching over the already-authorized, bounded listing. */
export function matchesFileName(name: string, query: string): boolean {
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  return normalize(name).includes(normalize(query.trim()));
}
