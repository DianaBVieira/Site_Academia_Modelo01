# Vértice Studio de Performance — projeto demonstrativo

Site fictício criado pela **Utopia Desenvolvimentos** para demonstrar capacidade técnica
e de design. A marca "Vértice", o endereço, o telefone, os preços e os depoimentos são
**fictícios** e não correspondem a nenhuma empresa real.

## Identidade visual

| Item | Valor |
|---|---|
| Nome | Vértice — Studio de Performance |
| Marca | `assets/logo-vertice.svg` (ápice de dois planos dobrados) |
| Favicon | `assets/favicon.svg` |
| Tipografia display | Bricolage Grotesque (Google Fonts, OFL) |
| Tipografia texto | Inter (Google Fonts, OFL) |

### Paleta

| Token | Hex | Uso |
|---|---|---|
| Obsidiana | `#0A0A0C` | fundo principal |
| Carbono | `#131317` | superfícies elevadas |
| Osso | `#EFEAE3` | texto sobre escuro / fundo claro |
| Cinza-areia | `#9A968F` | texto secundário sobre escuro |
| Pedra | `#5A5650` | texto secundário sobre claro |
| **Molten** | `#FF4E1B` | acento sobre fundo escuro, botões |
| Molten claro | `#FF6B3D` | segundo plano da marca |
| Molten profundo | `#B3300A` | acento em **texto sobre fundo claro** |

O acento tem duas variantes porque `#FF4E1B` sobre fundo claro atinge apenas 2,8:1 de
contraste. Para texto em seções claras usa-se `#B3300A` (5,3:1, aprovado no WCAG AA).

## Créditos das fotografias

Todas as imagens são de bancos livres e permitem uso comercial **com atribuição**.
Mantenha esta lista ao publicar o site.

