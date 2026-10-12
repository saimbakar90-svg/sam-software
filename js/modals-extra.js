/**
 * USMAN PHARMACY - Additional Modals & Workflow Handlers
 * Handles Add Medicine/Cosmetic, Add Batch, Product Batches Inspector,
 * Stock Adjustments, Inter-Branch Transfers, and Supplier Payments.
 */

// Add New Product Modal
window.app = window.app || {};
window.app.openAddProductModal = function(defaultCategory = 'Pharmaceutical') {
  const suppliers = window.db.data.suppliers || [];

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-lg animate-pop">
        <div class="modal-header bg-primary text-white">
          <h2 class="modal-title font-bold">Add New Product / Medicine to Catalog</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="row d-flex gap-3 mb-2">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Category:</label>
              <select id="np-category" class="form-select">
                <option value="Pharmaceutical" ${defaultCategory === 'Pharmaceutical' ? 'selected' : ''}>Pharmaceutical Medicine</option>
                <option value="Cosmetics" ${defaultCategory === 'Cosmetics' ? 'selected' : ''}>Cosmetics & Beauty</option>
              </select>
            </div>
            <div>
              <label class="form-label text-xs font-bold">Barcode (10-13 digits):</label>
              <input type="text" id="np-barcode" class="form-control" value="8964000${Math.floor(100 + Math.random() * 900)}">
            </div>
          </div>

          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Product Brand Name:</label>
            <input type="text" id="np-name" class="form-control" placeholder="e.g. Panadol Extra Tablets">
          </div>

          <div class="row d-flex gap-3 mb-2">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Generic / Scientific Name:</label>
              <input type="text" id="np-generic" class="form-control" placeholder="e.g. Paracetamol + Caffeine">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Dosage Form:</label>
              <select id="np-form" class="form-select">
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Suspension">Suspension</option>
                <option value="Ointment">Ointment / Cream</option>
                <option value="Injection">Injection</option>
                <option value="Drops">Eye/Ear Drops</option>
                <option value="Bottle">Bottle (Cosmetic)</option>
                <option value="Tube">Tube (Cosmetic)</option>
              </select>
            </div>
            <div>
              <label class="form-label text-xs font-bold">Strength / Volume:</label>
              <input type="text" id="np-strength" class="form-control" placeholder="e.g. 500mg or 100ml">
            </div>
          </div>

          <div class="row d-flex gap-3 mb-2">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Manufacturer:</label>
              <input type="text" id="np-manufacturer" class="form-control" placeholder="e.g. GlaxoSmithKline Pakistan">
            </div>
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Default Distributor / Supplier:</label>
              <select id="np-supplier" class="form-select">
                ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="row d-flex gap-3 mb-2">
            <div>
              <label class="form-label text-xs font-bold">Main Unit:</label>
              <select id="np-main-unit" class="form-select">
                <option value="Box">Box</option>
                <option value="Bottle">Bottle</option>
                <option value="Tube">Tube</option>
                <option value="Piece">Piece</option>
              </select>
            </div>
            <div>
              <label class="form-label text-xs font-bold">Sub-Unit (e.g. Strip):</label>
              <select id="np-sub-unit" class="form-select">
                <option value="Strip">Strip</option>
                <option value="Piece">Piece</option>
              </select>
            </div>
            <div>
              <label class="form-label text-xs font-bold">Strips per Box:</label>
              <input type="number" id="np-strips-per-box" class="form-control" value="10">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Tablets per Strip:</label>
              <input type="number" id="np-tabs-per-strip" class="form-control" value="10">
            </div>
          </div>

          <div class="row d-flex gap-3 mb-2">
            <div>
              <label class="form-label text-xs font-bold">Min Reorder Level:</label>
              <input type="number" id="np-min-stock" class="form-control" value="20">
            </div>
            <div>
              <label class="form-label text-xs font-bold">DRAP Reg #:</label>
              <input type="text" id="np-drap" class="form-control" value="00${Math.floor(1000 + Math.random() * 9000)}">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Sales Tax (%):</label>
              <input type="number" id="np-tax" class="form-control" value="${defaultCategory === 'Cosmetics' ? 18 : 0}">
            </div>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeAddProduct()">Create Product</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeAddProduct = function() {
  try {
    const productData = {
      category: document.getElementById('np-category').value,
      barcode: document.getElementById('np-barcode').value,
      name: document.getElementById('np-name').value,
      genericName: document.getElementById('np-generic').value,
      dosageForm: document.getElementById('np-form').value,
      strength: document.getElementById('np-strength').value,
      manufacturer: document.getElementById('np-manufacturer').value,
      supplierId: document.getElementById('np-supplier').value,
      unitType: document.getElementById('np-main-unit').value,
      subUnitType: document.getElementById('np-sub-unit').value,
      subUnitsPerUnit: Number(document.getElementById('np-strips-per-box').value) || 1,
      baseUnitsPerSubUnit: Number(document.getElementById('np-tabs-per-strip').value) || 1,
      minStockLevel: Number(document.getElementById('np-min-stock').value) || 10,
      drapRegNo: document.getElementById('np-drap').value,
      taxRate: Number(document.getElementById('np-tax').value) || 0
    };

    if (!productData.name) throw new Error('Product name is required');

    window.inventoryEngine.saveProduct(productData);
    app.closeModal();
    app.showToast(`Product "${productData.name}" added to catalog!`, 'success');
    app.renderInventory();
  } catch (err) {
    alert(err.message);
  }
};

