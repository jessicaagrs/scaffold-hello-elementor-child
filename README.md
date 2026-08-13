# COMO TESTAR O TEMA

### No painel do WordPress:

`Aparência → Temas → o card "Hello Elementor Child"` clique em Ativar.
Confirme que o Elementor continua editando normalmente uma página existente.

No arquivo (o único que muda por site): 

```
inc/config.php
```

Hoje está com `'front_page' => true` e `'lenis' => true`. Como as animações são opt-in, se você for testar numa página que não é a home, adicione o slug:

```
'pages' => array( 'sobre', 'servicos')
```

Como testar na prática

No Elementor, selecione uma seção → Avançado → Atributos personalizados (Pro) e cole:

```
class|js-reveal
data-reveal-y|80
data-reveal-stagger|0.12
```

Salve e abra a página no frontend (não no preview do editor — o tema desliga as animações lá de propósito, para o GSAP não duplicar ScrollTriggers). Role até a seção: ela deve subir e aparecer em cascata.

Checklist de verificação no DevTools:

- tem a classe `hc-has-animations` → o config reconheceu a página 
- Aba Network: `hc-base.css, gsap.min.js, ScrollTrigger.min.js, hc-main.js` carregados 
- Console: `SiteAnim.triggers().length` retorna o número de elementos animados ganha a classe lenis 
- lenis-smooth → Lenis ativo

Para ver os logs \[SiteAnim\] durante o teste, ligue o debug em 

```
wp-config.php:88:
```

```
define( 'WP_DEBUG', true );
```

Isso ativa `**window.hcSettings.debug**`, e cada módulo passa a logar quantos elementos encontrou — a forma mais rápida de descobrir que um seletor não pegou nada.

Vou ler os arquivos que ainda não vi para documentar com precisão.

WordPress 7.0.4 — o `strategy => defer` usado no enqueue é suportado (requer 6.3+). Segue a documentação dos dois pontos.

# O QUE CADA ARQUIVO FAZ

## Visão geral

O tema separa **três responsabilidades** que normalmente ficam misturadas:

| Camada                  | Onde vive                  | Quem edita             |
| ----------------------- | -------------------------- | ---------------------- |
| **Visual**              | Elementor (banco de dados) | você, no editor        |
| **Comportamento**       | `assets/js/`               | você, no código        |
| **Decisão de carregar** | `inc/config.php`           | você, uma vez por site |

A ideia central: **o Elementor cuida da aparência, o tema cuida do movimento.** Nenhum arquivo PHP renderiza HTML — não existe `header.php`, `footer.php` ou `page.php`, porque o tema pai (Hello Elementor) já resolve isso.

```
hello-elementor-child/
├── style.css              ← identidade do tema + overrides de última hora
├── functions.php          ← bootstrap (3 constantes + 1 require)
├── screenshot.png         ← miniatura no painel (ainda não existe)
├── inc/
│   ├── config.php         ← ⭐ O ÚNICO ARQUIVO QUE MUDA POR SITE
│   └── enqueue.php        ← toda a lógica de carregamento
└── assets/
    ├── css/
    │   ├── base.css
    │   ├── components.css
    │   ├── animations.css
    │   └── vendor/lenis.css
    └── js/
        ├── core.js
        ├── main.js
        ├── smooth-scroll.js
        ├── animations/
        │   ├── reveal.js
        │   ├── parallax.js
        │   └── horizontal-scroll.js
        └── vendor/
            ├── gsap.min.js
            ├── ScrollTrigger.min.js
            └── lenis.min.js
```

---

## Raiz

### `style.css`

Existe por **obrigação do WordPress**: é o cabeçalho de comentário no topo que registra o tema no painel. A linha decisiva é:

```css
template: hello-elementor;
```

É ela — e só ela — que transforma esta pasta num tema _filho_. Se o nome não bater exatamente com a pasta do tema pai, o WordPress recusa a ativação.

O CSS real do site **não mora aqui**. Este arquivo é enfileirado por último de propósito (`inc/enqueue.php:251`), então serve como espaço de override rápido durante o desenvolvimento — o que você escreve aqui vence os outros três CSS por ordem de cascata.

### `functions.php`

Deliberadamente sem lógica. Faz três coisas:

```php
define( 'HC_DIR', get_stylesheet_directory() );      // caminho no disco
define( 'HC_URI', get_stylesheet_directory_uri() );  // URL pública
define( 'HC_VER', '1.0.0' );                         // versão fallback
require_once HC_DIR . '/inc/enqueue.php';
```

O uso de `get_stylesheet_directory()` (e não `get_template_directory()`) é o que faz as constantes apontarem para o **filho**. Trocar por `template` faria tudo apontar para o Hello Elementor e nada carregaria.

### `screenshot.png`

Miniatura em **Aparência → Temas**, 1200×900. Puramente cosmético — o tema funciona sem.

---

## `inc/` — o cérebro

### `inc/config.php` ⭐

**O único arquivo que você edita ao reusar o tema em outro site.** Retorna um array PHP:

| Chave           | Tipo    | O que faz                                          |
| --------------- | ------- | -------------------------------------------------- |
| `front_page`    | `bool`  | A home carrega animações?                          |
| `pages`         | `array` | Slugs **ou** IDs de páginas que carregam animações |
| `post_types`    | `array` | Post types cujos singles carregam animações        |
| `lenis`         | `bool`  | Liga o smooth scroll                               |
| `lenis_options` | `array` | Repassado direto ao construtor do Lenis            |

A filosofia aqui é **opt-in**: por padrão _nenhuma_ página carrega os ~130 KB de GSAP. Você lista só onde usa. Numa landing page de uma página só, `front_page => true` já basta — e as outras páginas (política de privacidade, obrigado) ficam limpas.

### `inc/enqueue.php`

Onde mora toda a inteligência. São ~360 linhas divididas em quatro blocos:

**1\. Helpers**

| Função                               | Papel                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `hc_config()`                        | Lê o config uma única vez (cache em `static`) e preenche defaults                                                   |
| `hc_asset_path()` / `hc_asset_url()` | Converte caminho relativo em absoluto / URL                                                                         |
| `hc_asset_exists()`                  | Checa o disco antes de enfileirar — **é isso que evita 404**                                                        |
| `hc_asset_ver()`                     | Usa `filemtime()` como versão → cache-busting automático. Você salva o CSS, dá F5, e vê a mudança. Sem limpar cache |
| `hc_is_elementor_editor()`           | Detecta editor/preview do Elementor                                                                                 |
| `hc_should_load_animations()`        | Traduz o config em `true`/`false` para _esta_ requisição                                                            |
| `hc_lenis_enabled()`                 | Config ligado **E** lib presente no disco                                                                           |
| `hc_enqueue_script()`                | Enfileira com `defer` + versão automática                                                                           |

**2\. Styles** (`hc_enqueue_styles`, prioridade 20)

Carrega em cascata controlada: `base → components → animations → [lenis] → style.css`. Cada um declara o anterior como dependência, o que **garante a ordem** independentemente do que outros plugins façam.

Detalhe importante: **o CSS carrega em todas as páginas**, sempre. Só o JS é opt-in. São poucos KB e as animações CSS puras (`.anim-float`, `.anim-underline`, `.anim-shine`) são globais por natureza.

A prioridade `20` faz o CSS entrar depois do tema pai sem precisar declarar o handle dele como dependência — se o Elementor renomear o handle numa atualização, nada quebra.

**3\. Scripts** (`hc_enqueue_scripts`, prioridade 20)

Sai cedo em dois casos: dentro do editor do Elementor, ou fora das páginas do config. Depois verifica se GSAP e ScrollTrigger existem no disco — se faltar, **aborta em silêncio** (com log se `WP_DEBUG` estiver ligado) em vez de imprimir 404 e quebrar o site.

A ordem final é rígida:

```
gsap → ScrollTrigger → [lenis] → hc-settings → hc-core → [módulos] → hc-main
```

`hc-settings` é um handle _virtual_ (`wp_register_script( 'hc-settings', false, ... )`) — não existe arquivo. Ele só serve de âncora para imprimir `window.hcSettings` como JSON, o que faz `true`/`false` do PHP chegarem como booleanos reais no JS, sem `'1'`/`''` do `wp_localize_script`.

