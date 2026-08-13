<?php
/**
 * Registro e enfileiramento condicional dos assets.
 *
 * Regras:
 *  - CSS proprio carrega SEMPRE (e leve e as animacoes CSS puras sao globais).
 *  - JS de animacao carrega apenas nas paginas listadas em inc/config.php.
 *  - Nada carrega dentro do editor/preview do Elementor.
 *  - Se uma lib de vendor/ estiver faltando, aborta em vez de quebrar o site.
 *
 * @package hello-elementor-child
 */

defined( 'ABSPATH' ) || exit;

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

/**
 * Le (uma unica vez) o arquivo de configuracao do site.
 *
 * @param string|null $key     Chave desejada, ou null para o array inteiro.
 * @param mixed       $default Valor se a chave nao existir.
 * @return mixed
 */
function hc_config( $key = null, $default = null ) {
	static $config = null;

	if ( null === $config ) {
		$config = require HC_DIR . '/inc/config.php';

		$config = wp_parse_args(
			(array) $config,
			array(
				'front_page'    => false,
				'pages'         => array(),
				'post_types'    => array(),
				'lenis'         => false,
				'lenis_options' => array(),
			)
		);
	}

	if ( null === $key ) {
		return $config;
	}

	return isset( $config[ $key ] ) ? $config[ $key ] : $default;
}

/**
 * Caminho absoluto de um asset do tema.
 *
 * @param string $rel Caminho relativo a raiz do child theme.
 * @return string
 */
function hc_asset_path( $rel ) {
	return HC_DIR . '/' . ltrim( $rel, '/' );
}

/**
 * URL publica de um asset do tema.
 *
 * @param string $rel Caminho relativo a raiz do child theme.
 * @return string
 */
function hc_asset_url( $rel ) {
	return HC_URI . '/' . ltrim( $rel, '/' );
}

/**
 * O arquivo existe no disco?
 *
 * @param string $rel Caminho relativo a raiz do child theme.
 * @return bool
 */
function hc_asset_exists( $rel ) {
	return file_exists( hc_asset_path( $rel ) );
}

/**
 * Versao do asset via filemtime — cache-busting automatico durante o desenvolvimento.
 *
 * @param string $rel Caminho relativo a raiz do child theme.
 * @return string
 */
function hc_asset_ver( $rel ) {
	$file = hc_asset_path( $rel );

	if ( file_exists( $file ) ) {
		return (string) filemtime( $file );
	}

	return HC_VER;
}

/**
 * Estamos dentro do editor ou do preview do Elementor?
 *
 * Nesse contexto o Elementor re-renderiza widgets constantemente, o que faria
 * o GSAP criar ScrollTriggers duplicados. Por isso nao carregamos nada la.
 *
 * @return bool
 */
function hc_is_elementor_editor() {
	if ( ! class_exists( '\Elementor\Plugin' ) || ! isset( \Elementor\Plugin::$instance ) ) {
		return false;
	}

	$elementor = \Elementor\Plugin::$instance;

	if ( isset( $elementor->editor ) && $elementor->editor->is_edit_mode() ) {
		return true;
	}

	if ( isset( $elementor->preview ) && $elementor->preview->is_preview_mode() ) {
		return true;
	}

	return false;
}

/**
 * Esta requisicao deve carregar a camada de animacoes?
 *
 * Use o filtro `hc_load_animations` para casos que o config nao cobre.
 * Ex.: forcar em todos os posts de uma categoria:
 *
 *     add_filter( 'hc_load_animations', function ( $load ) {
 *         return $load || is_category( 'cases' );
 *     } );
 *
 * @return bool
 */
function hc_should_load_animations() {
	$load = false;

	if ( hc_config( 'front_page' ) && is_front_page() ) {
		$load = true;
	}

	$pages = array_filter( (array) hc_config( 'pages' ) );
	if ( ! $load && $pages && is_page( $pages ) ) {
		$load = true;
	}

	$post_types = array_filter( (array) hc_config( 'post_types' ) );
	if ( ! $load && $post_types && is_singular( $post_types ) ) {
		$load = true;
	}

	/**
	 * Filtra a decisao de carregar a camada de animacoes.
	 *
	 * @param bool $load Resultado calculado a partir de inc/config.php.
	 */
	return (bool) apply_filters( 'hc_load_animations', $load );
}

