<?php
/**
 * Configuracao do site.
 *
 * ESTE E O UNICO ARQUIVO QUE VOCE PRECISA EDITAR AO REUSAR O TEMA.
 *
 * A camada de animacoes (GSAP + ScrollTrigger + Lenis) e OPT-IN: por padrao
 * nenhuma pagina carrega os scripts. Liste abaixo apenas onde eles sao usados.
 *
 * @package hello-elementor-child
 */

defined( 'ABSPATH' ) || exit;

return array(

	/*
	 * A pagina inicial carrega animacoes?
	 */
	'front_page'    => true,

	/*
	 * Paginas que carregam animacoes. Aceita slugs OU IDs.
	 * Ex: array( 'sobre', 'servicos', 42 )
	 */
	'pages'         => array(),

	/*
	 * Post types cujos posts individuais carregam animacoes.
	 * Ex: array( 'projeto', 'post' )
	 */
	'post_types'    => array(),

	/*
	 * Smooth scroll (Lenis) ligado?
	 * Requer assets/js/vendor/lenis.min.js e assets/css/vendor/lenis.css.
	 * Se os arquivos nao existirem, e ignorado silenciosamente.
	 */
	'lenis'         => true,

	/*
	 * Opcoes repassadas direto para o construtor do Lenis.
	 * `autoRaf` e forcado para false no JS porque quem controla o loop e o
	 * gsap.ticker (evita dois requestAnimationFrame concorrentes).
	 *
	 * Ver: https://github.com/darkroomengineering/lenis
	 *
	 * Para deixar o scroll mais suave, mexa em `duration` e `easing` (nesta
	 * ordem). O resto raramente precisa mudar.
	 *
	 *   duration        Segundos ate a rolagem "assentar". 1.2 e o padrao do
	 *                   Lenis; 1.6-2.0 da a sensacao de deslize. Acima de ~2.5
	 *                   o site comeca a parecer lento pra responder.
	 *   easing          Nome de uma curva definida em assets/js/smooth-scroll.js:
	 *                   'expoOut' (padrao do Lenis), 'expoSoft' (cauda mais
	 *                   longa, mais macio) ou 'quintOut' (mais direto).
	 *   wheelMultiplier Quanto cada "clique" da roda avanca. Abaixo de 1 o
	 *                   scroll fica mais curto e controlado.
	 *   syncTouch       No mobile, aplica a mesma interpolacao ao toque. Deixe
	 *                   false se o scroll de dedo ficar "escorregadio" demais.
	 *
	 * Alternativa: trocar `duration`/`easing` por `lerp` (0.05-0.12) da um
	 * amortecimento continuo, sem duracao fixa. Os dois nao convivem — o JS
	 * descarta duration/easing se lerp estiver definido.
	 */
	'lenis_options' => array(
		'duration'        => 1.6,
		'easing'          => 'expoSoft',
		'smoothWheel'     => true,
		'wheelMultiplier' => 0.9,
		'syncTouch'       => false,
	),
);
