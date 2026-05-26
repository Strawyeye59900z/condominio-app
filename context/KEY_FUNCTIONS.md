# Funções e Serviços Principais

## AuthService — apps/api/src/auth/auth.service.ts

| Função | Assinatura | O que faz |
|--------|-----------|-----------|
| `hashPassword` | `(plain: string) → Promise<string>` | Bcrypt hash (10 rounds) |
| `compare` | `(plain, hash) → Promise<boolean>` | Verifica senha |
| `loginAdmin` | `(email, senha) → Promise<AuthSession>` | Login do admin, retorna tokens |
| `loginFuncionario` | `(loginId, senha) → Promise<AuthSession>` | Login do porteiro |
| `loginMorador` | `(numeroAp, senha) → Promise<AuthSession>` | Login pelo número do AP |
| `refresh` | `(payload) → Promise<AuthTokens>` | Gera novo access token |
| `changePassword` | `(user, senhaAtual, novaSenha) → void` | Troca senha (valida atual) |
| `listAdmins` | `() → Promise<Admin[]>` | Lista admins |
| `createAdmin` | `(email, senha) → Promise<Admin>` | Cria admin |
| `deleteAdmin` | `(id, currentUserId) → void` | Remove (impede auto-deleção) |
| `listFuncionariosPublic` | `() → Promise<FuncionarioPublic[]>` | Lista porteiros para tela de login |

## ApartamentosService — apps/api/src/apartamentos/apartamentos.service.ts

| Função | O que faz |
|--------|-----------|
| `create(dto)` | Cria apartamento com senha provisional |
| `bulk(dto)` | Cria em lote a partir de CSV |
| `list()` | Lista todos os apartamentos |
| `resetarSenha(id)` | Gera nova senha aleatória |

## MoradoresService — apps/api/src/moradores/moradores.service.ts

| Função | O que faz |
|--------|-----------|
| `listAll(filter?)` | Lista todos (filtro AP/statusFacial) |
| `listDoAp(apartamentoId)` | Moradores de um AP |
| `createNoAp(apartamentoId, dto)` | Cria morador vinculado ao AP |
| `updateNoAp(apartamentoId, id, dto, isFromMe?)` | Atualiza (verifica pertencimento ao AP) |
| `adminUpdate(id, dto)` | Atualiza sem verificar AP |
| `getAdminDoAp(apartamentoId)` | Retorna morador com `isAdminAp = true` |
| `resetSenhaAp(moradorId)` | Reseta senha do apartamento do morador |

## EncomendasService — apps/api/src/encomendas/encomendas.service.ts

| Função | O que faz |
|--------|-----------|
| `create(dto, funcionarioId)` | Registra encomenda + dispara WhatsApp assíncrono |
| `update(id, dto, userId, isAdmin)` | Edita (admin ignora janela de 10min) |
| `baixa(id, apartamentoId, moradorId)` | Confirma retirada pelo morador |
| `listPorteiro(status?)` | Lista encomendas (visão porteiro) |
| `listMorador(apartamentoId, status?)` | Lista encomendas do AP |
| `reenviarWhatsapp(id)` | Tenta reenvio manual da notificação |

## ReservasService — apps/api/src/reservas/reservas.service.ts

| Função | O que faz |
|--------|-----------|
| `create(dto, apartamentoId, moradorId)` | Valida regras e cria reserva |
| `disponibilidade(espaco, data)` | Retorna slots disponíveis (QUADRA) |
| `listMorador(apartamentoId)` | Reservas do morador |
| `listAdmin(inicio?, fim?)` | Todas as reservas (calendário) |
| `cancelar(id, userId, isAdmin)` | Cancela (admin ignora prazo mínimo) |

## FuncionariosService — apps/api/src/funcionarios/funcionarios.service.ts

| Função | O que faz |
|--------|-----------|
| `create(dto)` | Cria porteiro com `mustChangePassword = true` |
| `list()` | Lista porteiros |
| `update(id, dto)` | Atualiza nome/ativo; `resetarSenha = true` gera nova |

