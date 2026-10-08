/* =========================================================
   FIT LOCKER — contact.js
   Client-side only form handling. No backend/API calls —
   this project has none, per project constraints.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contactForm');
  var messageEl = document.getElementById('contactFormMessage');
  if (!form || !messageEl) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      showMessage('Please fill in every field with a valid value.', 'error');
      return;
    }

    // No backend exists for this project, so we just confirm receipt
    // locally and reset the form.
    showMessage("Thanks — your message has been noted. We'll get back to you soon.", 'success');
    form.reset();
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.hidden = false;
    messageEl.className = 'auth-form__message auth-form__message--' + type;
  }
});