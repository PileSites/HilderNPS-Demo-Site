/* ============================================================
   HILDER NPS - gallery.js
   Gallery page only: native <dialog> lightbox with keyboard,
   swipe, focus restoration and shared page scroll locking.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var gallery = $('[data-gallery]');
  var dialog = $('#lightbox');

  if (!gallery || !dialog) return;

  var items = $$('[data-gallery-item]', gallery);
  if (!items.length) return;

  var image = $('[data-lightbox-img]', dialog);
  var caption = $('[data-lightbox-caption]', dialog);
  var counter = $('[data-lightbox-count]', dialog);
  var closeButton = $('[data-lightbox-close]', dialog);
  var previousButton = $('[data-lightbox-prev]', dialog);
  var nextButton = $('[data-lightbox-next]', dialog);
  var inner = $('.lightbox-inner', dialog) || dialog;

  var currentIndex = 0;
  var lastTrigger = null;
  var isOpen = false;

  var scrollLock = (window.HILDER && window.HILDER.scrollLock) || {
    lock: function () {
      document.body.classList.add('scroll-locked');
    },
    unlock: function () {
      document.body.classList.remove('scroll-locked');
    },
  };

  var imageData = items.map(function (item) {
    var img = $('img', item);
    return {
      src: item.getAttribute('data-src') || (img ? img.getAttribute('src') : ''),
      alt: (img && img.getAttribute('alt')) || 'Hilder NPS photograph',
    };
  });

  if (image) image.setAttribute('draggable', 'false');

  if (caption) {
    caption.setAttribute('aria-live', 'polite');
    caption.setAttribute('aria-atomic', 'true');
  }

  var render = function () {
    var data = imageData[currentIndex];
    if (!data || !image) return;
    image.setAttribute('src', data.src);
    image.setAttribute('alt', data.alt);
    if (caption) caption.textContent = data.alt;
    if (counter) counter.textContent = currentIndex + 1 + ' / ' + imageData.length;
  };

  var preload = function (index) {
    var data = imageData[(index + imageData.length) % imageData.length];
    if (!data || !data.src) return;
    var loader = new Image();
    loader.src = data.src;
  };

  var preloadNeighbours = function () {
    preload(currentIndex - 1);
    preload(currentIndex + 1);
  };

  var openLightbox = function (index, trigger) {
    currentIndex = ((index % imageData.length) + imageData.length) % imageData.length;
    lastTrigger = trigger || document.activeElement;
    render();
    preloadNeighbours();

    scrollLock.lock();
    isOpen = true;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    if (closeButton) closeButton.focus();
  };

  var closeLightbox = function () {
    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
      /* Some engines close the dialog without firing `close`. Release
         the scroll lock here; finishClose() is idempotent. */
      finishClose();
    } else if (dialog.hasAttribute('open')) {
      dialog.removeAttribute('open');
      finishClose();
    }
  };

  var finishClose = function () {
    if (!isOpen) return;
    isOpen = false;
    scrollLock.unlock();
    resetDrag(true);

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  };

  var step = function (direction) {
    if (!isOpen) return;
    currentIndex = (currentIndex + direction + imageData.length) % imageData.length;
    render();
    preloadNeighbours();
  };

  items.forEach(function (item, index) {
    item.addEventListener('click', function () {
      openLightbox(index, item);
    });
  });

  if (closeButton) closeButton.addEventListener('click', closeLightbox);
  if (previousButton) {
    previousButton.addEventListener('click', function () {
      step(-1);
    });
  }
  if (nextButton) {
    nextButton.addEventListener('click', function () {
      step(1);
    });
  }

  dialog.addEventListener('click', function (event) {
    /* Only a click on the dialog itself (the padded backdrop) closes. */
    if (event.target === dialog) closeLightbox();
  });

  dialog.addEventListener('close', finishClose);

  dialog.addEventListener('cancel', function (event) {
    /* Native Escape is fine; just make sure the lock is released. */
    event.preventDefault();
    closeLightbox();
  });

  document.addEventListener('keydown', function (event) {
    if (!isOpen) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      currentIndex = 0;
      render();
      preloadNeighbours();
    } else if (event.key === 'End') {
      event.preventDefault();
      currentIndex = imageData.length - 1;
      render();
      preloadNeighbours();
    }
  });

  /* ---------- Swipe to browse (touch + pen) ---------- */
  var drag = null;
  var DRAG_THRESHOLD = 45;

  var resetDrag = function (immediate) {
    if (!image) return;
    image.style.transition = immediate ? 'none' : '';
    image.style.transform = '';
    image.style.opacity = '';
    if (immediate) {
      /* Force a reflow so the next transition starts from rest. */
      void image.offsetWidth;
      image.style.transition = '';
    }
  };

  inner.addEventListener('pointerdown', function (event) {
    if (!isOpen || event.pointerType === 'mouse') return;
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      distance: 0,
      active: false,
    };
  });

  inner.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;

    var deltaX = event.clientX - drag.startX;
    var deltaY = event.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(deltaX) < 12) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        drag = null;
        return;
      }
      drag.active = true;
      if (image) image.style.transition = 'none';
    }

    drag.distance = deltaX;
    if (image) {
      var fade = Math.min(0.5, Math.abs(deltaX) / 480);
      image.style.transform = 'translate3d(' + deltaX + 'px, 0, 0)';
      image.style.opacity = String(1 - fade);
    }
  });

  var endDrag = function (event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;

    var distance = drag.distance;
    var active = drag.active;
    drag = null;

    if (!active) return;

    if (Math.abs(distance) > DRAG_THRESHOLD) {
      resetDrag(true);
      step(distance < 0 ? 1 : -1);
    } else {
      resetDrag(false);
    }
  };

  inner.addEventListener('pointerup', endDrag);
  inner.addEventListener('pointercancel', endDrag);

  /* Leaving the page with a lightbox open should never trap scrolling. */
  window.addEventListener('pageshow', function () {
    if (isOpen) {
      isOpen = false;
      scrollLock.unlock();
    }
  });
})();
