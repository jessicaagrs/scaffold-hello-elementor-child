/**
 * GSAP #1 — Reveal.
 *
 * Classe: .js-reveal
 *
 * Usa gsap.fromTo(): o estado inicial e responsabilidade do GSAP, nunca do CSS.
 * Se o JS falhar, o elemento continua visivel.
 *
 * Por padrao a animacao acontece UMA vez (once: true) e o ScrollTrigger se
 * remove em seguida. Com data-reveal-replay o trigger fica vivo e a animacao
 * se desfaz ao subir, repetindo na proxima descida.
 *
 * data-attributes (todos opcionais):
 *   data-reveal-y         deslocamento vertical inicial em px   (padrao 50)
 *   data-reveal-x         deslocamento horizontal inicial em px (padrao 0)
 *   data-reveal-scale     escala inicial                        (padrao 1)
 *   data-reveal-duration  duracao em segundos                   (padrao 1)
 *   data-reveal-delay     atraso em segundos                    (padrao 0)
 *   data-reveal-stagger   se > 0, anima os filhos em cascata    (padrao 0)
 *   data-reveal-ease      easing do GSAP                        (padrao power3.out)
 *   data-reveal-start     start do ScrollTrigger                (padrao "top 85%")
 *   data-reveal-replay    re-anima ao voltar ao topo            (padrao ausente)
 *
 * Exemplo no Elementor (Avancado > Atributos personalizados):
 *   class|js-reveal
 *   data-reveal-y|80
 *   data-reveal-stagger|0.12
 *   data-reveal-replay|true
 */
(function (window, document) {
	'use strict';

	if (!window.SiteAnim) {
		return;
	}

	window.SiteAnim.register('reveal', function (app) {

		var gsap = window.gsap;
		var elements = document.querySelectorAll('.js-reveal');

		if (!elements.length) {
			return null;
		}

		Array.prototype.forEach.call(elements, function (el) {

			var stagger = app.num(el, 'data-reveal-stagger', 0);
			var children = Array.prototype.slice.call(el.children);
			// Presenca do atributo = true; 'false' e '0' desligam.
			var replayAttr = el.getAttribute('data-reveal-replay');
			var replay = replayAttr !== null && replayAttr !== 'false' && replayAttr !== '0';

			// Com stagger, quem anima sao os filhos diretos; sem, o proprio elemento.
			var targets = (stagger > 0 && children.length) ? children : el;

			// Anima apenas transform e opacity: sem reflow.
			gsap.fromTo(targets, {
				y: app.num(el, 'data-reveal-y', 50),
				x: app.num(el, 'data-reveal-x', 0),
				scale: app.num(el, 'data-reveal-scale', 1),
				autoAlpha: 0
			}, {
				y: 0,
				x: 0,
				scale: 1,
				autoAlpha: 1,
				duration: app.num(el, 'data-reveal-duration', 1),
				delay: app.num(el, 'data-reveal-delay', 0),
				stagger: stagger,
				ease: app.str(el, 'data-reveal-ease', 'power3.out'),
				scrollTrigger: {
					trigger: el,
					start: app.str(el, 'data-reveal-start', 'top 85%'),
					// Sem replay o trigger dispara e se remove.
					once: !replay,
					// So tem efeito quando once e false.
					toggleActions: 'play none none reverse'
				}
			});
		});

		app.log('reveal: ' + elements.length + ' elemento(s).');

		return null;
	});

}(window, document));