/**
 * O smooth scroll (Lenis) deve ser usado?
 *
 * @return bool
 */
function hc_lenis_enabled() {
	$enabled = hc_config( 'lenis' ) && hc_asset_exists( 'assets/js/vendor/lenis.min.js' );

	/**
	 * Filtra o uso do Lenis nesta requisicao.
	 *
	 * @param bool $enabled Ligado no config E com a lib presente no disco.
	 */
	return (bool) apply_filters( 'hc_lenis_enabled', $enabled );
}

/**
 * Enfileira um script do tema com defer e cache-busting.
 *
 * `defer` preserva a ordem de execucao entre os scripts, o que mantem o
 * registry do SiteAnim funcionando (modulos registram, main.js inicializa).
 *
 * @param string $handle Handle do script.
 * @param string $rel    Caminho relativo a raiz do child theme.
 * @param array  $deps   Dependencias.
 * @return void
 */
function hc_enqueue_script( $handle, $rel, $deps = array() ) {
	wp_enqueue_script( $handle, hc_asset_url( $rel ), $deps, hc_asset_ver( $rel ), true );
	wp_script_add_data( $handle, 'strategy', 'defer' );
}

/**
 * Loga um aviso apenas com WP_DEBUG ligado.
 *
 * @param string $message Mensagem.
 * @return void
 */
function hc_debug_log( $message ) {
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
		error_log( '[hello-elementor-child] ' . $message ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}
}

/* -------------------------------------------------------------------------
 * Styles
 * ---------------------------------------------------------------------- */

/**
 * Enfileira o CSS do tema.
 *
 * Prioridade 20 para vir depois do Hello Elementor sem depender do handle do
 * tema pai (se o handle mudar em uma atualizacao, nada quebra).
 *
 * @return void
 */
function hc_enqueue_styles() {

	$sheets = array(
		'hc-base'       => 'assets/css/base.css',
		'hc-components' => 'assets/css/components.css',
		'hc-animations' => 'assets/css/animations.css',
	);

	$deps = array();

	foreach ( $sheets as $handle => $rel ) {
		if ( ! hc_asset_exists( $rel ) ) {
			continue;
		}

		wp_enqueue_style( $handle, hc_asset_url( $rel ), $deps, hc_asset_ver( $rel ) );
		$deps[] = $handle;
	}

	// O CSS do Lenis mexe em html/body, entao so entra onde o Lenis roda.
	if ( hc_should_load_animations()
		&& hc_lenis_enabled()
		&& ! hc_is_elementor_editor()
		&& hc_asset_exists( 'assets/css/vendor/lenis.css' )
	) {
		wp_enqueue_style(
			'lenis',
			hc_asset_url( 'assets/css/vendor/lenis.css' ),
			array(),
			hc_asset_ver( 'assets/css/vendor/lenis.css' )
		);
	}

	// style.css por ultimo: espaco para overrides rapidos.
	wp_enqueue_style( 'hc-style', get_stylesheet_uri(), $deps, hc_asset_ver( 'style.css' ) );
}
add_action( 'wp_enqueue_scripts', 'hc_enqueue_styles', 20 );

/* -------------------------------------------------------------------------
 * Scripts
 * ---------------------------------------------------------------------- */

/**
 * Enfileira a camada de animacoes, na ordem correta e so onde e necessaria.
 *
 * Ordem final:
 *   gsap -> ScrollTrigger -> lenis -> hc-settings -> hc-core -> modulos -> hc-main
 *
 * @return void
 */
