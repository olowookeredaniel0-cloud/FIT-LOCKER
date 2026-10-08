/* =========================================================
   FIT LOCKER — payment.js
   SCHOOL DEMO ONLY — no real payment provider is used. The card
   form fields (name, number, expiry, CVC) exist for a realistic
   demo experience and are format-validated on submit, but are
   NEVER written to Local Storage or the order record — only the
   fact that a "Demo Card Payment" was used is saved.

   Reads:  fitLockerCart, fitLockerCheckout
   Writes: fitLockerOrders (appends one order), fitLockerCart (cleared)
   ========================================================= */

$(function () {

  // ---------- Config ----------
  const CART_KEY = "fitLockerCart";
  const CHECKOUT_KEY = "fitLockerCheckout";
  const ORDERS_KEY = "fitLockerOrders";
  // Must match the DELIVERY_FEE used in checkout.js so the total
  // shown here matches what the person already saw at checkout.
  const DELIVERY_FEE = 2500;

  // ---------- Cached DOM elements ----------
  const $guardState = $("#guardState");
  const $guardTitle = $("#guardTitle");
  const $guardBody = $("#guardBody");
  const $paymentLayout = $("#paymentLayout");
  const $paymentItems = $("#paymentItems");
  const $paymentSubtotal = $("#paymentSubtotal");
  const $paymentDeliveryFee = $("#paymentDeliveryFee");
  const $paymentTotal = $("#paymentTotal");
  const $paymentMessage = $("#paymentMessage");
  const $payNowBtn = $("#payNowBtn");

  const $cardName = $("#cardName");
  const $cardNumber = $("#cardNumber");
  const $cardExpiry = $("#cardExpiry");
  const $cardCVC = $("#cardCVC");

  let cart = [];
  let checkoutDetails = null;

  // ---------- Init ----------
  init();

  function init() {
    cart = getCart();
    checkoutDetails = getCheckoutDetails();

    if (!checkoutDetails) {
      showGuard("No checkout details found.", "Please complete checkout before paying.");
      return;
    }

    if (cart.length === 0) {
      showGuard("Your cart is empty.", "There's nothing to pay for — add something from the shop first.");
      return;
    }

    $guardState.attr("hidden", true);
    $paymentLayout.attr("hidden", false);
    renderSummary(cart);
  }

  function showGuard(title, body) {
    $guardTitle.text(title);
    $guardBody.text(body);
    $guardState.attr("hidden", false);
    $paymentLayout.attr("hidden", true);
  }

  // ---------- Light input formatting (cosmetic only, not validation) ----------
  $cardNumber.on("input", function () {
    const digitsOnly = $(this).val().replace(/\D/g, "").slice(0, 19);
    $(this).val(digitsOnly.replace(/(.{4})/g, "$1 ").trim());
  });

  $cardExpiry.on("input", function () {
    const digitsOnly = $(this).val().replace(/\D/g, "").slice(0, 4);
    if (digitsOnly.length >= 3) {
      $(this).val(digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2));
    } else {
      $(this).val(digitsOnly);
    }
  });

  $cardCVC.on("input", function () {
    $(this).val($(this).val().replace(/\D/g, "").slice(0, 4));
  });

  // ---------- Local Storage helpers ----------
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function getCheckoutDetails() {
    try {
      const raw = localStorage.getItem(CHECKOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  // ---------- Render order summary ----------
  function renderSummary(cartItems) {
    $paymentItems.empty();

    let subtotal = 0;

    cartItems.forEach(function (item) {
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      subtotal += lineTotal;

      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
      if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
      const variantLabel = variantParts.join(" · ");

      $paymentItems.append(`
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

    $paymentSubtotal.text(formatNaira(subtotal));
    $paymentDeliveryFee.text(formatNaira(DELIVERY_FEE));
    $paymentTotal.text(formatNaira(grandTotal));

    return grandTotal;
  }

  // ---------- Pay Now ----------
  $payNowBtn.on("click", function () {
    // Re-read the cart in case it changed in another tab since page load.
    cart = getCart();

    if (cart.length === 0) {
      showGuard("Your cart is empty.", "There's nothing to pay for — add something from the shop first.");
      return;
    }

    const cardValidation = validateCardForm();
    if (!cardValidation.valid) {
      showMessage(cardValidation.error, true);
      return;
    }

    // Check stock is still sufficient for every item BEFORE creating the
    // order or touching anything — nothing is saved if this fails.
    const stockValidation = validateStock(cart);
    if (!stockValidation.valid) {
      showMessage(stockValidation.error, true);
      return;
    }

    hideMessage();
    $payNowBtn.prop("disabled", true).text("Processing...");

    const subtotal = cart.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);
    const total = subtotal + DELIVERY_FEE;

    const orderNumber = generateOrderNumber();

    const order = {
      orderNumber: orderNumber,
      customer: {
        fullName: checkoutDetails.fullName,
        email: checkoutDetails.email,
        phone: checkoutDetails.phone,
        address: checkoutDetails.address,
        city: checkoutDetails.city
      },
      items: cart,
      subtotal: subtotal,
      deliveryFee: DELIVERY_FEE,
      total: total,
      paymentMethod: "Demo Card Payment",
      date: new Date().toISOString(),
      status: "Confirmed"
    };

    // NOTE: card number, expiry, and CVC are read only for validation
    // above and are never added to `order` or written to Local Storage.

    // Stock is only ever reduced here — after every check above has
    // passed and the order is about to be created. Never on viewing a
    // product, adding to cart, checkout, or entering payment details.
    decrementStock(cart);

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    // Clear the cart now that the order has been placed.
    localStorage.setItem(CART_KEY, JSON.stringify([]));

    window.setTimeout(function () {
      window.location.href = `order-confirmation.html?order=${encodeURIComponent(orderNumber)}`;
    }, 400);
  });

  // ---------- Stock validation + decrement ----------
  // Reads fitLockerProducts fresh (via the shared catalogue module) each
  // time, rather than trusting anything cached earlier on the page, so
  // stock changed by another tab/admin in the meantime is respected.
  function validateStock(cartItems) {
    const products = window.FitLockerCatalogue.getProducts();

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const product = products.find(function (p) {
        return (p._id || p.id) === item.productId;
      });

      const available = product ? Number(product.stock) || 0 : 0;
      const requested = Number(item.quantity) || 0;

      if (requested > available) {
        return {
          valid: false,
          error: `Sorry, only ${available} unit${available === 1 ? "" : "s"} of ${item.name || "this product"} ${available === 1 ? "is" : "are"} currently available.`
        };
      }
    }

    return { valid: true };
  }

  // Subtracts each purchased quantity from its product's stock and saves
  // the updated catalogue. Never lets stock go below 0. If a purchased
  // product can no longer be found (e.g. deleted since), it's skipped
  // rather than throwing, since the order itself must still go through.
  function decrementStock(cartItems) {
    const products = window.FitLockerCatalogue.getProducts();

    cartItems.forEach(function (item) {
      const product = products.find(function (p) {
        return (p._id || p.id) === item.productId;
      });
      if (!product) return;

      const currentStock = Number(product.stock) || 0;
      const purchasedQty = Number(item.quantity) || 0;
      product.stock = Math.max(0, currentStock - purchasedQty);
    });

    window.FitLockerCatalogue.saveProducts(products);
  }

  // ---------- Demo card form validation ----------
  // Format-only checks, as this is a demo — no real card verification
  // (e.g. no Luhn check, no bank/network lookup) is performed or needed.
  function validateCardForm() {
    const name = $cardName.val().trim();
    const numberDigits = $cardNumber.val().replace(/\s/g, "");
    const expiry = $cardExpiry.val().trim();
    const cvc = $cardCVC.val().trim();

    if (!name) {
      return { valid: false, error: "Please enter the cardholder name." };
    }

    if (!numberDigits) {
      return { valid: false, error: "Please enter a card number." };
    }

    if (!/^\d{13,19}$/.test(numberDigits)) {
      return { valid: false, error: "Please enter a valid card number (13–19 digits)." };
    }

    if (!expiry) {
      return { valid: false, error: "Please enter the card's expiry date." };
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return { valid: false, error: "Please enter the expiry date as MM/YY." };
    }

    if (!cvc) {
      return { valid: false, error: "Please enter the card's CVC." };
    }

    if (!/^\d{3,4}$/.test(cvc)) {
      return { valid: false, error: "Please enter a valid 3 or 4 digit CVC." };
    }

    return { valid: true };
  }

  function showMessage(text, isError) {
    $paymentMessage
      .text(text)
      .attr("class", `checkout-form__message ${isError ? "checkout-form__message--error" : "checkout-form__message--success"}`)
      .attr("hidden", false);
  }

  function hideMessage() {
    $paymentMessage.attr("hidden", true);
  }

  // Simple, readable, unique-enough order number for a demo: a short
  // prefix plus the current timestamp in base 36.
  function generateOrderNumber() {
    return "FL-" + Date.now().toString(36).toUpperCase();
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