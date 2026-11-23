/* ============================================================
   HILDER NPS - achievements.js
   Achievements page only: PLE year selector with roving
   focus, arrow-key navigation, count-up and live updates.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var select = $('[data-ple-select]');
  var value = $('[data-ple-value]');
  var note = $('[data-ple-note]');

  if (!select || !value || !note) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var buttons = $$('[data-ple-year]', select);
  var rows = $$('[data-ple-row]');
  var animation = null;

  note.setAttribute('aria-live', 'polite');
  note.setAttribute('aria-atomic', 'true');

  var animateValue = function (target) {
    if (target === 0) {
      value.textContent = 'PLE';
      return;
    }
    if (animation !== null) window.cancelAnimationFrame(animation);

    if (prefersReducedMotion.matches) {
      value.textContent = String(target);
      return;
    }

    var from = Number(String(value.textContent).replace(/[^0-9.-]/g, '')) || 0;
    if (from === target) {
      value.textContent = String(target);
      return;
    }

    var duration = 520;
    var start = null;

    var tick = function (now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      value.textContent = String(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        animation = window.requestAnimationFrame(tick);
      } else {
        animation = null;
        value.textContent = String(target);
      }
    };

    animation = window.requestAnimationFrame(tick);
  };

  var activate = function (button, moveFocus) {
    var year = button.getAttribute('data-ple-year');
    var count = button.getAttribute('data-count');
    var extra = button.getAttribute('data-extra');
    var isHighlight = button.hasAttribute('data-highlight');

    buttons.forEach(function (item) {
      var isActive = item === button;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      item.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    rows.forEach(function (row) {
      row.classList.toggle('active', row.getAttribute('data-ple-row') === year);
    });

    animateValue(Number(count) || 0);
    var countNumber = Number(count) || 0;
    note.textContent = countNumber
      ? year + ' PLE cycle: ' + count + ' Division One' + (extra ? ', ' + extra : '')
      : 'Official PLE results are available directly from the school.';

    if (moveFocus) button.focus();
  };

  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () {
      activate(button);
    });

    button.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      var next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = (index + 1) % buttons.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next = (index - 1 + buttons.length) % buttons.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = buttons.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      activate(buttons[next], true);
    });
  });

  var initialButton =
    buttons.filter(function (button) {
      return button.getAttribute('aria-pressed') === 'true';
    })[0] || buttons[0];

  if (initialButton) activate(initialButton);

  /* Pause the count-up when the page is hidden mid-animation. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden || animation === null) return;
    window.cancelAnimationFrame(animation);
    animation = null;
    var active = buttons.filter(function (button) {
      return button.getAttribute('aria-pressed') === 'true';
    })[0];
    if (active) value.textContent = active.getAttribute('data-count');
  });
})();
