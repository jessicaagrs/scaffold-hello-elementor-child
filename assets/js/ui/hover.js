/**
 * Tilt no hover — inclina o elemento seguindo o ponteiro.
 *
 * Modulo da camada de UI: nao depende de GSAP, de ScrollTrigger nem do
 * registry do SiteAnim. Ele se inicializa sozinho e roda em TODA pagina.
 *
 * Uso no Elementor: adicione a classe `js-tilt` no elemento.
 * Opcional (CSS custom property, aceita valor inline):
 *   style="--tilt-max: 12; --tilt-scale: 1.04;"
 *
 * O CSS que faz a transicao/perspectiva vive em assets/css/interactions.css.
 */
(function (window, document) {
	'use strict';

	var SELECTOR = '.js-tilt';

	/**
	 * O usuario pediu menos movimento? Entao nao ligamos nada.
	 */
	function prefersReducedMotion() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/**
	 * Dispositivo sem hover real (touch): tilt nao faz sentido.
	 */
	function hasFinePointer() {
		return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	}

	/**
	 * Le uma custom property numerica do elemento, com fallback.
	 *
	 * @param {Element} el       Elemento.
	 * @param {string}  prop     Nome da custom property (ex.: '--tilt-max').
	 * @param {number}  fallback Valor padrao.
	 * @return {number}
	 */
	function numberVar(el, prop, fallback) {
		var raw = getComputedStyle(el).getPropertyValue(prop).trim();
		var value = parseFloat(raw);

		return isNaN(value) ? fallback : value;
	}

	/**
	 * Liga o efeito em um elemento.
	 *
	 * @param {Element} el Elemento alvo.
	 * @return {void}
	 */
	function bind(el) {
		// Guarda para nao duplicar listeners caso o Elementor re-renderize.
		if (el.dataset.hcTilt === 'on') {
			return;
		}
		el.dataset.hcTilt = 'on';

		var max = numberVar(el, '--tilt-max', 10);
		var scale = numberVar(el, '--tilt-scale', 1.03);
		var frame = null;

		function apply(event) {
			var rect = el.getBoundingClientRect();

			// -0.5 .. 0.5 a partir do centro do elemento.
			var x = (event.clientX - rect.left) / rect.width - 0.5;
			var y = (event.clientY - rect.top) / rect.height - 0.5;

			el.style.transform =
				'perspective(800px) ' +
				'rotateX(' + (-y * max).toFixed(2) + 'deg) ' +
				'rotateY(' + (x * max).toFixed(2) + 'deg) ' +
				'scale(' + scale + ')';
		}

		// requestAnimationFrame: no maximo uma escrita de estilo por frame.
		function onMove(event) {
			if (frame) {
				return;
			}

			frame = window.requestAnimationFrame(function () {
				frame = null;
				apply(event);
			});
		}

		function onLeave() {
			if (frame) {
				window.cancelAnimationFrame(frame);
				frame = null;
			}

			el.style.transform = '';
		}

		el.addEventListener('pointermove', onMove);
		el.addEventListener('pointerleave', onLeave);
		el.addEventListener('blur', onLeave, true);
	}

	function init() {
		if (prefersReducedMotion() || !hasFinePointer()) {
			return;
		}

		Array.prototype.forEach.call(
			document.querySelectorAll(SELECTOR),
			bind
		);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

}(window, document));
