// Baixa o histórico completo da API e grava uma versão compacta em public/data.
// Uso: bun scripts/fetch-draws.mjs [megasena|lotofacil ...]
const API = "https://loteriascaixa-api.herokuapp.com/api";
const games = process.argv.slice(2).length ? process.argv.slice(2) : ["megasena", "lotofacil"];

for (const game of games) {
  process.stdout.write(`${game}: baixando... `);
  const res = await fetch(`${API}/${game}`);
  if (!res.ok) throw new Error(`${game}: HTTP ${res.status}`);
  const raw = await res.json();

  const draws = raw
    .map((d) => ({
      c: d.concurso,
      d: d.data,
      n: d.dezenas.map(Number).sort((a, b) => a - b),
      a: d.acumulou,
      w: Number(d.premiacoes?.[0]?.ganhadores ?? 0),
      p: Number(d.premiacoes?.[0]?.valorPremio ?? 0),
    }))
    .filter((d) => d.n.length > 0)
    .sort((a, b) => a.c - b.c);

  const out = { game, updatedAt: new Date().toISOString(), count: draws.length, draws };
  const path = `public/data/${game}.json`;
  await Bun.write(path, JSON.stringify(out));
  console.log(
    `${draws.length} concursos (${(Bun.file(path).size / 1024).toFixed(0)} KB) → ${path}`,
  );
}
