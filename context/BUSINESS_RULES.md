# Regras de Negócio

Definidas em `apps/api/src/common/regras.ts` e espelhadas em `packages/shared/src/index.ts`.

```typescript
const REGRAS = {
  fotoMaxBytes: 1024 * 1024,                    // 1 MB — limite de foto
  encomendaJanelaEditMin: 10,                   // 10 minutos para editar encomenda
  reservaAntecedenciaDias: 90,                  // até 90 dias de antecedência
  quadraHorasMaxPorAp: 4,                       // máximo 4h/AP/dia na quadra
  quadraHoraMin: 0,                             // horário mínimo: 0h (meia-noite)
  quadraHoraMax: 23,                            // horário máximo: 23h
  cancelamentoChurrasqueiraSalaoHorasAntes: 24, // aviso mínimo para cancelar
}
```

---

## Encomendas

### Fluxo de status
```
PENDENTE → RETIRADA (morador confirma)
         → CANCELADA (admin cancela)
```

### Janela de edição
- Porteiro pode editar encomenda por **10 minutos** após o registro (`editavelAte = now + 10min`)
- Admin pode editar sem restrição de tempo

### Notificação WhatsApp
- Disparada automaticamente ao registrar encomenda
- Retry automático: 3 tentativas com delays de 5s, 30s, 120s
- Status salvo no campo `whatsappStatus` (PENDENTE → ENVIADA | FALHOU)
- Porteiro pode reenviar manualmente quando `whatsappStatus === 'FALHOU'`

### Template de mensagem
- Configurável pelo admin em `/admin/whatsapp`
- Variáveis disponíveis: `{nome}`, `{tipo}`, `{hora}`, `{porteiro}`
- Armazenado na tabela `configuracoes` com chave `whatsapp_template`
- Processado com Handlebars

---

## Reservas

### QUADRA (Quadra Esportiva)
- Reservas **por hora** (slots individuais de 1h)
- Horário: 0h às 23h
- Duração: 1 a 4 horas por reserva
- **Limite**: máximo 4 horas/AP/dia (soma de todas as reservas do AP naquele dia)
- Sem sobreposição de horários

### CHURRASQUEIRA e SALAO_FESTAS
- Reserva de **dia inteiro** (sem hora de início/fim)
- Apenas uma reserva por dia por espaço
- Cancelamento: mínimo **24 horas** de antecedência

### Regras gerais
- Máximo **90 dias** de antecedência
- Cancelamento por morador: respeitando prazo mínimo
- Cancelamento por admin: sem restrição de prazo

---

## Autenticação

### Tokens
- **Access token**: JWT, expira em `JWT_ACCESS_TTL` (padrão 15m)
- **Refresh token**: JWT, expira em `JWT_REFRESH_TTL` (padrão 30d), armazenado em cookie httpOnly

### Primeiro login (Funcionário)
- `mustChangePassword = true` ao criar funcionário
- Sistema redireciona para `/auth/change-password` antes de permitir acesso
- Flag zerada após troca de senha bem-sucedida
- Porteiro também precisa enviar foto obrigatória em `/porteiro/foto` se `fotoUrl` for null

### Roles
| Role | Valor no JWT | Acesso |
|------|-------------|--------|
| Admin | `admin` | Todas as rotas `/admin/**` |
| Funcionario | `funcionario` | Rotas `/porteiro/**` |
| Morador | `morador` | Rotas `/me/**` |

---

## Fotos e LGPD

### Fotos de moradores
- Limite: **1 MB** por foto
- Comprimidas automaticamente no upload
- Path salvo como relativo em `uploads/fotos/{apartamentoId}/{moradorId}.jpg`
- Exibição: via endpoint autenticado `/me/foto/:moradorId`

### Consentimento LGPD
- Morador deve aceitar antes de fazer upload de foto
- Timestamp e IP registrados em `consentLgpdAt` e `consentLgpdIp`

### Foto do porteiro
- Exibida publicamente na tela de login (seleção de porteiro)
- Endpoint público: `GET /auth/funcionarios/:id/foto`

---

## Reconhecimento Facial

### Fluxo
1. Morador faz upload de foto → `statusFacial = PENDENTE`
2. Admin acessa fila em `/admin/facial` → vê próximo morador pendente
3. Admin baixa foto, cadastra no sistema externo de reconhecimento
4. Admin marca como registrado → `statusFacial = REGISTRADO`

---

## WhatsApp (Baileys)

### Conexão
- Inicia via `OnModuleInit` quando a API sobe
- Credenciais persistidas em volume Docker `wa_auth` → `/app/auth_info_condominio`
- Reconexão automática (setTimeout 3s) exceto quando `connection = 'close'` e `loggedOut = true`
- QR code gerado via evento `connection.update` e exposto via endpoint

### Retry de envio
```
Tentativa 1 → aguarda 5s → Tentativa 2 → aguarda 30s → Tentativa 3 → aguarda 120s → FALHOU
```
- Antes de enviar: valida número com `onWhatsApp()` (verifica se tem conta WA)
