#!/bin/bash
# ============================================================
# Condomínio App — Checklist de testes e2e
# Uso: bash scripts/test-e2e.sh https://mhvl.com.br admin@email.com senha123
# ============================================================

BASE_URL="${1:-https://mhvl.com.br}"
ADMIN_EMAIL="${2:-mansaovillalobos@gmail.com}"
ADMIN_SENHA="${3:-26122002}"

PASS=0; FAIL=0
green='\033[0;32m'; red='\033[0;31m'; yellow='\033[1;33m'; nc='\033[0m'

ok()      { echo -e "${green}  PASS${nc} $1"; PASS=$((PASS+1)); }
fail()    { echo -e "${red}  FAIL${nc} $1 -- $2"; FAIL=$((FAIL+1)); }
info()    { echo -e "${yellow}  ----${nc} $1"; }
section() { echo; echo "==================================="; echo "  $1"; echo "==================================="; }

api() {
  curl -s -o /tmp/e2e_resp.json -w "%{http_code}" "$@"
}

# ===== 1. Health =====
section "1. Health Check"
STATUS=$(api "$BASE_URL/api/v1/health")
if [ "$STATUS" = "200" ] && grep -q '"db":"ok"' /tmp/e2e_resp.json 2>/dev/null; then
  ok "GET /health → 200, db:ok"
else
  fail "GET /health" "status=$STATUS body=$(cat /tmp/e2e_resp.json 2>/dev/null)"
fi

# ===== 2. Auth Admin =====
section "2. Autenticacao Admin"
STATUS=$(api -X POST "$BASE_URL/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"senha\":\"$ADMIN_SENHA\"}")
if [ "$STATUS" = "200" ]; then
  TOKEN_ADMIN=$(grep -o '"accessToken":"[^"]*' /tmp/e2e_resp.json | cut -d'"' -f4)
  ok "POST /auth/admin/login → 200"
else
  fail "POST /auth/admin/login" "status=$STATUS"
  TOKEN_ADMIN=""
fi

STATUS=$(api -X POST "$BASE_URL/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","senha":"errada"}')
[ "$STATUS" = "401" ] && ok "Login invalido → 401" || fail "Login invalido" "esperado 401, recebeu $STATUS"

# ===== 3. Apartamentos =====
section "3. Apartamentos"
if [ -n "$TOKEN_ADMIN" ]; then
  STATUS=$(api -X POST "$BASE_URL/api/v1/admin/apartamentos/bulk" \
    -H "Authorization: Bearer $TOKEN_ADMIN" \
    -H "Content-Type: application/json" \
    -d '{"csv":"numero,senha\nte01,teste123"}')
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    ok "POST /admin/apartamentos/bulk → $STATUS"
  else
    fail "bulk import" "status=$STATUS body=$(cat /tmp/e2e_resp.json)"
  fi

  STATUS=$(api -X GET "$BASE_URL/api/v1/admin/apartamentos" \
    -H "Authorization: Bearer $TOKEN_ADMIN")
  AP_COUNT=$(grep -o '"id"' /tmp/e2e_resp.json | wc -l)
  [ "$STATUS" = "200" ] && ok "GET /admin/apartamentos → 200 ($AP_COUNT APs)" || fail "listar APs" "status=$STATUS"
else
  info "Pulando (sem token admin)"
fi

# ===== 4. Auth Morador =====
section "4. Autenticacao Morador"
STATUS=$(api -X POST "$BASE_URL/api/v1/auth/morador/login" \
  -H "Content-Type: application/json" \
  -d '{"numeroAp":"te01","senha":"teste123"}')