| Arquivo | Fonte | Autor | Licença |
|---|---|---|---|
| `hero-sala.webp` | Unsplash | Danielle Cerullo | [Unsplash License](https://unsplash.com/license) |
| `sala-principal.webp` | Wikimedia Commons | 阿道 | CC BY-SA 4.0 |
| `sala-mobilidade.webp` | Wikimedia Commons | 阿道 | CC BY-SA 4.0 |
| `atleta-forca.webp` | Wikimedia Commons | Shixart1985 | CC BY 2.0 |
| `treino-halteres.webp` | Wikimedia Commons | Nenad Stojkovic | CC BY 2.0 |
| `agachamento.webp` | Wikimedia Commons | Nenad Stojkovic | CC BY 2.0 |
| `detalhe-pegada.webp` | Wikimedia Commons | Shixart1985 | CC BY 2.0 |

As imagens foram redimensionadas e convertidas para WebP (3,3 MB → 615 KB no total).
Redimensionar e converter formato é permitido pelas licenças CC BY e CC BY-SA.

`assets/utopia.webp` fica de fora dessa lista: é o ícone da própria **Utopia
Desenvolvimentos**, usado na assinatura do rodapé. Ativo de marca da autora do
site, sem exigência de atribuição de terceiros.

> **Atenção:** as duas fotos com CC BY-SA 4.0 (`sala-principal`, `sala-mobilidade`) exigem
> que qualquer versão modificada *da própria imagem* seja redistribuída sob a mesma licença.
> Isso não afeta o código do site. Se preferir evitar a cláusula, troque essas duas por
> fotos próprias.

## Componentes animados

Os dois componentes vieram do OriginKit em React/Framer e foram **portados para
JavaScript puro**, porque este site não usa React. O comportamento e as constantes
de física/perspectiva são os mesmos do original.

### Mesh Text — título do hero

Malha de 96×40 vértices em WebGL2. O texto é desenhado num canvas 2D, virá
textura, e os vértices são arrastados pelo cursor com física de mola
(`DRAG 1.8`, `SPRING_K 0.08`, `DAMPING 0.9`). A aberração cromática usa as cores
da marca (`#FF4E1B` e `#FF9E7A`) em vez do rosa/verde do original.

Adaptações feitas:

- **Multi-linha e duas cores.** O componente original desenha uma linha única
  centralizada. Aqui os trechos de texto e suas cores são lidos do próprio
  `<h1>` no DOM, e a quebra de linha é gulosa — igual à do navegador — para
  casar com a caixa real do elemento.
- **O `<h1>` continua no DOM** (`opacity: 0`), então leitores de tela e o Google
  leem o título normalmente. O canvas é `pointer-events: none` e é posicionado
  por JS exatamente sobre a caixa do `<h1>`.
- **Loop sob demanda.** O original roda `requestAnimationFrame` para sempre.
  Aqui o loop adormece quando o cursor sai e a malha volta ao repouso, e acorda
  no próximo movimento. Também pausa quando o hero sai da tela.
- **Desativado** com `prefers-reduced-motion`, sem WebGL2, e quando não há
  nenhum ponteiro preciso (`any-hover: hover` + `any-pointer: fine`). Nesses
  casos o `<h1>` aparece normalmente.
  A checagem usa `any-*` e não `hover`/`pointer`: num notebook com tela
  sensível ao toque o ponteiro *primário* é reportado como grosseiro, o que
  desligava o efeito mesmo havendo mouse.
- A espera por `document.fonts.ready` tem teto de 3s — se a rede engasgar o
  efeito liga do mesmo jeito, em vez de nunca iniciar.
- O favicon é um `data:` URI embutido: sob `file://` o Chrome trata cada
  arquivo como origem isolada e recusa carregar SVG externo como ícone.
  Ainda assim, **prefira servir por HTTP** ao testar — `file://` impõe
  restrições que não existem num site publicado.

### Coverflow — seção Estrutura

Galeria 3D com `perspective: 1600px` e `transform-style: preserve-3d`.
Constantes idênticas à referência: `tilt 12`, `sideTilt 8`, `DEPTH 240`,
`SCALE_STEP 0.16`, `MAX_VISIBLE 2`, transição `0.6s cubic-bezier(.22,1,.36,1)`.

- `showTitle: false` respeitado — os cards não têm legenda sobreposta. O título
  e a descrição do ambiente ativo aparecem **abaixo** do carrossel, num bloco
  com `aria-live="polite"`, para não perder o conteúdo.
- `autoplay: false`, como no preset. Para ligar, chame `step(1)` num
  `setInterval` no bloco do carrossel.
- Acrescentei ao original: **arraste/deslize** no toque, **setas** e
  **pontos de navegação** — o componente de referência só respondia a clique
  e teclado.
- O espaçamento lateral é proporcional à largura do card (`60%`) em vez de
  240px fixos, para funcionar de 320px a 1440px.

> Esta seção antes usava um bento grid que tinha um bug: `grid-auto-rows: 13rem`
> com `.cell { min-height: 15rem }` fazia cada card estourar 32px da sua faixa e
> invadir a linha de baixo, em todas as larguras de desktop. O carrossel
> substituiu esse layout.

## Decisões técnicas

- **Sem Tailwind CDN.** CSS próprio com sistema de tokens em três camadas
  (primitivo → semântico → componente). O site da Academia Brothers usava
  `cdn.tailwindcss.com`, que compila no navegador do visitante e não é recomendado
  em produção.
- **Sem dependências externas de JS.** Os ícones são SVG inline; não há Lucide via CDN.
  A única requisição externa são as fontes do Google.
- **Acessibilidade:** contrastes verificados e documentados no topo do CSS, anel de foco
  de duas camadas visível em fundo claro e escuro, `prefers-reduced-motion` respeitado,
  FAQ em `<details>` nativo (funciona sem JS), navegação por teclado com `Esc` fechando
  o menu móvel.
- **Performance:** imagens em WebP com `width`/`height` declarados (evita layout shift),
  `loading="lazy"` fora da dobra, `fetchpriority="high"` no hero, parallax com
  `requestAnimationFrame`.
