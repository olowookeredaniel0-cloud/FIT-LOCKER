/* =========================================================
   FIT LOCKER — cart.js
   Reads/writes the Local Storage cart ("fitLockerCart") and
   renders it on cart.html. Quantity changes are clamped against
   each product's current stock (looked up from the
   "fitLockerProducts" catalogue). Removing an item and changing
   quantity both persist immediately back to Local Storage.
   ========================================================= */

$(function () {

  // ---------- Config ----------
  const CART_KEY = "fitLockerCart";

  // ---------- Cached DOM elements ----------
  const $emptyCartState = $("#emptyCartState");
  const $cartLayout = $("#cartLayout");
  const $cartItems = $("#cartItems");
  const $cartTotal = $("#cartTotal");

  // ---------- Init ----------
  renderCart();

  // ---------- Local Storage helpers ----------
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  // Looks up a cart item's current stock from the product catalogue.
  // If the product can no longer be found, fall back to the item's
  // own saved quantity as the ceiling so the page doesn't break.
  function getStockForItem(item) {
    const products = window.FitLockerCatalogue.getProducts();
    const product = products.find(function (p) {
      return (p._id || p.id) === item.productId;
    });
    return product ? Number(product.stock) || 0 : item.quantity;
  }

  // ---------- Render ----------
  function renderCart() {
    const cart = getCart();

    if (cart.length === 0) {
      $emptyCartState.attr("hidden", false);
      $cartLayout.attr("hidden", true);
      return;
    }

    $emptyCartState.attr("hidden", true);
    $cartLayout.attr("hidden", false);

    $cartItems.empty();

    cart.forEach(function (item, index) {
      $cartItems.append(buildCartItemRow(item, index));
    });

    renderTotal(cart);
  }

  function buildCartItemRow(item, index) {
    const stock = getStockForItem(item);
    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

    const imageHtml = item.image
      ? `<img class="cart-item__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'cart-item__image-fallback', textContent: 'Image unavailable'}))" />`
      : `<div class="cart-item__image-fallback">No image</div>`;

    const variantParts = [];
    if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
    if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
    const variantLabel = variantParts.join(" · ");

    const atMax = (Number(item.quantity) || 0) >= stock;
    const atMin = (Number(item.quantity) || 0) <= 1;

    const $row = $(`
      <article class="cart-item" data-index="${index}">
        <div class="cart-item__image-wrap">${imageHtml}</div>
        <div class="cart-item__info">
          <h2 class="cart-item__name">${escapeHtml(item.name || "Untitled product")}</h2>
          ${variantLabel ? `<p class="cart-item__variant">${variantLabel}</p>` : ""}
          <p class="cart-item__price">${formatNaira(item.price)} each</p>

          <div class="cart-item__controls">
            <div class="cart-item__qty">
              <button type="button" class="cart-item__qty-btn cart-item__qty-minus" aria-label="Decrease quantity" ${atMin ? "disabled" : ""}>&minus;</button>
              <span class="cart-item__qty-value">${Number(item.quantity) || 0}</span>
              <button type="button" class="cart-item__qty-btn cart-item__qty-plus" aria-label="Increase quantity" ${atMax ? "disabled" : ""}>&plus;</button>
            </div>
            <span class="cart-item__subtotal">${formatNaira(lineTotal)}</span>
            <button type="button" class="cart-item__remove">Remove</button>
          </div>

          ${atMax ? `<p class="cart-item__stock-note">Maximum available stock reached.</p>` : ""}
        </div>
      </article>
    `);

    $row.find(".cart-item__qty-minus").on("click", function () {
      changeQuantity(index, -1);
    });

    $row.find(".cart-item__qty-plus").on("click", function () {
      changeQuantity(index, 1);
    });

    $row.find(".cart-item__remove").on("click", function () {
      removeItem(index);
    });

    return $row;
  }

  function renderTotal(cart) {
    const total = cart.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);

    $cartTotal.text(formatNaira(total));
  }

  // ---------- Quantity / removal actions ----------
  function changeQuantity(index, delta) {
    const cart = getCart();
    const item = cart[index];
    if (!item) return;

    const stock = getStockForItem(item);
    const newQty = (Number(item.quantity) || 0) + delta;

    if (newQty < 1) {
      // Quantity can't go below 1 from these buttons — use Remove instead.
      return;
    }

    if (newQty > stock) {
      // Never allow quantity to exceed available stock.
      return;
    }

    item.quantity = newQty;
    saveCart(cart);
    renderCart();
  }

  function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
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