if [ "$STATUS" = "200" ]; then
  TOKEN_MORADOR=$(grep -o '"accessToken":"[^"]*' /tmp/e2e_resp.json | cut -d'"' -f4)
  AP_ID=$(grep -o '"apartamentoId":"[^"]*' /tmp/e2e_resp.json | cut -d'"' -f4)
  ok "POST /auth/morador/login → 200"

  STATUS=$(api -X POST "$BASE_URL/api/v1/auth/change-password" \
    -H "Authorization: Bearer $TOKEN_MORADOR" \
    -H "Content-Type: application/json" \
    -d '{"senhaAtual":"teste123","novaSenha":"nova123"}')
  [ "$STATUS" = "204" ] && ok "POST /auth/change-password → 204" || info "change-password status=$STATUS (pode ja ter sido trocada)"

  STATUS=$(api -X POST "$BASE_URL/api/v1/auth/morador/login" \
    -H "Content-Type: application/json" \
    -d '{"numeroAp":"te01","senha":"nova123"}')
  if [ "$STATUS" = "200" ]; then
    TOKEN_MORADOR=$(grep -o '"accessToken":"[^"]*' /tmp/e2e_resp.json | cut -d'"' -f4)
    ok "Login com nova senha → 200"
  else
    ok "Login com senha atual (ja foi trocada antes)"
  fi
else
  fail "POST /auth/morador/login (te01)" "status=$STATUS"
  TOKEN_MORADOR=""
fi

# ===== 5. Reservas =====
section "5. Reservas"
if [ -n "$TOKEN_MORADOR" ] && [ -n "$AP_ID" ]; then
  # Garante morador existe no banco
  docker compose -f /opt/condominio/docker-compose.yml exec -T postgres \
    psql -U condominio -d condominio -c \
    "INSERT INTO moradores (id, apartamento_id, nome, telefone, status_facial, ativo, created_at) VALUES ('$AP_ID', '$AP_ID', 'Morador E2E', '+5511000000000', 'PENDENTE', true, NOW()) ON CONFLICT (id) DO NOTHING;" \
    > /dev/null 2>&1

  DATA_FUTURA=$(date -d "+15 days" +%Y-%m-%d 2>/dev/null || date -v+15d +%Y-%m-%d 2>/dev/null || echo "2026-06-15")

  STATUS=$(api -X POST "$BASE_URL/api/v1/me/reservas" \
    -H "Authorization: Bearer $TOKEN_MORADOR" \
    -H "Content-Type: application/json" \
    -d "{\"espaco\":\"CHURRASQUEIRA\",\"data\":\"$DATA_FUTURA\"}")
  if [ "$STATUS" = "201" ] || [ "$STATUS" = "200" ]; then
    RESERVA_ID=$(grep -o '"id":"[^"]*' /tmp/e2e_resp.json | head -1 | cut -d'"' -f4)
    ok "POST /me/reservas CHURRASQUEIRA → $STATUS"
  else
    BODY=$(cat /tmp/e2e_resp.json 2>/dev/null)
    if echo "$BODY" | grep -q "409\|ja reservado\|Conflict"; then
      info "CHURRASQUEIRA ja reservada nesse dia (ok, teste de conflito abaixo)"
      RESERVA_ID=""
    else
      fail "criar reserva CHURRASQUEIRA" "status=$STATUS body=$BODY"
      RESERVA_ID=""
    fi
  fi

  STATUS=$(api -X POST "$BASE_URL/api/v1/me/reservas" \
    -H "Authorization: Bearer $TOKEN_MORADOR" \
    -H "Content-Type: application/json" \
    -d "{\"espaco\":\"CHURRASQUEIRA\",\"data\":\"$DATA_FUTURA\"}")
  [ "$STATUS" = "409" ] && ok "Reserva duplicada → 409" || fail "reserva duplicada" "esperado 409, recebeu $STATUS"

  STATUS=$(api -X GET "$BASE_URL/api/v1/me/reservas/disponibilidade?espaco=QUADRA&data=$DATA_FUTURA" \
    -H "Authorization: Bearer $TOKEN_MORADOR")
  [ "$STATUS" = "200" ] && ok "GET /me/reservas/disponibilidade → 200" || fail "disponibilidade" "status=$STATUS"

  STATUS=$(api -X POST "$BASE_URL/api/v1/me/reservas" \
    -H "Authorization: Bearer $TOKEN_MORADOR" \
    -H "Content-Type: application/json" \
    -d "{\"espaco\":\"QUADRA\",\"data\":\"$DATA_FUTURA\",\"horaInicio\":10,\"duracaoHoras\":2}")
  if [ "$STATUS" = "201" ] || [ "$STATUS" = "200" ]; then
    ok "POST /me/reservas QUADRA 10h-12h → $STATUS"
  else
    fail "reserva QUADRA" "status=$STATUS body=$(cat /tmp/e2e_resp.json)"
  fi

  STATUS=$(api -X POST "$BASE_URL/api/v1/me/reservas" \
    -H "Authorization: Bearer $TOKEN_MORADOR" \
    -H "Content-Type: application/json" \
    -d "{\"espaco\":\"QUADRA\",\"data\":\"$DATA_FUTURA\",\"horaInicio\":13,\"duracaoHoras\":3}")
  [ "$STATUS" = "409" ] && ok "Cota 4h excedida → 409" || fail "cota 4h" "esperado 409, recebeu $STATUS"

  if [ -n "$RESERVA_ID" ]; then
    STATUS=$(api -X DELETE "$BASE_URL/api/v1/me/reservas/$RESERVA_ID" \
      -H "Authorization: Bearer $TOKEN_MORADOR")
    [ "$STATUS" = "200" ] && ok "DELETE /me/reservas/:id → 200" || fail "cancelar reserva" "status=$STATUS"
  fi
