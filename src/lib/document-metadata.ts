export function updatedAtLabel(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Última atualização: não informada";
  return `Última atualização: ${new Date(value).toLocaleString("pt-BR")}`;
}
