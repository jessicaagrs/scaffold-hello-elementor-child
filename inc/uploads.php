<?php
/**
 * Tipos de arquivo permitidos no upload.
 *
 * SVG so e liberado para quem pode `manage_options` (administrador), porque
 * SVG e XML executavel e um arquivo malicioso vira XSS na biblioteca de midia.
 * Para liberar a editores/clientes, use o plugin Safe SVG (sanitiza o arquivo).
 *
 * @package hello-elementor-child
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'upload_mimes',
	function ( $mimes ) {
		if ( current_user_can( 'manage_options' ) ) {
			$mimes['svg'] = 'image/svg+xml';
		}
		return $mimes;
	}
);

/**
 * O WP valida o mime real do arquivo; SVG e texto puro e seria rejeitado
 * mesmo com o mime liberado acima.
 */
add_filter(
	'wp_check_filetype_and_ext',
	function ( $data, $file, $filename, $mimes ) {
		if ( current_user_can( 'manage_options' ) && str_ends_with( strtolower( $filename ), '.svg' ) ) {
			$data['ext']  = 'svg';
			$data['type'] = 'image/svg+xml';
		}
		return $data;
	},
	10,
	4
);