// Add New Batch Modal
window.app.openAddBatchModal = function() {
  const products = window.db.data.products || [];
  const branch = window.db.getCurrentBranch();

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-secondary text-white">
          <h2 class="modal-title font-bold">Add New Batch & Expiry Date</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Medicine / Product:</label>
            <select id="nb-product" class="form-select">
              ${products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('')}
            </select>
          </div>
          <div class="row d-flex gap-2 mb-2">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Batch / Lot #:</label>
              <input type="text" id="nb-batch-no" class="form-control" placeholder="e.g. PND-26-Z01">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Expiry Date:</label>
              <input type="date" id="nb-expiry" class="form-control" value="2027-12-31">
            </div>
          </div>
          <div class="row d-flex gap-2 mb-2">
            <div>
              <label class="form-label text-xs font-bold">Stock Qty (Boxes):</label>
              <input type="number" id="nb-qty" class="form-control" value="50">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Unit Cost (PKR):</label>
              <input type="number" id="nb-cost" class="form-control" value="450">
            </div>
            <div>
              <label class="form-label text-xs font-bold">Retail Price (PKR):</label>
              <input type="number" id="nb-retail" class="form-control" value="550">
            </div>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Storage Shelf Location:</label>
            <input type="text" id="nb-shelf" class="form-control" value="Rack A-01">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeAddBatch()">Save Batch</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeAddBatch = function() {
  try {
    const batchData = {
      productId: document.getElementById('nb-product').value,
      batchNumber: document.getElementById('nb-batch-no').value,
      expiryDate: document.getElementById('nb-expiry').value,
      quantity: Number(document.getElementById('nb-qty').value),
      purchaseCost: Number(document.getElementById('nb-cost').value),
      retailPrice: Number(document.getElementById('nb-retail').value),
      shelfLocation: document.getElementById('nb-shelf').value,
      branchId: window.db.getCurrentBranch().id,
      status: 'ACTIVE'
    };

    if (!batchData.batchNumber) throw new Error('Batch number is required');

    window.inventoryEngine.saveBatch(batchData);
    app.closeModal();
    app.showToast(`Batch ${batchData.batchNumber} added!`, 'success');
    app.renderInventory();
  } catch (err) {
    alert(err.message);
  }
};

