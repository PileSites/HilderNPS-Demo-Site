/* ============================================================
   HILDER NPS - main.js
   Shared behaviour for every page: navigation, mobile drawer,
   scroll lock, scroll progress, reveal-on-scroll, back-to-top
   and the footer year.
   No dependencies. Loaded with `defer` on every page.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var nav = $('#site-nav');
  var scrollProgress = $('#scroll-progress');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Scroll lock (shared with gallery.js) ---------- */
  var lockCount = 0;
  var lockPadding = 0;

  var scrollLock = {
    lock: function () {
      lockCount += 1;
      if (lockCount > 1) return;

      lockPadding = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (lockPadding > 0) {
        document.body.style.paddingRight = lockPadding + 'px';
        if (nav) nav.style.paddingRight = lockPadding + 'px';
      }

      document.body.classList.add('scroll-locked');
    },
    unlock: function () {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;

      document.body.classList.remove('scroll-locked');
      document.body.style.paddingRight = '';
      if (nav) nav.style.paddingRight = '';
    },
  };

  window.HILDER = window.HILDER || {};
  window.HILDER.scrollLock = scrollLock;

  /* ---------- Sticky / transparent navigation ---------- */
  function updateNav() {
    if (!nav) return;
    var scrolled = window.scrollY > 20;
    nav.classList.toggle('scrolled', scrolled);
    nav.classList.toggle('hero-top', !scrolled);
  }

  function updateScrollProgress() {
    if (!scrollProgress) return;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var value = total > 0 ? (window.scrollY / total) * 100 : 0;
    scrollProgress.style.width = Math.max(0, Math.min(100, value)) + '%';
  }

  /* ---------- Back to top ---------- */
  var backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.setAttribute('aria-hidden', 'true');
  backToTop.tabIndex = -1;
  backToTop.innerHTML =
    '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-arrow-right"></use></svg>';
  document.body.appendChild(backToTop);

  var backToTopVisible = false;

  function updateBackToTop() {
    var shouldShow = window.scrollY > Math.max(600, window.innerHeight * 0.9);
    if (shouldShow === backToTopVisible) return;

    backToTopVisible = shouldShow;
    backToTop.classList.toggle('is-visible', shouldShow);
    backToTop.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    backToTop.tabIndex = shouldShow ? 0 : -1;
  }

  backToTop.addEventListener('click', function () {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    });
  });

  /* ---------- Single throttled scroll loop ---------- */
  var scrollTicking = false;

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      updateNav();
      updateScrollProgress();
      updateBackToTop();
      scrollTicking = false;
    });
  }

  updateNav();
  updateScrollProgress();
  updateBackToTop();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);

  /* ---------- Mobile drawer ---------- */
  var menuBtn = $('#menu-toggle');
  var drawer = $('#mobile-drawer');
  var drawerBackdrop = $('#drawer-backdrop');
  var drawerClose = $('#drawer-close');

  if (menuBtn && drawer && drawerBackdrop) {
    var lastFocused = null;
    var backgroundElements = $$('main, footer');

    if (!drawer.hasAttribute('tabindex')) drawer.setAttribute('tabindex', '-1');

    var isOpen = function () {
      return drawer.classList.contains('open');
    };

    var focusWithoutScroll = function (element) {
      if (!element || typeof element.focus !== 'function') return;
      try {
        element.focus({ preventScroll: true });
      } catch (error) {
        element.focus();
      }
    };

    var focusableInDrawer = function () {
      return $$('a[href], button:not([disabled])', drawer).filter(function (element) {
        return element.offsetParent !== null;
      });
    };

    var setBackgroundInert = function (inert) {
      backgroundElements.forEach(function (element) {
        if (inert) {
          element.setAttribute('inert', '');
          element.setAttribute('aria-hidden', 'true');
        } else {
          element.removeAttribute('inert');
          element.removeAttribute('aria-hidden');
        }
      });
    };

    var openDrawer = function () {
      if (isOpen()) return;

      lastFocused = document.activeElement;
      drawer.classList.add('open');
      drawerBackdrop.classList.add('open');
      drawer.removeAttribute('inert');
      drawer.setAttribute('aria-hidden', 'false');
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close menu');

      if (drawerClose) {
        focusWithoutScroll(drawerClose);
      } else {
        focusWithoutScroll(drawer);
      }

      setBackgroundInert(true);
      scrollLock.lock();
    };

    var closeDrawer = function (restoreFocus) {
      if (!isOpen()) return;

      drawer.classList.remove('open');
      drawerBackdrop.classList.remove('open');
      drawer.setAttribute('inert', '');
      drawer.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
      setBackgroundInert(false);
      scrollLock.unlock();

      if (restoreFocus !== false) {
        var target =
          lastFocused && lastFocused !== document.body && lastFocused !== document.documentElement
            ? lastFocused
            : menuBtn;
        focusWithoutScroll(target);
      }
    };

    menuBtn.addEventListener('click', function () {
      if (isOpen()) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (drawerClose) {
      drawerClose.addEventListener('click', function () {
        closeDrawer();
      });
    }

    drawerBackdrop.addEventListener('click', function () {
      closeDrawer();
    });

    $$('a', drawer).forEach(function (link) {
      link.addEventListener('click', function () {
        closeDrawer(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab') return;

      var focusable = focusableInDrawer();
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* Keep focus inside the drawer even when something outside steals it. */
    document.addEventListener('focusin', function (event) {
      if (!isOpen() || drawer.contains(event.target)) return;
      var focusable = focusableInDrawer();
      if (focusable.length) focusable[0].focus();
    });

    /* Swipe right to dismiss on touch devices. */
    var drag = null;

    drawer.addEventListener('pointerdown', function (event) {
      if (!isOpen() || event.pointerType === 'mouse') return;
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        distance: 0,
        active: false,
      };
    });

    drawer.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;

      var deltaX = event.clientX - drag.startX;
      var deltaY = event.clientY - drag.startY;

      if (!drag.active) {
        if (Math.abs(deltaX) < 12 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        drag.active = true;
        drawer.style.transition = 'none';
      }

      drag.distance = Math.max(0, deltaX);
      drawer.style.transform = 'translate3d(' + drag.distance + 'px, 0, 0)';
    });

    var endDrag = function (event) {
      if (!drag || (event && event.pointerId !== drag.id)) return;

      var distance = drag.distance;
      var active = drag.active;
      drag = null;

      if (!active) return;

      drawer.style.transition = '';
      drawer.style.transform = '';

      if (distance > drawer.offsetWidth * 0.3) closeDrawer();
    };

    drawer.addEventListener('pointerup', endDrag);
    drawer.addEventListener('pointercancel', endDrag);

    var wideScreen = window.matchMedia('(min-width: 1001px)');
    var handleWideScreen = function (event) {
      if (event.matches && isOpen()) closeDrawer(false);
    };

    if (wideScreen.addEventListener) {
      wideScreen.addEventListener('change', handleWideScreen);
    } else if (wideScreen.addListener) {
      wideScreen.addListener(handleWideScreen);
    }

    /* A back/forward restore should never leave the page locked. */
    window.addEventListener('pageshow', function () {
      if (isOpen()) closeDrawer(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealElements = $$('.reveal-on-scroll, .reveal-img');

  if (!revealElements.length) {
    // Nothing to animate.
  } else if (!('IntersectionObserver' in window) || prefersReducedMotion.matches) {
    revealElements.forEach(function (element) {
      element.classList.add('visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(function (element) {
      observer.observe(element);
    });

    // Safety net for short pages or browsers that miss an intersection.
    window.setTimeout(function () {
      revealElements.forEach(function (element) {
        if (!element.classList.contains('visible')) element.classList.add('visible');
      });
    }, 4000);
  }

  /* ---------- Footer year ---------- */
  var year = $('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
