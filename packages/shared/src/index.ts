// Tipos compartilhados entre apps/api e apps/web.
// Evoluído conforme as fases avançam (DTOs, enums espelhados do Prisma, etc.).

export const APP_NAME = 'Condomínio';

// Espelha enums do Prisma (string literais — sem dependência do @prisma/client no web).
export const StatusFacialValues = ['PENDENTE', 'REGISTRADO'] as const;
export type StatusFacial = (typeof StatusFacialValues)[number];

export const TipoEncomendaValues = ['CAIXA', 'ENVELOPE', 'SACOLA'] as const;
export type TipoEncomenda = (typeof TipoEncomendaValues)[number];

export const StatusEncomendaValues = ['PENDENTE', 'RETIRADA', 'CANCELADA'] as const;
export type StatusEncomenda = (typeof StatusEncomendaValues)[number];

export const EspacoValues = ['QUADRA', 'CHURRASQUEIRA', 'SALAO_FESTAS'] as const;
export type Espaco = (typeof EspacoValues)[number];

// Regras de negócio (centralizadas p/ front e back não divergirem).
export const REGRAS = {
  fotoMaxBytes: 1024 * 1024,                    // 1 MB
  encomendaJanelaEditMin: 10,                   // minutos
  reservaAntecedenciaDias: 90,
  quadraHorasMaxPorAp: 4,
  quadraHoraMin: 0,
  quadraHoraMax: 23,
  cancelamentoChurrasqueiraSalaoHorasAntes: 24, // = até 23:59 da véspera
} as const;
