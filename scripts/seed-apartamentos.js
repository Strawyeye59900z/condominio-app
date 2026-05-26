/**
 * Seed / reset dos apartamentos do condomínio.
 *
 * Floors 1–14, 4 apartments each:
 *   Floor 1  → 101, 102, 103, 104
 *   Floor 10 → 1001, 1002, 1003, 1004
 *   ...
 *
 * O script também:
 *   - Apaga TODAS as encomendas (limpeza de dados de teste)
 *   - Apaga todos os moradores INATIVOS
 *
 * Cada apartamento é criado (ou resetado) com:
 *   - senha provisória "1234"
 *   - isProvisional = true  (obriga troca na primeira sessão)
 *
 * Uso (dentro do container):
 *   node /app/scripts/seed-apartamentos.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const FLOORS = 14;
const PER_FLOOR = 4;
const DEFAULT_PASSWORD = '1234';

async function main() {
  const prisma = new PrismaClient();

  // ── 1. Apagar todas as encomendas ──────────────────────────────────────────
  console.log('Apagando todas as encomendas...');
  const { count: encCount } = await prisma.encomenda.deleteMany({});
  console.log(`   ${encCount} encomenda(s) removida(s).`);

  // ── 2. Apagar moradores inativos ───────────────────────────────────────────
  console.log('Apagando moradores inativos...');
  const { count: morCount } = await prisma.morador.deleteMany({ where: { ativo: false } });
  console.log(`   ${morCount} morador(es) inativo(s) removido(s).`);

  // ── 3. Criar / resetar apartamentos ───────────────────────────────────────
  console.log('\nGerando hash da senha padrão...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const numeros = [];
  for (let floor = 1; floor <= FLOORS; floor++) {
    for (let unit = 1; unit <= PER_FLOOR; unit++) {
      numeros.push(`${floor}${String(unit).padStart(2, '0')}`);
    }
  }

  console.log(`Sincronizando ${numeros.length} apartamentos (${FLOORS} andares × ${PER_FLOOR} por andar)...`);

  let criados = 0;
  let atualizados = 0;

  for (const numero of numeros) {
    const existing = await prisma.apartamento.findUnique({ where: { numero } });

    if (existing) {
      await prisma.apartamento.update({
        where: { numero },
        data: { passwordHash, isProvisional: true },
      });
      atualizados++;
    } else {
      await prisma.apartamento.create({
        data: { numero, passwordHash, isProvisional: true },
      });
      criados++;
    }
  }

  console.log(`\n✅ Concluído!`);
  console.log(`   Encomendas removidas : ${encCount}`);
  console.log(`   Moradores inativos   : ${morCount}`);
  console.log(`   APs criados          : ${criados}`);
  console.log(`   APs resetados        : ${atualizados}`);
  console.log(`\nTodos os APs têm senha "1234" e isProvisional=true.`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