O `defer` em todos os scripts preserva a ordem de execução — é isso que permite os módulos se registrarem antes de o `main.js` inicializar.

**4\. Body class**

Adiciona `hc-has-animations` ao `<body>` quando a camada está ativa. Serve para escrever CSS que só vale onde há animação — e o `components.css` já usa isso para desligar o scroll nativo do carrossel horizontal quando o GSAP assume.

---

## `assets/css/`

### `base.css`

Ajustes globais que não pertencem a componente nenhum: `overflow-x: clip` no body (usa `clip` e não `hidden` porque `hidden` quebraria `position: sticky` nos filhos), `:focus-visible` sempre visível, `.sr-only`, e imagens responsivas.

Também neutraliza `scroll-behavior: smooth` quando o Lenis está ativo — dois motores de scroll competindo é uma das causas clássicas de scroll travado.

### `components.css`

**A estrutura que as animações GSAP exigem para funcionar.** Regra do projeto: estrutura no CSS, movimento no JS.

- `.parallax-wrap` + `.js-parallax` — o pai recorta, o filho tem 120% de área para se deslocar
- `.js-hscroll` / `__track` / `__item` — o flex row de largura `max-content`, que é o que define a distância do scroll horizontal
- `.card` — exemplo de hover

O truque mais elegante daqui: `.js-hscroll__track` tem `overflow-x: auto` + `scroll-snap` por padrão. Se o JS não rodar (rede falhou, `prefers-reduced-motion`, tela pequena), a seção vira um **carrossel nativo funcional** em vez de conteúdo quebrado.

### `animations.css`

Três animações **CSS puras** — efeitos cíclicos ou de hover, que não dependem de scroll e não valem o custo de JS:

| Classe            | Efeito                                  | Customização                            |
| ----------------- | --------------------------------------- | --------------------------------------- |
| `.anim-float`     | Flutuação vertical infinita             | `--float-distance`, `--float-duration`  |
| `.anim-underline` | Sublinhado crescendo do centro no hover | `--underline-color`, `--underline-size` |
| `.anim-shine`     | Brilho diagonal atravessando no hover   | `--shine-color`, `--shine-duration`     |

Fecha com um bloco `@media (prefers-reduced-motion: reduce)` que desliga o movimento **sem esconder nada** e limpa os `will-change` (que ocupam memória de GPU à toa).

### `assets/css/vendor/lenis.css`

CSS obrigatório do Lenis (~800 bytes): ajusta `html/body` e define os estados `.lenis-smooth` / `.lenis-stopped`. Carregado **apenas** nas páginas onde o Lenis roda.

---

## `assets/js/`

### `core.js` — o núcleo `SiteAnim`

O arquivo mais importante. Expõe `window.SiteAnim`, que é ao mesmo tempo:

**Um registry.** Módulos chamam `SiteAnim.register(nome, fn)` e ficam na fila. Ninguém inicializa sozinho.

**Um porteiro.** O `init()` recusa rodar em três casos: editor do Elementor, GSAP ausente, ou `prefers-reduced-motion` ativo.

**Um contexto descartável.** Tudo é criado dentro de um `gsap.context()`, o que permite destruir o conjunto inteiro sem vazar ScrollTriggers órfãos.

API pública:

| Método                                      | Uso                                                         |
| ------------------------------------------- | ----------------------------------------------------------- |
| `SiteAnim.init()`                           | Cria tudo (idempotente)                                     |
| `SiteAnim.destroy()`                        | Desfaz tudo                                                 |
| `SiteAnim.refresh()`                        | Recalcula posições — **barato**, use após mudança de layout |
| `SiteAnim.rebuild()`                        | Destrói e recria — **caro**, só se o DOM mudou de verdade   |
| `SiteAnim.triggers()`                       | Lista os ScrollTriggers ativos (debug)                      |
| `SiteAnim.num/str/bool(el, attr, fallback)` | Leitura segura de `data-attributes`                         |
| `SiteAnim.log()`                            | Só imprime com `WP_DEBUG` ligado                            |

Também reage sozinho a três eventos: usuário ligando "reduzir movimento" com a página aberta, `window.load` (imagens mudam alturas), e widgets do Elementor renderizando dinamicamente (popups, abas, lightbox) — este último com _debounce_ de 200 ms.

