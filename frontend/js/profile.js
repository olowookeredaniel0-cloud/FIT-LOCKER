/* =========================================================
   FIT LOCKER — profile.js
   Customer account area: profile info, orders, tracking,
   receipts, and support complaints. Everything is scoped to
   the currently logged-in user via window.FitLockerAuth.

   IMPORTANT DATA NOTE:
   There is no separate "user ID" anywhere in this system —
   email is the only unique identifier (fitLockerUsers,
   fitLockerCurrentUser). Orders (fitLockerOrders) are not
   linked to an account at all; they only carry whatever name/
   email/phone/address the customer typed at checkout. So "my
   orders" here means "orders whose customer.email matches my
   account email" — the best link the existing data allows.

   Local Storage keys used:
   - fitLockerUsers, fitLockerCurrentUser (via auth.js)
   - fitLockerOrders (read-only; status is never changed here —
     only admin.js changes order status)
   - fitLockerComplaints (new — created by this file)
   ========================================================= */

$(function () {

  const ORDERS_KEY = "fitLockerOrders";
  const COMPLAINTS_KEY = "fitLockerComplaints";

  // Orders considered "current" (still moving toward delivery).
  // "Confirmed" is included because that's the actual status
  // payment.js writes for a brand-new order — without it, a fresh
  // order would show in neither Current Orders nor Order History.
  // "Pending" and "Out for Delivery" are included per this feature's
  // spec, even though admin.js's status dropdown doesn't yet offer
  // "Out for Delivery" (see note in the chat response).
  const ACTIVE_STATUSES = ["Confirmed", "Pending", "Processing", "Shipped", "Out for Delivery"];
  const HISTORY_STATUSES = ["Delivered", "Cancelled"];

  // Order status → tracking timeline step index.
  const TRACKING_STEPS = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];
  const STATUS_TO_STEP = {
    "Confirmed": 0,
    "Pending": 0,
    "Processing": 1,
    "Shipped": 2,
    "Out for Delivery": 3,
    "Delivered": 4
  };

  // ---------- Cached DOM elements ----------
  const $guardState = $("#guardState");
  const $profileShell = $("#profileShell");
  const $profileTabs = $("#profileTabs");

  const $accountForm = $("#accountForm");
  const $accountName = $("#accountName");
  const $accountEmail = $("#accountEmail");
  const $accountPhone = $("#accountPhone");
  const $accountAddress = $("#accountAddress");
  const $accountMessage = $("#accountMessage");

  const $currentOrdersList = $("#currentOrdersList");
  const $currentOrdersEmpty = $("#currentOrdersEmpty");
  const $orderHistoryList = $("#orderHistoryList");
  const $orderHistoryEmpty = $("#orderHistoryEmpty");

  const $trackingList = $("#trackingList");
  const $trackingEmpty = $("#trackingEmpty");

  const $receiptsList = $("#receiptsList");
  const $receiptsEmpty = $("#receiptsEmpty");

  const $complaintForm = $("#complaintForm");
  const $complaintCategory = $("#complaintCategory");
  const $complaintSubject = $("#complaintSubject");
  const $complaintMessage = $("#complaintMessage");
  const $complaintMessageStatus = $("#complaintMessageStatus");
  const $complaintList = $("#complaintList");
  const $complaintEmpty = $("#complaintEmpty");

  let currentUser = null;
  let userOrders = [];

  // ---------- Init ----------
  init();

  function init() {
    if (!window.FitLockerAuth || !window.FitLockerAuth.isLoggedIn()) {
      $guardState.attr("hidden", false);
      $profileShell.attr("hidden", true);
      return;
    }

    currentUser = window.FitLockerAuth.getCurrentUser();
    $guardState.attr("hidden", true);
    $profileShell.attr("hidden", false);

    loadAccountInfo();
    userOrders = getOrdersForCurrentUser();
    renderOrders();
    renderTracking();
    renderReceipts();
    renderComplaints();
  }

  // =========================================================
  // Tabs
  // =========================================================
  $profileTabs.on("click", ".profile-tab", function () {
    const tab = $(this).data("tab");
    activateTab(tab);
  });

  function activateTab(tab) {
    $profileTabs.find(".profile-tab").removeClass("profile-tab--active");
    $profileTabs.find(`[data-tab="${tab}"]`).addClass("profile-tab--active");

    $(".profile-tab-panel").attr("hidden", true);
    $(`#tab-${tab}`).attr("hidden", false);
  }

  // =========================================================
  // 1. Account Information
  // =========================================================
  function loadAccountInfo() {
    const user = window.FitLockerAuth.getUserByEmail(currentUser.email);
    if (!user) return;

    $accountName.val(user.name || "");
    $accountEmail.val(user.email || "");
    $accountPhone.val(user.phone || "");
    $accountAddress.val(user.address || "");
  }

  $accountForm.on("submit", function (event) {
    event.preventDefault();

    const name = $accountName.val().trim();
    const phone = $accountPhone.val().trim();
    const address = $accountAddress.val().trim();

    if (!name) {
      return showAccountMessage("Please enter your full name.", true);
    }

    const result = window.FitLockerAuth.updateProfile(currentUser.email, {
      name: name,
      phone: phone,
      address: address
    });

    if (!result.success) {
      return showAccountMessage(result.error, true);
    }

    currentUser = window.FitLockerAuth.getCurrentUser();
    showAccountMessage("Changes saved.", false);
  });

  function showAccountMessage(text, isError) {
    $accountMessage
      .text(text)
      .attr("class", `profile-form__message ${isError ? "profile-form__message--error" : "profile-form__message--success"}`)
      .attr("hidden", false);
  }

  // =========================================================
  // Shared order helpers
  // =========================================================
  function getAllOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  // Matches by email (case-insensitive) since that's the only link
  // between an order and an account in this system.
  function getOrdersForCurrentUser() {
    const myEmail = (currentUser.email || "").toLowerCase();
    return getAllOrders().filter(function (order) {
      const orderEmail = order.customer && order.customer.email ? order.customer.email.toLowerCase() : "";
      return orderEmail === myEmail;
    });
  }

  function isHistoryStatus(status) {
    return HISTORY_STATUSES.indexOf(status) !== -1;
  }

  // =========================================================
  // 2 & 3 & 4. My Orders (Current + History)
  // =========================================================
  function renderOrders() {
    const current = userOrders.filter(function (o) { return !isHistoryStatus(o.status); });
    const history = userOrders.filter(function (o) { return isHistoryStatus(o.status); });

    renderOrderGroup(current, $currentOrdersList, $currentOrdersEmpty);
    renderOrderGroup(history, $orderHistoryList, $orderHistoryEmpty);
  }

  function renderOrderGroup(orders, $list, $empty) {
    $list.empty();

    if (orders.length === 0) {
      $empty.attr("hidden", false);
      return;
    }
    $empty.attr("hidden", true);

    orders
      .slice()
      .reverse()
      .forEach(function (order) {
        $list.append(buildOrderRow(order));
      });
  }

  function buildOrderRow(order) {
    const isCancelled = order.status === "Cancelled";

    const $row = $(`
      <div class="profile-order-row" id="order-${escapeHtml(order.orderNumber)}">
        <div>
          <p class="profile-order-row__number">${escapeHtml(order.orderNumber)}</p>
          <p class="profile-order-row__meta">${escapeHtml(formatDate(order.date))} &middot; ${formatNaira(order.total)}</p>
        </div>
        <span class="profile-order-row__badge ${isCancelled ? "profile-order-row__badge--cancelled" : ""}">${escapeHtml(order.status || "Confirmed")}</span>
        <div class="profile-order-row__actions">
          <button type="button" class="view-order-btn">View Order</button>
          <button type="button" class="track-order-btn">Track Order</button>
          <a href="order-confirmation.html?order=${encodeURIComponent(order.orderNumber)}" target="_blank" rel="noopener">View Receipt</a>
        </div>
        <div class="profile-order-row__detail" hidden></div>
      </div>
    `);

    $row.find(".view-order-btn").on("click", function () {
      const $detail = $row.find(".profile-order-row__detail");
      const isOpen = $detail.attr("hidden") === undefined;
      if (isOpen) {
        $detail.attr("hidden", true).empty();
      } else {
        $detail.html(buildOrderDetailHtml(order)).attr("hidden", false);
      }
    });

    $row.find(".track-order-btn").on("click", function () {
      activateTab("tracking");
      const target = document.getElementById(`tracking-${order.orderNumber}`);
      if (target) {
        window.setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    });

    return $row;
  }

  function buildOrderDetailHtml(order) {
    const items = order.items || [];
    const itemsHtml = items.map(function (item) {
      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
      if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
      const variantLabel = variantParts.join(" · ");
      return `
        <div class="profile-order-item-row">
          <span>${escapeHtml(item.name || "Untitled product")} &times; ${Number(item.quantity) || 0} ${variantLabel ? `(${variantLabel})` : ""}</span>
          <span>${formatNaira((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span>
        </div>
      `;
    }).join("");

    return `
      ${itemsHtml || "<p>No items on this order.</p>"}
      <div class="profile-order-item-row" style="font-weight:600; border-top:1px solid var(--line); padding-top:8px; margin-top:4px;">
        <span>Total</span><span>${formatNaira(order.total)}</span>
      </div>
    `;
  }

  // =========================================================
  // 5. Order Tracking
  // =========================================================
  function renderTracking() {
    $trackingList.empty();

    if (userOrders.length === 0) {
      $trackingEmpty.attr("hidden", false);
      return;
    }
    $trackingEmpty.attr("hidden", true);

    userOrders
      .slice()
      .reverse()
      .forEach(function (order) {
        $trackingList.append(buildTrackingCard(order));
      });
  }

  function buildTrackingCard(order) {
    const $card = $(`
      <div class="tracking-card" id="tracking-${escapeHtml(order.orderNumber)}">
        <div class="tracking-card__header">
          <div>
            <p class="profile-order-row__number">${escapeHtml(order.orderNumber)}</p>
            <p class="profile-order-row__meta">${escapeHtml(formatDate(order.date))}</p>
          </div>
        </div>
      </div>
    `);

    if (order.status === "Cancelled") {
      $card.append(`<p class="tracking-cancelled-banner">This order was cancelled.</p>`);
      return $card;
    }

    const currentStep = STATUS_TO_STEP.hasOwnProperty(order.status) ? STATUS_TO_STEP[order.status] : 0;

    const $timeline = $('<div class="tracking-timeline"></div>');
    TRACKING_STEPS.forEach(function (label, index) {
      const isDone = index <= currentStep;
      const isCurrent = index === currentStep;
      $timeline.append(`
        <div class="tracking-step ${isDone ? "tracking-step--done" : ""} ${isCurrent ? "tracking-step--current" : ""}">
          <span class="tracking-step__dot"></span>
          <span class="tracking-step__label">${label}</span>
        </div>
      `);
    });

    $card.append($timeline);
    return $card;
  }

  // =========================================================
  // 6. Receipts
  // =========================================================
  function renderReceipts() {
    $receiptsList.empty();

    if (userOrders.length === 0) {
      $receiptsEmpty.attr("hidden", false);
      return;
    }
    $receiptsEmpty.attr("hidden", true);

    userOrders
      .slice()
      .reverse()
      .forEach(function (order) {
        $receiptsList.append(`
          <div class="profile-order-row">
            <div>
              <p class="profile-order-row__number">${escapeHtml(order.orderNumber)}</p>
              <p class="profile-order-row__meta">${escapeHtml(formatDate(order.date))} &middot; ${formatNaira(order.total)}</p>
            </div>
            <div class="profile-order-row__actions">
              <a href="order-confirmation.html?order=${encodeURIComponent(order.orderNumber)}" target="_blank" rel="noopener">View Receipt</a>
              <a href="order-confirmation.html?order=${encodeURIComponent(order.orderNumber)}&autoprint=1" target="_blank" rel="noopener">Print Receipt</a>
            </div>
          </div>
        `);
        // NOTE: no "Download Receipt" — the existing receipt page only
        // supports viewing/printing (window.print()), not exporting a
        // file, so that option is left out rather than faked.
      });
  }

  // =========================================================
  // 7. Help & Support (Complaints)
  // =========================================================
  function getComplaints() {
    try {
      const raw = localStorage.getItem(COMPLAINTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveComplaints(list) {
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(list));
  }

  $complaintForm.on("submit", function (event) {
    event.preventDefault();

    const category = $complaintCategory.val();
    const subject = $complaintSubject.val().trim();
    const message = $complaintMessage.val().trim();

    if (!subject) {
      return showComplaintMessage("Please enter a subject.", true);
    }
    if (!message) {
      return showComplaintMessage("Please describe the issue.", true);
    }

    const complaint = {
      id: "cmp-" + Date.now().toString(36),
      userId: currentUser.email, // email is the only identifier this system has
      userName: currentUser.name,
      subject: subject,
      category: category,
      message: message,
      status: "Open",
      createdAt: new Date().toISOString()
    };

    const complaints = getComplaints();
    complaints.push(complaint);
    saveComplaints(complaints);

    $complaintForm[0].reset();
    showComplaintMessage("Your complaint has been submitted.", false);
    renderComplaints();
  });

  function showComplaintMessage(text, isError) {
    $complaintMessageStatus
      .text(text)
      .attr("class", `profile-form__message ${isError ? "profile-form__message--error" : "profile-form__message--success"}`)
      .attr("hidden", false);
  }

  function renderComplaints() {
    const myEmail = (currentUser.email || "").toLowerCase();
    const mine = getComplaints().filter(function (c) {
      return (c.userId || "").toLowerCase() === myEmail;
    });

    $complaintList.empty();

    if (mine.length === 0) {
      $complaintEmpty.attr("hidden", false);
      return;
    }
    $complaintEmpty.attr("hidden", true);

    mine
      .slice()
      .reverse()
      .forEach(function (complaint) {
        $complaintList.append(`
          <div class="complaint-row">
            <div class="complaint-row__top">
              <div>
                <p class="complaint-row__subject">${escapeHtml(complaint.subject)}</p>
                <p class="complaint-row__meta">${escapeHtml(complaint.category)} &middot; ${escapeHtml(formatDate(complaint.createdAt))}</p>
              </div>
              <span class="complaint-row__status">${escapeHtml(complaint.status || "Open")}</span>
            </div>
            <p class="complaint-row__message">${escapeHtml(complaint.message)}</p>
          </div>
        `);
      });
  }

  // ---------- Shared helpers ----------
  function formatDate(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString || "";
    return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatNaira(amount) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

});