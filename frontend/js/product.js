/* =========================================================
   FIT LOCKER — product.js
   Product details are read from the same Local Storage
   catalogue the shop page uses ("fitLockerProducts").
   Reads the product id from the URL, finds that product in
   storage, renders its details, handles size/color/quantity
   selection, and on Add to Cart writes to the Local Storage
   cart ("fitLockerCart") — see cart.html / js/cart.js for the
   cart page itself.
   ========================================================= */

$(function () {

  try {

  // ---------- State ----------
  let currentProduct = null;
  let selectedColor = null;
  let selectedSize = null;
  let currentQty = 1;

  // ---------- Cached DOM elements ----------
  const $loadingState = $("#loadingState");
  const $errorState = $("#errorState");
  const $productDetail = $("#productDetail");

  const $productImage = $("#productImage");
  const $productCategory = $("#productCategory");
  const $productName = $("#productName");
  const $productPrice = $("#productPrice");
  const $productDescription = $("#productDescription");
  const $productStock = $("#productStock");

  const $colorGroup = $("#colorGroup");
  const $colorOptions = $("#colorOptions");
  const $sizeGroup = $("#sizeGroup");
  const $sizeOptions = $("#sizeOptions");

  const $qtyValue = $("#qtyValue");
  const $qtyMinus = $("#qtyMinus");
  const $qtyPlus = $("#qtyPlus");

  const $detailMessage = $("#detailMessage");
  const $addToCartBtn = $("#addToCartBtn");

  // Some color names used in the catalogue (e.g. "Terracotta", "Sage")
  // aren't valid CSS color keywords, so the swatch dot would render
  // blank for them. This maps those specific names to a real hex value;
  // anything not listed here falls through to the name itself, which
  // works fine for standard CSS colors (Black, White, Navy, Khaki, etc).
  // IMPORTANT: this const MUST be declared before the "Init" call below
  // (loadProduct()) — that call runs immediately and synchronously reaches
  // colorToCss() before the engine executes anything declared later in
  // the file, regardless of where colorToCss's own function definition
  // sits (function declarations are hoisted; const initializers are not).
  const COLOR_NAME_MAP = {
    "light blue": "#ADD8E6",
    "terracotta": "#E2725B",
    "sage": "#9CAF88"
  };

  function colorToCss(colorName) {
    if (!colorName) return "transparent";
    const mapped = COLOR_NAME_MAP[colorName.toLowerCase()];
    return mapped || colorName;
  }

  // ---------- Init ----------
  loadProduct();

  // ---------- Read the product id from the URL ----------
  function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  // ---------- Load the product from Local Storage (via the shared catalogue module) ----------
  function loadProduct() {
    const productId = getProductIdFromUrl();

    if (!productId) {
      showState("error");
      return;
    }

    showState("loading");

    if (!window.FitLockerCatalogue) {
      console.error(
        'FIT LOCKER: window.FitLockerCatalogue is undefined. This means js/catalogue.js ' +
        'did not load — check that product.html includes <script src="js/catalogue.js"></script> ' +
        "BEFORE <script src=\"js/product.js\"></script>."
      );
      showState("error");
      return;
    }

    try {
      // Seeds the catalogue if this browser hasn't visited shop.html yet —
      // product.html no longer depends on the shop page loading first.
      const allProducts = window.FitLockerCatalogue.getProducts();
      const product = allProducts.find(function (p) {
        return (p._id || p.id) === productId;
      });

      if (!product) {
        showState("error");
        return;
      }

      currentProduct = product;
      renderProduct(product);
      showState("detail");
    } catch (err) {
      // Reached only if the stored JSON is corrupted/unreadable, or
      // something else unexpected threw. Log it so the real cause is
      // visible in the console instead of just showing a generic message.
      console.error("FIT LOCKER: error loading product:", err);
      showState("error");
    }
  }

  // ---------- Render product details ----------
  function renderProduct(product) {
    const stockInfo = getStockInfo(product.stock);

    document.title = `${product.name || "Product"} — FIT LOCKER`;

    $productImage.attr("src", product.image || "");
    $productImage.attr("alt", product.name || "");
    $productImage.off("error").on("error", function () {
      $(this).replaceWith(
        $('<div class="product-detail__image-fallback">Image unavailable</div>')
      );
    });

    $productCategory.text(`${product.category || ""} / ${product.subcategory || ""}`);
    $productName.text(product.name || "Untitled product");
    $productPrice.text(formatNaira(product.price));
    $productDescription.text(product.description || "");
    $productStock
      .text(stockInfo.label)
      .attr("class", `product-detail__stock ${stockInfo.className}`);

    renderColorOptions(product);
    renderSizeOptions(product);
    renderQuantity();
    hideDetailMessage();

    $addToCartBtn.prop("disabled", stockInfo.isOut);
    $addToCartBtn.text(stockInfo.isOut ? "Out of stock" : "Add to Cart");
  }

  // ---------- Color options ----------
  // The Phase 1 seed products don't include a "colors" field, so this
  // section simply stays hidden for them. Left in place so it keeps
  // working automatically if colors are added to the catalogue later.

  function renderColorOptions(product) {
    const colors = Array.isArray(product.colors) ? product.colors : [];

    if (colors.length === 0) {
      $colorGroup.attr("hidden", true);
      return;
    }

    $colorGroup.attr("hidden", false);
    $colorOptions.empty();
    selectedColor = null;

    colors.forEach(function (color) {
      const $swatch = $(`
        <button type="button" class="swatch" data-color="${escapeHtml(color)}">
          <span class="swatch__dot" style="background:${colorToCss(color)}"></span>
          <span class="swatch__label">${escapeHtml(color)}</span>
        </button>
      `);
      $colorOptions.append($swatch);
    });
  }

  $colorOptions.on("click", ".swatch", function () {
    selectedColor = $(this).data("color");
    $colorOptions.find(".swatch").removeClass("swatch--selected");
    $(this).addClass("swatch--selected");
    hideDetailMessage();
  });

  // ---------- Size options ----------
  function renderSizeOptions(product) {
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];

    $sizeOptions.empty();
    selectedSize = null;

    if (sizes.length === 0) {
      $sizeGroup.attr("hidden", true);
      return;
    }

    $sizeGroup.attr("hidden", false);

    sizes.forEach(function (size) {
      const $btn = $(`
        <button type="button" class="size-option" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>
      `);
      $sizeOptions.append($btn);
    });
  }

  $sizeOptions.on("click", ".size-option", function () {
    selectedSize = $(this).data("size");
    $sizeOptions.find(".size-option").removeClass("size-option--selected");
    $(this).addClass("size-option--selected");
    hideDetailMessage();
  });

  // ---------- Quantity ----------
  function renderQuantity() {
    currentQty = 1;
    $qtyValue.text(currentQty);
    updateQtyButtons();
  }

  function updateQtyButtons() {
    const maxQty = currentProduct ? Number(currentProduct.stock) || 0 : 0;
    $qtyMinus.prop("disabled", currentQty <= 1);
    $qtyPlus.prop("disabled", currentQty >= maxQty);
  }

  $qtyMinus.on("click", function () {
    if (currentQty > 1) {
      currentQty -= 1;
      $qtyValue.text(currentQty);
      updateQtyButtons();
    }
  });

  $qtyPlus.on("click", function () {
    const maxQty = currentProduct ? Number(currentProduct.stock) || 0 : 0;
    if (currentQty < maxQty) {
      currentQty += 1;
      $qtyValue.text(currentQty);
      updateQtyButtons();
    }
  });

  // ---------- Inline validation / feedback message ----------
  function showDetailMessage(text, isError) {
    $detailMessage
      .text(text)
      .attr("class", `detail-message ${isError ? "detail-message--error" : "detail-message--success"}`)
      .attr("hidden", false);
  }

  function hideDetailMessage() {
    $detailMessage.attr("hidden", true);
  }

  // ---------- Cart (Local Storage) ----------
  const CART_KEY = "fitLockerCart";

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      // If the stored cart is ever corrupted, start fresh rather than break the page.
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function addItemToCart(product, color, size, quantity) {
    const cart = getCart();
    const productId = product._id || product.id;

    // Normalize color to null so a saved item with no "color" key
    // (undefined) still matches a colorless product's selection
    // (null) — otherwise undefined !== null and duplicates a row
    // instead of merging.
    const normalizedColor = color || null;

    const existingItem = cart.find(function (item) {
      return (
        item.productId === productId &&
        item.size === size &&
        (item.color || null) === normalizedColor
      );
    });

    if (existingItem) {
      // Never let the combined quantity exceed available stock.
      const maxQty = Number(product.stock) || 0;
      existingItem.quantity = Math.min(existingItem.quantity + quantity, maxQty);
    } else {
      const cartItem = {
        productId: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size,
        quantity: quantity
      };

      // Only include color if the product actually has colors.
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        cartItem.color = color;
      }

      cart.push(cartItem);
    }

    saveCart(cart);
  }

  // ---------- Add to Cart ----------
  $addToCartBtn.on("click", function () {
    if (!currentProduct) return;

    if (!window.FitLockerAuth.isLoggedIn()) {
      showDetailMessage("Please log in to add items to your cart.", true);
      return;
    }

    const hasColors = Array.isArray(currentProduct.colors) && currentProduct.colors.length > 0;
    const hasSizes = Array.isArray(currentProduct.sizes) && currentProduct.sizes.length > 0;

    if (hasColors && !selectedColor) {
      showDetailMessage("Please select a color.", true);
      return;
    }

    if (hasSizes && !selectedSize) {
      showDetailMessage("Please select a size.", true);
      return;
    }

    addItemToCart(currentProduct, selectedColor, selectedSize, currentQty);
    showDetailMessage("Added to cart.", false);
  });

  // ---------- Stock helper ----------
  function getStockInfo(stock) {
    const quantity = Number(stock) || 0;

    if (quantity <= 0) {
      return { label: "Out of stock", className: "product-detail__stock--out", isOut: true };
    }
    if (quantity <= 5) {
      return { label: `Low stock (${quantity} left)`, className: "product-detail__stock--low", isOut: false };
    }
    return { label: `In stock (${quantity})`, className: "product-detail__stock--in", isOut: false };
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

  // ---------- State switching ----------
  // Only one of these is visible at a time: loading, error, detail.
  function showState(state) {
    $loadingState.attr("hidden", state !== "loading");
    $errorState.attr("hidden", state !== "error");
    $productDetail.attr("hidden", state !== "detail");
  }

  } catch (err) {
    // Something unexpected broke before/outside the normal error handling
    // above. Surface it plainly instead of leaving a blank page, so it's
    // obvious what to fix rather than silently showing nothing.
    console.error("FIT LOCKER product page error:", err);
    document.getElementById("loadingState").setAttribute("hidden", "hidden");
    const errorEl = document.getElementById("errorState");
    if (errorEl) {
      errorEl.removeAttribute("hidden");
      const titleEl = errorEl.querySelector(".state-message__title");
      const bodyEl = errorEl.querySelector(".state-message__body");
      if (titleEl) titleEl.textContent = "Something went wrong loading this product.";
      if (bodyEl) bodyEl.textContent = "Technical details: " + err.message;
    }
  }

});