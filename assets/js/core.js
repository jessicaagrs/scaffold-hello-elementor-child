/**
 * SiteAnim — nucleo da camada de animacoes.
 *
 * Responsabilidades:
 *   - expor um registry para os modulos (reveal, parallax, hscroll, lenis...)
 *   - decidir SE as animacoes devem rodar (reduced motion, editor do Elementor)
 *   - criar tudo dentro de um gsap.context(), o que permite destruir o conjunto
 *     inteiro sem vazar ScrollTriggers
 *
 * Nenhum modulo inicializa sozinho. O kickoff no fim deste arquivo dispara no
 * DOMContentLoaded, quando todos os scripts `defer` ja rodaram.
 */
(function (window, document) {
	'use strict';

	var settings = window.hcSettings || {};
	var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	var pluginsRegistered = false;

	/**
	 * Estamos rodando dentro do editor do Elementor?
	 * O PHP ja evita enfileirar os scripts la, mas a checagem no cliente cobre
	 * previews e casos em que algum plugin injeta os scripts por conta propria.
	 */
	function isElementorEditor() {
		return !!(
			window.elementorFrontend &&
			typeof window.elementorFrontend.isEditMode === 'function' &&
			window.elementorFrontend.isEditMode()
		);
	}

	function debounce(fn, wait) {
		var timer = null;

		return function () {
			var args = arguments;
			var self = this;

			window.clearTimeout(timer);
			timer = window.setTimeout(function () {
				fn.apply(self, args);
			}, wait);
		};
	}

	var SiteAnim = {

		settings: settings,

		/** Modulos registrados: { name, fn }. */
		modules: [],

		/** Objetos com .destroy() devolvidos pelos modulos. */
		instances: [],

		/** gsap.context() atual — reverte tudo de uma vez. */
		ctx: null,

		/** Evita init() duplicado. */
		ready: false,

		/**
		 * O usuario pediu menos movimento no sistema operacional?
		 * @return {boolean}
		 */
		isReduced: function () {
			return motionQuery.matches;
		},

		/**
		 * Registra um modulo de animacao.
		 *
		 * A funcao recebe o proprio SiteAnim e pode devolver um objeto com
		 * `destroy()` para limpeza manual (coisas que o gsap.context nao cobre,
		 * como a instancia do Lenis).
		 *
		 * @param {string}   name Nome do modulo (aparece nos logs).
		 * @param {Function} fn   Funcao de setup.
		 */
		register: function (name, fn) {
			if (typeof fn !== 'function') {
				return;
			}

			this.modules.push({ name: name, fn: fn });
		},

		/**
		 * Cria todas as animacoes. Idempotente.
		 */
		init: function () {
			if (this.ready) {
				return;
			}

			if (isElementorEditor()) {
				this.log('editor do Elementor detectado — animacoes desligadas.');
				return;
			}

			if (!window.gsap || !window.ScrollTrigger) {
				this.log('GSAP ou ScrollTrigger ausente — animacoes desligadas.');
				return;
			}

			if (!pluginsRegistered) {
				window.gsap.registerPlugin(window.ScrollTrigger);
				pluginsRegistered = true;
			}

			// prefers-reduced-motion: nao cria nada.
			// Como todas as animacoes usam gsap.from()/fromTo(), os elementos
			// permanecem no estado natural (visiveis). Nenhum opacity:0 no CSS.
			if (this.isReduced()) {
				this.log('prefers-reduced-motion ativo — animacoes desligadas.');
				return;
			}

			var self = this;

			this.ctx = window.gsap.context(function () {
				self.modules.forEach(function (module) {
					try {
						var instance = module.fn(self);

						if (instance && typeof instance.destroy === 'function') {
							self.instances.push(instance);
						}
					} catch (error) {
						window.console.error('[SiteAnim] modulo "' + module.name + '" falhou:', error);
					}
				});
			});

			this.ready = true;
			this.log('inicializado com ' + this.modules.length + ' modulo(s).');
		},

		/**
		 * Destroi tudo que foi criado por init().
		 */
		destroy: function () {
			this.instances.forEach(function (instance) {
				try {
					instance.destroy();
				} catch (error) {
					window.console.error('[SiteAnim] falha ao destruir instancia:', error);
				}
			});

			this.instances.length = 0;

			if (this.ctx) {
				this.ctx.revert();
				this.ctx = null;
			}

			this.ready = false;
			this.log('destruido.');
		},

		/**
		 * Recalcula posicoes. Barato — use apos mudancas de layout
		 * (imagens carregando, abas, popups, accordions).
		 */
		refresh: function () {
			if (window.ScrollTrigger) {
				window.ScrollTrigger.refresh();
			}
		},


		/* --- helpers de data-attributes, usados pelos modulos --- */

		/**
		 * Le um data-attribute numerico.
		 *
		 * @param {Element} el       Elemento.
		 * @param {string}  attr     Nome do atributo.
		 * @param {number}  fallback Valor padrao.
		 * @return {number}
		 */
		num: function (el, attr, fallback) {
			var value = parseFloat(el.getAttribute(attr));

			return isNaN(value) ? fallback : value;
		},

		/**
		 * Le um data-attribute de texto.
		 *
		 * @param {Element} el       Elemento.
		 * @param {string}  attr     Nome do atributo.
		 * @param {string}  fallback Valor padrao.
		 * @return {string}
		 */
		str: function (el, attr, fallback) {
			var value = el.getAttribute(attr);

			return (value === null || value === '') ? fallback : value;
		},


		log: function (message) {
			if (settings.debug) {
				window.console.log('[SiteAnim] ' + message);
			}
		}
	};

	/* ---------------------------------------------------------------------
	 * Reacoes a mudancas de contexto
	 * ------------------------------------------------------------------ */

	// O usuario ligou/desligou "reduzir movimento" com a pagina aberta.
	function onMotionPreferenceChange() {
		if (motionQuery.matches) {
			SiteAnim.destroy();
		} else {
			SiteAnim.init();
		}
	}

	motionQuery.addEventListener('change', onMotionPreferenceChange);

	// Imagens/fontes terminando de carregar mudam as alturas: recalcula.
	// O init() aqui e so rede de seguranca (script injetado tarde); e
	// idempotente, entao no fluxo normal nao faz nada.
	window.addEventListener('load', function () {
		SiteAnim.init();
		SiteAnim.refresh();
	});

	// Elementor renderiza widgets dinamicamente (popups, abas, lightbox).
	// Um refresh debounced e suficiente e nao recria ScrollTriggers.
	var debouncedRefresh = debounce(function () {
		SiteAnim.refresh();
	}, 200);

	// Lazy load (LiteSpeed, Elementor ou loading="lazy" nativo) traz imagens
	// DEPOIS do evento 'load' — as alturas mudam e os ScrollTriggers ficam
	// defasados. Ouvir o 'load' de cada midia cobre qualquer implementacao,
	// sem depender de eventos proprietarios de plugin.
	//
	// Fase de captura obrigatoria: 'load' de img/iframe nao borbulha.
	document.addEventListener('load', function (event) {
		var tag = event.target && event.target.tagName;

		if (tag === 'IMG' || tag === 'IFRAME') {
			debouncedRefresh();
		}
	}, true);

	// O evento so dispara depois que o elementorFrontend.hooks existe — por isso
	// nao ha versao "caso ja tenha inicializado": com defer, este script sempre roda antes.
	if (window.jQuery) {
		window.jQuery(window).on('elementor/frontend/init', function () {
			window.elementorFrontend.hooks.addAction('frontend/element_ready/global', debouncedRefresh);
		});
	}

	window.SiteAnim = SiteAnim;

	// Kickoff. Com `defer` todos os modulos ja se registraram quando o
	// DOMContentLoaded dispara — por isso a inicializacao mora aqui, e nao em
	// um script separado no fim da fila.
	if (document.readyState === 'complete') {
		SiteAnim.init();
	} else {
		document.addEventListener('DOMContentLoaded', function () {
			SiteAnim.init();
		});
	}

}(window, document));
