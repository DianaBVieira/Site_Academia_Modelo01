# Site Academia — Modelo 01

Site modelo para academias e studios de treino, criado pela
[Utopia Desenvolvimentos](https://www.utopiadesenvolvimentos.com.br) como
demonstração de capacidade técnica e de design.

**A marca "Vértice — Studio de Performance" é fictícia.** Endereço, telefone,
preços, estatísticas e depoimentos são inventados e não correspondem a nenhuma
empresa real. A página é marcada como `noindex` justamente por isso.

## Como ver

Abra `index.html` servindo por HTTP — não pelo duplo clique, porque `file://`
impõe restrições de origem que não existem num site publicado:

```bash
python -m http.server 8130 --bind 127.0.0.1
# depois acesse http://localhost:8130
```

## O que tem aqui

Um único arquivo `index.html` com CSS e JavaScript embutidos, mais as imagens
em `assets/`. Site inteiro em cerca de 700 KB.

**Sem framework, sem build, sem dependências.** Nenhum Tailwind via CDN, nenhuma
biblioteca de ícones — os ícones são SVG escritos à mão dentro do HTML. A única
requisição externa são as fontes do Google (Bricolage Grotesque e Inter).

### Seções

Hero · manifesto · método em 4 etapas · galeria da estrutura · planos ·
depoimentos · FAQ · chamada final · rodapé.

### Destaques técnicos

- **Design system em três camadas** (primitivo → semântico → componente) em
  variáveis CSS, com os contrastes WCAG verificados e documentados no topo da
  folha de estilo.
- **Mesh Text**: o título do hero é uma malha de 96×40 vértices em WebGL2 que se
  deforma conforme o cursor. O `<h1>` real continua no DOM para leitores de tela.
- **Coverflow**: galeria 3D com perspectiva, navegável por clique, setas,
  teclado e arraste.
- **Tipografia fluida** com `clamp()`, de 320px a 1440px sem breakpoints de fonte.
- **Acessibilidade**: anel de foco visível em fundo claro e escuro, FAQ em
  `<details>` nativo (funciona sem JS), `prefers-reduced-motion` respeitado em
  todas as animações, e fallback para quem não tem WebGL2.

## Créditos das imagens

As fotos vêm do Wikimedia Commons e do Unsplash sob licenças que **exigem
atribuição**. A lista completa com autores e licenças está em
[CREDITOS.md](CREDITOS.md) e precisa acompanhar qualquer publicação.

> Duas das fotos são CC BY-SA 4.0, que tem cláusula *share-alike* sobre a
> imagem. Isso não afeta o código do site. Ao adaptar este modelo para um
> cliente real, troque todas as fotos pelas do próprio cliente.

## Usando como modelo

As cores, tipografia, espaçamentos e raios vivem todos como variáveis CSS no
início do `<style>`. Para adaptar a outra academia, o caminho mais curto é
trocar os valores da **camada 1 (primitivos)** — em especial `--c-molten`, que é
a cor de acento — e substituir as imagens em `assets/`.

Atenção ao acento: ele tem duas variantes propositais. `--c-molten` (`#FF4E1B`)
só é legível sobre fundo escuro; sobre fundo claro use `--c-molten-deep`
(`#B3300A`), que passa no critério AA. Trocar uma pela outra quebra o contraste.
