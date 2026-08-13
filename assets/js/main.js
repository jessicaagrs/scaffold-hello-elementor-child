/**
 * Kickoff.
 *
 * Este e o ULTIMO script da fila. A essa altura todos os modulos ja se
 * registraram no SiteAnim (o atributo `defer` preserva a ordem de execucao),
 * entao basta inicializar uma vez.
 *
 * Se voce criar um novo modulo em assets/js/animations/, registre-o em
 * inc/enqueue.php no array $animations. Nada muda aqui.
 */
(function (window, document) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	function start() {
		window.SiteAnim.init();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start);
	} else {
		start();
	}

}(window, document));
