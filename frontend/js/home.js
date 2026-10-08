/* =========================================================
   FIT LOCKER — home.js
   Renders the homepage's category cards from fitLockerCategories
   (via the shared js/catalogue.js) — NOT a separate category
   list. Adding/renaming/deleting a category in admin.html is
   automatically reflected here on next load, no code changes
   needed. Each card links to shop.html?category=<name>, which
   products.js reads and preselects on the shop page.
   ========================================================= */

$(function () {

  const $categoryGrid = $("#categoryGrid");

  renderCategories();

  function renderCategories() {
    const categories = window.FitLockerCatalogue.getCategories();

    $categoryGrid.empty();

    categories.forEach(function (category) {
      $categoryGrid.append(`
        <a class="category-card" href="shop.html?category=${encodeURIComponent(category.name)}">
          <span class="category-card__name">${escapeHtml(category.name)}</span>
          <span class="category-card__cta">Shop now &rarr;</span>
        </a>
      `);
    });
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