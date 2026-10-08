/* =========================================================
   FIT LOCKER — index.js
   Homepage-only behavior: mobile nav toggle + cart count.
   Reads the EXISTING localStorage cart ("fitLockerCart").
   Does not create, modify, or replace the cart structure.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  renderCartCount();
  setFooterYear();
});

function initMobileNav() {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('site-nav--open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function renderCartCount() {
  var badge = document.getElementById('cartBadge');
  if (!badge) return;

  var count = getCartItemCount();

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

/**
 * Reads the existing "fitLockerCart" localStorage key and returns a
 * total item count. Tolerant of a few common cart shapes so it never
 * throws even if the exact structure differs slightly:
 *   - array of { quantity } or { qty }
 *   - plain array of items (counts entries)
 */
function getCartItemCount() {
  try {
    var raw = localStorage.getItem('fitLockerCart');
    if (!raw) return 0;

    var cart = JSON.parse(raw);
    if (!Array.isArray(cart)) return 0;

    return cart.reduce(function (total, item) {
      if (item && typeof item === 'object') {
        var qty = item.quantity || item.qty || 1;
        return total + Number(qty);
      }
      return total + 1;
    }, 0);
  } catch (err) {
    return 0;
  }
}

function setFooterYear() {
  var el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}