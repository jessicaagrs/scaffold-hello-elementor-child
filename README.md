# Hello Elementor Child

O Elementor cuida da aparência; este tema cuida do movimento — GSAP + ScrollTrigger + Lenis, carregados só onde você mandar.

Nenhum arquivo PHP renderiza HTML: não há `header.php`, `footer.php` nem `page.php`, porque o tema pai já resolve isso.

Requer **Hello Elementor** e **WordPress 6.3+** (por causa do `strategy => defer`).

## Instalar

`Aparência → Temas → Hello Elementor Child → Ativar`.

## Configurar

`inc/config.php` é o único arquivo que muda por site. O JS é **opt-in** — por padrão nenhuma página o carrega:

```php
'front_page' => true,                     // a home carrega animações
'pages'      => array( 'sobre', 42 ),     // slugs ou IDs
'post_types' => array( 'projeto' ),       // posts individuais desses tipos
'lenis'      => true,                     // smooth scroll
```

O CSS carrega em **toda** página, sempre — são poucos KB e as animações CSS puras são globais por natureza. Só o JS passa pelo config.

## Classes

### CSS puro — funciona em qualquer página

| Classe            | Efeito                            | Customização                            |
| ----------------- | --------------------------------- | --------------------------------------- |
| `.anim-float`     | Flutuação vertical infinita       | `--float-distance`, `--float-duration`  |
| `.anim-underline` | Sublinhado cresce do centro       | `--underline-color`, `--underline-size` |
| `.anim-shine`     | Brilho diagonal no hover          | `--shine-color`, `--shine-duration`     |
| `.hover-lift`     | Sobe e ganha sombra no hover      | `--lift-distance`, `--lift-duration`    |
| `.hover-zoom`     | Imagem aproxima dentro da moldura | `--zoom-scale`, `--zoom-duration`       |
| `.js-tilt`        | Inclina seguindo o ponteiro       | `--tilt-max`, `--tilt-scale`            |

`.hover-zoom` vai no **wrapper**; quem escala é a imagem interna. `.js-tilt` é o único com JS (`assets/js/ui/hover.js`), mas não depende de GSAP nem do config — e se desliga sozinho em touch.

### GSAP — só nas páginas ligadas no config

| Classe         | Efeito                          | `data-attributes`                                                        |
| -------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `.js-reveal`   | Entra na tela ao rolar          | `-y` `-x` `-scale` `-duration` `-delay` `-stagger` `-ease` `-start` `-replay` |
| `.js-parallax` | Desloca em ritmo diferente      | `-speed` (0–1) · `-axis` (`y`/`x`)                                       |
| `.js-hscroll`  | Fixa a seção e desliza no eixo X | `-min-width` (padrão 1024) · `-scrub`                                    |

Prefixo completo: `data-reveal-y`, `data-parallax-speed`, `data-hscroll-scrub`.

Duas exigem estrutura no HTML:

- `.js-parallax` precisa de `.parallax-wrap` no pai (recorta o excedente).
- `.js-hscroll` precisa de um `.js-hscroll__track` dentro, com `.js-hscroll__item` como filhos. Sem JS o track vira um carrossel nativo com snap, então nada quebra.

Com `data-reveal-stagger > 0`, quem anima são os **filhos diretos**, em cascata. Sem `data-reveal-replay`, a animação roda uma vez e o ScrollTrigger se remove.

### Usar no Elementor

Selecione o elemento → `Avançado → Atributos personalizados` (Pro) e cole:

```
class|js-reveal
data-reveal-y|80
data-reveal-stagger|0.12
```

Confira no **frontend**, não no preview do editor — o tema desliga as animações lá de propósito, para o GSAP não duplicar ScrollTriggers.

## Adicionar uma animação

Depende de scroll ou de timeline? **Não** → CSS. **Sim** → módulo GSAP.

### CSS (custo ~0, não toca em PHP nem JS)

