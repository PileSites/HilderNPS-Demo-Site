/* ============================================================
   HILDER NPS - academics.js
   Academics page only: accessible vertical programme tabs.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var tablist = $('[data-program-tabs]');
  if (!tablist) return;

  var tabs = $$('[role="tab"]', tablist);

  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  });

  var activate = function (tab, moveFocus) {
    tabs.forEach(function (item, index) {
      var isActive = item === tab;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      item.setAttribute('tabindex', isActive ? '0' : '-1');
      if (panels[index]) {
        panels[index].hidden = !isActive;
        panels[index].classList.toggle('is-active', isActive);
      }
    });

    if (moveFocus) tab.focus();
  };

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      activate(tab, false);
    });

    tab.addEventListener('keydown', function (event) {
      var nextIndex = null;

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex === null) return;
      event.preventDefault();
      activate(tabs[nextIndex], true);
    });
  });

  var initialTab = tabs.filter(function (tab) {
    return tab.getAttribute('aria-selected') === 'true';
  })[0];

  if (initialTab) activate(initialTab, false);
})();
