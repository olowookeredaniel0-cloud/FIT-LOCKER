/* =========================================================
   FIT LOCKER — order-confirmation.js
   Reads the order number from the URL (?order=...), looks it
   up in fitLockerOrders, and displays it as a printable receipt.
   ========================================================= */

$(function () {

  const ORDERS_KEY = "fitLockerOrders";

  const $notFoundState = $("#notFoundState");
  const $confirmationLayout = $("#confirmationLayout");

  const $confirmOrderNumber = $("#confirmOrderNumber");
  const $confirmDate = $("#confirmDate");
  const $confirmCustomerName = $("#confirmCustomerName");
  const $confirmCustomerEmail = $("#confirmCustomerEmail");
  const $confirmAddress = $("#confirmAddress");
  const $confirmItems = $("#confirmItems");
  const $confirmSubtotal = $("#confirmSubtotal");
  const $confirmDeliveryFee = $("#confirmDeliveryFee");
  const $confirmTotal = $("#confirmTotal");
  const $confirmPaymentMethod = $("#confirmPaymentMethod");
  const $confirmStatus = $("#confirmStatus");
  const $printReceiptBtn = $("#printReceiptBtn");

  init();

  function init() {
    const orderNumber = getOrderNumberFromUrl();
    const order = orderNumber ? findOrder(orderNumber) : null;

    if (!order) {
      $notFoundState.attr("hidden", false);
      $confirmationLayout.attr("hidden", true);
      return;
    }

    renderOrder(order);
    $notFoundState.attr("hidden", true);
    $confirmationLayout.attr("hidden", false);

    // Optional entry point for other pages (e.g. profile.html's "Print
    // Receipt" button) that want this page to open straight into print:
    // order-confirmation.html?order=...&autoprint=1
    if (new URLSearchParams(window.location.search).get("autoprint") === "1") {
      window.setTimeout(function () { window.print(); }, 300);
    }
  }

  function getOrderNumberFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("order");
  }

  function findOrder(orderNumber) {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders = raw ? JSON.parse(raw) : [];
      return orders.find(function (o) {
        return o.orderNumber === orderNumber;
      });
    } catch (err) {
      return null;
    }
  }

  function renderOrder(order) {
    const customer = order.customer || {};

    $confirmOrderNumber.text(order.orderNumber);
    $confirmDate.text(formatDate(order.date));
    $confirmCustomerName.text(customer.fullName || "");
    $confirmCustomerEmail.text(customer.email || "");
    $confirmAddress.text(`${customer.address || ""}, ${customer.city || ""}`);

    renderItems(order.items || []);

    $confirmSubtotal.text(formatNaira(order.subtotal));
    $confirmDeliveryFee.text(formatNaira(order.deliveryFee));
    $confirmTotal.text(formatNaira(order.total));
    $confirmPaymentMethod.text(order.paymentMethod || "Demo Card Payment");
    $confirmStatus.text(order.status || "Confirmed");
  }

  function renderItems(items) {
    $confirmItems.empty();

    items.forEach(function (item) {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.price) || 0;

      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${escapeHtml(item.size)}`);
      if (item.color) variantParts.push(`Color: ${escapeHtml(item.color)}`);
      const variantLabel = variantParts.join(" · ");

      $confirmItems.append(`
        <div class="receipt-item-row">
          <div>
            <div>${escapeHtml(item.name || "Untitled product")} &times; ${quantity} @ ${formatNaira(unitPrice)}</div>
            ${variantLabel ? `<div class="receipt-item-row__variant">${variantLabel}</div>` : ""}
          </div>
          <span>${formatNaira(unitPrice * quantity)}</span>
        </div>
      `);
    });
  }

  $printReceiptBtn.on("click", function () {
    window.print();
  });

  function formatDate(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString || "";
    return date.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
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