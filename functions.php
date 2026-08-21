<?php
/**
 * Hello Elementor Child - bootstrap.
 *
 * Este arquivo nao contem logica. Ele apenas define constantes e carrega
 * os modulos de `inc/`. Toda regra de carregamento vive em inc/enqueue.php
 * e toda configuracao por site vive em inc/config.php.
 *
 * @package hello-elementor-child
 */

defined( 'ABSPATH' ) || exit;

define( 'HC_DIR', get_stylesheet_directory() );
define( 'HC_URI', get_stylesheet_directory_uri() );
define( 'HC_VER', '1.0.0' );

require_once HC_DIR . '/inc/enqueue.php';
require_once HC_DIR . '/inc/uploads.php';