## WhatsAppService — apps/api/src/whatsapp/whatsapp.service.ts

| Função | O que faz |
|--------|-----------|
| `status()` | `{ connected, state, instance }` |
| `getQrCode()` | `{ qrDataUrl }` ou null se já conectado |
| `disconnect()` | Logout da sessão WhatsApp |
| `sendAsync(to, text, callbacks?)` | Envia com retry (fire-and-forget) |
| `testSend(to, text)` | Envia sem retry (retorna resultado) |
| `initializeSocket()` (privado) | Inicia socket Baileys |
| `sendWithRetry()` (privado) | Lógica de 3 tentativas (5s/30s/120s) |

## DriveService — apps/api/src/drive/drive.service.ts

| Função | O que faz |
|--------|-----------|
| `saveFile(relativePath, buffer)` | Salva arquivo em `UPLOADS_DIR` |
| `readFile(relativePath)` | Lê arquivo → `{ buffer, mimeType }` |
| `deleteFile(relativePath)` | Remove arquivo |
| `ping()` | Health check (write + delete teste) |

## PrismaService — apps/api/src/prisma/prisma.service.ts

Estende `PrismaClient`. Connect em `onModuleInit`, disconnect em `onModuleDestroy`.

## PdfService — apps/api/src/reservas/pdf.service.ts

| Função | O que faz |
|--------|-----------|
| `generateReservasReport(reservas[])` | Gera PDFDocument com relatório de reservas |

## SeedService — apps/api/src/seed/seed.service.ts

| Função | O que faz |
|--------|-----------|
| `seed()` | Cria admin padrão e 56 apartamentos se não existirem |

---

## Frontend — apps/web/src/lib/api.ts

### Namespaces exportados

#### `authApi`
```typescript
loginAdmin(email, senha)
loginFuncionario(loginId, senha)
loginMorador(numeroAp, senha)
listFuncionarios()                    // para tela de login
changePassword(senhaAtual, novaSenha)
logout()
refresh()
```

#### `adminApi`
```typescript
getMoradores(filter?)
patchMorador(id, dto)
resetSenhaMorador(id)
listAdmins()
createAdmin(email, senha)
deleteAdmin(id)
getFuncionarios()
createFuncionario(dto)
patchFuncionario(id, dto)
getEncomendas(status?)
patchEncomenda(id, dto)
patchEncomendaAdmin(id, dto)
getReservas(inicio?, fim?)
cancelarReserva(id)
getFacialNext()
postFacialRegistrado(id)
getWhatsAppStatus()
getWhatsAppQrCode()
disconnectWhatsApp()
getWhatsAppTemplate()
patchWhatsAppTemplate(template)
testWhatsApp(numero)
getRelatorio(inicio, fim)
```

#### `porteiroApi`
```typescript
getEncomendas(status?)
createEncomenda(dto)
patchEncomenda(id, dto)
getApartamentos()
reenviarWhatsapp(id)
uploadFoto(formData)
```

#### `moradorApi`
```typescript
getMe()
getMoradores()
createMorador(dto)
updateMorador(id, dto)
deleteMorador(id)
getEncomendas(status?)
baixaEncomenda(id)
getReservas()
createReserva(dto)
cancelarReserva(id)
getDisponibilidade(espaco, data)
consentLgpd()
uploadFoto(moradorId, formData)
```

---

## Frontend — apps/web/src/lib/auth.ts

```typescript
session.save(loginResponse)           // salva token + user no sessionStorage
session.getToken(): string | null     // recupera JWT
session.getUser(): SessionUser | null // recupera objeto do usuário
session.clear()                       // logout (limpa sessionStorage)
session.getHomePath(user?): string    // '/admin' | '/porteiro' | '/me' | '/'
```

---

## Frontend — apps/web/src/lib/useAuth.ts (Hook React)

```typescript
const { user, login, logout, loading } = useAuth()
```