Escreva em `assets/css/animations.css` seguindo os três exemplos: prefixo `.anim-`, customização por custom property com fallback, só `transform` e `opacity`, e uma entrada no bloco `@media (prefers-reduced-motion: reduce)` do fim do arquivo. Pronto — já vale em todo o site.

### Módulo GSAP

**1.** Crie `assets/js/animations/counter.js`:

```js
(function (window, document) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	// Registra; NUNCA inicialize aqui. Quem dispara é o kickoff do core.js.
	window.SiteAnim.register('counter', function (app) {
		var elements = document.querySelectorAll('.js-counter');

		if (!elements.length) {
			return null;
		}

		Array.prototype.forEach.call(elements, function (el) {
			// app.num(el, attr, padrão) e app.str(el, attr, padrão) leem data-attributes.
			var to = app.num(el, 'data-counter-to', 100);

			window.gsap.fromTo(el, { textContent: 0 }, {
				textContent: to,
				duration: app.num(el, 'data-counter-duration', 2),
				snap: { textContent: 1 },
				scrollTrigger: { trigger: el, start: 'top 85%', once: true }
			});
		});

		app.log('counter: ' + elements.length + ' elemento(s).');

		// Devolva { destroy: fn } só se criar algo fora do gsap.context()
		// (uma instância de lib, um listener próprio). Caso contrário, null.
		return null;
	});

}(window, document));
```

**2.** Uma linha no array `$animations` de `inc/enqueue.php`:

```php
'hc-counter' => 'assets/js/animations/counter.js',
```

O loop cuida do resto: confere se o arquivo existe e enfileira com `defer` e dependência de `hc-core`. **Você não toca no `core.js`.**

**3.** Use a classe no Elementor, como qualquer outra.

## Lenis

Você quase nunca o toca. O Lenis é o *motor de scroll*, não uma biblioteca de animação, e o `smooth-scroll.js` já fez a única costura que importa:

```js
lenis.on('scroll', ScrollTrigger.update);
```

A partir daí **todo ScrollTrigger que você criar já está sincronizado**. Não configure nada de Lenis no seu módulo.

Três exceções:

**Scroll programático** (botão âncora). Com o Lenis rodando, link âncora nativo e `scrollIntoView()` brigam com o scroller:

```js
if (window.SiteAnim && window.SiteAnim.lenis) {
    window.SiteAnim.lenis.scrollTo('#contato', { offset: -80 });
}
```

Teste `if (SiteAnim.lenis)` sempre — em páginas sem Lenis (ou com `prefers-reduced-motion`) ele é `null`.

**Travar o scroll** ao abrir um popup: `SiteAnim.lenis.stop()` / `.start()`.

**Excluir uma área da suavização** (mapa incorporado, scroll interno) — só um atributo no Elementor, sem JS:

```
data-lenis-prevent|true
```

## As 6 regras do projeto

| #   | Regra                                                          | Por quê                                                                                       |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Anime só `transform` e `opacity`                               | São compostas na GPU. `width`, `height`, `top`, `margin` causam reflow a cada frame            |
| 2   | Use `gsap.from()` / `fromTo()`, nunca `opacity: 0` no CSS       | Se o JS falhar, o conteúdo continua visível. Um `opacity: 0` no CSS deixa a página em branco   |
| 3   | Nunca adicione listener de `scroll`                            | O ScrollTrigger já faz isso, otimizado e único. Um listener extra briga com o Lenis            |
| 4   | Módulos registram, o `core.js` inicializa no `DOMContentLoaded` | Ordem garantida e um único ponto de partida                                                    |
| 5   | Nada roda no editor do Elementor                               | Ele re-renderiza widgets constantemente, o que criaria ScrollTriggers duplicados               |
| 6   | Toda animação nova ganha bloco `prefers-reduced-motion`        | Movimento involuntário causa enjoo em parte real do público                                    |

## Debug

Ligue o `WP_DEBUG` no `wp-config.php` — isso ativa `window.hcSettings.debug` e faz cada módulo logar quantos elementos encontrou:

