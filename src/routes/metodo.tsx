import { createFileRoute, Link } from "@tanstack/react-router";

import { useGame } from "../components/lottery/game-context";
import { PageHeader } from "../components/lottery/shell";
import { choose } from "../lib/lottery";

export const Route = createFileRoute("/metodo")({
  head: () => ({ meta: [{ title: "Método — Projeto Million" }] }),
  component: Metodo,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-premium p-6">
      <h2 className="font-display text-2xl leading-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function Metodo() {
  const { game } = useGame();
  const total = choose(game.pool, game.picks);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentação"
        title="Método"
        subtitle="O que cada análise mede, o que ela não mede, e por que os números de validação aparecem ao lado de cada resultado."
      />

      <Section title="A premissa">
        <p>
          Sorteios da Caixa são eventos independentes. O resultado de um concurso não carrega
          informação sobre o próximo, e a probabilidade de qualquer combinação de {game.picks}{" "}
          dezenas é sempre 1 em {Math.round(total).toLocaleString("pt-BR")}, tenha ela saído ontem
          ou nunca.
        </p>
        <p>
          Disso não se conclui que a análise seja inútil: ela descreve o passado com precisão e
          permite verificar se o sorteio se comporta como deveria. O que ela não faz é prever. Esta
          plataforma foi construída para manter essa distinção visível em cada tela, em vez de
          apagá-la.
        </p>
      </Section>

      <Section title="Por que correção de múltiplas comparações">
        <p>
          Um teste a 5% aceita, por definição, 5% de falsos positivos. Testando as {game.pool}{" "}
          dezenas de uma vez, cerca de {(game.pool * 0.05).toFixed(1)} apareceriam como
          "significativas" mesmo num sorteio perfeito. Nos{" "}
          {choose(game.pool, 2).toLocaleString("pt-BR")} pares, seriam cerca de{" "}
          {Math.round(choose(game.pool, 2) * 0.05).toLocaleString("pt-BR")}.
        </p>
        <p>
          O procedimento de Benjamini-Hochberg controla a proporção de falsas descobertas entre os
          achados. É por isso que a coluna <strong>q</strong> aparece ao lado do <strong>p</strong>{" "}
          em todas as tabelas: o p é o teste isolado, o q é o que resta depois de considerar quantos
          testes foram feitos.
        </p>
      </Section>

      <Section title="Distribuições exatas, não simuladas">
        <p>
          Os padrões — consecutivos, paridade, repetições, soma — são comparados com a distribuição
          exata calculada por combinatória, não com uma intuição nem com uma simulação aproximada.
        </p>
        <p>
          Exemplo concreto: na Mega-Sena, a ausência de dezenas consecutivas ocorre em 57,9% dos
          sorteios possíveis. Quem observa "quase nunca saem dois números seguidos" está descrevendo
          corretamente o resultado, e interpretando-o errado: consecutivos são raros porque há
          poucas combinações com eles, não porque o sorteio os evite.
        </p>
      </Section>

      <Section title="Quando corrigir por múltiplos testes não basta">
        <p>
          Benjamini-Hochberg corrige pelo <em>número</em> de testes. Não corrige pelo fato de a
          estatística de cada teste poder ser dirigida por uma única célula extrema entre dezenas
          delas.
        </p>
        <p>
          Caso concreto desta plataforma: na Mega-Sena, a 2ª menor dezena rejeita a uniformidade com
          p = 0,0041, e o achado sobrevive ao BH. Mas 21% do qui-quadrado vem de uma célula só — a
          dezena 27 nessa posição, 96 sorteios contra 65 esperados. Simulando o procedimento inteiro
          sob sorteio uniforme perfeito, incluindo a escolha do máximo, o acaso produz uma célula
          assim em cerca de 5% dos históricos. O achado evapora.
        </p>
        <p>
          A página de{" "}
          <Link to="/estrutura" className="underline underline-offset-2">
            estrutura
          </Link>{" "}
          publica esse p corrigido ao lado do nominal, com o erro de Monte Carlo à vista.
        </p>
      </Section>

      <Section title="Condicionar pelas marginais">
        <p>
          Se uma dezena sai acima da média, todos os pares que a contêm herdam esse desvio e parecem
          anômalos — sem que exista qualquer relação entre as dezenas. A página de{" "}
          <Link to="/pares" className="underline underline-offset-2">
            pares
          </Link>{" "}
          mostra duas colunas: o desvio bruto e o desvio calculado sobre as frequências individuais
          realmente observadas.
        </p>
        <p>Só o segundo seria evidência de dependência entre dezenas. Na prática, ele zera.</p>
      </Section>

      <Section title="Estrutura do sorteio, não só as dezenas">
        <p>
          Contar quantas vezes cada dezena saiu é a análise rasa. A página de{" "}
          <Link to="/estrutura" className="underline underline-offset-2">
            estrutura
          </Link>{" "}
          troca a unidade de análise: em vez da dezena isolada, o conjunto sorteado.
        </p>
        <p>
          Onde cai a menor dezena de cada sorteio? E a terceira menor? Que distância as dezenas
          guardam entre si? Quanto do volante elas cobrem? Cada uma dessas perguntas tem
          distribuição exata conhecida — hipergeométrica negativa para as posições, C(N−d, k−1)/C(N,
          k) para os espaçamentos — e todas foram conferidas por enumeração exaustiva em casos
          pequenos antes de serem aplicadas ao histórico real.
        </p>
      </Section>

      <Section title="A série tem memória?">
        <p>
          A pergunta mais funda que se pode fazer a um sorteio não é "esta dezena sai demais", e sim
          "o passado informa o futuro". A página de{" "}
          <Link to="/aleatoriedade" className="underline underline-offset-2">
            aleatoriedade
          </Link>{" "}
          aplica a bateria clássica de validação de geradores aleatórios:
        </p>
        <p>
          <strong>Sobreposição por lag</strong> — quantas dezenas um concurso divide com o de N
          concursos atrás, contra a hipergeométrica exata, para cada lag.{" "}
          <strong>Intervalo entre aparições</strong> — contra a distribuição geométrica, mais a
          correlação direta entre o atraso de uma dezena e ela sair no concurso seguinte, que é o
          teste que decide a crença nas "atrasadas". <strong>Sequências</strong> — teste de
          Wald-Wolfowitz para agrupamento e alternância. <strong>Periodicidade</strong> — teste g de
          Fisher, com p-valor exato, para ciclos ocultos.
        </p>
      </Section>

      <Section title="Poder: o que dá para detectar">
        <p>
          Um resultado nulo sem análise de poder não vale nada, porque é indistinguível de um teste
          cego. A página de{" "}
          <Link to="/poder" className="underline underline-offset-2">
            poder
          </Link>{" "}
          calcula o menor viés detectável dado o histórico disponível, com o alfa já corrigido pelo
          número de dezenas testadas.
        </p>
        <p>
          É o que transforma "não encontramos viés" em uma afirmação com conteúdo: "não há viés
          maior que X%". A diferença entre as duas frases é a diferença entre uma plataforma de
          análise e uma de opinião.
        </p>
      </Section>

      <Section title="O backtest é o juiz">
        <p>
          Descrição do passado e capacidade de previsão são coisas diferentes. O{" "}
          <Link to="/backtest" className="underline underline-offset-2">
            backtest
          </Link>{" "}
          monta jogos usando exclusivamente os concursos anteriores e os confere contra o concurso
          seguinte, milhares de vezes.
        </p>
        <p>
          Cada estratégia recebe um intervalo de confiança para a diferença de acertos contra a
          aposta aleatória. Intervalo contendo zero significa: sem efeito detectável. É a forma
          honesta de responder à pergunta que motiva toda análise de loteria.
        </p>
      </Section>

      <Section title="Fonte e limites dos dados">
        <p>
          Resultados oficiais da Caixa, obtidos via API pública e armazenados em formato compacto no
          próprio site. Atualização por{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">bun scripts/fetch-draws.mjs</code>.
        </p>
        <p>
          Prêmios e número de ganhadores referem-se à faixa principal. Valores históricos não são
          corrigidos pela inflação, então comparações de prêmio entre décadas diferentes não são
          diretas.
        </p>
      </Section>

      <Section title="O que esta plataforma não faz">
        <p>
          Não indica dezenas com maior chance, não promete aumento de probabilidade e não trata
          frequência passada como sinal. Qualquer serviço que faça isso está vendendo a descrição do
          passado como se fosse previsão — a diferença entre as duas coisas está medida na página de
          backtest.
        </p>
      </Section>
    </div>
  );
}
