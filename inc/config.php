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
	 */
	'lenis_options' => array(
		'duration'    => 1.2,
		'smoothWheel' => true,
	),
);
