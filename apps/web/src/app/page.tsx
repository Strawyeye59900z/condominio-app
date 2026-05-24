export default function HomePage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Condomínio</h1>
      <p className="mt-2 text-neutral-600">
        Sistema em configuração inicial. Telas de login serão adicionadas na Fase 2.
      </p>
      <p className="mt-4 text-sm text-neutral-500">
        Verifique <code>/api/v1/health</code> para o status do back-end.
      </p>
    </main>
  );
}
