/**
 * USMAN PHARMACY - Main Application Controller
 * Handles SPA navigation, real-time UI state synchronization,
 * role switching, language translation, time-machine simulation,
 * interactive modals, and global keyboard shortcuts.
 */

// Global App State
window.app = Object.assign(window.app || {}, {
  currentTab: 'dashboard',
  currentLang: 'en',
  activeRole: 'Owner',

  init() {
    this.currentLang = window.db.data.settings.language || 'en';
    this.setupEventListeners();
    this.renderHeader();
    this.updateExpiryBadge();
    this.navigateTo('dashboard');
    this.setupKeyboardShortcuts();
  },

  // Navigation controller
  navigateTo(tabId) {
    this.currentTab = tabId;

    // Auto-close mobile sidebar drawer on navigation
    document.body.classList.remove('sidebar-open');

    // Update sidebar active states
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.tab === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Trigger tab-specific renders
    switch (tabId) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'expiry':
        this.renderExpiryCenter();
        break;
      case 'inventory':
        this.renderInventory();
        break;
      case 'cosmetics':
        this.renderCosmetics();
        break;
      case 'pos':
        this.renderPos();
        break;
      case 'purchases':
        this.renderPurchases();
        break;
      case 'accounting':
        this.renderAccounting();
        break;
      case 'reports':
        this.renderReports();
        break;
      case 'staff':
        this.renderStaff();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }

    this.updateExpiryBadge();
  },

  // Update topbar & sidebar notification badge
  updateExpiryBadge() {
    const sum = window.expiryEngine.getSummary();
    const badges = document.querySelectorAll('.expiry-alert-count');
    badges.forEach(b => {
      b.textContent = sum.criticalCount;
      b.style.display = sum.criticalCount > 0 ? 'inline-flex' : 'none';
    });

    const bellBadge = document.getElementById('top-bell-badge');
    if (bellBadge) {
      bellBadge.textContent = sum.criticalCount;
      bellBadge.style.display = sum.criticalCount > 0 ? 'inline-block' : 'none';
    }
  },

  // Setup Global Keyboard Shortcuts (F2: POS, F3: Expiry, F4: Complete Sale, Ctrl+K: Global Search, F9: AI Voice)
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        this.navigateTo('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        this.navigateTo('expiry');
      } else if (e.key === 'F4' && this.currentTab === 'pos') {
        e.preventDefault();
        this.openCheckoutModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        this.toggleAiDrawer();
      }
    });
  },

  // Toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  },

  // Render Header (Branch Selector, Role Switcher, Simulated Date, User info)
  renderHeader() {
    const branchSelect = document.getElementById('header-branch-select');
    if (branchSelect) {
      branchSelect.innerHTML = window.db.data.branches.map(b =>
        `<option value="${b.id}" ${b.id === window.db.data.settings.activeBranch ? 'selected' : ''}>${b.name}</option>`
      ).join('');
    }

    const userSelect = document.getElementById('header-user-select');
    if (userSelect) {
      userSelect.innerHTML = window.db.data.users.map(u =>
        `<option value="${u.id}" ${u.id === window.db.data.settings.activeUser ? 'selected' : ''}>${u.name} (${u.role})</option>`
      ).join('');
    }

    this.updateSimulatedDateUI();
  },

  updateSimulatedDateUI() {
    const simDate = window.db.getSimulatedDate();
    const dateDisplay = document.getElementById('system-date-display');
    const offsetDays = window.db.data.settings.simulatedDaysAdvance || 0;

    if (dateDisplay) {
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      dateDisplay.innerHTML = `
        <span class="clock-icon">🕒</span> 
        <strong>${simDate.toLocaleDateString('en-PK', options)}</strong>
        ${offsetDays > 0 ? `<span class="badge badge-simulated">+${offsetDays}d Sim</span>` : ''}
      `;
    }
  },

  // Time Machine Simulator
  advanceDays(days) {
    window.db.advanceSimulationDays(days);
    this.updateSimulatedDateUI();
    this.updateExpiryBadge();
    this.showToast(`Time Machine: System clock advanced by +${days} days. Recalculating all expiry alerts & stock status.`, 'warning');
    // Refresh current view
    this.navigateTo(this.currentTab);
  },

  resetSimulation() {
    window.db.resetSimulationDays();
    this.updateSimulatedDateUI();
    this.updateExpiryBadge();
    this.showToast('Time Machine: System clock reset to actual real-time.', 'success');
    this.navigateTo(this.currentTab);
  },

  // Language switcher (Urdu / English)
  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ur' : 'en';
    window.db.data.settings.language = this.currentLang;
    window.db.save();

    document.body.classList.toggle('lang-ur', this.currentLang === 'ur');
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.textContent = this.currentLang === 'en' ? 'اردو' : 'English';
    }
    this.showToast(this.currentLang === 'en' ? 'Interface language set to English' : 'زبان اردو میں تبدیل کر دی گئی ہے', 'info');
    this.navigateTo(this.currentTab);
  },

  // Global Search Handler
  handleGlobalSearch(query) {
    if (!query || query.trim().length < 2) {
      document.getElementById('global-search-results').style.display = 'none';
      return;
    }

    const q = query.toLowerCase().trim();
    const resultsBox = document.getElementById('global-search-results');
    const products = window.db.data.products || [];
    const batches = window.db.data.batches || [];
    const suppliers = window.db.data.suppliers || [];
    const sales = window.db.data.sales || [];

    const matchedProducts = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.genericName.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    ).slice(0, 5);

    const matchedBatches = batches.filter(b =>
      b.batchNumber.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedSuppliers = suppliers.filter(s =>
      s.name.toLowerCase().includes(q) || s.phone.includes(q)
    ).slice(0, 3);

    const matchedInvoices = sales.filter(s =>
      s.id.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)
    ).slice(0, 3);

    let html = '';

    if (matchedProducts.length > 0) {
      html += `<div class="search-category-title">💊 Medicines & Cosmetics</div>`;
      matchedProducts.forEach(p => {
        html += `
          <div class="search-item" onclick="app.selectSearchResult('product', '${p.id}')">
            <div><strong>${p.name}</strong> <span class="text-muted">(${p.genericName})</span></div>
            <div class="search-sub text-muted">${p.category} | ${p.dosageForm} ${p.strength} | Barcode: ${p.barcode}</div>
          </div>
        `;
      });
    }

    if (matchedBatches.length > 0) {
      html += `<div class="search-category-title">🏷️ Batches & Expiry</div>`;
      matchedBatches.forEach(b => {
        const prod = products.find(p => p.id === b.productId);
        const days = window.expiryEngine.getDaysRemaining(b.expiryDate);
        html += `
          <div class="search-item" onclick="app.selectSearchResult('batch', '${b.id}')">
            <div><strong>Batch ${b.batchNumber}</strong> — ${prod ? prod.name : ''}</div>
            <div class="search-sub text-muted">Expiry: ${b.expiryDate} (${days} days) | Qty: ${b.quantity} | Shelf: ${b.shelfLocation}</div>
          </div>
        `;
      });
    }

    if (matchedSuppliers.length > 0) {
      html += `<div class="search-category-title">🏢 Distributors & Suppliers</div>`;
      matchedSuppliers.forEach(s => {
        html += `
          <div class="search-item" onclick="app.selectSearchResult('supplier', '${s.id}')">
            <div><strong>${s.name}</strong></div>
            <div class="search-sub text-muted">Contact: ${s.contactPerson} (${s.phone}) | Payable: PKR ${s.balance.toLocaleString()}</div>
          </div>
        `;
      });
    }

    if (matchedInvoices.length > 0) {
      html += `<div class="search-category-title">🧾 Sales Invoices</div>`;
      matchedInvoices.forEach(inv => {
        html += `
          <div class="search-item" onclick="app.selectSearchResult('invoice', '${inv.id}')">
            <div><strong>Invoice ${inv.id}</strong> — ${inv.customerName}</div>
            <div class="search-sub text-muted">Amount: PKR ${inv.netTotal.toLocaleString()} | Date: ${inv.dateTime.split('T')[0]}</div>
          </div>
        `;
      });
    }

    if (!html) {
      html = `<div class="search-empty text-muted">No records matching "${query}"</div>`;
    }

    resultsBox.innerHTML = html;
    resultsBox.style.display = 'block';
  },

  selectSearchResult(type, id) {
    document.getElementById('global-search-results').style.display = 'none';
    document.getElementById('global-search-input').value = '';

    if (type === 'product' || type === 'batch') {
      this.navigateTo('inventory');
    } else if (type === 'supplier') {
      this.navigateTo('purchases');
    } else if (type === 'invoice') {
      this.navigateTo('reports');
    }
  },

  // Setup Event Listeners
  setupEventListeners() {
    // Topbar Branch & User switches
    const branchSelect = document.getElementById('header-branch-select');
    if (branchSelect) {
      branchSelect.addEventListener('change', (e) => {
        window.db.data.settings.activeBranch = e.target.value;
        window.db.save();
        this.showToast(`Active Branch switched to: ${window.db.getCurrentBranch().name}`, 'info');
        this.navigateTo(this.currentTab);
      });
    }

    const userSelect = document.getElementById('header-user-select');
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        window.db.data.settings.activeUser = e.target.value;
        window.db.save();
        const u = window.db.getCurrentUser();
        this.showToast(`Logged in as: ${u.name} (${u.role})`, 'info');
        this.navigateTo(this.currentTab);
      });
    }

    // Global search input
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleGlobalSearch(e.target.value);
      });
      // Close on click outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.global-search-container')) {
          const res = document.getElementById('global-search-results');
          if (res) res.style.display = 'none';
        }
      });
    }

    // Language toggle
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => this.toggleLanguage());
    }

    // Floating AI quick launcher
    const aiToggleBtn = document.getElementById('btn-open-ai');
    if (aiToggleBtn) {
      aiToggleBtn.addEventListener('click', () => this.toggleAiDrawer());
    }

    const aiCloseBtn = document.getElementById('ai-drawer-close');
    if (aiCloseBtn) {
      aiCloseBtn.addEventListener('click', () => this.toggleAiDrawer(false));
    }
  },

  // AI Drawer toggler
  toggleAiDrawer(forceOpen = null) {
    const drawer = document.getElementById('ai-assistant-drawer');
    if (!drawer) return;
    if (forceOpen === true) {
      drawer.classList.add('open');
    } else if (forceOpen === false) {
      drawer.classList.remove('open');
    } else {
      drawer.classList.toggle('open');
    }
  }
});

// Start application when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
