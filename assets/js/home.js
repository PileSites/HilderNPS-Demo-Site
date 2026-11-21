/* ============================================================
   HILDER NPS - home.js
   Home page only: tiled hero slideshow + stat count-up.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero slideshow ---------- */
  var slider = $('[data-hero-slider]');

  if (slider) {
    var slides = $$('[data-hero-slide]', slider);
    var dots = $$('[data-hero-dot]', slider);
    var previousButton = $('[data-hero-prev]', slider);
    var nextButton = $('[data-hero-next]', slider);
    var toggle = $('[data-hero-toggle]', slider);
    var playIcon = toggle ? $('[data-icon-play]', toggle) : null;
    var pauseIcon = toggle ? $('[data-icon-pause]', toggle) : null;
    var interval = 4000;
    var index = 0;
    var timer = null;
    var cleanupTimer = null;
    var pausedByUser = prefersReducedMotion.matches;
    var hovering = false;
    var focusWithin = false;
    var touchStartX = null;
    var preloaded = [];
    var transitionDuration = 1250;
    var tileColumns = 4;
    var tileRows = 3;

    slides.forEach(function (slide, slideIndex) {
      if (slide.classList.contains('is-active')) index = slideIndex;
    });

    var imageFor = function (slide) {
      return $('.hero-image-wrap > img', slide);
    };

    var setHidden = function (slide) {
      slide.classList.remove('is-active', 'is-previous');
      slide.setAttribute('aria-hidden', 'true');
      slide.setAttribute('inert', '');
    };

    var buildTiles = function (slide) {
      var wrap = $('.hero-image-wrap', slide);
      if (!wrap || $('.hero-tiles', wrap)) return;

      var source = imageFor(slide);
      var src = source && (source.currentSrc || source.getAttribute('src'));
      if (!src) return;

      var tiles = document.createElement('div');
      tiles.className = 'hero-tiles';
      tiles.setAttribute('aria-hidden', 'true');

      for (var row = 0; row < tileRows; row += 1) {
        for (var column = 0; column < tileColumns; column += 1) {
          var tile = document.createElement('span');
          tile.className = 'hero-tile';
          tile.style.setProperty('--col', column);
          tile.style.setProperty('--row', row);
          tile.style.setProperty('--cols', tileColumns);
          tile.style.setProperty('--rows', tileRows);
          tile.style.setProperty('--i', row * tileColumns + column);

          var tileImage = document.createElement('img');
          tileImage.src = src;
          tileImage.alt = '';
          tileImage.decoding = 'async';
          tileImage.setAttribute('aria-hidden', 'true');
          tile.appendChild(tileImage);
          tiles.appendChild(tile);
        }
      }

      var mask = $('.hero-image-mask', wrap);
      if (mask) {
        wrap.insertBefore(tiles, mask);
      } else {
        wrap.appendChild(tiles);
      }

      wrap.classList.add('has-tiles');
    };

    var preloadSlide = function (slide) {
      if (!slide) return;
      var slideIndex = slides.indexOf(slide);
      if (slideIndex < 0 || preloaded[slideIndex]) return;

      var source = imageFor(slide);
      var src = source && source.getAttribute('src');
      if (!src) return;

      preloaded[slideIndex] = new Image();
      preloaded[slideIndex].decoding = 'async';
      preloaded[slideIndex].src = src;
    };

    /* Build the next slide's tiles early and decode them, so the image
       is ready the moment the transition starts. */
    var warmed = [];
    var warmTimer = null;

    var warmSlide = function (slide) {
      if (!slide) return;
      var slideIndex = slides.indexOf(slide);
      if (slideIndex < 0 || warmed[slideIndex]) return;

      buildTiles(slide);

      var images = $$('.hero-tile img', slide);
      if (!images.length) return;

      warmed[slideIndex] = images.map(function (image) {
        return image.decode ? image.decode().catch(function () {}) : Promise.resolve();
      });
    };

    var scheduleWarm = function () {
      if (warmTimer !== null) window.clearTimeout(warmTimer);
      warmTimer = window.setTimeout(function () {
        warmTimer = null;
        warmSlide(slides[(index + 1) % slides.length]);
      }, 600);
    };

    var renderDots = function () {
      dots.forEach(function (dot, dotIndex) {
        var active = dotIndex === index;
        dot.classList.toggle('active', active);
        if (active) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
    };

    /* Screen-reader announcement for user-driven slide changes. */
    var liveRegion = document.createElement('p');
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    slider.appendChild(liveRegion);

    var announce = function () {
      var slide = slides[index];
      if (!slide) return;
      var heading = $('.hero-text h1, .hero-text h2', slide);
      var label = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';
      liveRegion.textContent =
        'Slide ' + (index + 1) + ' of ' + slides.length + (label ? ': ' + label : '');
    };

    var stopTimer = function () {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    var canPlay = function () {
      return !pausedByUser && !hovering && !focusWithin && !document.hidden;
    };

    var updateToggle = function () {
      if (!toggle) return;
      toggle.setAttribute('aria-label', pausedByUser ? 'Play slideshow' : 'Pause slideshow');
      if (playIcon) playIcon.hidden = !pausedByUser;
      if (pauseIcon) pauseIcon.hidden = pausedByUser;
    };

    var goTo = function (nextIndex, restart, userInitiated) {
      var total = slides.length;
      if (!total) return;

      var next = ((nextIndex % total) + total) % total;
      if (next === index) {
        if (restart) startTimer();
        return;
      }

      if (cleanupTimer !== null) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }

      var outgoing = slides[index];
      var incoming = slides[next];
      var settleDelay = prefersReducedMotion.matches ? 80 : transitionDuration;

      preloadSlide(incoming);
      buildTiles(incoming);

      slides.forEach(function (slide) {
        if (slide !== outgoing && slide !== incoming) setHidden(slide);
      });

      if (outgoing) {
        outgoing.classList.remove('is-active');
        outgoing.classList.add('is-previous');
        outgoing.setAttribute('aria-hidden', 'true');
        outgoing.setAttribute('inert', '');
      }

      incoming.classList.remove('is-previous');
      incoming.classList.add('is-active');
      incoming.setAttribute('aria-hidden', 'false');
      incoming.removeAttribute('inert');

      index = next;
      renderDots();
      preloadSlide(slides[(index + 1) % total]);

      /* Keep the visual slide and the announced slide in sync. */
      if (userInitiated) announce();

      cleanupTimer = window.setTimeout(function () {
        if (outgoing) outgoing.classList.remove('is-previous');
        cleanupTimer = null;
        scheduleWarm();
      }, settleDelay);

      if (restart) startTimer();
    };

    function startTimer() {
      stopTimer();
      if (!canPlay()) return;
      timer = window.setInterval(function () {
        goTo(index + 1);
      }, interval);
    }

    slides.forEach(function (slide, slideIndex) {
      if (slideIndex === index) {
        slide.classList.add('is-active');
        slide.classList.remove('is-previous');
        slide.setAttribute('aria-hidden', 'false');
        slide.removeAttribute('inert');
        buildTiles(slide);
      } else {
        setHidden(slide);
      }
    });

    renderDots();
    preloadSlide(slides[(index + 1) % slides.length]);
    updateToggle();
    startTimer();
    scheduleWarm();

    if (previousButton) {
      previousButton.addEventListener('click', function () {
        goTo(index - 1, true, true);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        goTo(index + 1, true, true);
      });
    }

    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () {
        pausedByUser = true;
        updateToggle();
        stopTimer();
        goTo(dotIndex, false, true);
      });
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        pausedByUser = !pausedByUser;
        updateToggle();
        if (pausedByUser) {
          stopTimer();
        } else {
          startTimer();
        }
      });
    }

    slider.addEventListener('mouseenter', function () {
      hovering = true;
      stopTimer();
    });

    slider.addEventListener('mouseleave', function () {
      hovering = false;
      startTimer();
    });

    slider.addEventListener('focusin', function () {
      focusWithin = true;
      stopTimer();
    });

    slider.addEventListener('focusout', function (event) {
      if (slider.contains(event.relatedTarget)) return;
      focusWithin = false;
      startTimer();
    });

    /* Arrow / Home / End keys drive the slideshow from anywhere inside it. */
    slider.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      var target = null;
      if (event.key === 'ArrowLeft') {
        target = index - 1;
      } else if (event.key === 'ArrowRight') {
        target = index + 1;
      } else if (event.key === 'Home') {
        target = 0;
      } else if (event.key === 'End') {
        target = slides.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      goTo(target, true, true);
    });

    var handleMotionPreference = function (event) {
      if (!event.matches) return;
      pausedByUser = true;
      updateToggle();
      stopTimer();
    };

    if (prefersReducedMotion.addEventListener) {
      prefersReducedMotion.addEventListener('change', handleMotionPreference);
    } else if (prefersReducedMotion.addListener) {
      prefersReducedMotion.addListener(handleMotionPreference);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    slider.addEventListener(
      'touchstart',
      function (event) {
        touchStartX = event.changedTouches[0].clientX;
      },
      { passive: true }
    );

    slider.addEventListener(
      'touchend',
      function (event) {
        if (touchStartX === null) return;
        var distance = event.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(distance) < 50) return;
        goTo(index + (distance < 0 ? 1 : -1), true);
      },
      { passive: true }
    );
  }

  /* ---------- Count-up statistics ---------- */
  var counters = $$('[data-count-to]');

  if (counters.length) {
    var setFinalValues = function () {
      counters.forEach(function (counter) {
        counter.textContent = counter.getAttribute('data-count-to');
      });
    };

    var animateCounter = function (counter) {
      var target = Number(counter.getAttribute('data-count-to'));
      if (!isFinite(target)) return;

      var duration = 1600;
      var startTime = null;

      var step = function (now) {
        if (startTime === null) startTime = now;
        var progress = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = String(Math.round(eased * target));
        if (progress < 1) window.requestAnimationFrame(step);
      };

      counter.textContent = '0';
      window.requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window) || prefersReducedMotion.matches) {
      setFinalValues();
    } else {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            counterObserver.unobserve(entry.target);
            animateCounter(entry.target);
          });
        },
        { threshold: 0.4 }
      );

      counters.forEach(function (counter) {
        counterObserver.observe(counter);
      });
    }
  }
})();
