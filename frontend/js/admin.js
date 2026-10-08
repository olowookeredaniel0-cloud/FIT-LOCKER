/* =========================================================
   FIT LOCKER — admin.js
   A SIMPLE DEMO admin login + dashboard for a school project.

   IMPORTANT — NOT REAL SECURITY:
   The admin credentials below are hardcoded in this file, in
   plain text, and are checked entirely in the browser. Anyone
   who opens this file (or DevTools) can see them and log in.
   This is ONLY suitable for demonstrating what an admin area
   looks like in a classroom/portfolio project — never use this
   pattern for a real admin system.

   This is intentionally a SEPARATE identity system from the
   customer login in js/auth.js — an admin session does not use
   fitLockerUsers/fitLockerCurrentUser at all.

   Local Storage key:
   - fitLockerAdminSession → { email } when logged in as admin, absent otherwise

   Reads (read-only, never modified here):
   - fitLockerProducts → for Total Products / Total Items in Stock
   - fitLockerOrders   → for Total Orders / Total Sales
   ========================================================= */

$(function () {

  // ---------- Demo admin account ----------
  // Not a real password — a placeholder for demo login only.
  const DEMO_ADMIN = {
    email: "admin@fitlocker.com",
    password: "admin-demo123"
  };

  const ADMIN_SESSION_KEY = "fitLockerAdminSession";
  const ORDERS_KEY = "fitLockerOrders";
  const COMPLAINTS_KEY = "fitLockerComplaints";

  // ---------- Cached DOM elements ----------
  const $adminLoginSection = $("#adminLoginSection");
  const $adminDashboardSection = $("#adminDashboardSection");
  const $adminLoginForm = $("#adminLoginForm");
  const $adminEmail = $("#adminEmail");
  const $adminPassword = $("#adminPassword");
  const $adminLoginMessage = $("#adminLoginMessage");
  const $adminWelcome = $("#adminWelcome");
  const $adminLogoutBtn = $("#adminLogoutBtn");

  const $statTotalProducts = $("#statTotalProducts");
  const $statTotalOrders = $("#statTotalOrders");
  const $statTotalStock = $("#statTotalStock");
  const $statTotalSales = $("#statTotalSales");
  const $statOpenComplaints = $("#statOpenComplaints");

  // Product management
  const $addProductBtn = $("#addProductBtn");
  const $productForm = $("#productForm");
  const $productFormTitle = $("#productFormTitle");
  const $productFormMessage = $("#productFormMessage");
  const $productFormCancelBtn = $("#productFormCancelBtn");
  const $adminProductList = $("#adminProductList");
  const $adminProductsEmpty = $("#adminProductsEmpty");

  // Tabs
  const $adminTabs = $("#adminTabs");

  // Order management
  const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
  const $adminOrderList = $("#adminOrderList");
  const $adminOrdersEmpty = $("#adminOrdersEmpty");

  // Complaint management
  const COMPLAINT_STATUSES = ["Open", "In Review", "Resolved", "Closed"];
  const $complaintFilters = $("#complaintFilters");
  const $adminComplaintList = $("#adminComplaintList");
  const $adminComplaintsEmpty = $("#adminComplaintsEmpty");
  let currentComplaintFilter = "All";

  // Category management
  const $addCategoryBtn = $("#addCategoryBtn");
  const $categoryForm = $("#categoryForm");
  const $categoryFormTitle = $("#categoryFormTitle");
  const $categoryFormMessage = $("#categoryFormMessage");
  const $categoryFormCancelBtn = $("#categoryFormCancelBtn");
  const $categoryId = $("#categoryId");
  const $categoryName = $("#categoryName");
  const $adminCategoryList = $("#adminCategoryList");
  const $adminCategoriesEmpty = $("#adminCategoriesEmpty");

  const $productId = $("#productId");
  const $productName = $("#productName");
  const $productCategory = $("#productCategory");
  const $productSubcategory = $("#productSubcategory");
  const $productPrice = $("#productPrice");
  const $productStock = $("#productStock");
  const $productImage = $("#productImage");
  const $productImageFile = $("#productImageFile");
  const $productImagePreview = $("#productImagePreview");
  const $productImagePreviewImg = $("#productImagePreviewImg");
  const $productImageClearBtn = $("#productImageClearBtn");
  const $productColors = $("#productColors");
  const $productSizes = $("#productSizes");
  const $productDescription = $("#productDescription");

  // ---------- Init ----------
  init();

  function init() {
    const session = getAdminSession();

    if (session) {
      showDashboard(session);
    } else {
      showLogin();
    }
  }

  // ---------- Session helpers ----------
  function getAdminSession() {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function setAdminSession(email) {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email: email }));
  }

  function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  // ---------- View switching ----------
  function showLogin() {
    $adminLoginSection.attr("hidden", false);
    $adminDashboardSection.attr("hidden", true);
  }

  function showDashboard(session) {
    $adminLoginSection.attr("hidden", true);
    $adminDashboardSection.attr("hidden", false);
    $adminWelcome.text(`Logged in as ${session.email}`);
    renderStats();
    renderProductList();
    renderCategoryList();
    renderOrderList();
    renderComplaintList();
  }

  // ---------- Login ----------
  $adminLoginForm.on("submit", function (event) {
    event.preventDefault();

    const email = $adminEmail.val().trim().toLowerCase();
    const password = $adminPassword.val();

    if (!email || !password) {
      showLoginMessage("Please enter both email and password.", true);
      return;
    }

    if (email !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
      showLoginMessage("Invalid admin email or password.", true);
      return;
    }

    setAdminSession(email);
    showLoginMessage("Logged in!", false);
    showDashboard({ email: email });
  });

  function showLoginMessage(text, isError) {
    $adminLoginMessage
      .text(text)
      .attr("class", `admin-login__message ${isError ? "admin-login__message--error" : "admin-login__message--success"}`)
      .attr("hidden", false);
  }

  // ---------- Logout ----------
  $adminLogoutBtn.on("click", function () {
    clearAdminSession();
    $adminLoginForm[0].reset();
    $adminLoginMessage.attr("hidden", true);
    showLogin();
  });

  // ---------- Dashboard stats ----------
  function renderStats() {
    const products = getProducts();
    const orders = getOrders();

    const totalProducts = products.length;

    const totalStock = products.reduce(function (sum, product) {
      return sum + (Number(product.stock) || 0);
    }, 0);

    const totalOrders = orders.length;

    const totalSales = orders.reduce(function (sum, order) {
      return sum + (Number(order.total) || 0);
    }, 0);

    const openComplaints = getComplaints().filter(function (c) {
      return c.status === "Open";
    }).length;

    $statTotalProducts.text(totalProducts);
    $statTotalOrders.text(totalOrders);
    $statTotalStock.text(totalStock);
    $statTotalSales.text(formatNaira(totalSales));
    $statOpenComplaints.text(openComplaints);
  }

  function getProducts() {
    return window.FitLockerCatalogue.getProducts();
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
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

  // =========================================================
  // Product management (view / add / edit / delete)
  // =========================================================

  // ---------- Render the product list ----------
  function renderProductList() {
    const products = getProducts();

    $adminProductList.empty();

    if (products.length === 0) {
      $adminProductsEmpty.attr("hidden", false);
      return;
    }

    $adminProductsEmpty.attr("hidden", true);

    products.forEach(function (product) {
      $adminProductList.append(buildProductRow(product));
    });
  }

  function buildProductRow(product) {
    const productId = product._id || product.id;

    const imageHtml = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'admin-product-row__image-fallback', textContent: 'No image'}))" />`
      : `<div class="admin-product-row__image-fallback">No image</div>`;

    const $row = $(`
      <div class="admin-product-row" data-id="${escapeHtml(productId)}">
        <div class="admin-product-row__image">${imageHtml}</div>
        <div class="admin-product-row__info">
          <p class="admin-product-row__name">${escapeHtml(product.name || "Untitled product")}</p>
          <p class="admin-product-row__meta">
            ${escapeHtml(product.category || "")} / ${escapeHtml(product.subcategory || "")}
            &middot; ${formatNaira(product.price)}
            &middot; Stock: ${Number(product.stock) || 0}
          </p>
        </div>
        <div class="admin-product-row__actions">
          <button type="button" class="admin-product-row__edit-btn">Edit</button>
          <button type="button" class="admin-product-row__delete-btn">Delete</button>
        </div>
      </div>
    `);

    $row.find(".admin-product-row__edit-btn").on("click", function () {
      openEditForm(product);
    });

    $row.find(".admin-product-row__delete-btn").on("click", function () {
      deleteProduct(productId);
    });

    return $row;
  }

  // ---------- Add / Edit form ----------
  $addProductBtn.on("click", function () {
    openAddForm();
  });

  $productFormCancelBtn.on("click", function () {
    closeForm();
  });

  function openAddForm() {
    $productFormTitle.text("Add Product");
    $productId.val("");
    $productName.val("");
    populateCategoryDropdown();
    $productCategory.val("");
    $productSubcategory.val("");
    $productPrice.val("");
    $productStock.val("");
    resetImagePicker();
    $productColors.val("");
    $productSizes.val("");
    $productDescription.val("");
    hideFormMessage();
    $productForm.attr("hidden", false);
    $productName.trigger("focus");
  }

  function openEditForm(product) {
    $productFormTitle.text("Edit Product");
    $productId.val(product._id || product.id || "");
    $productName.val(product.name || "");
    populateCategoryDropdown(product.category || "");
    $productCategory.val(product.category || "");
    $productSubcategory.val(product.subcategory || "");
    $productPrice.val(product.price != null ? product.price : "");
    $productStock.val(product.stock != null ? product.stock : "");
    resetImagePicker();
    $productImage.val(product.image || "");
    if (product.image) {
      showImagePreview(product.image);
    }
    $productColors.val(Array.isArray(product.colors) ? product.colors.join(", ") : "");
    $productSizes.val(Array.isArray(product.sizes) ? product.sizes.join(", ") : "");
    $productDescription.val(product.description || "");
    hideFormMessage();
    $productForm.attr("hidden", false);
    $productName.trigger("focus");
  }

  // ---------- Image picker ----------
  // Reads the chosen file and embeds it directly as a base64 data URL in
  // the hidden #productImage field. This needs no server/upload endpoint —
  // every page that displays a product image just does <img src="...">,
  // and a data URL works there exactly like a filename would.
  $productImageFile.on("change", function () {
    const file = this.files && this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = event.target.result;
      $productImage.val(dataUrl);
      showImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  });

  $productImageClearBtn.on("click", function () {
    resetImagePicker();
  });

  function showImagePreview(src) {
    $productImagePreviewImg.attr("src", src);
    $productImagePreview.attr("hidden", false);
  }

  function resetImagePicker() {
    $productImage.val("");
    $productImageFile.val("");
    $productImagePreviewImg.attr("src", "");
    $productImagePreview.attr("hidden", true);
  }

  function closeForm() {
    $productForm.attr("hidden", true);
  }

  function showFormMessage(text) {
    $productFormMessage
      .text(text)
      .attr("class", "admin-login__message admin-login__message--error")
      .attr("hidden", false);
  }

  function hideFormMessage() {
    $productFormMessage.attr("hidden", true);
  }

  // Splits a comma-separated input into a trimmed array with empty
  // entries removed, e.g. "Black,  White ,," -> ["Black", "White"].
  function parseCommaList(value) {
    return (value || "")
      .split(",")
      .map(function (part) { return part.trim(); })
      .filter(function (part) { return part.length > 0; });
  }

  function generateProductId() {
    return "prod-" + Date.now().toString(36);
  }

  // ---------- Save (add or edit) ----------
  $productForm.on("submit", function (event) {
    event.preventDefault();

    const name = $productName.val().trim();
    const category = $productCategory.val().trim();
    const subcategory = $productSubcategory.val().trim();
    const priceRaw = $productPrice.val();
    const stockRaw = $productStock.val();

    if (!name) return showFormMessage("Please enter a product name.");
    if (!category) return showFormMessage("Please enter a category.");
    if (!subcategory) return showFormMessage("Please enter a subcategory.");

    if (priceRaw === "" || isNaN(priceRaw) || Number(priceRaw) < 0) {
      return showFormMessage("Please enter a valid price.");
    }

    if (stockRaw === "" || isNaN(stockRaw) || Number(stockRaw) < 0) {
      return showFormMessage("Please enter a valid stock quantity.");
    }

    const existingId = $productId.val();
    const products = getProducts();

    const productData = {
      _id: existingId || generateProductId(),
      name: name,
      category: category,
      subcategory: subcategory,
      price: Number(priceRaw),
      description: $productDescription.val().trim(),
      image: $productImage.val().trim(),
      colors: parseCommaList($productColors.val()),
      sizes: parseCommaList($productSizes.val()),
      stock: Number(stockRaw)
    };

    if (existingId) {
      const index = products.findIndex(function (p) {
        return (p._id || p.id) === existingId;
      });
      if (index !== -1) {
        products[index] = productData;
      } else {
        products.push(productData);
      }
    } else {
      products.push(productData);
    }

    window.FitLockerCatalogue.saveProducts(products);

    closeForm();
    renderProductList();
    renderStats();
  });

  // ---------- Delete ----------
  function deleteProduct(productId) {
    const confirmed = window.confirm("Delete this product? This can't be undone.");
    if (!confirmed) return;

    const products = getProducts().filter(function (p) {
      return (p._id || p.id) !== productId;
    });

    window.FitLockerCatalogue.saveProducts(products);
    renderProductList();
    renderStats();
  }

  // =========================================================
  // Category management (view / add / rename / delete)
  // Single source of truth is window.FitLockerCatalogue's category
  // functions (fitLockerCategories) — this file never keeps its own
  // separate category array.
  // =========================================================

  // Fills the product form's Category <select> with the current
  // category list. selectedValue lets openEditForm() pass in the
  // product's existing category; if that category was since renamed
  // or removed, it's added as an extra option so editing never
  // silently discards it.
  function populateCategoryDropdown(selectedValue) {
    const categories = window.FitLockerCatalogue.getCategories();
    $productCategory.empty();

    categories.forEach(function (category) {
      $productCategory.append(`<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`);
    });

    if (selectedValue && !categories.some(function (c) { return c.name === selectedValue; })) {
      $productCategory.append(`<option value="${escapeHtml(selectedValue)}">${escapeHtml(selectedValue)} (no longer a category)</option>`);
    }
  }

  function renderCategoryList() {
    const categories = window.FitLockerCatalogue.getCategories();

    $adminCategoryList.empty();

    if (categories.length === 0) {
      $adminCategoriesEmpty.attr("hidden", false);
      return;
    }
    $adminCategoriesEmpty.attr("hidden", true);

    categories.forEach(function (category) {
      $adminCategoryList.append(buildCategoryRow(category));
    });
  }

  function buildCategoryRow(category) {
    const productCount = window.FitLockerCatalogue.countProductsUsingCategory(category.name);

    const $row = $(`
      <div class="admin-product-row">
        <div class="admin-product-row__info">
          <p class="admin-product-row__name">${escapeHtml(category.name)}</p>
          <p class="admin-product-row__meta">${productCount} product${productCount === 1 ? "" : "s"} using this category</p>
        </div>
        <div class="admin-product-row__actions">
          <button type="button" class="admin-product-row__edit-btn">Rename</button>
          <button type="button" class="admin-product-row__delete-btn">Delete</button>
        </div>
      </div>
    `);

    $row.find(".admin-product-row__edit-btn").on("click", function () {
      openCategoryForm(category);
    });

    $row.find(".admin-product-row__delete-btn").on("click", function () {
      const result = window.FitLockerCatalogue.deleteCategory(category.id);

      if (!result.success) {
        window.alert(
          `Can't delete "${category.name}": ${result.error}\n\n` +
          `Go to Product Management and change those products to a different category first, ` +
          `then delete "${category.name}" here.`
        );
        return;
      }

      renderCategoryList();
    });

    return $row;
  }

  $addCategoryBtn.on("click", function () {
    openCategoryForm(null);
  });

  $categoryFormCancelBtn.on("click", function () {
    $categoryForm.attr("hidden", true);
  });

  function openCategoryForm(category) {
    $categoryFormTitle.text(category ? "Rename Category" : "Add Category");
    $categoryId.val(category ? category.id : "");
    $categoryName.val(category ? category.name : "");
    $categoryFormMessage.attr("hidden", true);
    $categoryForm.attr("hidden", false);
    $categoryName.trigger("focus");
  }

  $categoryForm.on("submit", function (event) {
    event.preventDefault();

    const existingId = $categoryId.val();
    const name = $categoryName.val();

    const result = existingId
      ? window.FitLockerCatalogue.renameCategory(existingId, name)
      : window.FitLockerCatalogue.addCategory(name);

    if (!result.success) {
      $categoryFormMessage
        .text(result.error)
        .attr("class", "admin-login__message admin-login__message--error")
        .attr("hidden", false);
      return;
    }

    $categoryForm.attr("hidden", true);
    renderCategoryList();
    renderProductList(); // category names may have changed via rename
  });

  // =========================================================
  // Tabs
  // =========================================================
  $adminTabs.on("click", ".admin-tab", function () {
    const tab = $(this).data("tab");

    $adminTabs.find(".admin-tab").removeClass("admin-tab--active");
    $(this).addClass("admin-tab--active");

    $(".admin-tab-panel").attr("hidden", true);
    $(`#tab-${tab}`).attr("hidden", false);
  });

  // =========================================================
  // Order management (view / view details / update status)
  // =========================================================

  function getOrdersFromStorage() {
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

  function renderOrderList() {
    const orders = getOrdersFromStorage();

    $adminOrderList.empty();

    if (orders.length === 0) {
      $adminOrdersEmpty.attr("hidden", false);
      return;
    }

    $adminOrdersEmpty.attr("hidden", true);

    // Most recent first.
    orders
      .slice()
      .reverse()
      .forEach(function (order) {
        $adminOrderList.append(buildOrderRow(order));
      });
  }

  function buildOrderRow(order) {
    const customer = order.customer || {};
    const itemCount = (order.items || []).reduce(function (sum, item) {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    const $row = $(`
      <div class="admin-order-row" data-order-number="${escapeHtml(order.orderNumber)}">
        <div class="admin-order-row__summary">
          <div>
            <p class="admin-order-row__number">${escapeHtml(order.orderNumber)}</p>
            <p class="admin-order-row__meta">
              ${escapeHtml(customer.fullName || "Unknown customer")} &middot;
              ${escapeHtml(formatDate(order.date))} &middot;
              ${itemCount} item${itemCount === 1 ? "" : "s"}
            </p>
          </div>
          <span class="admin-order-row__badge">${escapeHtml(order.status || "Confirmed")}</span>
          <span class="admin-order-row__total">${formatNaira(order.total)}</span>
        </div>
        <div class="admin-order-row__detail" hidden></div>
      </div>
    `);

    $row.find(".admin-order-row__summary").on("click", function () {
      const $detail = $row.find(".admin-order-row__detail");
      const isOpen = $detail.attr("hidden") === undefined;

      if (isOpen) {
        $detail.attr("hidden", true).empty();
      } else {
        $detail.html(buildOrderDetail(order)).attr("hidden", false);
      }
    });

    return $row;
  }

  function buildOrderDetail(order) {
    const customer = order.customer || {};
    const items = order.items || [];

    const itemsHtml = items
      .map(function (item) {
        const variantParts = [];
        if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
        if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
        const variantLabel = variantParts.join(" · ");

        return `
          <div class="admin-order-item-row">
            <div>
              <div>${escapeHtml(item.name || "Untitled product")} &times; ${Number(item.quantity) || 0}</div>
              ${variantLabel ? `<div class="admin-order-item-row__variant">${variantLabel}</div>` : ""}
            </div>
            <span>${formatNaira((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span>
          </div>
        `;
      })
      .join("");

    const statusOptions = ORDER_STATUSES.map(function (status) {
      const selected = status === order.status ? "selected" : "";
      return `<option value="${status}" ${selected}>${status}</option>`;
    }).join("");

    // If the stored status isn't one of the five allowed values (e.g. an
    // older order saved as "Confirmed" by payment.js), show a neutral
    // placeholder so the dropdown doesn't misrepresent it as one of them.
    const currentIsKnownStatus = ORDER_STATUSES.indexOf(order.status) !== -1;
    const placeholderOption = currentIsKnownStatus
      ? ""
      : `<option value="" selected disabled>Current: ${escapeHtml(order.status || "Confirmed")}</option>`;

    return `
      <div>
        <p class="admin-order-detail__section-label">Customer</p>
        <div class="admin-order-detail__customer">
          <p>${escapeHtml(customer.fullName || "")}</p>
          <p>${escapeHtml(customer.email || "")}</p>
          <p>${escapeHtml(customer.phone || "")}</p>
          <p>${escapeHtml(customer.address || "")}, ${escapeHtml(customer.city || "")}</p>
        </div>
      </div>
      <div>
        <p class="admin-order-detail__section-label">Items</p>
        ${itemsHtml || "<p>No items on this order.</p>"}
      </div>
      <div>
        <p class="admin-order-detail__section-label">Total</p>
        <p style="font-weight:600;">${formatNaira(order.total)}</p>
      </div>
      <div>
        <p class="admin-order-detail__section-label">Status</p>
        <div class="admin-order-detail__status">
          <select class="order-status-select" data-order-number="${escapeHtml(order.orderNumber)}">
            ${placeholderOption}
            ${statusOptions}
          </select>
        </div>
      </div>
    `;
  }

  // Delegated handler — order rows are rebuilt often, so bind on the
  // container once rather than re-binding after every render.
  $adminOrderList.on("change", ".order-status-select", function () {
    const orderNumber = $(this).data("order-number");
    const newStatus = $(this).val();

    const orders = getOrdersFromStorage();
    const order = orders.find(function (o) {
      return o.orderNumber === orderNumber;
    });

    if (!order) return;

    order.status = newStatus;
    saveOrders(orders);
    renderOrderList();
  });

  function formatDate(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString || "";
    return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  }

  // =========================================================
  // Complaint management (view / filter / status / delete)
  //
  // Reuses the exact fitLockerComplaints structure already written
  // by the customer profile page (profile.js): { id, userId, userName,
  // subject, category, message, status, createdAt }. This is the same
  // storage this file reads/writes — not a second complaint system —
  // so a status change here is immediately visible on profile.html too.
  // =========================================================

  function getComplaints() {
    try {
      const raw = localStorage.getItem(COMPLAINTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveComplaints(complaints) {
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
  }

  // ---------- Filter ----------
  $complaintFilters.on("click", ".filter-pill", function () {
    currentComplaintFilter = $(this).data("status");

    $complaintFilters.find(".filter-pill").removeClass("filter-pill--active");
    $(this).addClass("filter-pill--active");

    renderComplaintList();
  });

  // ---------- Render list ----------
  function renderComplaintList() {
    const all = getComplaints();
    const filtered = currentComplaintFilter === "All"
      ? all
      : all.filter(function (c) { return c.status === currentComplaintFilter; });

    $adminComplaintList.empty();

    if (filtered.length === 0) {
      $adminComplaintsEmpty.attr("hidden", false);
      return;
    }

    $adminComplaintsEmpty.attr("hidden", true);

    // Most recent first.
    filtered
      .slice()
      .reverse()
      .forEach(function (complaint) {
        $adminComplaintList.append(buildComplaintRow(complaint));
      });
  }

  function badgeClassForStatus(status) {
    if (status === "Open") return "admin-complaint-row__badge--open";
    if (status === "Closed") return "admin-complaint-row__badge--closed";
    return "";
  }

  function buildComplaintRow(complaint) {
    const $row = $(`
      <div class="admin-complaint-row" data-id="${escapeHtml(complaint.id)}">
        <div class="admin-complaint-row__summary">
          <div>
            <p class="admin-complaint-row__subject">${escapeHtml(complaint.subject)}</p>
            <p class="admin-complaint-row__meta">
              ${escapeHtml(complaint.id)} &middot;
              ${escapeHtml(complaint.userName || "Unknown customer")} &middot;
              ${escapeHtml(complaint.category)} &middot;
              ${escapeHtml(formatDate(complaint.createdAt))}
            </p>
          </div>
          <span class="admin-complaint-row__badge ${badgeClassForStatus(complaint.status)}">${escapeHtml(complaint.status || "Open")}</span>
        </div>
        <div class="admin-complaint-row__detail" hidden></div>
      </div>
    `);

    $row.find(".admin-complaint-row__summary").on("click", function () {
      const $detail = $row.find(".admin-complaint-row__detail");
      const isOpen = $detail.attr("hidden") === undefined;

      if (isOpen) {
        $detail.attr("hidden", true).empty();
      } else {
        $detail.html(buildComplaintDetail(complaint)).attr("hidden", false);
      }
    });

    return $row;
  }

  function buildComplaintDetail(complaint) {
    const statusOptions = COMPLAINT_STATUSES.map(function (status) {
      const selected = status === complaint.status ? "selected" : "";
      return `<option value="${status}" ${selected}>${status}</option>`;
    }).join("");

    return `
      <div>
        <p class="admin-order-detail__section-label">Customer</p>
        <p>${escapeHtml(complaint.userName || "Unknown customer")} (${escapeHtml(complaint.userId || "")})</p>
      </div>
      <div>
        <p class="admin-order-detail__section-label">Message</p>
        <p class="admin-complaint-row__message">${escapeHtml(complaint.message)}</p>
      </div>
      <div class="admin-complaint-row__actions">
        <select class="complaint-status-select" data-complaint-id="${escapeHtml(complaint.id)}">
          ${statusOptions}
        </select>
        <button type="button" class="admin-complaint-row__delete-btn" data-complaint-id="${escapeHtml(complaint.id)}">Delete</button>
      </div>
    `;
  }

  // Delegated handlers — rows are rebuilt on every render.
  $adminComplaintList.on("change", ".complaint-status-select", function () {
    const complaintId = $(this).data("complaint-id");
    const newStatus = $(this).val();

    const complaints = getComplaints();
    const complaint = complaints.find(function (c) { return c.id === complaintId; });
    if (!complaint) return;

    complaint.status = newStatus;
    saveComplaints(complaints);
    renderComplaintList();
    renderStats();
  });

  $adminComplaintList.on("click", ".admin-complaint-row__delete-btn", function () {
    const complaintId = $(this).data("complaint-id");
    const confirmed = window.confirm("Delete this complaint? This can't be undone.");
    if (!confirmed) return;

    const complaints = getComplaints().filter(function (c) { return c.id !== complaintId; });
    saveComplaints(complaints);
    renderComplaintList();
    renderStats();
  });

});