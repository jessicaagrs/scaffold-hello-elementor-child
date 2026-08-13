/**
 * GSAP #3 — Horizontal scroll.
 *
 * Classes: .js-hscroll (secao que sera fixada)
 *            > .js-hscroll__track (linha que desliza na horizontal)
 *
 * A secao e fixada (pin) e o track desliza no eixo X enquanto o usuario rola.
 * Usa gsap.matchMedia() para se desligar sozinho no mobile e se religar no
 * resize, sem deixar ScrollTrigger orfao.
 *
 * data-attributes (opcionais, na secao):
 *   data-hscroll-min-width  largura minima em px para ativar (padrao 1024)
 *   data-hscroll-scrub      suavidade do scrub em segundos   (padrao 1)
 *
 * Estrutura no Elementor:
 *   Container  -> class|js-hscroll
 *     Container -> class|js-hscroll__track
 *       Container -> class|js-hscroll__item
 *       Container -> class|js-hscroll__item
 *       ...
 */
(function (window, document) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	window.SiteAnim.register('horizontal-scroll', function (app) {

		var gsap = window.gsap;
		var sections = document.querySelectorAll('.js-hscroll');

		if (!sections.length) {
			return null;
		}

		var mm = gsap.matchMedia();
		var count = 0;

		Array.prototype.forEach.call(sections, function (section) {

			var track = section.querySelector('.js-hscroll__track');

			if (!track) {
				window.console.warn('[SiteAnim] .js-hscroll sem .js-hscroll__track:', section);
				return;
			}

			var minWidth = app.num(section, 'data-hscroll-min-width', 1024);
			var scrub = app.num(section, 'data-hscroll-scrub', 1);

			count++;

			mm.add('(min-width: ' + minWidth + 'px)', function () {

				// Recalculado a cada refresh gracas a invalidateOnRefresh.
				function distance() {
					return Math.max(0, track.scrollWidth - window.innerWidth);
				}

				gsap.to(track, {
					x: function () {
						return -distance();
					},
					ease: 'none',
					scrollTrigger: {
						trigger: section,
						start: 'top top',
						end: function () {
							return '+=' + distance();
						},
						pin: true,
						scrub: scrub,
						anticipatePin: 1,
						invalidateOnRefresh: true
					}
				});

				// O cleanup do matchMedia e automatico: tudo criado aqui dentro
				// e revertido quando a media query deixa de bater.
			});
		});

		app.log('horizontal-scroll: ' + count + ' secao(oes).');

		return {
			destroy: function () {
				mm.revert();
			}
		};
	});

}(window, document));
