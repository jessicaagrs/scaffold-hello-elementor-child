/**
 * Smooth scroll com Lenis, sincronizado com o ScrollTrigger.
 *
 * O loop de animacao e o gsap.ticker — por isso `autoRaf: false`. Deixar os
 * dois rodando causaria dois requestAnimationFrame concorrentes e scroll travado.
 *
 * Ativado por 'lenis' => true em inc/config.php.
 */
(function (window) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	window.SiteAnim.register('smooth-scroll', function (app) {

		if (!app.settings.lenis || !window.Lenis) {
			return null;
		}

		var gsap = window.gsap;
		var ScrollTrigger = window.ScrollTrigger;

		var options = {};
		var configured = app.settings.lenisOptions || {};

		Object.keys(configured).forEach(function (key) {
			options[key] = configured[key];
		});

		// Quem controla o loop e o gsap.ticker.
		options.autoRaf = false;

		var lenis = new window.Lenis(options);

		// Toda vez que o Lenis rola, o ScrollTrigger recalcula.
		lenis.on('scroll', ScrollTrigger.update);

		function raf(time) {
			// gsap.ticker entrega segundos; Lenis espera milissegundos.
			lenis.raf(time * 1000);
		}

		gsap.ticker.add(raf);

		// Sem suavizacao de lag: o Lenis ja interpola.
		gsap.ticker.lagSmoothing(0);

		// Exposto para uso pontual: SiteAnim.lenis.scrollTo('#contato')
		app.lenis = lenis;

		app.log('Lenis iniciado.');

		return {
			destroy: function () {
				gsap.ticker.remove(raf);
				gsap.ticker.lagSmoothing(500, 33);
				lenis.destroy();
				app.lenis = null;
			}
		};
	});

}(window));
