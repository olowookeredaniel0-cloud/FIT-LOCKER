/* =========================================================
   FIT LOCKER — checkout.js
   Reads the Local Storage cart ("fitLockerCart"), displays the
   order summary (items, subtotal, delivery fee, grand total),
   validates the delivery details form, and on success saves
   those details ("fitLockerCheckout") before moving on to
   payment.html — which is NOT built in this phase. Clicking
   "Proceed to Payment" after this phase will 404 until that
   page exists; that's expected.
   ========================================================= */

$(function () {

  // ---------- Config ----------
  const CART_KEY = "fitLockerCart";
  const CHECKOUT_KEY = "fitLockerCheckout";
  const DELIVERY_FEE = 2500;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- Cached DOM elements ----------
  const $emptyCartState = $("#emptyCartState");
  const $checkoutLayout = $("#checkoutLayout");
  const $checkoutItems = $("#checkoutItems");
  const $checkoutSubtotal = $("#checkoutSubtotal");
  const $checkoutDeliveryFee = $("#checkoutDeliveryFee");
  const $checkoutGrandTotal = $("#checkoutGrandTotal");
  const $checkoutForm = $("#checkoutForm");
  const $checkoutMessage = $("#checkoutMessage");

  const $fullName = $("#fullName");
  const $email = $("#email");
  const $phone = $("#phone");
  const $address = $("#address");
  const $city = $("#city");

  // ---------- Init ----------
  init();

  function init() {
    const cart = getCart();

    if (cart.length === 0) {
      $emptyCartState.attr("hidden", false);
      $checkoutLayout.attr("hidden", true);
      return;
    }

    $emptyCartState.attr("hidden", true);
    $checkoutLayout.attr("hidden", false);

    renderSummary(cart);
    prefillFromLoggedInUser();
  }

  // ---------- Local Storage helpers ----------
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  // ---------- Order summary ----------
  function renderSummary(cart) {
    $checkoutItems.empty();

    let subtotal = 0;

    cart.forEach(function (item) {
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      subtotal += lineTotal;

      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
      if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
      const variantLabel = variantParts.join(" · ");

      $checkoutItems.append(`
        <div class="checkout-item">
          <div class="checkout-item__info">
            <p class="checkout-item__name">${escapeHtml(item.name || "Untitled product")} &times; ${Number(item.quantity) || 0}</p>
            ${variantLabel ? `<p class="checkout-item__variant">${variantLabel}</p>` : ""}
          </div>
          <span class="checkout-item__line-total">${formatNaira(lineTotal)}</span>
        </div>
      `);
    });

    const grandTotal = subtotal + DELIVERY_FEE;

    $checkoutSubtotal.text(formatNaira(subtotal));
    $checkoutDeliveryFee.text(formatNaira(DELIVERY_FEE));
    $checkoutGrandTotal.text(formatNaira(grandTotal));
  }

  // ---------- Convenience: prefill name/email if the user is logged in ----------
  function prefillFromLoggedInUser() {
    if (!window.FitLockerAuth || !window.FitLockerAuth.isLoggedIn()) return;

    const user = window.FitLockerAuth.getCurrentUser();
    if (!user) return;

    if (!$fullName.val()) $fullName.val(user.name || "");
    if (!$email.val()) $email.val(user.email || "");
  }

  // ---------- Validation + submit ----------
  $checkoutForm.on("submit", function (event) {
    event.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      // Cart could have been emptied in another tab since the page loaded.
      init();
      return;
    }

    const fullName = $fullName.val().trim();
    const email = $email.val().trim();
    const phone = $phone.val().trim();
    const address = $address.val().trim();
    const city = $city.val().trim();

    clearFieldErrors();

    if (!fullName) {
      return showFieldError($fullName, "Please enter your full name.");
    }

    if (!email) {
      return showFieldError($email, "Please enter your email.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      return showFieldError($email, "Please enter a valid email address.");
    }

    if (!phone) {
      return showFieldError($phone, "Please enter your phone number.");
    }

    if (!address) {
      return showFieldError($address, "Please enter your delivery address.");
    }

    if (!city) {
      return showFieldError($city, "Please enter your city.");
    }

    const subtotal = cart.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);

    const checkoutDetails = {
      fullName: fullName,
      email: email,
      phone: phone,
      address: address,
      city: city,
      subtotal: subtotal,
      deliveryFee: DELIVERY_FEE,
      grandTotal: subtotal + DELIVERY_FEE
    };

    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutDetails));

    showMessage("Details saved. Taking you to payment...", false);

    window.setTimeout(function () {
      window.location.href = "payment.html";
    }, 500);
  });

  // ---------- Field-level error helpers ----------
  function showFieldError($field, text) {
    $field.addClass("checkout-form__input--invalid");
    showMessage(text, true);
  }

  function clearFieldErrors() {
    $checkoutForm.find(".checkout-form__input").removeClass("checkout-form__input--invalid");
    hideMessage();
  }

  function showMessage(text, isError) {
    $checkoutMessage
      .text(text)
      .attr("class", `checkout-form__message ${isError ? "checkout-form__message--error" : "checkout-form__message--success"}`)
      .attr("hidden", false);
  }

  function hideMessage() {
    $checkoutMessage.attr("hidden", true);
  }

  // ---------- Currency helper ----------
  function formatNaira(amount) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(value);
  }

  // ---------- Basic HTML escaping for text pulled from storage ----------
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

});