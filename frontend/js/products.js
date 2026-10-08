/* =========================================================
   FIT LOCKER — products.js
   Products come from a Local Storage catalogue instead of the
   API. Seed data and seeding/versioning logic live in the
   shared js/catalogue.js (loaded before this file) so every
   page — shop, product, and cart — can seed the catalogue, not
   just this one. Categories also come from catalogue.js
   (fitLockerCategories) — this file never keeps its own
   separate category list.

   Filtering: Category, Availability, and Sort live together in
   one compact "Filters" dropdown; Search is its own separate
   control. All combine with AND logic. A category can be
   preselected via the URL: shop.html?category=Men (used by
   index.html's category cards). Product detail + cart logic
   lives on their own pages — see product.html / js/product.js
   and cart.html / js/cart.js.
   ========================================================= */

$(function () {

  // ---------- State ----------
  let allProducts = [];
  let currentSearchTerm = "";

  // ---------- Cached DOM elements ----------
  const $loadingState = $("#loadingState");
  const $errorState = $("#errorState");
  const $emptyState = $("#emptyState");
  const $grid = $("#productGrid");
  const $resultCount = $("#resultCount");
  const $searchInput = $("#searchInput");

  const $filterDropdown = $("#filterDropdown");
  const $filterToggleBtn = $("#filterToggleBtn");
  const $filterPanel = $("#filterPanel");
  const $categorySelect = $("#categorySelect");
  const $availabilitySelect = $("#availabilitySelect");
  const $sortSelect = $("#sortSelect");
  const $filterBarClearBtn = $("#filterBarClearBtn");

  // ---------- Load products from Local Storage (via the shared catalogue module) ----------
  function loadProducts() {
    showState("loading");

    try {
      allProducts = window.FitLockerCatalogue.getProducts();
      populateCategoryDropdown();
      applyCategoryFromUrl();
      updateFilterToggleLabel();
      applyFiltersAndRender();
    } catch (err) {
      // If this throws, the page would otherwise go completely blank
      // with no bindings attached at all — log it so the real cause is
      // visible instead of a silent dead page.
      console.error("FIT LOCKER: error loading products:", err);
      showState("error");
    }
  }

  // ---------- Category dropdown (dynamic, from fitLockerCategories) ----------
  function populateCategoryDropdown() {
    const categories = window.FitLockerCatalogue.getCategories();

    $categorySelect.empty();
    $categorySelect.append(`<option value="">All Categories</option>`);

    categories.forEach(function (category) {
      $categorySelect.append(`<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`);
    });
  }

  // Supports index.html's category cards linking to shop.html?category=Men
  // — reads the category from the URL once on load and preselects it.
  function applyCategoryFromUrl() {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (!requestedCategory) return;

    const categories = window.FitLockerCatalogue.getCategories();
    const match = categories.find(function (c) {
      return c.name.toLowerCase() === requestedCategory.toLowerCase();
    });

    if (match) {
      $categorySelect.val(match.name);
    }
  }

  // ---------- Filters dropdown open/close ----------
  $filterToggleBtn.on("click", function (event) {
    event.stopPropagation();
    $filterPanel.attr("hidden", $filterPanel.attr("hidden") === undefined);
  });

  // Close the panel when clicking anywhere outside it.
  $(document).on("click", function (event) {
    if ($filterPanel.attr("hidden") !== undefined) return;
    if ($(event.target).closest("#filterDropdown").length === 0) {
      $filterPanel.attr("hidden", true);
    }
  });

  // Shows which filter is active on the toggle button itself, so the
  // current selection is visible even while the panel is collapsed.
  function updateFilterToggleLabel() {
    const category = $categorySelect.val();
    $filterToggleBtn.text(category ? `Filters • ${category}` : "Filters");
  }

  // ---------- Sorting ----------
  function applySort(products, sortValue) {
    const sorted = products.slice();

    if (sortValue === "price-asc") {
      sorted.sort(function (a, b) { return (Number(a.price) || 0) - (Number(b.price) || 0); });
    } else if (sortValue === "price-desc") {
      sorted.sort(function (a, b) { return (Number(b.price) || 0) - (Number(a.price) || 0); });
    } else if (sortValue === "name-asc") {
      sorted.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    } else if (sortValue === "name-desc") {
      sorted.sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); });
    }
    // "default" (or anything unrecognized) = leave in catalogue order.

    return sorted;
  }

  // ---------- Filtering (search + category + availability, combined) ----------
  function applyFiltersAndRender() {
    const term = currentSearchTerm.trim().toLowerCase();
    const selectedCategory = $categorySelect.val();
    const availability = $availabilitySelect.val();

    let filtered = allProducts.filter(function (product) {
      const matchesSearch = term === "" || (product.name || "").toLowerCase().includes(term);
      const matchesCategory = !selectedCategory || product.category === selectedCategory;

      const stock = Number(product.stock) || 0;
      const matchesAvailability =
        availability === "All" ||
        (availability === "In Stock" ? stock > 0 : stock <= 0);

      return matchesSearch && matchesCategory && matchesAvailability;
    });

    filtered = applySort(filtered, $sortSelect.val());

    renderResultCount(filtered.length);

    if (filtered.length === 0) {
      showState("empty");
    } else {
      showState("grid");
      renderGrid(filtered);
    }
  }

  // ---------- Rendering ----------
  function renderGrid(products) {
    $grid.empty();

    products.forEach(function (product) {
      $grid.append(buildCard(product));
    });
  }

  function buildCard(product) {
    const stockInfo = getStockInfo(product.stock);
    const priceLabel = formatNaira(product.price);
    const imageHtml = product.image
      ? `<img class="card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'card__image-fallback', textContent: 'Image unavailable'}))" />`
      : `<div class="card__image-fallback">No image available</div>`;

    const productId = product._id || product.id;

    const $card = $(`
      <article class="card">
        <div class="card__image-wrap">${imageHtml}</div>
        <div class="card__body">
          <p class="card__category">${escapeHtml(product.category || "")} / ${escapeHtml(product.subcategory || "")}</p>
          <h3 class="card__name">${escapeHtml(product.name || "Untitled product")}</h3>
          <p class="card__price">${priceLabel}</p>
          <p class="card__stock ${stockInfo.className}">${stockInfo.label}</p>
          <button class="card__button" type="button" ${stockInfo.isOut ? "disabled" : ""}>
            ${stockInfo.isOut ? "Out of stock" : "View Product"}
          </button>
        </div>
      </article>
    `);

    if (!stockInfo.isOut) {
      $card.find(".card__button").on("click", function () {
        window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
      });
    }

    return $card;
  }

  function renderResultCount(count) {
    const total = allProducts.length;
    $resultCount.text(`Showing ${count} of ${total} product${total === 1 ? "" : "s"}`);
  }

  // ---------- Stock helper ----------
  function getStockInfo(stock) {
    const quantity = Number(stock) || 0;

    if (quantity <= 0) {
      return { label: "Out of stock", className: "card__stock--out", isOut: true };
    }
    if (quantity <= 5) {
      return { label: `Low stock (${quantity} left)`, className: "card__stock--low", isOut: false };
    }
    return { label: `In stock (${quantity})`, className: "card__stock--in", isOut: false };
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
  function showState(state) {
    $loadingState.attr("hidden", state !== "loading");
    $errorState.attr("hidden", state !== "error");
    $emptyState.attr("hidden", state !== "empty");
    $grid.attr("hidden", state !== "grid");
    $resultCount.attr("hidden", state !== "grid");
  }

  // ---------- Search ----------
  $searchInput.on("input", function () {
    currentSearchTerm = $(this).val();
    applyFiltersAndRender();
  });

  // ---------- Filter panel events ----------
  $categorySelect.on("change", function () {
    updateFilterToggleLabel();
    applyFiltersAndRender();
  });

  $availabilitySelect.on("change", applyFiltersAndRender);
  $sortSelect.on("change", applyFiltersAndRender);

  // ---------- Clear Filters (inside the dropdown panel) ----------
  // Resets filters/sort but deliberately leaves the search box alone —
  // "Filters" and "Search" are separate, clearly-labeled controls.
  $filterBarClearBtn.on("click", function () {
    resetFilterControls();
    applyFiltersAndRender();
  });

  // ---------- Retry / empty-state clear (full reset, including search) ----------
  $("#retryButton").on("click", loadProducts);

  $("#clearFiltersButton").on("click", function () {
    currentSearchTerm = "";
    $searchInput.val("");
    resetFilterControls();
    applyFiltersAndRender();
  });

  function resetFilterControls() {
    $categorySelect.val("");
    $availabilitySelect.val("All");
    $sortSelect.val("default");
    updateFilterToggleLabel();
  }

  // ---------- Init ----------
  // Runs last, after every click/change handler above is already bound —
  // so even if this throws, the Filters button and everything else on
  // the page still works.
  loadProducts();

});