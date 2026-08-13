/**
 * GSAP #2 — Parallax.
 *
 * Classe: .js-parallax
 *
 * O elemento se desloca em ritmo diferente do scroll. Amarrado ao scroll via
 * `scrub` — sem nenhum listener de scroll proprio.
 *
 * IMPORTANTE: o elemento pai precisa de `overflow: hidden` e o elemento
 * animado precisa sobrar area (ex.: `height: 120%`). A classe utilitaria
 * `.parallax-wrap` em components.css ja faz isso.
 *
 * data-attributes (todos opcionais):
 *   data-parallax-speed  intensidade, 0 a 1  (padrao 0.2)
 *   data-parallax-axis   "y" ou "x"          (padrao "y")
 *
 * Exemplo no Elementor:
 *   container -> class|parallax-wrap
 *     imagem  -> class|js-parallax
 *                data-parallax-speed|0.35
 */
(function (window, document) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	window.SiteAnim.register('parallax', function (app) {

		var gsap = window.gsap;
		var elements = document.querySelectorAll('.js-parallax');

		if (!elements.length) {
			return null;
		}

		Array.prototype.forEach.call(elements, function (el) {

			var speed = app.num(el, 'data-parallax-speed', 0.2);
			var axis = app.str(el, 'data-parallax-axis', 'y').toLowerCase();
			var amount = speed * 100;
			var prop = (axis === 'x') ? 'xPercent' : 'yPercent';

			var from = {};
			var to = {
				ease: 'none',
				scrollTrigger: {
					trigger: el,
					start: 'top bottom',
					end: 'bottom top',
					scrub: true,
					invalidateOnRefresh: true
				}
			};

			from[prop] = -amount / 2;
			to[prop] = amount / 2;

			gsap.fromTo(el, from, to);
		});

		app.log('parallax: ' + elements.length + ' elemento(s).');

		return null;
	});

}(window, document));
