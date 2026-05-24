import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;

    // Só loga mutações
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    if (!user) return next.handle();

    const path: string = req.route?.path ?? req.url;
    const action = resolveAction(method, path);
    if (!action) return next.handle();

    const actorType = user.role as string;
    const actorId = user.sub as string;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const targetId = extractTargetId(responseBody, req.params?.id);
          this.prisma.auditLog
            .create({
              data: {
                actorType,
                actorId,
                action,
                targetId: targetId ?? undefined,
                metadata: {
                  method,
                  path,
                  body: sanitize(req.body),
                },
              },
            })
            .catch((err) => {
              // Nunca deixa o audit quebrar o fluxo principal
              console.error('[AuditInterceptor] Falha ao gravar log:', err?.message);
            });
        },
      }),
    );
  }
}

// ===== Helpers =====

/**
 * Mapeia method + path para uma string de ação legível.
 * Retorna null para rotas que não precisam de log.
 */
function resolveAction(method: string, path: string): string | null {
  // Normaliza o path removendo parâmetros dinâmicos para facilitar matching
  const normalized = path
    .replace(/\/[a-z0-9]{20,}/gi, '/:id') // cuid / uuid
    .replace(/\/\d+/g, '/:id');

  const map: Record<string, string> = {
    // Auth
    'POST /api/v1/auth/change-password': 'auth.change-password',
    'POST /api/v1/auth/logout': 'auth.logout',

    // Funcionários
    'POST /api/v1/admin/funcionarios': 'funcionario.create',
    'PATCH /api/v1/admin/funcionarios/:id': 'funcionario.update',

    // Apartamentos
    'POST /api/v1/admin/apartamentos/bulk': 'apartamento.bulk-import',
    'PATCH /api/v1/admin/apartamentos/:id': 'apartamento.update',

    // Moradores
    'PATCH /api/v1/admin/moradores/:id': 'morador.update-admin',
    'POST /api/v1/me/moradores': 'morador.create',
    'PATCH /api/v1/me/moradores/:id': 'morador.update',
    'DELETE /api/v1/me/moradores/:id': 'morador.delete',

    // Fotos
    'POST /api/v1/me/foto/:id': 'morador.foto.upload',
    'POST /api/v1/porteiro/me/foto': 'funcionario.foto.upload',
    'POST /api/v1/me/consent-lgpd': 'morador.consent-lgpd',

    // Facial
    'POST /api/v1/admin/facial-queue/:id/registrado': 'morador.facial.registrado',

    // Encomendas
    'POST /api/v1/porteiro/encomendas': 'encomenda.create',
    'PATCH /api/v1/porteiro/encomendas/:id': 'encomenda.update',
    'PATCH /api/v1/admin/encomendas/:id': 'encomenda.update-admin',
    'POST /api/v1/me/encomendas/:id/baixa': 'encomenda.baixa',

    // Reservas
    'POST /api/v1/me/reservas': 'reserva.create',
    'DELETE /api/v1/me/reservas/:id': 'reserva.cancel',
    'DELETE /api/v1/admin/reservas/:id': 'reserva.cancel-admin',
  };

  const key = `${method} ${normalized}`;
  return map[key] ?? null;
}

function extractTargetId(
  body: any,
  paramId?: string,
): string | undefined {
  if (paramId) return paramId;
  if (body && typeof body === 'object') {
    return body.id ?? body.reservaId ?? body.encomendaId ?? undefined;
  }
  return undefined;
}

/** Remove campos sensíveis do body antes de gravar no log */
function sanitize(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sensitive = ['senha', 'password', 'passwordHash', 'novaSenha', 'senhaAtual'];
  const clean = { ...body };
  for (const key of sensitive) {
    if (key in clean) clean[key] = '***';
  }
  return clean;
}
