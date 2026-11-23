/* ============================================================
   HILDER NPS - forms.js
   Admissions and contact enquiry forms: accessible validation,
   Encodes enquiries for WhatsApp when data-whatsapp is set.
   See README.md for the enquiry setup.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };

  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  var forms = $$('[data-enquiry-form]');
  if (!forms.length) return;

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var phonePattern = /^[+0-9\s()-]{7,}$/;

  forms.forEach(function (form) {
    var notice = $('[data-form-notice]', form);
    var submitButton = $('[type="submit"]', form);
    var submitMarkup = submitButton ? submitButton.innerHTML : '';
    var submitting = false;
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var recipient = (form.getAttribute('data-recipient') || '').trim();
    var whatsapp = (form.getAttribute('data-whatsapp') || '').trim();

    var fields = {
      parent: form.elements.parent,
      phone: form.elements.phone,
      email: form.elements.email,
      childClass: form.elements.childClass,
      section: form.elements.section,
      campus: form.elements.campus,
      message: form.elements.message,
    };

    var rules = [
      {
        name: 'parent',
        required: true,
        isEmpty: function (field) {
          return !field.value.trim();
        },
        message: 'Please enter the parent or guardian name.',
      },
      {
        name: 'phone',
        required: true,
        isEmpty: function (field) {
          return !field.value.trim();
        },
        isValid: function (field) {
          return phonePattern.test(field.value.trim());
        },
        message: 'Please enter a telephone number we can reach you on.',
      },
      {
        name: 'email',
        required: false,
        isValid: function (field) {
          return emailPattern.test(field.value.trim());
        },
        message: 'Please enter a valid email address, or leave this blank.',
      },
      {
        name: 'childClass',
        required: true,
        isEmpty: function (field) {
          return !field.value;
        },
        message: 'Please choose an intended class.',
      },
      {
        name: 'section',
        required: true,
        isEmpty: function (field) {
          return !field.value;
        },
        message: 'Please choose a preferred section.',
      },
    ];

    var noticeTimeout = null;

    var showNotice = function (type, text) {
      if (!notice) return;
      if (noticeTimeout !== null) window.clearTimeout(noticeTimeout);
      notice.className = 'notice ' + type;
      notice.textContent = text;
      notice.hidden = false;
      notice.focus();
    };

    var hideNotice = function () {
      if (!notice) return;
      notice.hidden = true;
    };

    /* ---------- Inline errors ---------- */
    var errorFor = function (field) {
      if (!field || !field.id) return null;
      return document.getElementById(field.id + '-error');
    };

    var describe = function (field, errorId) {
      if (!field) return;
      var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (ids.indexOf(errorId) === -1) ids.push(errorId);
      field.setAttribute('aria-describedby', ids.join(' '));
    };

    var undescribe = function (field, errorId) {
      if (!field) return;
      var ids = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(function (id) {
          return id && id !== errorId;
        });

      if (ids.length) {
        field.setAttribute('aria-describedby', ids.join(' '));
      } else {
        field.removeAttribute('aria-describedby');
      }
    };

    var showError = function (field, message) {
      if (!field || !field.id) return;
      var errorId = field.id + '-error';
      var error = errorFor(field);

      if (!error) {
        error = document.createElement('p');
        error.className = 'field-error';
        error.id = errorId;
        var wrapper = field.closest('.field') || field.parentNode;
        wrapper.appendChild(error);
      }

      error.textContent = message;
      field.setAttribute('aria-invalid', 'true');
      describe(field, errorId);
    };

    var clearError = function (field) {
      if (!field || !field.id) return;
      var errorId = field.id + '-error';
      var error = errorFor(field);
      if (error && error.parentNode) error.parentNode.removeChild(error);
      field.removeAttribute('aria-invalid');
      undescribe(field, errorId);
    };

    var ruleFor = function (name) {
      for (var i = 0; i < rules.length; i += 1) {
        if (rules[i].name === name) return rules[i];
      }
      return null;
    };

    var validateField = function (name) {
      var rule = ruleFor(name);
      var field = fields[name];
      if (!rule || !field) return true;

      var value = field.value;

      if (rule.isEmpty && rule.isEmpty(field)) {
        clearError(field);
        if (rule.required) {
          showError(field, rule.message);
          return false;
        }
        return true;
      }

      if (!value.trim() && !rule.required) {
        clearError(field);
        return true;
      }

      if (rule.isValid && !rule.isValid(field)) {
        showError(field, rule.message);
        return false;
      }

      clearError(field);
      return true;
    };

    var validateAll = function () {
      var valid = true;
      var firstInvalid = null;

      rules.forEach(function (rule) {
        if (!validateField(rule.name) && !firstInvalid) {
          firstInvalid = fields[rule.name];
        }
        if (fields[rule.name] && fields[rule.name].getAttribute('aria-invalid') === 'true') {
          valid = false;
        }
      });

      return { valid: valid, firstInvalid: firstInvalid };
    };

    /* ---------- Field events ---------- */
    Object.keys(fields).forEach(function (name) {
      var field = fields[name];
      if (!field) return;

      field.addEventListener('blur', function () {
        if (!ruleFor(name)) return;
        if (!field.value.trim() && !ruleFor(name).required) {
          clearError(field);
          return;
        }
        validateField(name);
      });

      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') !== 'true') return;
        /* Only clear the error once the value actually passes. */
        if (validateField(name)) hideNotice();
      });

      field.addEventListener('change', function () {
        if (!ruleFor(name)) return;
        validateField(name);
      });
    });

    var setSubmitting = function (state) {
      submitting = state;
      if (!submitButton) return;
      submitButton.disabled = state;
      submitButton.innerHTML = state
        ? endpoint
          ? 'Sending your enquiry...'
          : 'Opening your email app...'
        : submitMarkup;
      form.setAttribute('aria-busy', state ? 'true' : 'false');
    };

    var clearFieldErrors = function () {
      Object.keys(fields).forEach(function (name) {
        clearError(fields[name]);
      });
    };

    var sendEnquiry = function (payload) {
      setSubmitting(true);

      var controller = null;
      var timeout = null;

      if (typeof window.AbortController === 'function') {
        controller = new window.AbortController();
        timeout = window.setTimeout(function () {
          controller.abort();
        }, 15000);
      }

      var finish = function () {
        if (timeout !== null) window.clearTimeout(timeout);
        setSubmitting(false);
      };

      window
        .fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined,
        })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { ok: response.ok, data: data };
            });
        })
        .then(function (result) {
          if (!result.ok || String(result.data.success) === 'false') {
            throw new Error((result.data && result.data.message) || 'Submission failed');
          }

          finish();
          showNotice(
            'success',
            'Thank you. Your enquiry has been sent to the school office. We will be in touch shortly. For urgent matters call +256 782 279751.'
          );
          form.reset();
          clearFieldErrors();
        })
        .catch(function () {
          finish();
          showNotice(
            'error',
            'Sorry, your enquiry could not be sent automatically. Please call +256 782 279751' +
              (recipient ? ' or email ' + recipient : '') +
              '.'
          );
        });
    };

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submitting) return;

      hideNotice();

      var result = validateAll();
      if (!result.valid) {
        showNotice('error', 'Please check the highlighted fields and try again.');
        if (result.firstInvalid) result.firstInvalid.focus();
        return;
      }

      var subjectLabel = form.getAttribute('data-subject') || 'Website enquiry';
      var subject = encodeURIComponent(
        subjectLabel +
          ' - ' +
          fields.childClass.value +
          ' (' +
          fields.section.value +
          ')'
      );
      var body = encodeURIComponent(
        'Parent/Guardian: ' +
          fields.parent.value.trim() +
          '\nTelephone: ' +
          fields.phone.value.trim() +
          '\nEmail: ' +
          (fields.email.value.trim() || 'N/A') +
          '\nIntended class: ' +
          fields.childClass.value +
          '\nPreferred section: ' +
          fields.section.value +
          '\n\nMessage:\n' +
          (fields.message.value.trim() || 'N/A')
      );

      if (whatsapp) {
        var whatsappMessage =
          subjectLabel + '\n\n' +
          'Parent/Guardian: ' + fields.parent.value.trim() + '\n' +
          'Telephone: ' + fields.phone.value.trim() + '\n' +
          'Email: ' + (fields.email.value.trim() || 'Not provided') + '\n' +
          'Intended class: ' + fields.childClass.value + '\n' +
          'Preferred section: ' + fields.section.value + '\n\n' +
          'Preferred campus: ' + (fields.campus ? fields.campus.value : 'Main Campus') + '\n\n' +
          'Message:\n' + (fields.message.value.trim() || 'Not provided');
        var whatsappUrl = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(whatsappMessage);
        setSubmitting(true);
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        showNotice('success', 'Your enquiry is ready in WhatsApp. Send the prepared message to Hilder NPS.');
        form.reset();
        clearFieldErrors();
        window.setTimeout(function () {
          setSubmitting(false);
        }, 1500);
        return;
      }

      setSubmitting(true);

      window.location.href = 'mailto:' + recipient + '?subject=' + subject + '&body=' + body;

      showNotice(
        'success',
        'Your enquiry is ready in your email app. You can also call +256 782 279751.'
      );

      form.reset();
      clearFieldErrors();

      /* Re-enable the button so a second enquiry is possible. */
      window.setTimeout(function () {
        setSubmitting(false);
      }, 1500);
    });

    /* Clear the summary when the visitor starts fixing the form. */
    form.addEventListener('input', function () {
      if (notice && !notice.hidden && notice.classList.contains('error')) hideNotice();
    });
  });
})();