### `main.js` — o kickoff

Nove linhas úteis. É o **último** script da fila; a essa altura todos os módulos já se registraram, então basta um `SiteAnim.init()`. Ao criar um módulo novo você **não mexe aqui**.

### `smooth-scroll.js` — Lenis

Módulo que instancia o Lenis e o costura ao GSAP. Duas linhas contêm todo o segredo:

```
lenis.on('scroll', ScrollTrigger.update);   // Lenis rola → ScrollTrigger recalcula
gsap.ticker.add(raf);                        // um único loop de animação
```

Com `autoRaf: false` forçado — dois `requestAnimationFrame` concorrentes causariam scroll travado. É o único módulo que devolve um `destroy()`, porque a instância do Lenis não é coberta pelo `gsap.context()`.

### `animations/reveal.js` — `.js-reveal`

Elementos entram na tela ao rolar. Usa `gsap.fromTo()`: o estado inicial é responsabilidade do GSAP, nunca do CSS — **se o JS falhar, o elemento continua visível**. Com `data-reveal-stagger > 0`, quem anima são os filhos diretos, em cascata.

Por padrão a animação acontece **uma vez** (`once: true`) e o ScrollTrigger se remove em seguida. Adicione `data-reveal-replay|true` nos elementos que devem se desfazer ao subir e reanimar na próxima descida — inclusive ao voltar ao topo da página.

`data-reveal-y` · `-x` · `-scale` · `-duration` · `-delay` · `-stagger` · `-ease` · `-start` · `-replay`

### `animations/parallax.js` — `.js-parallax`

Deslocamento em ritmo diferente do scroll, amarrado via `scrub: true` — sem nenhum listener de scroll próprio. Anima `yPercent`/`xPercent` (percentual, não pixel), então sobrevive a resize.

`data-parallax-speed` (0–1) · `data-parallax-axis` (`y`/`x`)

### `animations/horizontal-scroll.js` — `.js-hscroll`

Fixa a seção (`pin`) e desliza o track no eixo X. Usa `gsap.matchMedia()`, que **se desliga sozinho no mobile e se religa no resize** sem deixar ScrollTrigger órfão — o cleanup é automático quando a media query deixa de bater. Avisa no console se encontrar `.js-hscroll` sem `.js-hscroll__track`.

`data-hscroll-min-width` (padrão 1024) · `data-hscroll-scrub`

### `assets/js/vendor/`

GSAP 71 KB · ScrollTrigger 44 KB · Lenis 18 KB. Locais, não CDN: sem requisição externa, sem depender de terceiro, e o `filemtime()` cuida do cache.

# COMO ADICIONAR ANIMACOES

## Primeiro: qual caminho seguir?

```
A animação depende do SCROLL ou de uma TIMELINE?
│
├── NÃO (hover, loop infinito, transição de estado)
│   └── ► CAMINHO A: CSS puro em animations.css
│         Custo: ~0. Não precisa tocar em PHP nem JS.
│
└── SIM (entra ao rolar, parallax, pin, sequência encadeada)
    └── ► CAMINHO B: módulo GSAP em assets/js/animations/
          Custo: 1 arquivo novo + 1 linha em inc/enqueue.php
```

Assimetria importante que decorre da arquitetura: **o CSS carrega em todas as páginas, o JS só nas listadas no** `**config.php**`**.** Uma animação CSS funciona em qualquer lugar do site imediatamente. Uma animação GSAP só funciona onde a camada está ligada.

## **CAMINHO A — nova classe CSS**

### Passo 1 — escreva em `assets/css/animations.css`

Siga o padrão dos três exemplos existentes: prefixo `.anim-`, customização via CSS custom properties com fallback, e **anime apenas** `**transform**` **e** `**opacity**`.

```css
/* =========================================================================
   4. .anim-arrow — seta que desliza no hover
   Para links de "saiba mais".

   Opcional:
     style="--arrow-shift: .5em;"
   ========================================================================= */

.anim-arrow {
	display: inline-flex;
	align-items: center;
	gap: 0.5em;
	text-decoration: none;
}

.anim-arrow::after {
	content: '→';
	transform: translateX(0);
	transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform;
}

.anim-arrow:hover::after,
.anim-arrow:focus-visible::after {
	transform: translateX(var(--arrow-shift, 0.35em));
}
```

