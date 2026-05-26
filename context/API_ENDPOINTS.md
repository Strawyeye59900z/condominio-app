# API Endpoints

Base: `/api/v1`
Rate limit global: 60 req/min | Auth routes: 10 req/min
CORS: restrito a `APP_URL` + `localhost:3000/3001`

---

## Autenticação (`/auth/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/admin/login` | Público | Login do admin (email + senha) |
| POST | `/auth/funcionario/login` | Público | Login do porteiro (loginId + senha) |
| GET | `/auth/funcionarios/list` | Público | Lista porteiros para tela de login |
| POST | `/auth/morador/login` | Público | Login do morador (nº AP + senha) |
| POST | `/auth/refresh` | Cookie JWT Refresh | Renova access token |
| POST | `/auth/logout` | Autenticado | Limpa cookie de refresh |
| POST | `/auth/change-password` | Autenticado | Troca senha (atual + nova) |
| GET | `/auth/admins` | Admin | Lista todos os admins |
| POST | `/auth/admins` | Admin | Cria novo admin |
| DELETE | `/auth/admins/:id` | Admin | Remove admin (não pode deletar a si mesmo) |
| GET | `/auth/funcionarios/:id/foto` | Público | Foto do porteiro para tela de login |

---

## Apartamentos (`/admin/apartamentos/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/admin/apartamentos` | Admin | Cria apartamento |
| POST | `/admin/apartamentos/bulk` | Admin | Cria em lote (CSV) |
| GET | `/admin/apartamentos` | Admin | Lista todos |
| PATCH | `/admin/apartamentos/:id` | Admin | Atualiza; `resetarSenha=true` gera nova senha |

---

## Moradores

### Visão Admin (`/admin/moradores/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/admin/moradores` | Admin | Lista todos (query: `apartamentoId`, `statusFacial`) |
| PATCH | `/admin/moradores/:id` | Admin | Atualiza morador (ativo, resetFoto) |
| POST | `/admin/moradores/:id/reset-senha` | Admin | Reseta senha do apartamento |

### Visão Morador (`/me/moradores/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/me/moradores` | Morador | Lista moradores do próprio AP |
| POST | `/me/moradores` | Morador | Cria novo morador no AP |
| PATCH | `/me/moradores/:id` | Morador | Atualiza dados |
| DELETE | `/me/moradores/:id` | Morador | Desativa morador |

---

## Encomendas

### Visão Porteiro (`/porteiro/encomendas/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/porteiro/encomendas` | Funcionario | Registra encomenda recebida |
| PATCH | `/porteiro/encomendas/:id` | Funcionario | Edita (janela de 10 min) |
| GET | `/porteiro/encomendas` | Funcionario | Lista (query: `status`) |
| GET | `/porteiro/apartamentos` | Funcionario | Lista APs para seleção |
| POST | `/porteiro/encomendas/:id/reenviar-whatsapp` | Funcionario | Reenvia notificação WhatsApp |

### Visão Admin (`/admin/encomendas/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/admin/encomendas` | Admin | Lista todas (query: `status`) |
| PATCH | `/admin/encomendas/:id` | Admin | Edita sem restrição de tempo |

### Visão Morador (`/me/encomendas/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/me/encomendas` | Morador | Minhas encomendas (query: `status`) |
| POST | `/me/encomendas/:id/baixa` | Morador | Confirma retirada |

---

## Reservas

### Visão Morador (`/me/reservas/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/me/reservas` | Morador | Cria reserva (espaco, data, horaInicio?, duracaoHoras?) |
| DELETE | `/me/reservas/:id` | Morador | Cancela reserva |
| GET | `/me/reservas` | Morador | Minhas reservas |
| GET | `/me/reservas/disponibilidade` | Morador | Slots disponíveis (query: `espaco`, `data`) |

### Visão Admin (`/admin/reservas/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/admin/reservas/calendario` | Admin | Calendário (query: `inicio`, `fim`) |
| GET | `/admin/reservas/relatorio.pdf` | Admin | Relatório PDF (query: `inicio`, `fim`) |
| DELETE | `/admin/reservas/:id` | Admin | Cancela reserva (sem restrição de prazo) |

---

## Funcionários (`/admin/funcionarios/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/admin/funcionarios` | Admin | Cria porteiro |
| GET | `/admin/funcionarios` | Admin | Lista porteiros |
| PATCH | `/admin/funcionarios/:id` | Admin | Atualiza (nome, ativo, resetarSenha) |

---

## Fotos

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/me/consent-lgpd` | Morador | Registra aceite LGPD |
| GET | `/me/foto/:moradorId` | Morador | Visualiza foto do morador |
| POST | `/me/foto/:moradorId` | Morador | Upload foto (multipart/form-data) |
| POST | `/porteiro/me/foto` | Funcionario | Upload foto do porteiro (multipart) |

---

## Reconhecimento Facial (`/admin/facial-queue/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/admin/facial-queue/next` | Admin | Próximo morador pendente |
| GET | `/admin/facial-queue/:id/foto` | Admin | Visualiza foto do morador |
| GET | `/admin/facial-queue/:id/foto-download` | Admin | Download com nome padronizado |
| POST | `/admin/facial-queue/:id/registrado` | Admin | Marca cadastro facial como concluído |

---

## WhatsApp (`/admin/whatsapp/*`)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/admin/whatsapp/status` | Admin | Status da conexão |
| GET | `/admin/whatsapp/qrcode` | Admin | QR code para emparelhamento |
| POST | `/admin/whatsapp/disconnect` | Admin | Desconecta |
| GET | `/admin/whatsapp/template` | Admin | Lê template de mensagem |
| PATCH | `/admin/whatsapp/template` | Admin | Atualiza template |
| POST | `/admin/whatsapp/test` | Admin | Envia mensagem de teste (body: `{ numero }`) |

---

## Utilitários

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/me` | Autenticado | Perfil do usuário logado (role-specific) |
| GET | `/health` | Público | Status: DB, storage, WhatsApp |
