// Constantes de regras de negócio. Espelhadas em packages/shared para o front;
// duplicadas aqui para evitar resolver path do workspace no build do NestJS.
export const REGRAS = {
  fotoMaxBytes: 1024 * 1024, // 1 MB
  encomendaJanelaEditMin: 10,
  reservaAntecedenciaDias: 90,
  quadraHorasMaxPorAp: 4,
  quadraHoraMin: 0,
  quadraHoraMax: 23,
  cancelamentoChurrasqueiraSalaoHorasAntes: 24,
} as const;