Três decisões que valem explicar:

- `**transform**`**, nunca** `**margin**`**/**`**left**` — transform roda na GPU e não causa reflow. `margin-left` recalcularia o layout a cada frame.
- `**:focus-visible**` **junto com** `**:hover**` — quem navega por teclado vê o mesmo feedback.
- `**var(--x, fallback)**` — permite ajustar por elemento no Elementor sem criar variação de classe.

### Passo 2 — declare o comportamento com movimento reduzido

Obrigatório. Adicione ao bloco `@media (prefers-reduced-motion: reduce)` que já existe no fim do arquivo:

```css
.anim-arrow::after {
	transition: none !important;
}

.anim-arrow::after {
	will-change: auto !important;
}
```

A regra do projeto é **desligar o movimento sem esconder nada**. A seta continua lá, só não desliza.

### Passo 3 — use no Elementor

Selecione o widget → **Avançado → Atributos personalizados**:

```
class|anim-arrow
```

Para ajustar, use o campo **CSS ID/Classe → estilos personalizados** ou um atributo:

```
style|--arrow-shift: .6em
```

### Passo 4 — veja

Salve o arquivo, dê F5. O `filemtime()` já fez o cache-busting — não precisa limpar cache nenhum.

## **CAMINHO B — novo módulo GSAP**

Vou usar um exemplo completo e realista: um **contador numérico** que anima de 0 até o valor quando entra na tela (`+500 pacientes atendidos`).

### Passo 1 — crie `assets/js/animations/counter.js`

Todo módulo segue o mesmo esqueleto. Copie e adapte:

```
/**
 * GSAP #4 — Contador numérico.
 *
 * Classe: .js-counter
 *
 * O valor FINAL deve estar escrito no elemento (ex.: "500"). O GSAP anima a
 * partir de zero em cima disso. Se o JS falhar, o número correto ja esta la.
 *
 * data-attributes (todos opcionais):
 *   data-counter-to        valor final      (padrao: o texto do elemento)
 *   data-counter-from      valor inicial    (padrao 0)
 *   data-counter-duration  duracao em s     (padrao 2)
 *   data-counter-decimals  casas decimais   (padrao 0)
 *   data-counter-prefix    texto antes      (padrao "")
 *   data-counter-suffix    texto depois     (padrao "")
 *   data-counter-start     start do trigger (padrao "top 85%")
 *
 * Exemplo no Elementor:
 *   class|js-counter
 *   data-counter-suffix|+
 *   data-counter-duration|2.5
 */
(function (window, document) {
    'use strict';

    // 1. Sem o nucleo, o modulo simplesmente nao existe.
    if (!window.SiteAnim) {
        return;
    }

    // 2. Registra. NUNCA inicialize aqui — quem dispara e o main.js.
    window.SiteAnim.register('counter', function (app) {

        var gsap = window.gsap;
        var elements = document.querySelectorAll('.js-counter');

        // 3. Nada na pagina? Sai sem custo.
        if (!elements.length) {
            return null;
        }

        Array.prototype.forEach.call(elements, function (el) {

            // 4. Le a configuracao via helpers do nucleo.
            var target   = app.num(el, 'data-counter-to', parseFloat(el.textContent) || 0);
            var decimals = app.num(el, 'data-counter-decimals', 0);
            var prefix   = app.str(el, 'data-counter-prefix', '');
            var suffix   = app.str(el, 'data-counter-suffix', '');

            // Objeto intermediario: o GSAP anima a propriedade, nao o DOM.
            var proxy = { value: app.num(el, 'data-counter-from', 0) };

            gsap.to(proxy, {
                value: target,
                duration: app.num(el, 'data-counter-duration', 2),
                ease: 'power2.out',
                onUpdate: function () {
                    el.textContent = prefix + proxy.value.toFixed(decimals) + suffix;
                },
                scrollTrigger: {
                    trigger: el,
                    start: app.str(el, 'data-counter-start', 'top 85%'),
                    once: true
                }
            });
        });

        // 5. Log so aparece com WP_DEBUG ligado.
        app.log('counter: ' + elements.length + ' elemento(s).');

        // 6. Devolva null, ou { destroy: fn } se criou algo fora do gsap.context.
        return null;
    });

}(window, document));
```

**Por que o** `**proxy**`**?** O GSAP anima propriedades de objetos JavaScript, não só de elementos DOM. Animar `proxy.value` e escrever o resultado no `onUpdate` é o padrão para qualquer coisa que não seja CSS — contadores, barras de progresso, SVG paths.

**Por que o valor final fica no HTML?** Mesma filosofia do `reveal.js`: se o JS falhar, o usuário vê `500`, não `0`. Nunca escreva o estado inicial no CSS ou no HTML — deixe o JS partir do estado final para trás.

### Passo 2 — registre em `inc/enqueue.php`

Obs: se precisa adicionar plugin novo do GSAP, olhar os comentários em `enqueue.php`

**Uma linha.** Localize o array `$animations` (por volta da linha 321) e acrescente:

```php
        $animations = array(
            'hc-reveal'   => 'assets/js/animations/reveal.js',
            'hc-parallax' => 'assets/js/animations/parallax.js',
            'hc-hscroll'  => 'assets/js/animations/horizontal-scroll.js',
            'hc-counter'  => 'assets/js/animations/counter.js',   // ← novo
        );