```
[SiteAnim] reveal: 6 elemento(s).
[SiteAnim] Lenis iniciado.
[SiteAnim] inicializado com 4 modulo(s).
```

| Sintoma                                    | Causa provável                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Nenhum log, nada anima                     | Página fora do `inc/config.php` — confira se o `<body>` tem `hc-has-animations`        |
| `[SiteAnim] editor do Elementor detectado` | Você está no preview. Abra o frontend real                                             |
| `[SiteAnim] prefers-reduced-motion ativo`  | Configuração do sistema operacional, não bug                                           |
| Módulo logou `0 elemento(s)`               | A classe não chegou no HTML — inspecione o elemento no DevTools                        |
| Anima na primeira vez e para               | Faltou `invalidateOnRefresh: true` ou um `SiteAnim.refresh()` após mudança de layout   |
| Animação dispara cedo demais               | Ajuste o `start`: `"top 85%"` = topo do elemento a 85% da altura da viewport           |
| Erro de módulo no console                  | O `core.js` isola falhas num `try/catch` — um módulo quebrado não derruba os outros    |

No console: `SiteAnim.refresh()` recalcula posições (barato), `ScrollTrigger.getAll().length` conta os triggers ativos.

## LiteSpeed Cache

Três lugares onde ele quebra o tema:

**1. JS Delayed** (o mais grave). O GSAP passaria a carregar só na primeira interação: o elemento aparece normal, o usuário rola, o script carrega e aí *esconde* o elemento pra animar — um piscar feio. O Lenis inicializando no meio de um scroll é pior. Exclua em *Page Optimization → Tuning → JS Delayed Excludes*:

```
gsap.min.js
ScrollTrigger.min.js
lenis.min.js
/themes/hello-elementor-child/assets/js/
```

**2. JS Combine.** O `window.hcSettings` é impresso inline antes do `core.js`. O Combine trata inline e arquivo separadamente e pode inverter a ordem — se o `hcSettings` cair depois, `settings` vira `{}`, o Lenis não liga e o debug some, sem erro no console. Com HTTP/2 o Combine quase não dá ganho: **deixe desligado**. Minify pode ficar ligado.

"Load JS Deferred" é redundante — o `hc_enqueue_script()` já aplica `defer` em tudo.

**3. UCSS / CCSS.** O `lenis.css` mira seletores que o Lenis adiciona em runtime (`html.lenis`, `.lenis-smooth`). O UCSS varre o HTML estático, não os encontra e remove as regras — scroll travado ou body com altura errada. Adicione `lenis.css` em *UCSS File Excludes and Inline*.

## Estrutura

```
hello-elementor-child/
├── style.css              ← cabeçalho do tema + overrides de última hora
├── functions.php          ← 3 constantes + 1 require
├── inc/
│   ├── config.php         ← o único arquivo que muda por site
│   └── enqueue.php        ← toda a lógica de carregamento
└── assets/
    ├── css/
    │   ├── base.css           ← ajustes globais
    │   ├── components.css     ← estrutura que o GSAP exige
    │   ├── animations.css     ← animações CSS puras
    │   ├── interactions.css   ← hover / focus
    │   └── vendor/lenis.css
    └── js/
        ├── core.js            ← registry SiteAnim + kickoff
        ├── smooth-scroll.js   ← Lenis
        ├── animations/        ← reveal, parallax, horizontal-scroll
        ├── ui/hover.js        ← tilt (independente do GSAP)
        └── vendor/            ← gsap 71 KB · ScrollTrigger 44 KB · lenis 18 KB
```

Vendor é local, não CDN: sem requisição externa e o `filemtime()` cuida do cache-busting.

Ordem de carregamento do JS:

```
gsap → ScrollTrigger → [lenis] → hc-core (+ hcSettings inline) → [módulos]
```

O `defer` preserva a ordem de execução, e scripts `defer` rodam todos antes do `DOMContentLoaded` — é isso que permite os módulos se registrarem antes de o kickoff no fim do `core.js` chamar `SiteAnim.init()`.
