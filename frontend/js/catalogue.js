/* =========================================================
   FIT LOCKER — catalogue.js
   Single source of truth for the product seed data and the
   Local Storage seeding/versioning logic. Loaded by shop.html,
   product.html, and cart.html (before products.js / product.js
   / cart.js), so the catalogue gets seeded correctly no matter
   which page a visitor lands on first — not just the shop page.

   Exposes one global: window.FitLockerCatalogue.getProducts()
   ========================================================= */

window.FitLockerCatalogue = (function () {

  const STORAGE_KEY = "fitLockerProducts";
  const VERSION_KEY = "fitLockerProductsVersion";
  // Bump this any time SEED_PRODUCTS below changes shape (new/changed
  // fields, added products, etc.) so already-seeded browsers refresh.
  const PRODUCTS_VERSION = "2";

  // ---------- Seed data ----------
  // Used to initialize Local Storage the first time any page runs,
  // or whenever PRODUCTS_VERSION above no longer matches what a
  // browser already has stored.
  const SEED_PRODUCTS = [
    {
      _id: "prod-1",
      name: "Classic Oxford Shirt",
      category: "Men",
      subcategory: "Shirts",
      price: 35000,
      description: "A clean and versatile everyday shirt.",
      image: "oxford-shirt.jpg",
      colors: ["White", "Light Blue", "Black"],
      sizes: ["S", "M", "L", "XL"],
      stock: 15
    },
    {
      _id: "prod-2",
      name: "Relaxed Fit Trousers",
      category: "Men",
      subcategory: "Trousers",
      price: 42000,
      description: "",
      image: "",
      colors: ["Black", "Khaki", "Navy"],
      sizes: ["30", "32", "34", "36", "38"],
      stock: 10
    },
    {
      _id: "prod-3",
      name: "Essential Bomber Jacket",
      category: "Men",
      subcategory: "Jackets",
      price: 55000,
      description: "",
      image: "",
      colors: ["Black", "Olive", "Navy"],
      sizes: ["S", "M", "L", "XL"],
      stock: 8
    },
    {
      _id: "prod-4",
      name: "Everyday Midi Dress",
      category: "Women",
      subcategory: "Dresses",
      price: 45000,
      description: "",
      image: "",
      colors: ["Black", "Terracotta", "Navy"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 12
    },
    {
      _id: "prod-5",
      name: "Essential Ribbed Top",
      category: "Women",
      subcategory: "Tops",
      price: 22000,
      description: "",
      image: "",
      colors: ["White", "Black", "Sage"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 20
    },
    {
      _id: "prod-6",
      name: "Wide Leg Trousers",
      category: "Women",
      subcategory: "Trousers",
      price: 40000,
      description: "",
      image: "",
      colors: ["Black", "Beige", "Navy"],
      sizes: ["28", "30", "32", "34", "36"],
      stock: 14
    },
    {
      _id: "prod-7",
      name: "Classic Kids Shirt",
      category: "Kids",
      subcategory: "Boys",
      price: 18000,
      description: "",
      image: "",
      colors: ["White", "Blue", "Grey"],
      sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
      stock: 18
    },
    {
      _id: "prod-8",
      name: "Casual Girls Dress",
      category: "Kids",
      subcategory: "Girls",
      price: 25000,
      description: "",
      image: "",
      colors: ["Pink", "White", "Yellow"],
      sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
      stock: 16
    }
  ];

  // Returns the product catalogue, seeding (or re-seeding, on a
  // version change) Local Storage first if needed. Safe to call
  // from any page, in any order.
  function getProducts() {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored || storedVersion !== PRODUCTS_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
        localStorage.setItem(VERSION_KEY, PRODUCTS_VERSION);
        return SEED_PRODUCTS;
      }

      return JSON.parse(stored);
    } catch (err) {
      // Local Storage can be unreadable/unwritable in some setups (certain
      // private-browsing modes, restricted file:// contexts, DevTools
      // device-emulation frames, etc). Rather than breaking the page,
      // fall back to showing the seed catalogue for this session only.
      console.warn("FIT LOCKER: Local Storage unavailable, using in-memory seed data instead.", err);
      return SEED_PRODUCTS;
    }
  }

  // Overwrites the full product catalogue. Used by the admin product
  // management screen (add/edit/delete). Does not touch VERSION_KEY —
  // that tracks the shape of SEED_PRODUCTS, not the live edited data.
  function saveProducts(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  // =========================================================
  // Categories
  // Single source of truth for fitLockerCategories — shop.js,
  // products.js, and admin.js all read/write through these
  // functions rather than keeping their own category lists.
  // =========================================================

  const CATEGORIES_KEY = "fitLockerCategories";
  // Only used to initialize Local Storage the first time — matches the
  // categories the existing seed products already use. Never re-applied
  // once fitLockerCategories exists, so admin-added categories persist.
  const DEFAULT_CATEGORIES = [
    { id: "cat-men", name: "Men" },
    { id: "cat-women", name: "Women" },
    { id: "cat-kids", name: "Kids" }
  ];

  function getCategories() {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);

      if (!stored) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }

      return JSON.parse(stored);
    } catch (err) {
      console.warn("FIT LOCKER: Local Storage unavailable, using default categories instead.", err);
      return DEFAULT_CATEGORIES;
    }
  }

  function saveCategories(categories) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  function generateCategoryId() {
    return "cat-" + Date.now().toString(36);
  }

  // Returns { success: true, category } or { success: false, error }.
  // Category names must be non-empty and unique (case-insensitive).
  function addCategory(name) {
    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Please enter a category name." };
    }

    const categories = getCategories();
    const exists = categories.some(function (c) {
      return c.name.toLowerCase() === trimmedName.toLowerCase();
    });
    if (exists) {
      return { success: false, error: "A category with that name already exists." };
    }

    const category = { id: generateCategoryId(), name: trimmedName };
    categories.push(category);
    saveCategories(categories);
    return { success: true, category: category };
  }

  // Renames a category AND updates every product currently using its old
  // name, so products never end up pointing at a stale category name.
  function renameCategory(categoryId, newName) {
    const trimmedName = (newName || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Please enter a category name." };
    }

    const categories = getCategories();
    const category = categories.find(function (c) { return c.id === categoryId; });
    if (!category) {
      return { success: false, error: "Category not found." };
    }

    const duplicate = categories.some(function (c) {
      return c.id !== categoryId && c.name.toLowerCase() === trimmedName.toLowerCase();
    });
    if (duplicate) {
      return { success: false, error: "A category with that name already exists." };
    }

    const oldName = category.name;
    category.name = trimmedName;
    saveCategories(categories);

    // Keep existing products pointing at the renamed category, not the
    // old (now-nonexistent) name.
    if (oldName !== trimmedName) {
      const products = getProducts();
      let changed = false;
      products.forEach(function (product) {
        if (product.category === oldName) {
          product.category = trimmedName;
          changed = true;
        }
      });
      if (changed) saveProducts(products);
    }

    return { success: true };
  }

  // How many products currently use a given category name — used by the
  // admin UI to block/warn before deleting a category that's still in use.
  function countProductsUsingCategory(categoryName) {
    return getProducts().filter(function (p) { return p.category === categoryName; }).length;
  }

  // Deletes a category ONLY if no products use it. Returns
  // { success: false, error, productCount } if products are still
  // assigned to it, so the caller can show a clear warning instead of
  // silently deleting and leaving products with a broken category.
  function deleteCategory(categoryId) {
    const categories = getCategories();
    const category = categories.find(function (c) { return c.id === categoryId; });
    if (!category) {
      return { success: false, error: "Category not found." };
    }

    const productCount = countProductsUsingCategory(category.name);
    if (productCount > 0) {
      return {
        success: false,
        error: `${productCount} product${productCount === 1 ? "" : "s"} still use this category. Reassign or remove ${productCount === 1 ? "it" : "them"} first.`,
        productCount: productCount
      };
    }

    saveCategories(categories.filter(function (c) { return c.id !== categoryId; }));
    return { success: true };
  }

  return {
    getProducts: getProducts,
    saveProducts: saveProducts,
    getCategories: getCategories,
    addCategory: addCategory,
    renameCategory: renameCategory,
    deleteCategory: deleteCategory,
    countProductsUsingCategory: countProductsUsingCategory
  };


})();