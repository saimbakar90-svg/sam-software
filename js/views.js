/**
 * USMAN PHARMACY - Views & UI Component Renderer
 * Implements interactive HTML rendering for:
 * 1. Owner & Operations Dashboard (live metrics, drilldowns, charts)
 * 2. Dedicated Expiry & Alerts Center (1-180d thresholds, quarantine, returns, disposition resolution)
 * 3. Inventory & Batch Management (FEFO, units, adjustments, transfers)
 * 4. Cosmetics Management (shades, skincare, fragrances)
 * 5. Smart POS & Billing (barcode, thermal receipts, khata credit)
 * 6. Purchases & Suppliers (10+1 bonus scheme, receiving)
 * 7. Accounting & Ledgers (P&L, Balance sheet, expenses)
 * 8. All 19 Reports with CSV Export & Print
 * 9. Staff & Security (Roles, Audit trail)
 * 10. Settings & Backup/Restore.
 */

// Extend App prototype with view renderers
window.app = window.app || {};
window.app.renderDashboard = function() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const fin = window.accountingEngine.getFinancialSummary();
  const expirySum = window.expiryEngine.getSummary();
  const lowStock = window.inventoryEngine.getProductsWithStock().filter(p => p.isLowStock);
  const sales = window.db.data.sales || [];
  const batches = window.db.data.batches || [];
  const products = window.db.data.products || [];

  // Top selling products calculated from real transactions
  const productSalesMap = {};
  sales.forEach(s => {
    (s.items || []).forEach(item => {
      productSalesMap[item.productId] = (productSalesMap[item.productId] || 0) + item.quantity;
    });
  });

  const topSellingList = Object.keys(productSalesMap).map(id => {
    const prod = products.find(p => p.id === id);
    return { name: prod ? prod.name : id, qty: productSalesMap[id], category: prod ? prod.category : '' };
  }).sort((a, b) => b.qty - a.qty).slice(0, 5);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Executive Owner Dashboard</h1>
        <p class="view-subtitle">Real-time Financials, Expiry Risk Matrix & Operations Telemetry for Usman Pharmacy</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="app.openTimeMachineModal()">
          ⏳ Time Machine Simulator
        </button>
        <button class="btn btn-primary" onclick="app.navigateTo('pos')">
          ⚡ Open Smart POS (F2)
        </button>
      </div>
    </div>

    <!-- Alert Banner if Critical Batches Exist -->
    ${expirySum.criticalCount > 0 ? `
      <div class="alert-banner alert-banner-critical animate-pulse">
        <div class="alert-banner-icon">🚨</div>
        <div class="alert-banner-content">
          <strong>CRITICAL MEDICINE EXPIRY ALERT:</strong> 
          There are <strong>${expirySum.criticalCount} batch(es)</strong> expired or expiring within 7 days valued at 
          <strong>PKR ${expirySum.expiredCostValue.toLocaleString()}</strong>. Sale is automatically blocked at POS for patient safety.
        </div>
        <button class="btn btn-danger btn-sm" onclick="app.navigateTo('expiry')">
          Review Alerts Center →
        </button>
      </div>
    ` : ''}

    <!-- Primary KPI Cards (Clickable drilldowns) -->
    <div class="kpi-grid">
      <!-- 1. Today's Net Sales -->
      <div class="kpi-card cursor-pointer" onclick="app.navigateTo('reports'); app.loadReport(1);">
        <div class="kpi-header">
          <span class="kpi-label">Today's Net Sales</span>
          <span class="kpi-icon bg-pink-subtle">💳</span>
        </div>
        <div class="kpi-value text-pink">PKR ${fin.netSalesRevenue.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Gross: <strong>PKR ${fin.grossSales.toLocaleString()}</strong></span> • 
          <span class="text-success">Discount: <strong>PKR ${fin.discountsGiven.toLocaleString()}</strong></span>
        </div>
      </div>

      <!-- 2. Today's Gross Profit -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #0d9488;" onclick="app.navigateTo('accounting')">
        <div class="kpi-header">
          <span class="kpi-label">Today's Gross Profit</span>
          <span class="kpi-icon bg-teal-subtle">📈</span>
        </div>
        <div class="kpi-value text-teal">PKR ${fin.grossProfit.toLocaleString()}</div>
        <div class="kpi-meta">
          <span class="badge badge-success">Margin: ${fin.grossProfitMarginPct.toFixed(1)}%</span> • 
          <span>COGS: <strong>PKR ${fin.totalCogs.toLocaleString()}</strong></span>
        </div>
      </div>

      <!-- 3. Net Operating Profit -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #10b981;" onclick="app.navigateTo('accounting')">
        <div class="kpi-header">
          <span class="kpi-label">Net Operating Income</span>
          <span class="kpi-icon bg-green-subtle">💰</span>
        </div>
        <div class="kpi-value ${fin.netProfit >= 0 ? 'text-success' : 'text-danger'}">
          PKR ${fin.netProfit.toLocaleString()}
        </div>
        <div class="kpi-meta">
          <span>Operating Expenses: <strong>PKR ${fin.totalOperatingExpenses.toLocaleString()}</strong></span>
        </div>
      </div>

      <!-- 4. Total Stock at Cost -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #7c3aed;" onclick="app.navigateTo('inventory')">
        <div class="kpi-header">
          <span class="kpi-label">Inventory Value (at Cost)</span>
          <span class="kpi-icon bg-purple-subtle">📦</span>
        </div>
        <div class="kpi-value text-purple">PKR ${fin.inventoryValueAtCost.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Retail Valuation: <strong>PKR ${fin.inventoryRetailValue.toLocaleString()}</strong></span>
        </div>
      </div>

      <!-- 5. Expiring Stock at Risk (<90d) -->
      <div class="kpi-card card-risk cursor-pointer" onclick="app.navigateTo('expiry')">
        <div class="kpi-header">
          <span class="kpi-label">Stock at Expiry Risk</span>
          <span class="kpi-icon bg-warning-subtle">⚠️</span>
        </div>
        <div class="kpi-value text-warning">PKR ${expirySum.totalCostAtRisk.toLocaleString()}</div>
        <div class="kpi-meta">
          <span class="text-danger font-bold">${expirySum.expiredCount} Expired Batches</span> • 
          <span>${expirySum.upcomingCount} Upcoming</span>
        </div>
      </div>

      <!-- 6. Cash & Bank Balances -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #047857;" onclick="app.navigateTo('accounting')">
        <div class="kpi-header">
          <span class="kpi-label">Liquid Cash & Bank Float</span>
          <span class="kpi-icon bg-emerald-subtle">🏦</span>
        </div>
        <div class="kpi-value text-emerald">PKR ${(fin.estimatedCashInHand + fin.estimatedBankBalance).toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Counter: <strong>PKR ${fin.estimatedCashInHand.toLocaleString()}</strong></span> • 
          <span>Bank: <strong>PKR ${fin.estimatedBankBalance.toLocaleString()}</strong></span>
        </div>
      </div>

      <!-- 7. Customer Khata Receivables -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #b45309;" onclick="app.navigateTo('reports'); app.loadReport(12);">
        <div class="kpi-header">
          <span class="kpi-label">Customer Khata (Receivables)</span>
          <span class="kpi-icon bg-amber-subtle">👤</span>
        </div>
        <div class="kpi-value text-amber">PKR ${fin.customerReceivables.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Active Patient Balances (Pending Recovery)</span>
        </div>
      </div>

      <!-- 8. Supplier Payables -->
      <div class="kpi-card cursor-pointer" style="border-top-color: #e11d48;" onclick="app.navigateTo('purchases')">
        <div class="kpi-header">
          <span class="kpi-label">Distributor Payables</span>
          <span class="kpi-icon bg-rose-subtle">🏢</span>
        </div>
        <div class="kpi-value text-rose">PKR ${fin.supplierPayables.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Distributor Accounts Due for Payment</span>
        </div>
      </div>
    </div>

    <!-- Secondary Widgets Row -->
    <div class="dashboard-split-grid">
      <!-- Expiry Health Matrix Widget -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🚨 Advance Expiry Matrix (1-180 Days)</h3>
          <button class="btn btn-link btn-sm" onclick="app.navigateTo('expiry')">View Full Center →</button>
        </div>
        <div class="card-body">
          <div class="expiry-meter-bars">
            <div class="expiry-bar-row">
              <span class="bar-label text-danger font-bold">Expired (&lt;0 Days):</span>
              <div class="progress-track"><div class="progress-fill fill-danger" style="width: ${Math.min(100, expirySum.expiredCount * 25)}%"></div></div>
              <span class="bar-count text-danger">${expirySum.expiredCount} batches (PKR ${expirySum.expiredCostValue.toLocaleString()})</span>
            </div>
            <div class="expiry-bar-row">
              <span class="bar-label text-critical font-bold">Critical (1 - 7 Days):</span>
              <div class="progress-track"><div class="progress-fill fill-critical" style="width: ${Math.min(100, expirySum.criticalCount * 20)}%"></div></div>
              <span class="bar-count text-critical">${expirySum.criticalCount} batches</span>
            </div>
            <div class="expiry-bar-row">
              <span class="bar-label text-high font-bold">High Risk (8 - 15 Days):</span>
              <div class="progress-track"><div class="progress-fill fill-high" style="width: ${Math.min(100, expirySum.highCount * 18)}%"></div></div>
              <span class="bar-count text-high">${expirySum.highCount} batches</span>
            </div>
            <div class="expiry-bar-row">
              <span class="bar-label text-warning font-bold">Warning (16 - 30 Days):</span>
              <div class="progress-track"><div class="progress-fill fill-warning" style="width: ${Math.min(100, expirySum.warningCount * 15)}%"></div></div>
              <span class="bar-count text-warning">${expirySum.warningCount} batches</span>
            </div>
            <div class="expiry-bar-row">
              <span class="bar-label text-upcoming font-bold">Upcoming (31 - 180 Days):</span>
              <div class="progress-track"><div class="progress-fill fill-upcoming" style="width: ${Math.min(100, expirySum.upcomingCount * 12)}%"></div></div>
              <span class="bar-count text-upcoming">${expirySum.upcomingCount} batches</span>
            </div>
          </div>
          <div class="mt-3 p-2 bg-light rounded text-xs text-muted">
            🛡️ <strong>Safety Lock Active:</strong> Any medicine reaching 0 days is barred from sale at POS, dispensing, or billing automatically.
          </div>
        </div>
      </div>

      <!-- Top Selling Products & Low Stock Alerts -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔥 Fast Moving & Low Stock Items</h3>
          <button class="btn btn-link btn-sm" onclick="app.navigateTo('inventory')">Inventory →</button>
        </div>
        <div class="card-body">
          <h4 class="text-xs uppercase text-muted font-bold mb-2">Top Moving This Week</h4>
          <div class="top-list mb-4">
            ${topSellingList.map((t, idx) => `
              <div class="top-list-item">
                <span class="top-rank">#${idx + 1}</span>
                <span class="top-name font-bold">${t.name}</span>
                <span class="top-cat text-muted text-xs">${t.category}</span>
                <span class="badge badge-info">${t.qty} units sold</span>
              </div>
            `).join('')}
          </div>

          <h4 class="text-xs uppercase text-muted font-bold mb-2">Low Stock Reorder Alerts</h4>
          <div class="low-stock-list">
            ${lowStock.length > 0 ? lowStock.slice(0, 3).map(l => `
              <div class="low-stock-item">
                <div><strong>${l.name}</strong> <span class="text-muted text-xs">(${l.manufacturer})</span></div>
                <div class="text-danger font-bold text-xs">Stock: ${l.totalStockBoxes} (Min: ${l.minStockLevel})</div>
              </div>
            `).join('') : '<div class="text-muted text-xs">All stocks at healthy levels.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
};

// ==========================================
// 2. DEDICATED EXPIRY & ALERTS CENTER
// ==========================================
window.app.renderExpiryCenter = function(severityFilter = 'ALL') {
  const container = document.getElementById('view-expiry');
  if (!container) return;

  const alerts = window.expiryEngine.getAllAlerts({ severityFilter });
  const summary = window.expiryEngine.getSummary();
  const suppliers = window.db.data.suppliers || [];

  container.innerHTML = `
    <div class="view-header">
      <div>
        <div class="d-flex align-center gap-2">
          <h1 class="view-title">🚨 Expiry & Alerts Center</h1>
          <span class="badge badge-danger">${summary.criticalCount} Critical</span>
        </div>
        <p class="view-subtitle">Regulatory Expiry Control, Advance 180-Day Alerts, Quarantine Isolation & Supplier Return Records</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="app.openTimeMachineModal()">
          ⏳ Test Expiry Simulation (+Days)
        </button>
        <button class="btn btn-outline" onclick="window.reportsEngine.exportToCSV('expiry_alerts', window.reportsEngine.generateExpiringThresholdsReport().headers, window.reportsEngine.generateExpiringThresholdsReport().data)">
          📥 Export Expiry Register (CSV)
        </button>
      </div>
    </div>

    <!-- Alert KPI Summary Cards -->
    <div class="expiry-kpi-strip">
      <div class="kpi-chip chip-critical cursor-pointer ${severityFilter === 'Critical' ? 'active' : ''}" onclick="app.renderExpiryCenter('Critical')">
        <span class="chip-count">${summary.criticalCount}</span>
        <span class="chip-label">Critical (&le;7d / Expired)</span>
      </div>
      <div class="kpi-chip chip-high cursor-pointer ${severityFilter === 'High' ? 'active' : ''}" onclick="app.renderExpiryCenter('High')">
        <span class="chip-count">${summary.highCount}</span>
        <span class="chip-label">High Risk (8-15d)</span>
      </div>
      <div class="kpi-chip chip-warning cursor-pointer ${severityFilter === 'Warning' ? 'active' : ''}" onclick="app.renderExpiryCenter('Warning')">
        <span class="chip-count">${summary.warningCount}</span>
        <span class="chip-label">Warning (16-30d)</span>
      </div>
      <div class="kpi-chip chip-upcoming cursor-pointer ${severityFilter === 'Upcoming' ? 'active' : ''}" onclick="app.renderExpiryCenter('Upcoming')">
        <span class="chip-count">${summary.upcomingCount}</span>
        <span class="chip-label">Upcoming (31-180d)</span>
      </div>
      <div class="kpi-chip chip-quarantine cursor-pointer ${severityFilter === 'Quarantined' ? 'active' : ''}" onclick="app.renderExpiryCenter('Quarantined')">
        <span class="chip-count">${summary.quarantinedCount}</span>
        <span class="chip-label">Quarantined Stock</span>
      </div>
      <div class="kpi-chip chip-resolved cursor-pointer ${severityFilter === 'Resolved' ? 'active' : ''}" onclick="app.renderExpiryCenter('Resolved')">
        <span class="chip-count">${summary.resolvedCount}</span>
        <span class="chip-label">Resolved / Documented</span>
      </div>
      <div class="kpi-chip chip-all cursor-pointer ${severityFilter === 'ALL' ? 'active' : ''}" onclick="app.renderExpiryCenter('ALL')">
        <span class="chip-count">${alerts.length}</span>
        <span class="chip-label">All Monitored Batches</span>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="filter-bar">
      <div class="search-input-wrap flex-grow">
        <input type="text" id="expiry-search-input" class="form-control" placeholder="Search by medicine, generic, batch #, barcode, supplier..." onkeyup="app.filterExpiryTable()">
      </div>
      <select id="expiry-cat-select" class="form-select" onchange="app.filterExpiryTable()">
        <option value="ALL">All Categories</option>
        <option value="Pharmaceutical">Pharmaceutical Medicines</option>
        <option value="Cosmetics">Cosmetics & Beauty</option>
      </select>
    </div>

    <!-- Expiry Alert Table -->
    <div class="table-responsive card mt-3">
      <table class="table" id="expiry-table">
        <thead>
          <tr>
            <th>Severity & Days</th>
            <th>Medicine / Cosmetic Item</th>
            <th>Batch / Lot #</th>
            <th>Expiry Date</th>
            <th>Available Stock</th>
            <th>Est. Cost Value</th>
            <th>Supplier & Invoice</th>
            <th>Storage Location</th>
            <th>Recommended Action</th>
            <th>Action Buttons</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.length === 0 ? `
            <tr><td colspan="10" class="text-center p-4 text-muted">No expiry alerts matching selected filter.</td></tr>
          ` : alerts.map(a => `
            <tr class="${a.daysRemaining < 0 ? 'row-expired' : a.daysRemaining <= 7 ? 'row-critical' : ''}">
              <td>
                <span class="badge ${a.classification.badgeClass}">
                  ${a.classification.label}
                </span>
              </td>
              <td>
                <div class="font-bold">${a.productName}</div>
                <div class="text-xs text-muted">${a.genericName} (${a.category})</div>
              </td>
              <td>
                <span class="badge-batch">${a.batchNumber}</span>
              </td>
              <td>
                <div class="font-bold ${a.daysRemaining < 0 ? 'text-danger' : a.daysRemaining <= 15 ? 'text-warning' : ''}">${a.expiryDate}</div>
                <div class="text-xs text-muted">${a.daysRemaining < 0 ? `${Math.abs(a.daysRemaining)} days ago` : `${a.daysRemaining} days left`}</div>
              </td>
              <td>
                <div><strong>${a.quantity}</strong> ${a.unitType}s</div>
                ${a.quarantinedQuantity > 0 ? `<div class="text-xs text-danger font-bold">(${a.quarantinedQuantity} in Quarantine)</div>` : ''}
              </td>
              <td>
                <div><strong>PKR ${a.totalCostValue.toLocaleString()}</strong></div>
                <div class="text-xs text-muted">@ PKR ${a.purchaseCost.toFixed(2)}</div>
              </td>
              <td>
                <div>${a.supplierName}</div>
                <div class="text-xs text-muted">Inv: ${a.invoiceRef}</div>
              </td>
              <td>
                <span class="shelf-tag">📍 ${a.shelfLocation}</span>
              </td>
              <td>
                <div class="text-xs font-semibold ${a.daysRemaining <= 7 ? 'text-danger' : 'text-primary'}">
                  ${a.classification.actionNeeded}
                </div>
                ${a.lastAction ? `<div class="text-xxs text-muted mt-1">Last: ${a.lastAction.actionType} by ${a.lastAction.staffName}</div>` : ''}
              </td>
              <td>
                <div class="action-btn-group">
                  <button class="btn btn-xs btn-outline" title="View Batch & Audit History" onclick="app.openBatchHistoryModal('${a.batchId}')">
                    📜 Audit
                  </button>
                  <button class="btn btn-xs btn-warning" title="Move to Quarantine Isolation" onclick="app.openQuarantineModal('${a.batchId}')">
                    ⚠️ Quarantine
                  </button>
                  <button class="btn btn-xs btn-primary" title="Return to Supplier (Debit Note)" onclick="app.openSupplierReturnModal('${a.batchId}')">
                    📦 Return
                  </button>
                  <button class="btn btn-xs btn-secondary" title="Assign Staff Responsible" onclick="app.openAssignStaffModal('${a.batchId}')">
                    👤 Assign
                  </button>
                  <button class="btn btn-xs btn-success" title="Mark as Resolved (Requires Verified Disposition)" onclick="app.openResolveModal('${a.batchId}')">
                    ✓ Resolve
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// Filter helper for Expiry Center
window.app.filterExpiryTable = function() {
  const kw = (document.getElementById('expiry-search-input')?.value || '').toLowerCase();
  const cat = document.getElementById('expiry-cat-select')?.value || 'ALL';
  const rows = document.querySelectorAll('#expiry-table tbody tr');

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    const matchKw = text.includes(kw);
    const matchCat = cat === 'ALL' || text.includes(cat.toLowerCase());
    row.style.display = (matchKw && matchCat) ? '' : 'none';
  });
};

// ==========================================
// 3. INVENTORY & BATCH MANAGEMENT VIEW
// ==========================================
window.app.renderInventory = function() {
  const container = document.getElementById('view-inventory');
  if (!container) return;

  const branch = window.db.getCurrentBranch();
  const products = window.inventoryEngine.getProductsWithStock(branch.id);
  const fin = window.accountingEngine.getFinancialSummary(branch.id);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">💊 Pharmacy & Medicine Inventory</h1>
        <p class="view-subtitle">Active Stock in ${branch.name} • FEFO Batch Allocation • Multi-unit Dispensing</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="app.openStockAdjustModal()">
          ⚖️ Stock Adjustment
        </button>
        <button class="btn btn-outline" onclick="app.openInterBranchTransferModal()">
          🔄 Inter-Branch Transfer
        </button>
        <button class="btn btn-secondary" onclick="app.openAddBatchModal()">
          🏷️ Add New Batch
        </button>
        <button class="btn btn-primary" onclick="app.openAddProductModal()">
          ➕ Add New Medicine
        </button>
      </div>
    </div>

    <!-- Summary metrics -->
    <div class="kpi-mini-grid mb-3">
      <div class="kpi-mini-card">
        <span class="text-muted text-xs">Total Products</span>
        <strong>${products.length} Items</strong>
      </div>
      <div class="kpi-mini-card">
        <span class="text-muted text-xs">Inventory Cost Value</span>
        <strong>PKR ${fin.inventoryValueAtCost.toLocaleString()}</strong>
      </div>
      <div class="kpi-mini-card">
        <span class="text-muted text-xs">Retail Selling Value</span>
        <strong>PKR ${fin.inventoryRetailValue.toLocaleString()}</strong>
      </div>
      <div class="kpi-mini-card">
        <span class="text-muted text-xs">Low Stock Alert</span>
        <strong class="text-danger">${products.filter(p => p.isLowStock).length} Items</strong>
      </div>
    </div>

    <!-- Product list table -->
    <div class="table-responsive card">
      <div class="p-3 border-bottom d-flex gap-2">
        <input type="text" id="inv-search" class="form-control" placeholder="Search medicine, generic, brand or barcode..." onkeyup="app.filterInventoryTable()">
      </div>
      <table class="table" id="inv-table">
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Medicine Name & Generic</th>
            <th>Category & Dosage</th>
            <th>Manufacturer</th>
            <th>Stock in Boxes</th>
            <th>Stock in Strips / Tabs</th>
            <th>Active Batches (FEFO)</th>
            <th>Next Batch to Dispense</th>
            <th>Cost / Retail</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><code>${p.barcode}</code></td>
              <td>
                <div class="font-bold">${p.name}</div>
                <div class="text-xs text-muted">${p.genericName}</div>
                ${p.requiresPrescription ? '<span class="badge badge-warning text-xxs">Rx Required</span>' : '<span class="badge badge-success text-xxs">OTC</span>'}
              </td>
              <td>
                <div>${p.category}</div>
                <div class="text-xs text-muted">${p.dosageForm} (${p.strength})</div>
              </td>
              <td>${p.manufacturer}</td>
              <td>
                <strong class="${p.isLowStock ? 'text-danger font-bold' : ''}">${p.totalStockBoxes}</strong> Boxes
                ${p.isLowStock ? '<div class="text-danger text-xxs font-bold">REORDER NEEDED</div>' : ''}
              </td>
              <td>
                <div class="text-xs">${p.totalStockStrips} Strips</div>
                <div class="text-xxs text-muted">${p.totalStockTablets} Tablets</div>
              </td>
              <td>
                <span class="badge badge-info">${p.batches.length} Batches</span>
              </td>
              <td>
                ${p.nextBatchToDispense ? `
                  <div class="text-xs font-bold text-teal">Batch: ${p.nextBatchToDispense.batchNumber}</div>
                  <div class="text-xxs text-muted">Exp: ${p.nextBatchToDispense.expiryDate} (${p.nextBatchToDispense.shelfLocation})</div>
                ` : '<span class="text-danger text-xs">No sellable batch!</span>'}
              </td>
              <td>
                <div class="text-xs text-muted">Cost: PKR ${p.totalCostVal.toFixed(0)}</div>
                <div class="text-xs font-bold text-success">Ret: PKR ${p.totalRetailVal.toFixed(0)}</div>
              </td>
              <td>
                <button class="btn btn-xs btn-outline" onclick="app.openProductBatchesModal('${p.id}')">
                  View Batches
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.app.filterInventoryTable = function() {
  const kw = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const rows = document.querySelectorAll('#inv-table tbody tr');
  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(kw) ? '' : 'none';
  });
};

// ==========================================
// 4. COSMETICS MANAGEMENT VIEW
// ==========================================
window.app.renderCosmetics = function() {
  const container = document.getElementById('view-cosmetics');
  if (!container) return;

  const cosmetics = window.inventoryEngine.getProductsWithStock(null, 'Cosmetics');

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">✨ Cosmetics, Skincare & Fragrances</h1>
        <p class="view-subtitle">High-End Beauty, Sunscreens, Makeup Shades, Perfumes & Personal Care Catalog</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="app.openAddProductModal('Cosmetics')">
          ➕ Add Cosmetic Product
        </button>
      </div>
    </div>

    <div class="cosmetics-grid">
      ${cosmetics.map(c => `
        <div class="cosmetic-card card">
          <div class="cosmetic-header">
            <span class="badge badge-purple">${c.subCategory}</span>
            <span class="text-xs text-muted">Tax: ${c.taxRate}% GST</span>
          </div>
          <div class="card-body">
            <h3 class="font-bold text-base mb-1">${c.name}</h3>
            <p class="text-xs text-muted mb-2">${c.genericName}</p>
            <div class="text-xs mb-1"><strong>Brand:</strong> ${c.brand} (${c.manufacturer})</div>
            <div class="text-xs mb-3"><strong>Packaging:</strong> ${c.strength} ${c.dosageForm}</div>
            
            <div class="d-flex justify-between align-center border-top pt-2 mt-2">
              <div>
                <div class="text-xxs text-muted">CURRENT STOCK</div>
                <div class="font-bold text-base ${c.totalStockBoxes < c.minStockLevel ? 'text-danger' : 'text-success'}">
                  ${c.totalStockBoxes} Units
                </div>
              </div>
              <button class="btn btn-sm btn-outline" onclick="app.openProductBatchesModal('${c.id}')">
                Batches & Shades
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

// ==========================================
// 5. SMART POS & SALES VIEW
// ==========================================
window.app.renderPos = function() {
  const container = document.getElementById('view-pos');
  if (!container) return;

  const products = window.db.data.products || [];
  const customers = window.db.data.customers || [];
  const branch = window.db.getCurrentBranch();
  const totals = window.posEngine.getTotals();

  container.innerHTML = `
    <div class="pos-layout">
      <!-- Left: Product Scanner & Fast Selection -->
      <div class="pos-catalog">
        <div class="pos-search-header card p-3 mb-3">
          <div class="d-flex gap-2">
            <div class="scanner-input-wrap flex-grow">
              <input type="text" id="pos-barcode-input" class="form-control pos-input-lg" placeholder="🔍 Scan Barcode or Type Medicine / Cosmetic Name (Enter to add)..." autofocus>
            </div>
            <select id="pos-category-filter" class="form-select" onchange="app.filterPosTiles()">
              <option value="ALL">All Items</option>
              <option value="Pharmaceutical">Medicines Only</option>
              <option value="Cosmetics">Cosmetics Only</option>
            </select>
          </div>
          <div class="pos-quick-shortcuts text-xs text-muted mt-2">
            💡 <strong>Fast Keys:</strong> [F2] Search | [F4] Checkout | [F9] Usman AI Voice Assistant | Auto-FEFO selection active
          </div>
        </div>

        <!-- Quick Item Tiles -->
        <div class="pos-items-grid" id="pos-items-grid">
          ${products.map(p => {
            const stockInfo = window.inventoryEngine.getProductsWithStock(branch.id).find(sp => sp.id === p.id);
            const availQty = stockInfo ? stockInfo.totalStockBoxes : 0;
            const hasSellableBatch = stockInfo && stockInfo.nextBatchToDispense !== null;

            return `
              <div class="pos-tile ${!hasSellableBatch ? 'pos-tile-disabled' : ''}" data-category="${p.category}" data-text="${(p.name + ' ' + p.genericName + ' ' + (p.barcode || '')).toLowerCase()}" onclick="${hasSellableBatch ? `app.posAddProduct('${p.id}')` : `app.showToast('No sellable non-expired stock for ${p.name}', 'error')`}">
                <div class="tile-category">${p.category === 'Pharmaceutical' ? '💊' : '✨'} ${p.category}</div>
                <div class="tile-title font-bold">${p.name}</div>
                <div class="tile-generic text-muted text-xxs">${p.genericName}</div>
                <div class="tile-footer">
                  <span class="tile-stock ${availQty <= p.minStockLevel ? 'text-danger' : 'text-teal'}">
                    Stock: ${availQty} ${p.unitType}s
                  </span>
                  <span class="tile-price font-bold">
                    ${hasSellableBatch ? `PKR ${stockInfo.nextBatchToDispense.retailPrice.toFixed(0)}` : 'BLOCKED'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right: POS Billing Cart -->
      <div class="pos-cart card">
        <div class="cart-header p-3 border-bottom d-flex justify-between align-center">
          <div>
            <h2 class="cart-title font-bold text-lg">Billing Counter (${branch.name})</h2>
            <div class="text-xs text-muted">Cashier: ${window.db.getCurrentUser().name}</div>
          </div>
          <button class="btn btn-outline btn-xs" onclick="window.posEngine.resetCart(); app.renderPos();">
            Clear Cart
          </button>
        </div>

        <!-- Customer Selector (Cash or Khata) -->
        <div class="p-3 border-bottom bg-light">
          <label class="form-label text-xs font-bold">Customer Account (Khata):</label>
          <select id="pos-customer-select" class="form-select form-select-sm" onchange="window.posEngine.activeCustomerId = this.value; app.renderPos();">
            ${customers.map(c => `
              <option value="${c.id}" ${c.id === window.posEngine.activeCustomerId ? 'selected' : ''}>
                ${c.name} ${c.balance > 0 ? `(Khata Due: PKR ${c.balance.toLocaleString()})` : ''}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Cart Items List -->
        <div class="cart-items-wrap flex-grow p-2">
          ${window.posEngine.cart.length === 0 ? `
            <div class="cart-empty text-center p-5 text-muted">
              <div class="cart-empty-icon text-3xl mb-2">🛒</div>
              <div>Cart is currently empty.</div>
              <div class="text-xs">Scan barcode or click items to start billing.</div>
            </div>
          ` : `
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Item & Batch</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${window.posEngine.cart.map((item, idx) => `
                  <tr>
                    <td>
                      <div class="font-bold text-xs">${item.productName}</div>
                      <div class="text-xxs text-muted">Batch: <code>${item.batchNumber}</code> (Exp: ${item.expiryDate})</div>
                    </td>
                    <td>
                      <select class="form-select form-select-xs" onchange="app.changeCartUnit(${idx}, this.value)">
                        <option value="Box" ${item.unit === 'Box' ? 'selected' : ''}>Box</option>
                        <option value="Strip" ${item.unit === 'Strip' ? 'selected' : ''}>Strip</option>
                        <option value="Tablet" ${item.unit === 'Tablet' ? 'selected' : ''}>Tab</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" min="1" class="form-control form-control-xs qty-input" value="${item.quantity}" onchange="window.posEngine.updateItemQuantity(${idx}, this.value); app.renderPos();">
                    </td>
                    <td class="text-xs">PKR ${item.pricePerUnit.toFixed(1)}</td>
                    <td class="font-bold text-xs">PKR ${item.subtotal.toFixed(1)}</td>
                    <td>
                      <button class="btn btn-link text-danger btn-xs" onclick="window.posEngine.removeItem(${idx}); app.renderPos();">×</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Totals & Payment Actions -->
        <div class="cart-footer p-3 border-top bg-light">
          <div class="totals-row d-flex justify-between text-xs mb-1">
            <span>Subtotal:</span>
            <strong>PKR ${totals.subtotal.toFixed(2)}</strong>
          </div>
          <div class="totals-row d-flex justify-between text-xs mb-1">
            <span>Discount (PKR):</span>
            <div class="d-flex gap-1 align-center">
              <input type="number" class="form-control form-control-xs w-20" value="${window.posEngine.discountValue}" onchange="window.posEngine.discountValue = Number(this.value); app.renderPos();">
            </div>
          </div>
          ${totals.totalTax > 0 ? `
            <div class="totals-row d-flex justify-between text-xs mb-1">
              <span>GST Tax (Cosmetics):</span>
              <span>PKR ${totals.totalTax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="totals-row d-flex justify-between text-xs mb-2">
            <span>FBR POS Fee:</span>
            <span>PKR ${totals.fbrFee.toFixed(2)}</span>
          </div>
          <div class="totals-row net-total-row d-flex justify-between font-bold text-lg mb-3 pt-2 border-top">
            <span>Net Payable:</span>
            <span class="text-teal">PKR ${totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <!-- Checkout button -->
          <button class="btn btn-primary btn-block btn-lg" onclick="app.openCheckoutModal()" ${window.posEngine.cart.length === 0 ? 'disabled' : ''}>
            💳 Complete Checkout (F4)
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach barcode input listener
  const barcodeInput = document.getElementById('pos-barcode-input');
  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        app.handlePosBarcodeSubmit(barcodeInput.value);
      }
    });
    barcodeInput.addEventListener('input', () => {
      app.filterPosTiles();
    });
  }
};

window.app.filterPosTiles = function() {
  const catFilter = document.getElementById('pos-category-filter') ? document.getElementById('pos-category-filter').value : 'ALL';
  const searchInput = document.getElementById('pos-barcode-input') ? document.getElementById('pos-barcode-input').value.toLowerCase().trim() : '';
  const tiles = document.querySelectorAll('#pos-items-grid .pos-tile');

  tiles.forEach(tile => {
    const tileCat = tile.getAttribute('data-category') || '';
    const tileText = tile.getAttribute('data-text') || '';

    const matchesCat = (catFilter === 'ALL' || tileCat === catFilter);
    const matchesSearch = (!searchInput || tileText.includes(searchInput));

    tile.style.display = (matchesCat && matchesSearch) ? 'flex' : 'none';
  });
};

window.app.handlePosBarcodeSubmit = function(query) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();
  const products = window.db.data.products || [];

  const matched = products.find(p =>
    p.barcode === q ||
    p.name.toLowerCase().includes(q) ||
    p.genericName.toLowerCase().includes(q)
  );

  if (matched) {
    app.posAddProduct(matched.id);
    document.getElementById('pos-barcode-input').value = '';
  } else {
    app.showToast(`No product matching barcode or code: "${query}"`, 'error');
  }
};

window.app.posAddProduct = function(productId) {
  try {
    window.posEngine.addItem(productId, null, 'Box', 1);
    app.renderPos();
    app.showToast('Item added to bill', 'success');
  } catch (err) {
    // Show loud modal alert if blocked by expiry policy!
    app.showExpiredBlockModal(err.message);
  }
};

window.app.changeCartUnit = function(index, newUnit) {
  const item = window.posEngine.cart[index];
  if (!item) return;
  const product = window.db.data.products.find(p => p.id === item.productId);
  const conversion = window.inventoryEngine.getUnitConversion(product, newUnit);
  const batch = window.db.data.batches.find(b => b.id === item.batchId);

  item.unit = newUnit;
  item.ratioToMainUnit = conversion.ratioToMainUnit;
  item.pricePerUnit = batch.retailPrice * conversion.ratioToMainUnit;
  item.costPerUnit = batch.purchaseCost * conversion.ratioToMainUnit;
  item.subtotal = item.quantity * item.pricePerUnit;
  item.cogs = item.quantity * item.costPerUnit;

  app.renderPos();
};

window.app.showExpiredBlockModal = function(errorMessage) {
  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-danger animate-pop">
        <div class="modal-header bg-danger text-white">
          <h2 class="modal-title">🚫 DRAP REGULATORY SAFETY BLOCK</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4 text-center">
          <div class="text-4xl mb-2">🛑</div>
          <h3 class="text-danger font-bold text-lg mb-2">DISPENSING STRICTLY FORBIDDEN!</h3>
          <p class="mb-3 text-base">${errorMessage}</p>
          <div class="alert alert-warning text-xs text-left">
            <strong>DRAP Rules Notice:</strong> Expired pharmaceutical or cosmetic stocks must be routed to the <strong>Quarantine Isolation Shelf</strong> or returned to the licensed distributor with an approved debit note.
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Dismiss</button>
          <button class="btn btn-danger" onclick="app.closeModal(); app.navigateTo('expiry');">Go to Expiry & Alerts Center →</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

// Checkout Modal & Thermal Receipt Generation
window.app.openCheckoutModal = function() {
  const totals = window.posEngine.getTotals();
  const customer = window.db.data.customers.find(c => c.id === window.posEngine.activeCustomerId) || window.db.data.customers[0];

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header">
          <div class="d-flex align-center gap-2">
            <img src="assets/logo.jpg" alt="Logo" style="width:28px;height:28px;border-radius:50%;border:1px solid #d4af37;object-fit:cover;">
            <h2 class="modal-title font-bold">Complete Checkout Transaction</h2>
          </div>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="checkout-summary-box mb-3 p-3 bg-light rounded">
            <div class="d-flex justify-between font-bold text-lg mb-1">
              <span>Total Payable:</span>
              <span class="text-teal">PKR ${totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="text-xs text-muted">Customer: ${customer.name} | Items: ${totals.itemCount}</div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label font-bold">Payment Method:</label>
            <div class="payment-methods-grid">
              ${['Cash', 'Credit / Khata', 'EasyPaisa / JazzCash', 'Bank Transfer (Meezan/HBL)', 'Debit/Credit Card'].map(m => `
                <label class="payment-method-pill">
                  <input type="radio" name="payment_method" value="${m}" ${window.posEngine.paymentMethod === m ? 'checked' : ''} onchange="window.posEngine.paymentMethod = this.value; document.getElementById('tender-wrap').style.display = (this.value === 'Cash' ? 'block' : 'none');">
                  <span>${m}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div id="tender-wrap" class="form-group mb-3" style="display: ${window.posEngine.paymentMethod === 'Cash' ? 'block' : 'none'};">
            <label class="form-label font-bold">Cash Tendered by Customer (PKR):</label>
            <input type="number" id="cash-tendered-input" class="form-control" value="${totals.netTotal}" oninput="app.calculateChange(this.value, ${totals.netTotal})">
            <div class="d-flex justify-between text-xs mt-1">
              <span class="text-muted">Change to Return:</span>
              <strong id="change-due-display" class="text-success font-bold text-base">PKR 0.00</strong>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label text-xs">Prescribing Doctor (Optional for Rx):</label>
            <input type="text" id="rx-doctor-input" class="form-control form-control-sm" placeholder="Dr. Name & PMDC/PMC #">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.finalizeSale()">
            Print & Complete Invoice
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.calculateChange = function(tender, netTotal) {
  const t = Number(tender) || 0;
  const change = Math.max(0, t - netTotal);
  const disp = document.getElementById('change-due-display');
  if (disp) {
    disp.textContent = `PKR ${change.toFixed(2)}`;
  }
};

window.app.finalizeSale = function() {
  try {
    const tenderInput = document.getElementById('cash-tendered-input');
    if (tenderInput) {
      window.posEngine.amountTendered = Number(tenderInput.value);
    }
    const docInput = document.getElementById('rx-doctor-input');
    if (docInput) {
      window.posEngine.prescriptionDoctor = docInput.value;
    }

    const invoice = window.posEngine.completeSale();
    app.closeModal();
    app.showToast(`Invoice #${invoice.id} completed successfully!`, 'success');
    app.showThermalReceipt(invoice);
    app.renderPos();
  } catch (err) {
    alert(err.message);
  }
};

// Render & Print Thermal Receipt
window.app.showThermalReceipt = function(invoice) {
  const settings = window.db.data.settings;

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-receipt animate-pop">
        <div class="modal-header">
          <h2 class="modal-title">Thermal Receipt Preview (80mm)</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-3">
          <div class="thermal-receipt" id="printable-receipt">
            <div class="receipt-logo-wrap">
              <img src="assets/logo.jpg" alt="Usman Pharmacy & Cosmetics" class="receipt-logo-img">
            </div>
            <div class="receipt-header text-center">
              <h2 class="receipt-store-name">${settings.storeName}</h2>
              <div class="receipt-tagline">${settings.tagline}</div>
              <div class="receipt-address">${settings.address}</div>
              <div class="receipt-contact">Tel: ${settings.phone}</div>
              <div class="receipt-tax-ids">
                NTN: ${settings.ntn} | STRN: ${settings.strn}<br>
                DRAP Lic: ${settings.drapLicense}
              </div>
            </div>

            <div class="receipt-divider">================================</div>

            <div class="receipt-meta">
              <div>Invoice #: <strong>${invoice.id}</strong></div>
              <div>Date: ${new Date(invoice.dateTime).toLocaleString('en-PK')}</div>
              <div>Cashier: ${invoice.cashierName}</div>
              <div>Customer: ${invoice.customerName}</div>
              ${invoice.prescriptionDoctor ? `<div>Prescriber: ${invoice.prescriptionDoctor}</div>` : ''}
              <div>Branch: ${invoice.branchName}</div>
            </div>

            <div class="receipt-divider">--------------------------------</div>

            <table class="receipt-items-table">
              <thead>
                <tr>
                  <th align="left">Description & Batch</th>
                  <th align="right">Qty</th>
                  <th align="right">Price</th>
                  <th align="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td colspan="4">
                      <strong>${item.productName}</strong><br>
                      <small class="receipt-batch-line">Batch: ${item.batchNumber} | Exp: ${item.expiryDate}</small>
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td align="right">${item.quantity} ${item.unit}</td>
                    <td align="right">${item.pricePerUnit.toFixed(1)}</td>
                    <td align="right">${item.subtotal.toFixed(1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="receipt-divider">--------------------------------</div>

            <div class="receipt-totals">
              <div class="d-flex justify-between"><span>Subtotal:</span><span>PKR ${invoice.subtotal.toFixed(2)}</span></div>
              ${invoice.discountAmount > 0 ? `<div class="d-flex justify-between"><span>Discount:</span><span>-PKR ${invoice.discountAmount.toFixed(2)}</span></div>` : ''}
              ${invoice.taxAmount > 0 ? `<div class="d-flex justify-between"><span>GST Tax:</span><span>PKR ${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
              <div class="d-flex justify-between"><span>FBR POS Fee:</span><span>PKR ${invoice.fbrFee.toFixed(2)}</span></div>
              <div class="d-flex justify-between receipt-grand-total">
                <strong>NET PAYABLE:</strong>
                <strong>PKR ${invoice.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
              <div class="d-flex justify-between"><span>Payment Mode:</span><span>${invoice.paymentMethod}</span></div>
              ${invoice.paymentMethod === 'Cash' ? `
                <div class="d-flex justify-between"><span>Paid / Tendered:</span><span>PKR ${invoice.paidAmount.toFixed(2)}</span></div>
                <div class="d-flex justify-between"><span>Change Returned:</span><span>PKR ${invoice.changeReturned.toFixed(2)}</span></div>
              ` : ''}
            </div>

            <div class="receipt-divider">================================</div>

            <div class="receipt-footer text-center">
              <div class="fbr-qr-box">
                <div class="qr-mock">[ FBR POS VERIFIED QR ]</div>
                <small>FBR Invoice #: ${invoice.fbrInvoiceNo}</small>
              </div>
              <div class="urdu-greeting font-nastaliq mt-2">شفا دینے والا اللہ ہے — جزاک اللہ خیر</div>
              <div class="receipt-policy text-xxs mt-1">
                Medicines cannot be returned without original receipt within 3 days.<br>
                Refrigerated medicines are strictly non-returnable.
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Close</button>
          <button class="btn btn-primary" onclick="window.print()">
            🖨️ Print Thermal Slip
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

// ==========================================
// 6. PURCHASES & SUPPLIER VIEW
// ==========================================
window.app.renderPurchases = function() {
  const container = document.getElementById('view-purchases');
  if (!container) return;

  const purchases = (window.db.data.purchases && window.db.data.purchases.length > 0)
    ? window.db.data.purchases
    : window.db.getDefaultPurchases();

  const suppliers = (window.db.data.suppliers && window.db.data.suppliers.length > 0)
    ? window.db.data.suppliers
    : [];

  // Calculate high-level supplier & purchase telemetry
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalPaidAmount = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalPayablesDue = suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">📦 Purchase & Supplier Management</h1>
        <p class="view-subtitle">Pharmaceutical Goods Receiving, 10+1 Scheme Bonus Stock Dilution & Supplier Statements</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="app.openRegisterSupplierModal()">
          🏢 Register New Supplier
        </button>
        <button class="btn btn-primary" onclick="app.openReceiveInvoiceModal()">
          ➕ Receive Purchase Invoice
        </button>
      </div>
    </div>

    <!-- Purchase Telemetry KPI Summary Cards -->
    <div class="kpi-grid mb-4">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Total Invoiced Purchases</span>
          <span class="kpi-icon bg-teal-subtle">📦</span>
        </div>
        <div class="kpi-value text-teal">PKR ${totalPurchasesAmount.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Invoices Recorded: <strong>${purchases.length}</strong></span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Paid to Distributors</span>
          <span class="kpi-icon bg-emerald-subtle">💳</span>
        </div>
        <div class="kpi-value text-emerald">PKR ${totalPaidAmount.toLocaleString()}</div>
        <div class="kpi-meta">
          <span>Settled Payments</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Total Supplier Payables</span>
          <span class="kpi-icon bg-pink-subtle">⏳</span>
        </div>
        <div class="kpi-value text-pink">PKR ${totalPayablesDue.toLocaleString()}</div>
        <div class="kpi-meta text-danger">
          <span>Outstanding Distributor Dues</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Registered Distributors</span>
          <span class="kpi-icon bg-purple-subtle">🏢</span>
        </div>
        <div class="kpi-value text-purple">${suppliers.length}</div>
        <div class="kpi-meta">
          <span>DRAP Licensed Vendors</span>
        </div>
      </div>
    </div>

    <!-- Supplier Overview Cards -->
    <div class="d-flex justify-between align-center mb-2">
      <h3 class="text-sm font-bold uppercase text-muted">Registered Pharma Distributors & Balances</h3>
      <button class="btn btn-xs btn-outline" onclick="app.openRegisterSupplierModal()">+ Add Distributor</button>
    </div>

    <div class="supplier-cards-grid mb-4">
      ${suppliers.length > 0 ? suppliers.map(s => `
        <div class="card p-3">
          <div class="d-flex justify-between align-center mb-1">
            <h4 class="font-bold text-base">${s.name || 'Vendor'}</h4>
            <span class="badge ${(Number(s.balance) || 0) > 0 ? 'badge-danger' : 'badge-success'}">
              Due: PKR ${(Number(s.balance) || 0).toLocaleString()}
            </span>
          </div>
          <div class="text-xs text-muted mb-2">
            👤 Contact: <strong>${s.contactPerson || 'N/A'}</strong> (${s.phone || 'N/A'})<br>
            🆔 NTN: ${s.ntn || 'N/A'}
          </div>
          <div class="d-flex justify-between align-center pt-2 border-top">
            <span class="text-xxs text-muted font-bold">Terms: ${s.terms || '30 Days Net'}</span>
            <button class="btn btn-xs btn-primary" onclick="app.openSupplierPayModal('${s.id}')">
              Record Payment
            </button>
          </div>
        </div>
      `).join('') : `
        <div class="card p-4 text-center text-muted col-12">
          No registered suppliers found. Click "+ Register New Supplier" to add distributors.
        </div>
      `}
    </div>

    <!-- Purchase History Register -->
    <div class="table-responsive card">
      <div class="p-3 border-bottom d-flex justify-between align-center font-bold">
        <span>Purchase Invoice Ledger & Goods Receiving Slips</span>
        <span class="text-xs text-muted font-normal">Showing ${purchases.length} invoices</span>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Purchase ID</th>
            <th>Distributor Invoice #</th>
            <th>Date</th>
            <th>Supplier Name</th>
            <th>Total Amount</th>
            <th>Paid Amount</th>
            <th>Balance Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${purchases.length > 0 ? purchases.map(p => `
            <tr>
              <td><code>${p.id || 'PUR-000'}</code></td>
              <td><strong>${p.invoiceNo || 'N/A'}</strong></td>
              <td>${p.invoiceDate || p.date || 'N/A'}</td>
              <td>${p.supplierName || 'Distributor'}</td>
              <td><strong>PKR ${(Number(p.totalAmount) || 0).toLocaleString()}</strong></td>
              <td class="text-success">PKR ${(Number(p.paidAmount) || 0).toLocaleString()}</td>
              <td class="${(Number(p.balanceDue) || 0) > 0 ? 'text-danger font-bold' : 'text-muted'}">
                PKR ${(Number(p.balanceDue) || 0).toLocaleString()}
              </td>
              <td>
                <span class="badge ${p.status === 'PAID' ? 'badge-success' : (p.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger')}">
                  ${p.status || 'PAID'}
                </span>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="8" class="text-center text-muted p-4">
                No purchase invoices recorded yet. Click "Receive Purchase Invoice" to record stock entry.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
};

// ==========================================
// 7. ACCOUNTING & FINANCIAL VIEW
// ==========================================
window.app.renderAccounting = function() {
  const container = document.getElementById('view-accounting');
  if (!container) return;

  const fin = window.accountingEngine.getFinancialSummary();
  const expenses = window.db.data.expenses || [];
  const coa = window.accountingEngine.getChartOfAccounts();

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">💰 Accounting & Profit Engine</h1>
        <p class="view-subtitle">Double-entry Ledgers, COGS Calculation, Operating Expense Audit & Balance Sheet</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="app.openRecordExpenseModal()">
          ➕ Record Operating Expense
        </button>
      </div>
    </div>

    <!-- Income Statement & COGS Breakdown -->
    <div class="card p-4 mb-4">
      <h3 class="font-bold text-lg mb-3">Profit & Loss Income Statement (PKR)</h3>
      <table class="table table-bordered">
        <tbody>
          <tr>
            <td><strong>Gross Sales Revenue</strong></td>
            <td align="right" class="font-bold">PKR ${fin.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Less: Customer Trade Discounts</td>
            <td align="right" class="text-danger">(PKR ${fin.discountsGiven.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
          </tr>
          <tr class="bg-light">
            <td><strong>NET SALES REVENUE</strong></td>
            <td align="right" class="font-bold text-teal">PKR ${fin.netSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Less: Cost of Goods Sold (COGS - Verified Batch Cost)</td>
            <td align="right" class="text-danger">(PKR ${fin.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
          </tr>
          <tr class="bg-light font-bold">
            <td><strong>GROSS PROFIT (Margin: ${fin.grossProfitMarginPct.toFixed(1)}%)</strong></td>
            <td align="right" class="text-success text-lg">PKR ${fin.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Less: Store Operating Expenses (Rent, Utilities, Staff)</td>
            <td align="right" class="text-danger">(PKR ${fin.totalOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})</td>
          </tr>
          <tr class="bg-blue-subtle font-bold text-lg">
            <td><strong>NET OPERATING PROFIT (Net Margin: ${fin.netProfitMarginPct.toFixed(1)}%)</strong></td>
            <td align="right" class="${fin.netProfit >= 0 ? 'text-teal' : 'text-danger'}">PKR ${fin.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Operating Expenses Table -->
    <div class="table-responsive card mb-4">
      <div class="p-3 border-bottom font-bold">Operating Expenses Register</div>
      <table class="table">
        <thead>
          <tr>
            <th>Expense ID</th>
            <th>Date</th>
            <th>Category</th>
            <th>Title & Purpose</th>
            <th>Amount (PKR)</th>
            <th>Paid Via</th>
            <th>Recorded By</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(e => `
            <tr>
              <td><code>${e.id}</code></td>
              <td>${e.date}</td>
              <td><span class="badge badge-info">${e.category}</span></td>
              <td><strong>${e.title}</strong></td>
              <td class="font-bold">PKR ${e.amount.toLocaleString()}</td>
              <td>${e.paidBy}</td>
              <td>${e.recordedBy}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Chart of Accounts -->
    <div class="card p-3">
      <div class="font-bold mb-2">Double-Entry Chart of Accounts (COA)</div>
      <div class="coa-grid">
        ${coa.map(c => `
          <div class="coa-item p-2 border rounded text-xs mb-1">
            <code>${c.code}</code> — <strong>${c.name}</strong> <span class="badge badge-outline">${c.type}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

// ==========================================
// 8. COMPLETE REPORTS VIEW (19 REPORTS)
// ==========================================
window.app.renderReports = function() {
  const container = document.getElementById('view-reports');
  if (!container) return;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">📑 Complete Reports & Analytics Center</h1>
        <p class="view-subtitle">Access all 19 Comprehensive Regulatory, Audit, Stock & Financial Statements</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" id="btn-export-report" onclick="app.exportActiveReportCSV()">
          📥 Export CSV
        </button>
        <button class="btn btn-primary" onclick="window.print()">
          🖨️ Print Report
        </button>
      </div>
    </div>

    <!-- Report Selector Selector Bar -->
    <div class="card p-3 mb-3">
      <label class="form-label font-bold text-xs">Select Regulatory or Financial Report:</label>
      <select id="report-selector" class="form-select" onchange="app.loadReport(Number(this.value))">
        <option value="1">Report 1: Daily, Weekly, Monthly & Annual Sales Ledger</option>
        <option value="2">Report 2: Purchase & Purchase-Return Register</option>
        <option value="3">Report 3: Gross Profit, Net Profit & Operating Expenses</option>
        <option value="4">Report 4: Fast-Moving & Slow-Moving Stock Movement Analysis</option>
        <option value="5">Report 5: Current Stock & Inventory Valuation at Cost & Retail</option>
        <option value="6">Report 6: Batch-wise Stock & Expiry Ledger</option>
        <option value="7">Report 7: Expiring Stock by 180, 150, 90, 60, 30, 15, 7, 3 & 1 Day Thresholds</option>
        <option value="8">Report 8: Expired Stock Quantity & Valuation at Cost</option>
        <option value="9">Report 9: Quarantined, Damaged & Written-off Inventory</option>
        <option value="10">Report 10: Supplier Return & Expiry Action History</option>
        <option value="11">Report 11: Low-Stock & Reorder Recommendations</option>
        <option value="12">Report 12: Customer Receivables (Khata) & Supplier Payables</option>
        <option value="13">Report 13: Daily Cash Inflow & Payment Channel Ledger</option>
        <option value="14">Report 14: Department & Category Profitability Matrix (Pharma vs Cosmetics)</option>
        <option value="15">Report 15: FBR POS Sales Tax & Regulatory Surcharge Register</option>
        <option value="16">Report 16: Inter-Branch Stock Transfers & Dispatch Register</option>
        <option value="17">Report 17: DRAP Drug Sale Register (Form 7 / Form 9 Standard)</option>
        <option value="18">Report 18: Monthly Income Statement & Balance Sheet</option>
        <option value="19">Report 19: User Activity & Security Audit Trail</option>
      </select>
    </div>

    <!-- Report Output Container -->
    <div class="card p-4" id="report-output-box">
      <!-- Generated via app.loadReport() -->
    </div>
  `;

  // Default load Report 1
  this.loadReport(1);
};

window.app.loadReport = function(reportNum) {
  const output = document.getElementById('report-output-box');
  if (!output) return;

  let repData;
  switch (reportNum) {
    case 1: repData = window.reportsEngine.generateSalesReport(); break;
    case 2: repData = window.reportsEngine.generatePurchasesReport(); break;
    case 3: repData = window.reportsEngine.generateProfitLossReport(); break;
    case 4: repData = window.reportsEngine.generateFastSlowMovingReport(); break;
    case 5: repData = window.reportsEngine.generateStockValuationReport(); break;
    case 6: repData = window.reportsEngine.generateBatchWiseReport(); break;
    case 7: repData = window.reportsEngine.generateExpiringThresholdsReport(); break;
    case 8: repData = window.reportsEngine.generateExpiredStockReport(); break;
    case 9: repData = window.reportsEngine.generateQuarantineReport(); break;
    case 10: repData = window.reportsEngine.generateSupplierReturnReport(); break;
    case 11: repData = window.reportsEngine.generateReorderReport(); break;
    case 12: repData = window.reportsEngine.generateLedgersReport(); break;
    case 13: repData = window.reportsEngine.generateCashFlowReport(); break;
    case 14: repData = window.reportsEngine.generateCategoryProfitabilityReport(); break;
    case 15: repData = window.reportsEngine.generateFbrTaxReport(); break;
    case 16: repData = window.reportsEngine.generateBranchTransfersReport(); break;
    case 17: repData = window.reportsEngine.generateDrapRegisterReport(); break;
    case 18: repData = window.reportsEngine.generateBalanceSheetReport(); break;
    case 19: repData = window.reportsEngine.generateAuditReport(); break;
    default: repData = window.reportsEngine.generateSalesReport(); break;
  }

  window.app.activeReportData = repData;

  output.innerHTML = `
    <div class="report-official-header">
      <img src="assets/logo.jpg" alt="Usman Pharmacy" class="report-header-logo">
      <div class="report-official-title-wrap">
        <div class="d-flex justify-between align-center">
          <div>
            <div class="report-official-store">USMAN PHARMACY & COSMETICS</div>
            <h2 class="font-bold text-lg text-primary mt-1">${repData.title}</h2>
          </div>
          <span class="report-official-badge">Official Store Audit Record</span>
        </div>
        <div class="report-official-meta">
          <strong>Licensing:</strong> DRAP Lic: 003291 • NTN: 7392014-8 • STRN: 3277876123456 • FBR POS Certified<br>
          <strong>Premises:</strong> Commercial Center, Rawalpindi / Islamabad • <strong>Ledger Generated:</strong> ${new Date().toLocaleString('en-PK')}
        </div>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="bg-light">
          <tr>
            ${repData.headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${repData.data.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell !== undefined ? cell : ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.app.exportActiveReportCSV = function() {
  if (window.app.activeReportData) {
    window.reportsEngine.exportToCSV('usman_pharmacy_report', window.app.activeReportData.headers, window.app.activeReportData.data);
    window.app.showToast('Report CSV exported successfully!', 'success');
  }
};

// ==========================================
// 9. STAFF & SECURITY AUDIT VIEW
// ==========================================
window.app.renderStaff = function() {
  const container = document.getElementById('view-staff');
  if (!container) return;

  const users = window.db.data.users || [];
  const logs = window.db.data.auditLogs.slice(0, 50);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">👥 Staff & Security Permissions</h1>
        <p class="view-subtitle">Role-Based Access Control, Cashier Permissions & Immutable Audit Trail</p>
      </div>
    </div>

    <!-- Roles Grid -->
    <div class="users-grid mb-4">
      ${users.map(u => `
        <div class="card p-3">
          <div class="d-flex justify-between align-center mb-1">
            <h4 class="font-bold text-base">${u.name}</h4>
            <span class="badge badge-info">${u.role}</span>
          </div>
          <div class="text-xs text-muted mb-2">${u.email}</div>
          <div class="text-xxs border-top pt-2">
            <strong>Permissions:</strong> ${u.permissions.join(', ')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Security Audit Log -->
    <div class="table-responsive card">
      <div class="p-3 border-bottom font-bold">Tamper-Evident System Audit Trail (Last 50 Events)</div>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Staff User</th>
            <th>Action</th>
            <th>Module</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td class="text-xs text-muted">${new Date(l.timestamp).toLocaleTimeString()}</td>
              <td class="font-bold text-xs">${l.user}</td>
              <td><code>${l.action}</code></td>
              <td><span class="badge badge-outline text-xxs">${l.module}</span></td>
              <td class="text-xs">${l.details}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ==========================================
// 10. SETTINGS & TIME MACHINE VIEW
// ==========================================
window.app.renderSettings = function() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const s = window.db.data.settings;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">⚙️ Settings & Regulatory Compliance</h1>
        <p class="view-subtitle">Store Profiles, DRAP Drug Licenses, FBR Integration, AI Voice Controls & Backups</p>
      </div>
    </div>

    <div class="settings-grid">
      <!-- General store settings -->
      <div class="card p-4">
        <h3 class="font-bold text-base mb-3">🏢 Store & Regulatory Credentials</h3>
        <div class="form-group mb-2">
          <label class="form-label text-xs">Pharmacy Name:</label>
          <input type="text" id="set-store-name" class="form-control" value="${s.storeName}">
        </div>
        <div class="form-group mb-2">
          <label class="form-label text-xs">Address:</label>
          <input type="text" id="set-address" class="form-control" value="${s.address}">
        </div>
        <div class="form-group mb-2">
          <label class="form-label text-xs">DRAP Pharmacy License #:</label>
          <input type="text" id="set-drap" class="form-control" value="${s.drapLicense}">
        </div>
        <div class="form-group mb-2">
          <label class="form-label text-xs">FBR NTN / STRN:</label>
          <input type="text" id="set-ntn" class="form-control" value="${s.ntn} / ${s.strn}">
        </div>
        <button class="btn btn-primary btn-sm mt-2" onclick="app.saveGeneralSettings()">Save Credentials</button>
      </div>

      <!-- Time machine simulation -->
      <div class="card p-4">
        <h3 class="font-bold text-base mb-2">⏳ Expiry Time-Machine Testing Suite</h3>
        <p class="text-xs text-muted mb-3">
          Advance the system calendar into the future to instantly verify that advance expiry alerts (180, 150, 90, 60, 30, 15, 7, 3, 1 day) trigger and that expired stock is blocked in Smart POS.
        </p>
        <div class="time-machine-controls d-flex flex-wrap gap-2 mb-3">
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(7)">+7 Days</button>
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(15)">+15 Days</button>
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(30)">+30 Days</button>
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(60)">+60 Days</button>
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(90)">+90 Days</button>
          <button class="btn btn-outline btn-sm" onclick="app.advanceDays(180)">+180 Days</button>
          <button class="btn btn-danger btn-sm" onclick="app.resetSimulation()">Reset to Today</button>
        </div>
        <div class="p-2 bg-light rounded text-xs">
          <strong>Current Simulated Offset:</strong> +${s.simulatedDaysAdvance || 0} days from real-time.
        </div>
      </div>

      <!-- AI Assistant Configuration -->
      <div class="card p-4">
        <h3 class="font-bold text-base mb-2">🤖 Usman AI Voice & API Settings</h3>
        <div class="form-group mb-2">
          <label class="form-label text-xs">Google Gemini API Key:</label>
          <input type="password" id="set-ai-key" class="form-control" value="${s.aiApiKey}">
        </div>
        <div class="form-group mb-2">
          <label class="form-check d-flex align-center gap-2">
            <input type="checkbox" id="set-ai-voice" ${s.aiVoiceEnabled ? 'checked' : ''}>
            <span class="text-xs">Enable Verbal Audio Speech Responses (SpeechSynthesis)</span>
          </label>
        </div>
        <button class="btn btn-primary btn-sm mt-2" onclick="app.saveAiSettings()">Save AI Configuration</button>
      </div>

      <!-- Backup & Restore -->
      <div class="card p-4">
        <h3 class="font-bold text-base mb-2">💾 Database Backup & Factory Reset</h3>
        <p class="text-xs text-muted mb-3">Export complete ERP ledger state as JSON or restore from backup.</p>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="app.downloadBackupJson()">Export Backup JSON</button>
          <button class="btn btn-danger btn-sm" onclick="app.resetFactoryData()">Reset to Demo Catalog</button>
        </div>
      </div>
    </div>
  `;
};

window.app.saveGeneralSettings = function() {
  window.db.data.settings.storeName = document.getElementById('set-store-name').value;
  window.db.data.settings.address = document.getElementById('set-address').value;
  window.db.data.settings.drapLicense = document.getElementById('set-drap').value;
  window.db.save();
  window.app.showToast('Store settings updated!', 'success');
};

window.app.saveAiSettings = function() {
  window.db.data.settings.aiApiKey = document.getElementById('set-ai-key').value;
  window.db.data.settings.aiVoiceEnabled = document.getElementById('set-ai-voice').checked;
  window.usmanAI.apiKey = window.db.data.settings.aiApiKey;
  window.usmanAI.autoSpeak = window.db.data.settings.aiVoiceEnabled;
  window.db.save();
  window.app.showToast('AI Settings updated!', 'success');
};

window.app.downloadBackupJson = function() {
  const json = window.db.exportJson();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `usman_pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};

window.app.resetFactoryData = function() {
  if (confirm('Are you sure you want to reset all data back to the demo Pakistani pharmacy catalog?')) {
    window.db.resetToDefault();
    window.app.showToast('Database reset to default seed catalog.', 'info');
    window.location.reload();
  }
};

window.app.closeModal = function() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
};

// Modals for Expiry workflows: Quarantine, Return, Resolve, Assign, Audit
window.app.openQuarantineModal = function(batchId) {
  const batch = window.db.data.batches.find(b => b.id === batchId);
  const product = window.db.data.products.find(p => p.id === batch.productId);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-warning">
          <div class="d-flex align-center gap-2">
            <img src="assets/logo.jpg" alt="Logo" style="width:28px;height:28px;border-radius:50%;border:1px solid #78350f;object-fit:cover;">
            <h2 class="modal-title font-bold">Move Batch to Quarantine Isolation</h2>
          </div>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="mb-3">
            <strong>${product.name}</strong> | Batch: <code>${batch.batchNumber}</code><br>
            <span class="text-xs text-muted">Available Active Stock: ${batch.quantity} units</span>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Quantity to Move to Quarantine:</label>
            <input type="number" id="quarantine-qty-input" class="form-control" value="${batch.quantity}" max="${batch.quantity}" min="1">
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Reason for Quarantine Isolation:</label>
            <select id="quarantine-reason-select" class="form-select">
              <option value="Near Expiry Threshold Reached">Near Expiry Threshold Reached</option>
              <option value="Expired Stock Detected">Expired Stock Detected</option>
              <option value="Physical Package Damage / Compromised Seal">Physical Package Damage / Compromised Seal</option>
              <option value="Cold-Chain Temperature Excursion">Cold-Chain Temperature Excursion</option>
              <option value="Manufacturer / DRAP Product Recall">Manufacturer / DRAP Product Recall</option>
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="form-label text-xs">Quarantine Isolation Shelf / Notes:</label>
            <input type="text" id="quarantine-notes-input" class="form-control form-control-sm" placeholder="e.g. Moved to Quarantine Cabinet Q-1 with red warning tag">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-warning font-bold" onclick="app.executeQuarantine('${batchId}')">Confirm Quarantine</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeQuarantine = function(batchId) {
  try {
    const qty = document.getElementById('quarantine-qty-input').value;
    const reason = document.getElementById('quarantine-reason-select').value;
    const notes = document.getElementById('quarantine-notes-input').value;

    window.expiryEngine.quarantineBatch(batchId, qty, reason, notes);
    app.closeModal();
    app.showToast('Batch successfully isolated in Quarantine.', 'warning');
    app.renderExpiryCenter();
  } catch (err) {
    alert(err.message);
  }
};

window.app.openSupplierReturnModal = function(batchId) {
  const batch = window.db.data.batches.find(b => b.id === batchId);
  const product = window.db.data.products.find(p => p.id === batch.productId);
  const suppliers = window.db.data.suppliers || [];

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-primary text-white">
          <div class="d-flex align-center gap-2">
            <img src="assets/logo.jpg" alt="Logo" style="width:28px;height:28px;border-radius:50%;border:1px solid #d4af37;object-fit:cover;">
            <h2 class="modal-title font-bold">Process Supplier Expiry Return</h2>
          </div>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="mb-3">
            <strong>${product.name}</strong> | Batch: <code>${batch.batchNumber}</code><br>
            <span class="text-xs text-muted">Total Available: ${batch.quantity + (batch.quarantinedQuantity || 0)} units</span>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Return to Distributor / Supplier:</label>
            <select id="return-supplier-select" class="form-select">
              ${suppliers.map(s => `
                <option value="${s.id}" ${s.id === product.supplierId ? 'selected' : ''}>${s.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Quantity to Return:</label>
            <input type="number" id="return-qty-input" class="form-control" value="${batch.quantity + (batch.quarantinedQuantity || 0)}" min="1">
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Return Reason:</label>
            <select id="return-reason-select" class="form-select">
              <option value="Near-Expiry Contractual Replacement Policy">Near-Expiry Contractual Replacement Policy</option>
              <option value="Expired Stock Credit Return">Expired Stock Credit Return</option>
              <option value="Damaged Stock Credit Note">Damaged Stock Credit Note</option>
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="form-label text-xs">Debit Note / Gate Pass Notes:</label>
            <input type="text" id="return-notes-input" class="form-control form-control-sm" placeholder="Challan # / Distributor authorization ref">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeSupplierReturn('${batchId}')">Generate Supplier Return Voucher</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeSupplierReturn = function(batchId) {
  try {
    const supId = document.getElementById('return-supplier-select').value;
    const qty = document.getElementById('return-qty-input').value;
    const reason = document.getElementById('return-reason-select').value;
    const notes = document.getElementById('return-notes-input').value;

    const res = window.expiryEngine.returnToSupplier(batchId, qty, supId, reason, notes);
    app.closeModal();
    app.showToast(`Supplier Return #${res.returnVoucher.id} processed! Supplier account debited.`, 'success');
    app.renderExpiryCenter();
  } catch (err) {
    alert(err.message);
  }
};

// MANDATORY DISPOSITION MODAL: Staff cannot resolve without recording verified disposition
window.app.openResolveModal = function(batchId) {
  const batch = window.db.data.batches.find(b => b.id === batchId);
  const product = window.db.data.products.find(p => p.id === batch.productId);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-success text-white">
          <h2 class="modal-title font-bold">Documented Disposition Resolution</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="alert alert-warning text-xs mb-3">
            ⚠️ <strong>DRAP Regulatory Requirement:</strong> Staff are prohibited from marking an expiry alert as resolved without selecting a verified regulatory disposition type and recording a substantive reason!
          </div>
          <div class="mb-3">
            <strong>${product.name}</strong> | Batch: <code>${batch.batchNumber}</code>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Verified Disposition Type (Mandatory):</label>
            <select id="resolve-type-select" class="form-select">
              <option value="REPLACED_BY_DISTRIBUTOR">Replaced by Licensed Distributor with Fresh Batch</option>
              <option value="CREDIT_NOTE_ISSUED">Full Credit Note Issued & Supplier Ledger Adjusted</option>
              <option value="REGULATORY_DESTRUCTION">Incinerated / Disposed Under Supervised DRAP Protocol</option>
              <option value="TRANSFERRED_TO_HOSPITAL">Fast-track Dispensed / Donated to Hospital Emergency</option>
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Substantive Reason & Disposition Evidence (Min 5 chars):</label>
            <textarea id="resolve-reason-input" class="form-control" rows="3" placeholder="Provide verified invoice/challan number or destruction certificate details..."></textarea>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-success" onclick="app.executeResolveAlert('${batchId}')">Confirm Verified Resolution</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeResolveAlert = function(batchId) {
  try {
    const type = document.getElementById('resolve-type-select').value;
    const reason = document.getElementById('resolve-reason-input').value;

    window.expiryEngine.resolveAlert(batchId, type, reason);
    app.closeModal();
    app.showToast('Alert marked as Resolved with permanent audit disposition.', 'success');
    app.renderExpiryCenter();
  } catch (err) {
    alert(err.message);
  }
};

window.app.openAssignStaffModal = function(batchId) {
  const users = window.db.data.users || [];
  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header">
          <h2 class="modal-title font-bold">Assign Staff Member to Expiry Action</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Responsible Staff:</label>
            <select id="assign-staff-select" class="form-select">
              ${users.map(u => `<option value="${u.name} (${u.role})">${u.name} (${u.role})</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="form-label font-bold text-xs">Action Deadline Date:</label>
            <input type="date" id="assign-deadline-input" class="form-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group mb-3">
            <label class="form-label text-xs">Action Instructions:</label>
            <input type="text" id="assign-notes-input" class="form-control" placeholder="e.g. Contact GSK distribution manager for pick up">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeAssignStaff('${batchId}')">Assign Responsibility</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeAssignStaff = function(batchId) {
  const staff = document.getElementById('assign-staff-select').value;
  const deadline = document.getElementById('assign-deadline-input').value;
  const note = document.getElementById('assign-notes-input').value;

  window.expiryEngine.assignStaff(batchId, staff, deadline, note);
  app.closeModal();
  app.showToast(`Task assigned to ${staff}`, 'info');
  app.renderExpiryCenter();
};

window.app.openBatchHistoryModal = function(batchId) {
  const batch = window.db.data.batches.find(b => b.id === batchId);
  const product = window.db.data.products.find(p => p.id === batch.productId);
  const actions = (window.db.data.expiryActions || []).filter(a => a.batchId === batchId);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-lg animate-pop">
        <div class="modal-header">
          <h2 class="modal-title font-bold">📜 Batch Traceability & Audit History</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="card p-3 mb-3 bg-light">
            <h4 class="font-bold text-base">${product.name}</h4>
            <div class="text-xs text-muted">
              Batch: <code>${batch.batchNumber}</code> | Expiry: <strong>${batch.expiryDate}</strong> | Active Qty: <strong>${batch.quantity}</strong> | Quarantined: <strong>${batch.quarantinedQuantity || 0}</strong><br>
              Purchase Cost: PKR ${batch.purchaseCost.toFixed(2)} | Shelf: ${batch.shelfLocation} | Invoice Ref: ${batch.supplierInvoiceRef}
            </div>
          </div>
          <h4 class="font-bold text-sm mb-2">Audit Action Log</h4>
          <div class="audit-timeline">
            ${actions.length === 0 ? '<div class="text-muted text-xs">No audit events recorded for this batch yet.</div>' : actions.map(act => `
              <div class="timeline-item p-2 mb-2 border-left pl-3">
                <div class="d-flex justify-between text-xs">
                  <strong>${act.actionType}</strong>
                  <span class="text-muted">${new Date(act.timestamp).toLocaleString()}</span>
                </div>
                <div class="text-xs mt-1">${act.actionSummary}</div>
                <div class="text-xxs text-muted">By: ${act.staffName} ${act.notes ? `| Note: ${act.notes}` : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Close</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

// Time machine modal trigger
window.app.openTimeMachineModal = function() {
  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-purple text-white">
          <h2 class="modal-title font-bold">⏳ System Time-Machine Simulation</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <p class="text-xs text-muted mb-3">
            Simulate passing of time to verify all alert thresholds (180d, 150d, 90d, 60d, 30d, 15d, 7d, 3d, 1d, 0d) and verify that expired batches are blocked from POS checkout.
          </p>
          <div class="time-machine-buttons d-grid gap-2">
            <button class="btn btn-outline" onclick="app.advanceDays(7); app.closeModal();">+7 Days (Advance 1 Week)</button>
            <button class="btn btn-outline" onclick="app.advanceDays(15); app.closeModal();">+15 Days (Advance Half Month)</button>
            <button class="btn btn-outline" onclick="app.advanceDays(30); app.closeModal();">+30 Days (Advance 1 Month)</button>
            <button class="btn btn-outline" onclick="app.advanceDays(90); app.closeModal();">+90 Days (Advance 1 Quarter)</button>
            <button class="btn btn-outline" onclick="app.advanceDays(180); app.closeModal();">+180 Days (Advance 6 Months)</button>
            <button class="btn btn-danger mt-2" onclick="app.resetSimulation(); app.closeModal();">Reset to Real Time (0 Days)</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

// Receive Purchase Invoice Modal with 10+1 Scheme bonus calculation
window.app.openReceiveInvoiceModal = function() {
  const suppliers = window.db.data.suppliers || [];
  const products = window.db.data.products || [];

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-lg animate-pop">
        <div class="modal-header bg-primary text-white">
          <h2 class="modal-title font-bold">Receive Purchase Invoice (With Pharma Bonus Schemes)</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="row d-flex gap-3 mb-3">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Supplier / Distributor:</label>
              <select id="pur-supplier-select" class="form-select">
                ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label text-xs font-bold">Invoice #:</label>
              <input type="text" id="pur-inv-no" class="form-control" value="INV-${Math.floor(100000 + Math.random() * 900000)}">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Invoice Date:</label>
              <input type="date" id="pur-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>

          <div class="card p-3 mb-3 bg-light">
            <h4 class="font-bold text-xs mb-2 uppercase text-muted">Item & Batch Details (Including 10+1 Schemes)</h4>
            <div class="d-flex gap-2 mb-2">
              <div class="flex-grow">
                <label class="text-xxs text-muted">Product</label>
                <select id="pur-product-select" class="form-select form-select-sm">
                  ${products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xxs text-muted">Batch #</label>
                <input type="text" id="pur-batch-no" class="form-control form-control-sm" placeholder="e.g. AUG-27-01">
              </div>
              <div>
                <label class="text-xxs text-muted">Expiry Date</label>
                <input type="date" id="pur-expiry" class="form-control form-control-sm" value="2027-12-31">
              </div>
            </div>

            <div class="d-flex gap-2 mb-2">
              <div>
                <label class="text-xxs text-muted">Paid Quantity</label>
                <input type="number" id="pur-qty" class="form-control form-control-sm" value="10" min="1" oninput="app.recalcBonusDilution()">
              </div>
              <div>
                <label class="text-xxs text-muted text-teal font-bold">Bonus Free Qty (10+1)</label>
                <input type="number" id="pur-bonus-qty" class="form-control form-control-sm" value="1" min="0" oninput="app.recalcBonusDilution()">
              </div>
              <div>
                <label class="text-xxs text-muted">Unit Purchase Cost (PKR)</label>
                <input type="number" id="pur-unit-cost" class="form-control form-control-sm" value="450" min="1" oninput="app.recalcBonusDilution()">
              </div>
              <div>
                <label class="text-xxs text-muted">Retail Selling Price (PKR)</label>
                <input type="number" id="pur-retail-price" class="form-control form-control-sm" value="550" min="1">
              </div>
            </div>

            <!-- Bonus Dilution Live Indicator -->
            <div class="p-2 bg-white rounded border text-xs d-flex justify-between" id="bonus-dilution-indicator">
              <span>Total Units to Stock: <strong>11</strong> (10 Paid + 1 Bonus)</span>
              <span>Invoice Billed Cost: <strong>PKR 4,500.00</strong></span>
              <span class="text-success font-bold">Effective Diluted Cost/Unit: PKR 409.09</span>
            </div>
          </div>

          <div class="d-flex gap-2">
            <div class="flex-grow">
              <label class="form-label text-xs">Payment Made Now (PKR):</label>
              <input type="number" id="pur-paid-amount" class="form-control" value="0">
            </div>
            <div class="flex-grow">
              <label class="form-label text-xs">Shelf Location:</label>
              <input type="text" id="pur-shelf" class="form-control" value="Rack A-02">
            </div>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeReceivePurchase()">Receive & Post Invoice</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.recalcBonusDilution = function() {
  const paidQty = Number(document.getElementById('pur-qty')?.value) || 0;
  const bonusQty = Number(document.getElementById('pur-bonus-qty')?.value) || 0;
  const unitCost = Number(document.getElementById('pur-unit-cost')?.value) || 0;

  const totalUnits = paidQty + bonusQty;
  const totalBill = paidQty * unitCost;
  const effectiveCost = totalUnits > 0 ? (totalBill / totalUnits) : 0;

  const ind = document.getElementById('bonus-dilution-indicator');
  if (ind) {
    ind.innerHTML = `
      <span>Total Units to Stock: <strong>${totalUnits}</strong> (${paidQty} Paid + ${bonusQty} Bonus)</span>
      <span>Invoice Billed Cost: <strong>PKR ${totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
      <span class="text-success font-bold">Effective Diluted Cost/Unit: PKR ${effectiveCost.toFixed(2)}</span>
    `;
  }
};

window.app.executeReceivePurchase = function() {
  try {
    const supplierId = document.getElementById('pur-supplier-select').value;
    const invoiceNo = document.getElementById('pur-inv-no').value;
    const invoiceDate = document.getElementById('pur-date').value;
    const productId = document.getElementById('pur-product-select').value;
    const batchNumber = document.getElementById('pur-batch-no').value || ('BAT-' + Date.now().toString().slice(-4));
    const expiryDate = document.getElementById('pur-expiry').value;
    const quantity = Number(document.getElementById('pur-qty').value);
    const bonusQty = Number(document.getElementById('pur-bonus-qty').value);
    const unitCost = Number(document.getElementById('pur-unit-cost').value);
    const retailPrice = Number(document.getElementById('pur-retail-price').value);
    const paidAmount = Number(document.getElementById('pur-paid-amount').value);
    const shelfLocation = document.getElementById('pur-shelf').value;

    window.purchaseEngine.receivePurchaseInvoice({
      supplierId,
      invoiceNo,
      invoiceDate,
      branchId: window.db.getCurrentBranch().id,
      paidAmount,
      items: [{
        productId,
        batchNumber,
        expiryDate,
        quantity,
        bonusQty,
        unitCost,
        retailPrice,
        shelfLocation
      }]
    });

    app.closeModal();
    app.showToast('Purchase invoice received and inventory updated!', 'success');
    app.renderPurchases();
  } catch (err) {
    alert(err.message);
  }
};

// Record Expense Modal
window.app.openRecordExpenseModal = function() {
  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header">
          <h2 class="modal-title font-bold">Record Store Operating Expense</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Category:</label>
            <select id="exp-cat" class="form-select">
              <option value="Electricity / Utility">Electricity / Utility</option>
              <option value="Store Rent & Maintenance">Store Rent & Maintenance</option>
              <option value="Staff Salaries & Pharmacist">Staff Salaries & Pharmacist</option>
              <option value="Packaging & Thermal Paper">Packaging & Thermal Paper</option>
              <option value="Tea & Refreshment">Tea & Refreshment</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Title / Purpose:</label>
            <input type="text" id="exp-title" class="form-control" placeholder="e.g. Monthly Commercial Electricity Bill">
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Amount (PKR):</label>
            <input type="number" id="exp-amount" class="form-control" placeholder="PKR 0">
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Paid From Account:</label>
            <select id="exp-paid-by" class="form-select">
              <option value="Cash">Cash in Hand</option>
              <option value="Meezan Bank">Meezan Bank - Commercial A/C</option>
              <option value="HBL">Habib Bank Limited (HBL) A/C</option>
            </select>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeRecordExpense()">Record Expense</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeRecordExpense = function() {
  try {
    const category = document.getElementById('exp-cat').value;
    const title = document.getElementById('exp-title').value;
    const amount = document.getElementById('exp-amount').value;
    const paidBy = document.getElementById('exp-paid-by').value;

    window.accountingEngine.recordExpense({ category, title, amount, paidBy });
    app.closeModal();
    app.showToast('Expense recorded successfully!', 'success');
    app.renderAccounting();
  } catch (err) {
    alert(err.message);
  }
};