function hc_enqueue_scripts() {

	if ( hc_is_elementor_editor() || ! hc_should_load_animations() ) {
		return;
	}

	// Sem as libs no disco nao ha o que fazer. Aborta em vez de imprimir 404s.
	$required = array(
		'assets/js/vendor/gsap.min.js',
		'assets/js/vendor/ScrollTrigger.min.js',
	);

	foreach ( $required as $rel ) {
		if ( ! hc_asset_exists( $rel ) ) {
			hc_debug_log( sprintf( 'Lib ausente: %s. A camada de animacoes nao foi carregada.', $rel ) );
			return;
		}
	}

	$use_lenis = hc_lenis_enabled();

	// 1. Vendor.
	hc_enqueue_script( 'gsap', 'assets/js/vendor/gsap.min.js' );
	hc_enqueue_script( 'gsap-scrolltrigger', 'assets/js/vendor/ScrollTrigger.min.js', array( 'gsap' ) );

	if ( $use_lenis ) {
		hc_enqueue_script( 'lenis', 'assets/js/vendor/lenis.min.js' );
	}

		// Plugins opcionais do GSAP: entram apenas se o arquivo existir no disco.
		// $gsap_plugins = array(
		// 	'gsap-motionpath' => 'assets/js/vendor/MotionPathPlugin.min.js',
		// );

		// $plugin_handles = array();

		// foreach ( $gsap_plugins as $handle => $rel ) {
		// 	if ( ! hc_asset_exists( $rel ) ) {
		// 		continue;
		// 	}

		// 	hc_enqueue_script( $handle, $rel, array( 'gsap' ) );
		// 	$plugin_handles[] = $handle;
		// }

	// 2. Settings — handle virtual, so para imprimir window.hcSettings com os tipos corretos.
	wp_register_script( 'hc-settings', false, array(), HC_VER, true );
	wp_enqueue_script( 'hc-settings' );
	wp_add_inline_script(
		'hc-settings',
		'window.hcSettings = ' . wp_json_encode(
			array(
				'lenis'        => $use_lenis,
				'lenisOptions' => (object) (array) hc_config( 'lenis_options', array() ),
				'debug'        => (bool) ( defined( 'WP_DEBUG' ) && WP_DEBUG ),
			)
		) . ';'
	);

	// 3. Nucleo.
	hc_enqueue_script( 'hc-core', 'assets/js/core.js', array( 'gsap', 'gsap-scrolltrigger', 'hc-settings' ) ); //array_merge( array( 'gsap', 'gsap-scrolltrigger', 'hc-settings' ), $plugin_handles )

	// 4. Modulos. Cada um se registra no SiteAnim; nenhum inicializa sozinho.
	$modules = array();

	if ( $use_lenis ) {
		hc_enqueue_script( 'hc-smooth-scroll', 'assets/js/smooth-scroll.js', array( 'hc-core', 'lenis' ) );
		$modules[] = 'hc-smooth-scroll';
	}

	$animations = array(
		'hc-reveal'   => 'assets/js/animations/reveal.js',
		'hc-parallax' => 'assets/js/animations/parallax.js',
		'hc-hscroll'  => 'assets/js/animations/horizontal-scroll.js',
	);

	foreach ( $animations as $handle => $rel ) {
		if ( ! hc_asset_exists( $rel ) ) {
			continue;
		}

		hc_enqueue_script( $handle, $rel, array( 'hc-core' ) );
		$modules[] = $handle;
	}

	// 5. Kickoff — sempre por ultimo.
	hc_enqueue_script( 'hc-main', 'assets/js/main.js', array_merge( array( 'hc-core' ), $modules ) );
}
add_action( 'wp_enqueue_scripts', 'hc_enqueue_scripts', 20 );

/* -------------------------------------------------------------------------
 * Body class
 * ---------------------------------------------------------------------- */

/**
 * Adiciona `hc-has-animations` ao body quando a camada esta ativa.
 *
 * Util para escrever CSS que so vale onde ha animacao.
 *
 * @param array $classes Classes do body.
 * @return array
 */
function hc_body_class( $classes ) {
	if ( ! hc_is_elementor_editor() && hc_should_load_animations() ) {
		$classes[] = 'hc-has-animations';
	}

	return $classes;
}
add_filter( 'body_class', 'hc_body_class' );
