# Banco de Dados — Schema e Modelos

Banco: **PostgreSQL**
ORM: **Prisma 5.22.0**
Schema: `prisma/schema.prisma`
Convenção: snake_case no DB, camelCase no código (via `@@map` / `@map`)

---

## Modelos

### Admin
Síndico do condomínio.

```prisma
model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

### Funcionario
Porteiro ou outro funcionário.

```prisma
model Funcionario {
  id                 String   @id @default(cuid())
  loginId            String   @unique        // ID de login (ex: "porteiro01")
  nome               String
  passwordHash       String
  fotoUrl            String?                 // path relativo em uploads/
  mustChangePassword Boolean  @default(true) // obriga troca na 1ª entrada
  ativo              Boolean  @default(true)
  createdAt          DateTime @default(now())

  encomendasRecebidas Encomenda[] @relation("FuncionarioRecebe")
}
```

### Apartamento
Unidade residencial.

```prisma
model Apartamento {
  id            String   @id @default(cuid())
  numero        String   @unique            // ex: "101", "203A"
  passwordHash  String
  isProvisional Boolean  @default(true)     // senha nunca foi trocada
  createdAt     DateTime @default(now())

  moradores  Morador[]
  reservas   Reserva[]
  encomendas Encomenda[]
}
```

### Morador
Residente vinculado a um apartamento.

```prisma
model Morador {
  id            String       @id @default(cuid())
  apartamentoId String                           // FK Apartamento
  nome          String
  telefone      String                           // E.164: +5511999999999
  fotoUrl       String?                          // path relativo em uploads/
  statusFacial  StatusFacial @default(PENDENTE)
  consentLgpdAt DateTime?
  consentLgpdIp String?
  isAdminAp     Boolean      @default(false)     // admin do AP (pode criar/editar moradores)
  ativo         Boolean      @default(true)
  createdAt     DateTime     @default(now())

  encomendas         Encomenda[] @relation("MoradorDestinatario")
  encomendasBaixaPor Encomenda[] @relation("MoradorBaixa")
  reservas           Reserva[]

  @@index([statusFacial, createdAt])
  @@index([apartamentoId])
}
```

### Encomenda
Entrega recebida na portaria.

```prisma
model Encomenda {
  id             String          @id @default(cuid())
  apartamentoId  String                              // FK Apartamento
  moradorId      String                              // FK Morador (destinatário)
  tipo           TipoEncomenda                       // CAIXA | ENVELOPE | SACOLA
  recebidaEm     DateTime        @default(now())
  recebidaPor    String                              // FK Funcionario.id (porteiro)
  retiradaEm     DateTime?
  retiradaPor    String?                             // FK Morador.id (quem retirou)
  status         StatusEncomenda @default(PENDENTE)  // PENDENTE | RETIRADA | CANCELADA
  whatsappStatus WhatsappStatus  @default(PENDENTE)  // PENDENTE | ENVIADA | FALHOU
  whatsappError  String?                             // mensagem de erro se FALHOU
  editavelAte    DateTime                            // now + 10 minutos

  @@index([apartamentoId, status])
  @@index([status, recebidaEm])
}
```

### Reserva
Reserva de espaço comum.

```prisma
model Reserva {
  id            String      @id @default(cuid())
  apartamentoId String                         // FK Apartamento
  moradorId     String                         // FK Morador
  espaco        Espaco                         // QUADRA | CHURRASQUEIRA | SALAO_FESTAS
  data          DateTime    @db.Date           // dia da reserva (sem hora)
  horaInicio    Int?                           // 0..23 — apenas QUADRA
  duracaoHoras  Int?                           // 1..4 — apenas QUADRA
  criadaEm      DateTime    @default(now())
  canceladaEm   DateTime?
  canceladaPor  String?                        // Morador.id ou Admin.id

  @@index([espaco, data])
  @@index([apartamentoId, data])
}
```

### Configuracao
Armazenamento chave-valor de configurações do sistema.

```prisma
model Configuracao {
  chave     String   @id                  // ex: "whatsapp_template"
  valor     String
  updatedAt DateTime @updatedAt
}
```

### AuditLog
Trilha de auditoria de todas as ações.

```prisma
model AuditLog {
  id        BigInt   @id @default(autoincrement())
  actorType String                                // "admin" | "funcionario" | "morador"
  actorId   String?
  action    String                                // ex: "encomenda.create"
  targetId  String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([action, createdAt])
  @@index([actorType, actorId, createdAt])
}
```

---

## Enums

```prisma
enum StatusFacial   { PENDENTE, REGISTRADO }
enum TipoEncomenda  { CAIXA, ENVELOPE, SACOLA }
enum StatusEncomenda { PENDENTE, RETIRADA, CANCELADA }
enum WhatsappStatus { PENDENTE, ENVIADA, FALHOU }
enum Espaco         { QUADRA, CHURRASQUEIRA, SALAO_FESTAS }
```

---

## Relacionamentos

```
Apartamento 1──* Morador
Apartamento 1──* Encomenda
Apartamento 1──* Reserva

Morador 1──* Encomenda (destinatário)
Morador 1──* Encomenda (baixa — quem retirou)
Morador 1──* Reserva

Funcionario 1──* Encomenda (recebidaPor)
```

---

## Comandos Prisma

```bash
# Gerar client após editar schema
npx prisma generate

# Criar migration
npx prisma migrate dev --name nome-da-migration

# Aplicar migrations em produção
npx prisma migrate deploy

# Seed
npm run seed -w apps/api
```