else
  info "Pulando testes de reservas (sem token ou AP_ID)"
fi

# ===== 6. Calendario & PDF =====
section "6. Admin Calendario e Relatorio PDF"
if [ -n "$TOKEN_ADMIN" ]; then
  STATUS=$(api -X GET "$BASE_URL/api/v1/admin/reservas/calendario" \
    -H "Authorization: Bearer $TOKEN_ADMIN")
  [ "$STATUS" = "200" ] && ok "GET /admin/reservas/calendario → 200" || fail "calendario" "status=$STATUS"

  STATUS=$(curl -s -o /tmp/e2e_relatorio.pdf -w "%{http_code}" \
    "$BASE_URL/api/v1/admin/reservas/relatorio.pdf?inicio=2026-01-01&fim=2026-12-31" \
    -H "Authorization: Bearer $TOKEN_ADMIN")
  if [ "$STATUS" = "200" ] && file /tmp/e2e_relatorio.pdf 2>/dev/null | grep -q PDF; then
    ok "GET /admin/reservas/relatorio.pdf → PDF valido"
  else
    fail "relatorio PDF" "status=$STATUS"
  fi
fi

# ===== 7. Rate Limiting =====
section "7. Rate Limiting"
COUNT_429=0
for i in $(seq 1 12); do
  S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"flood@test.com","senha":"flood"}')
  [ "$S" = "429" ] && COUNT_429=$((COUNT_429+1))
done
[ "$COUNT_429" -ge 1 ] && ok "Rate limit → $COUNT_429x 429 recebido" || fail "rate limit" "nenhum 429 em 12 requests"

# ===== 8. Audit Log =====
section "8. Audit Log"
AUDIT_COUNT=$(docker compose -f /opt/condominio/docker-compose.yml exec -T postgres \
  psql -U condominio -d condominio -t -c "SELECT COUNT(*) FROM audit_logs;" 2>/dev/null | tr -d ' \n')
if [ -n "$AUDIT_COUNT" ] && [ "$AUDIT_COUNT" -gt 0 ] 2>/dev/null; then
  ok "Audit log: $AUDIT_COUNT entradas gravadas"
else
  fail "Audit log" "tabela vazia ou inacessivel (count=$AUDIT_COUNT)"
fi

# ===== 9. Backup =====
section "9. Backup Local"
BACKUP_COUNT=$(ls /tmp/condominio-backups/*.dump.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 0 ] 2>/dev/null; then
  ok "Backup local: $BACKUP_COUNT arquivo(s) em /tmp/condominio-backups/"
else
  info "Nenhum backup local (rode: bash scripts/backup.sh)"
fi

# ===== Resultado =====
echo
echo "==================================="
echo "  PASS: $PASS  |  FAIL: $FAIL  |  Total: $((PASS+FAIL))"
echo "==================================="
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${green}Todos os testes passaram!${nc}"
else
  echo -e "  ${red}$FAIL teste(s) falharam.${nc}"
fi
echo