// Inspect Batches for specific product
window.app.openProductBatchesModal = function(productId) {
  const product = window.db.data.products.find(p => p.id === productId);
  const batches = (window.db.data.batches || []).filter(b => b.productId === productId);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog modal-lg animate-pop">
        <div class="modal-header">
          <h2 class="modal-title font-bold">Batch Inspector — ${product.name}</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="table-responsive">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Active Qty</th>
                  <th>Quarantine Qty</th>
                  <th>Unit Cost</th>
                  <th>Retail Price</th>
                  <th>Status</th>
                  <th>Shelf Location</th>
                </tr>
              </thead>
              <tbody>
                ${batches.map(b => {
                  const days = window.expiryEngine.getDaysRemaining(b.expiryDate);
                  return `
                    <tr class="${days < 0 ? 'bg-danger-light' : ''}">
                      <td><code>${b.batchNumber}</code></td>
                      <td class="${days < 0 ? 'text-danger font-bold' : ''}">${b.expiryDate}</td>
                      <td>${days < 0 ? `${Math.abs(days)}d Overdue` : `${days}d`}</td>
                      <td><strong>${b.quantity}</strong></td>
                      <td>${b.quarantinedQuantity || 0}</td>
                      <td>PKR ${b.purchaseCost.toFixed(1)}</td>
                      <td>PKR ${b.retailPrice.toFixed(1)}</td>
                      <td><span class="badge ${b.status === 'EXPIRED' ? 'badge-danger' : b.status === 'QUARANTINED' ? 'badge-warning' : 'badge-success'}">${b.status}</span></td>
                      <td>${b.shelfLocation}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
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

// Stock Adjustment Modal
window.app.openStockAdjustModal = function() {
  const batches = window.db.data.batches || [];
  const products = window.db.data.products || [];

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-warning">
          <h2 class="modal-title font-bold">Manual Stock Adjustment (Audit / Variance)</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Select Batch to Adjust:</label>
            <select id="adj-batch" class="form-select">
              ${batches.map(b => {
                const p = products.find(prod => prod.id === b.productId);
                return `<option value="${b.id}">${p ? p.name : ''} — Batch: ${b.batchNumber} (Current: ${b.quantity})</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Adjustment Action:</label>
            <select id="adj-type" class="form-select">
              <option value="DECREASE">Deduct Stock (Breakage, Spillage, Loss)</option>
              <option value="INCREASE">Add Stock (Found during physical count)</option>
              <option value="SET_EXACT">Set Exact Verified Quantity</option>
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Quantity:</label>
            <input type="number" id="adj-qty" class="form-control" value="1" min="1">
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Verified Reason (Mandatory Audit):</label>
            <input type="text" id="adj-reason" class="form-control" placeholder="e.g. Ampoule broken during shelf cleaning">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-warning font-bold" onclick="app.executeStockAdjust()">Post Adjustment</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeStockAdjust = function() {
  try {
    const batchId = document.getElementById('adj-batch').value;
    const type = document.getElementById('adj-type').value;
    const qty = document.getElementById('adj-qty').value;
    const reason = document.getElementById('adj-reason').value;

    if (!reason) throw new Error('Mandatory reason required for stock adjustment');

    window.inventoryEngine.adjustStock(batchId, qty, type, reason);
    app.closeModal();
    app.showToast('Stock adjustment posted and logged to audit trail.', 'success');
    app.renderInventory();
  } catch (err) {
    alert(err.message);
  }
};

// Inter-Branch Transfer Modal
window.app.openInterBranchTransferModal = function() {
  const batches = window.db.data.batches.filter(b => b.branchId === window.db.getCurrentBranch().id);
  const products = window.db.data.products || [];
  const otherBranches = window.db.data.branches.filter(br => br.id !== window.db.getCurrentBranch().id);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-info text-white">
          <h2 class="modal-title font-bold">Inter-Branch Stock Transfer</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Destination Branch:</label>
            <select id="trf-dest-branch" class="form-select">
              ${otherBranches.map(br => `<option value="${br.id}">${br.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Select Batch from ${window.db.getCurrentBranch().name}:</label>
            <select id="trf-batch" class="form-select">
              ${batches.map(b => {
                const p = products.find(prod => prod.id === b.productId);
                return `<option value="${b.id}">${p ? p.name : ''} — Batch: ${b.batchNumber} (Avail: ${b.quantity})</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Transfer Quantity:</label>
            <input type="number" id="trf-qty" class="form-control" value="10" min="1">
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Transfer Challan Notes:</label>
            <input type="text" id="trf-notes" class="form-control" placeholder="Sent via branch dispatch van">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeInterBranchTransfer()">Issue Transfer Challan</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeInterBranchTransfer = function() {
  try {
    const toBranchId = document.getElementById('trf-dest-branch').value;
    const batchId = document.getElementById('trf-batch').value;
    const qty = document.getElementById('trf-qty').value;
    const notes = document.getElementById('trf-notes').value;

    const trf = window.inventoryEngine.transferStock(batchId, toBranchId, qty, notes);
    app.closeModal();
    app.showToast(`Transfer Challan #${trf.id} generated! Stock transferred to destination branch.`, 'success');
    app.renderInventory();
  } catch (err) {
    alert(err.message);
  }
};

// Supplier Payment Settlement Modal
window.app.openSupplierPayModal = function(supplierId) {
  const supplier = window.db.data.suppliers.find(s => s.id === supplierId);

  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-primary text-white">
          <h2 class="modal-title font-bold">Settle Supplier Payable Balance</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="mb-3 p-3 bg-light rounded">
            <strong>${supplier.name}</strong><br>
            <span class="text-xs text-muted">Current Ledger Balance Due:</span> 
            <strong class="text-danger text-base">PKR ${supplier.balance.toLocaleString()}</strong>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Payment Amount (PKR):</label>
            <input type="number" id="spay-amount" class="form-control" value="${supplier.balance}" max="${supplier.balance}">
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs font-bold">Payment Channel:</label>
            <select id="spay-method" class="form-select">
              <option value="Meezan Bank Transfer">Meezan Bank - Online Transfer</option>
              <option value="HBL Crossed Cheque">HBL - Crossed Cheque</option>
              <option value="Cash Counter">Cash from Counter Float</option>
            </select>
          </div>
          <div class="form-group mb-2">
            <label class="form-label text-xs">Cheque # / Bank Reference #:</label>
            <input type="text" id="spay-ref" class="form-control" placeholder="e.g. CHQ-99214">
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeSupplierPay('${supplierId}')">Record Payment</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeSupplierPay = function(supplierId) {
  try {
    const amt = document.getElementById('spay-amount').value;
    const method = document.getElementById('spay-method').value;
    const ref = document.getElementById('spay-ref').value;

    window.purchaseEngine.paySupplier(supplierId, amt, method, ref);
    app.closeModal();
    app.showToast('Supplier payment voucher posted!', 'success');
    app.renderPurchases();
  } catch (err) {
    alert(err.message);
  }
};

window.app.openRegisterSupplierModal = function() {
  const modalHtml = `
    <div class="modal-backdrop">
      <div class="modal-dialog animate-pop">
        <div class="modal-header bg-primary text-white">
          <h2 class="modal-title font-bold">🏢 Register New Pharma / Cosmetics Distributor</h2>
          <button class="modal-close-btn" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body p-4">
          <div class="form-group mb-3">
            <label class="form-label text-xs font-bold">Distributor / Company Name: *</label>
            <input type="text" id="reg-sup-name" class="form-control" placeholder="e.g. Sanofi-Aventis Pakistan Ltd">
          </div>
          <div class="form-group mb-3">
            <label class="form-label text-xs font-bold">Contact Person / Medical Rep: *</label>
            <input type="text" id="reg-sup-contact" class="form-control" placeholder="e.g. Muhammad Asif">
          </div>
          <div class="row d-flex gap-2 mb-3">
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Phone Number:</label>
              <input type="text" id="reg-sup-phone" class="form-control" placeholder="051-5551234">
            </div>
            <div>
              <label class="form-label text-xs font-bold">NTN #:</label>
              <input type="text" id="reg-sup-ntn" class="form-control" placeholder="1234567-8">
            </div>
          </div>
          <div class="row d-flex gap-2 mb-3">
            <div>
              <label class="form-label text-xs font-bold">Credit Limit (PKR):</label>
              <input type="number" id="reg-sup-limit" class="form-control" value="200000">
            </div>
            <div class="flex-grow">
              <label class="form-label text-xs font-bold">Payment Terms:</label>
              <select id="reg-sup-terms" class="form-select">
                <option value="30 Days Net">30 Days Net</option>
                <option value="15 Days Net">15 Days Net</option>
                <option value="7 Days Net">7 Days Net</option>
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer p-3">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.executeRegisterSupplier()">Save Distributor</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-root').innerHTML = modalHtml;
};

window.app.executeRegisterSupplier = function() {
  try {
    const name = (document.getElementById('reg-sup-name').value || '').trim();
    const contact = (document.getElementById('reg-sup-contact').value || '').trim();
    const phone = (document.getElementById('reg-sup-phone').value || '').trim();
    const ntn = (document.getElementById('reg-sup-ntn').value || '').trim();
    const creditLimit = Number(document.getElementById('reg-sup-limit').value) || 200000;
    const terms = document.getElementById('reg-sup-terms').value;

    if (!name) {
      alert('Please enter distributor name');
      return;
    }

    const newSupplier = {
      id: 'SUP-' + String(window.db.data.suppliers.length + 1).padStart(2, '0'),
      name,
      contactPerson: contact || 'Sales Representative',
      phone: phone || 'N/A',
      ntn: ntn || 'N/A',
      balance: 0,
      creditLimit,
      terms
    };

    window.db.data.suppliers.push(newSupplier);
    window.db.logAudit('REGISTER_SUPPLIER', 'Purchases', `Registered new distributor ${name}`);
    window.db.save();

    app.closeModal();
    app.showToast(`Distributor "${name}" successfully registered!`, 'success');
    app.renderPurchases();
  } catch (err) {
    alert(err.message);
  }
};