```

O loop cuida do resto: verifica se o arquivo existe, enfileira com `defer` e dependência de `hc-core`, e adiciona o handle à lista de dependências do `hc-main`. **Você não toca no** `**main.js**`**.**

### Passo 3 — estrutura CSS, se precisar

O contador não precisa. Mas se a sua animação exigir estrutura (como o parallax exige `overflow: hidden` no pai), adicione em `components.css`, não em `animations.css`. A divisão é:

- `components.css` → **estrutura que o JS pressupõe**
- `animations.css` → **movimento feito em CSS puro**

### Passo 4 — use no Elementor

Widget de título ou texto, escreva `500`, e em **Avançado → Atributos personalizados**:

```
class|js-counter
data-counter-suffix|+
data-counter-duration|2.5
```

Um atributo por linha, separador `|`. Para combinar com outras classes, separe por espaço no mesmo valor:

```
class|js-counter anim-float
```

### Passo 5 — confirme que está ligado

Certifique-se de que a página está no `inc/config.php`. Depois, no console do frontend:

```
SiteAnim.triggers().length     // quantos ScrollTriggers existem
SiteAnim.modules              // módulos registrados (deve incluir "counter")
```

# **Onde entra o Lenis?**

Resposta curta: **você quase nunca o vincula a nada.**

O Lenis é o _motor de scroll_, não uma biblioteca de animação. Ele substitui o scroll nativo por um interpolado — e o `smooth-scroll.js` já fez a única costura que importa:

```
lenis.on('scroll', ScrollTrigger.update);
```

A partir daí, **todo ScrollTrigger que você criar já está sincronizado**. Não existe passo extra. Não configure nada de Lenis no seu módulo.

Os dois únicos casos em que você o toca diretamente:

**1\. Scroll programático** — para botões âncora ("Agendar consulta" que rola até o formulário):

```
// Disponível como SiteAnim.lenis quando o módulo está ativo
if (window.SiteAnim && window.SiteAnim.lenis) {
    window.SiteAnim.lenis.scrollTo('#contato', { offset: -80 });
}
```

**2\. Travar o scroll** — ao abrir um popup do Elementor:

```
SiteAnim.lenis.stop();   // trava
SiteAnim.lenis.start();  // libera
```

Sempre teste `if (SiteAnim.lenis)` antes — em páginas sem Lenis (ou com `prefers-reduced-motion`) ele é `null`.

**Impedir que uma área específica seja suavizada** — útil para um mapa incorporado ou uma área de scroll interno. Não precisa de JS, só de um atributo no Elementor:

```
data-lenis-prevent|true
```

---

## As 6 regras do projeto

| #   | Regra                                                     | Por quê                                                                                      |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Anime só `transform` e `opacity`                          | São compostas na GPU. `width`, `height`, `top`, `margin` causam reflow a cada frame          |
| 2   | Use `gsap.from()` / `fromTo()`, nunca `opacity: 0` no CSS | Se o JS falhar, o conteúdo continua visível. Um `opacity: 0` no CSS deixa a página em branco |
| 3   | Nunca adicione listener de `scroll`                       | O ScrollTrigger já faz isso, de forma otimizada e única. Um listener extra briga com o Lenis |
| 4   | Módulos registram, `main.js` inicializa                   | Ordem garantida e um único ponto de partida                                                  |
| 5   | Nada roda no editor do Elementor                          | Ele re-renderiza widgets constantemente, o que criaria ScrollTriggers duplicados             |
| 6   | Toda animação nova ganha bloco `prefers-reduced-motion`   | Movimento involuntário causa enjoo em parte real do público                                  |

---

## Debug

Ligue o `WP_DEBUG` em [wp-config.php:88](https://claude.ai/epitaxy/local_2354fe3d-4c7b-43d8-8621-d6dd33394982) — isso ativa `window.hcSettings.debug` e faz cada módulo logar quantos elementos encontrou:

```php
define( 'WP_DEBUG', true );
```

```
[SiteAnim] reveal: 6 elemento(s).
[SiteAnim] counter: 3 elemento(s).
[SiteAnim] Lenis iniciado.
[SiteAnim] inicializado com 5 modulo(s).
```

| Sintoma                                    | Causa provável                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Nenhum log, nada anima                     | Página fora do `inc/config.php` — confira se o `<body>` tem `hc-has-animations`      |
| `[SiteAnim] editor do Elementor detectado` | Você está no preview. Abra o frontend real                                           |
| `[SiteAnim] prefers-reduced-motion ativo`  | Configuração do sistema operacional, não bug                                         |
| Módulo logou `0 elemento(s)`               | A classe não chegou no HTML — inspecione o elemento no DevTools                      |
| Anima na primeira vez e para               | Faltou `invalidateOnRefresh: true` ou um `SiteAnim.refresh()` após mudança de layout |
| Animação dispara cedo demais               | Ajuste o `start`: `"top 85%"` = topo do elemento a 85% da altura da viewport         |
| Erro de módulo no console                  | O `core.js` isola falhas num `try/catch` — um módulo quebrado não derruba os outros  |

Para desenvolver sem recarregar, o console aceita:

```
SiteAnim.rebuild()   // destrói e recria tudo
```

---

# LITESPEED CACHE

## Onde o LiteSpeed vai quebrar

**1\. JS Delayed (o mais grave).** Se você ligar "Load JS Delayed", o GSAP só carrega na primeira interação do usuário. Como o estado inicial do reveal agora vem do `fromTo` (JS), o elemento aparece normal, o usuário rola, e aí o script carrega e _esconde_ o elemento pra animar. Fica um piscar feio. O Lenis inicializando no meio de um scroll em andamento é pior ainda.

Exclua em _Page Optimization → Tuning → JS Delayed Excludes_:

```
gsap.min.js
ScrollTrigger.min.js
lenis.min.js
/themes/hello-elementor-child/assets/js/
```

**2\. JS Combine.** O `window.hcSettings` é impresso inline via `wp_add_inline_script` ([enqueue.php:315](https://claude.ai/epitaxy/wp-content/themes/hello-elementor-child/inc/enqueue.php:315)). O Combine trata inline e arquivo separadamente e pode inverter a ordem — se `hcSettings` cair depois do `core.js`, o `settings` vira `{}`, o Lenis não liga e o debug some, sem erro nenhum no console. Com HTTP/2 o Combine praticamente não dá ganho. **Deixe desligado.** Minify pode ficar ligado.

"Load JS Deferred" também é redundante: [enqueue.php:190](https://claude.ai/epitaxy/wp-content/themes/hello-elementor-child/inc/enqueue.php:190) já aplica `defer` em tudo, e o `defer` nativo preserva a ordem — que é exatamente o que o registry do SiteAnim depende.

**3\. UCSS / CCSS.** O `lenis.css` mira seletores que o próprio Lenis adiciona em runtime (`html.lenis`, `.lenis-smooth`). O UCSS varre o HTML estático, não encontra essas classes e remove as regras — resultado: scroll travado ou body com altura errada. Adicione `lenis.css` em _UCSS File Excludes and Inline_.
