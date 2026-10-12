/**
 * USMAN PHARMACY - Inventory & Batch Management Engine
 * Implements FEFO (First Expiry, First Out) batch resolution,
 * multi-tier unit conversions (Box -> Strip -> Tablet/Piece),
 * stock adjustments, inter-branch transfers, cosmetics variants, and stock valuation.
 */

class InventoryEngine {
  // Get all products with calculated stock aggregates
  getProductsWithStock(branchId, categoryFilter, searchKeyword) {
    const products = window.db.data.products || [];
    const batches = window.db.data.batches || [];
    const simDate = window.db.getSimulatedDate();

    return products.filter(p => {
      if (categoryFilter && categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const match =
          p.name.toLowerCase().includes(kw) ||
          p.genericName.toLowerCase().includes(kw) ||
          p.brand.toLowerCase().includes(kw) ||
          (p.barcode && p.barcode.includes(kw));
        if (!match) return false;
      }
      return true;
    }).map(product => {
      // Find batches for this product
      const productBatches = batches.filter(b => {
        if (b.productId !== product.id) return false;
        if (branchId && b.branchId !== branchId) return false;
        return true;
      });

      let totalUnits = 0;
      let quarantinedUnits = 0;
      let expiredUnits = 0;
      let totalCostVal = 0;
      let totalRetailVal = 0;

      productBatches.forEach(b => {
        const days = window.expiryEngine.getDaysRemaining(b.expiryDate);
        if (days < 0 || b.status === 'EXPIRED') {
          expiredUnits += b.quantity;
        } else if (b.status === 'QUARANTINED') {
          quarantinedUnits += (b.quantity + (b.quarantinedQuantity || 0));
        } else {
          totalUnits += b.quantity;
          totalCostVal += (b.quantity * b.purchaseCost);
          totalRetailVal += (b.quantity * b.retailPrice);
        }
        quarantinedUnits += (b.quarantinedQuantity || 0);
      });

      // Unit conversion rates
      const stripsPerBox = product.subUnitsPerUnit || 1;
      const tabletsPerStrip = product.baseUnitsPerSubUnit || 1;
      const tabletsPerBox = stripsPerBox * tabletsPerStrip;

      const isLowStock = totalUnits <= product.minStockLevel;

      // FEFO active batches (earliest expiry first, only sellable)
      const activeBatches = productBatches
        .filter(b => b.quantity > 0 && window.expiryEngine.isBatchSellable(b).sellable)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

      const nextBatchToDispense = activeBatches[0] || null;

      return {
        ...product,
        totalStockBoxes: totalUnits,
        totalStockStrips: totalUnits * stripsPerBox,
        totalStockTablets: totalUnits * tabletsPerBox,
        quarantinedUnits,
        expiredUnits,
        totalCostVal,
        totalRetailVal,
        isLowStock,
        batches: productBatches,
        nextBatchToDispense
      };
    });
  }

  // Unit conversion helper
  getUnitConversion(product, unit) {
    const stripsPerBox = product.subUnitsPerUnit || 1;
    const tabletsPerStrip = product.baseUnitsPerSubUnit || 1;
    const tabletsPerBox = stripsPerBox * tabletsPerStrip;

    if (unit === product.unitType || unit === 'Box' || unit === 'Bottle' || unit === 'Tube' || unit === 'Piece') {
      return { ratioToMainUnit: 1, name: product.unitType };
    }
    if (unit === product.subUnitType || unit === 'Strip') {
      return { ratioToMainUnit: 1 / stripsPerBox, name: product.subUnitType || 'Strip' };
    }
    if (unit === 'Tablet' || unit === 'Capsule' || unit === 'Base Unit') {
      return { ratioToMainUnit: 1 / tabletsPerBox, name: 'Tablet/Piece' };
    }
    return { ratioToMainUnit: 1, name: unit };
  }

  // FEFO Batch Selector for POS / Dispensing
  getFefoBatchForSale(productId, branchId, requiredUnitsInMainUnit) {
    const batches = (window.db.data.batches || []).filter(b => {
      if (b.productId !== productId) return false;
      if (branchId && b.branchId !== branchId) return false;
      if (b.quantity <= 0) return false;
      const check = window.expiryEngine.isBatchSellable(b);
      return check.sellable;
    });

    if (batches.length === 0) {
      return null;
    }

    // Sort by FEFO (earliest expiry first)
    batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    return batches[0];
  }

  // Add or Edit Product
  saveProduct(productData) {
    const isNew = !productData.id;
    const user = window.db.getCurrentUser();

    if (isNew) {
      productData.id = 'PRD-' + String(window.db.data.products.length + 1).padStart(3, '0');
      window.db.data.products.push(productData);
      window.db.logAudit('PRODUCT_CREATE', 'Inventory', `Created product ${productData.name} (${productData.id})`);
    } else {
      const idx = window.db.data.products.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        window.db.data.products[idx] = { ...window.db.data.products[idx], ...productData };
        window.db.logAudit('PRODUCT_UPDATE', 'Inventory', `Updated product ${productData.name} (${productData.id})`);
      }
    }
    window.db.save();
    return productData;
  }

  // Add Batch
  saveBatch(batchData) {
    const isNew = !batchData.id;
    const user = window.db.getCurrentUser();

    if (isNew) {
      batchData.id = 'BAT-' + Date.now();
      batchData.status = batchData.status || 'ACTIVE';
      batchData.quarantinedQuantity = batchData.quarantinedQuantity || 0;
      window.db.data.batches.push(batchData);
      window.db.logAudit('BATCH_CREATE', 'Inventory', `Added batch ${batchData.batchNumber} for product ID ${batchData.productId}. Qty: ${batchData.quantity}`);
    } else {
      const idx = window.db.data.batches.findIndex(b => b.id === batchData.id);
      if (idx !== -1) {
        window.db.data.batches[idx] = { ...window.db.data.batches[idx], ...batchData };
        window.db.logAudit('BATCH_UPDATE', 'Inventory', `Updated batch ${batchData.batchNumber}`);
      }
    }
    window.db.save();
    return batchData;
  }

  // Stock Adjustment Workflow
  adjustStock(batchId, adjustmentQty, adjustmentType, reason) {
    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === batch.productId);
    const user = window.db.getCurrentUser();
    const qty = Number(adjustmentQty);

    const oldQty = batch.quantity;
    if (adjustmentType === 'INCREASE') {
      batch.quantity += qty;
    } else if (adjustmentType === 'DECREASE') {
      if (qty > batch.quantity) throw new Error('Adjustment exceeds available quantity.');
      batch.quantity -= qty;
    } else if (adjustmentType === 'SET_EXACT') {
      batch.quantity = qty;
    }

    const logEntry = {
      id: 'ADJ-' + Date.now(),
      batchId,
      productId: batch.productId,
      productName: product ? product.name : 'Unknown',
      batchNumber: batch.batchNumber,
      adjustmentType,
      previousQuantity: oldQty,
      adjustedQuantity: batch.quantity,
      difference: batch.quantity - oldQty,
      reason,
      adjustedBy: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString()
    };

    window.db.data.stockAdjustments = window.db.data.stockAdjustments || [];
    window.db.data.stockAdjustments.unshift(logEntry);

    window.db.logAudit('STOCK_ADJUSTMENT', 'Inventory', `Adjusted batch ${batch.batchNumber}: ${oldQty} -> ${batch.quantity}. Reason: ${reason}`);
    window.db.save();
    return logEntry;
  }

  // Inter-Branch Transfer Workflow
  transferStock(batchId, toBranchId, transferQty, notes) {
    const sourceBatch = window.db.data.batches.find(b => b.id === batchId);
    if (!sourceBatch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === sourceBatch.productId);
    const fromBranch = window.db.data.branches.find(b => b.id === sourceBatch.branchId);
    const toBranch = window.db.data.branches.find(b => b.id === toBranchId);
    const user = window.db.getCurrentUser();
    const qty = Number(transferQty);

    if (qty <= 0 || qty > sourceBatch.quantity) {
      throw new Error(`Invalid transfer quantity. Available at ${fromBranch ? fromBranch.name : 'source'}: ${sourceBatch.quantity}`);
    }

    // Deduct from source batch
    sourceBatch.quantity -= qty;

    // Find or create matching batch in target branch
    let targetBatch = window.db.data.batches.find(b =>
      b.productId === sourceBatch.productId &&
      b.batchNumber === sourceBatch.batchNumber &&
      b.branchId === toBranchId
    );

    if (targetBatch) {
      targetBatch.quantity += qty;
    } else {
      targetBatch = {
        ...sourceBatch,
        id: 'BAT-' + Date.now(),
        branchId: toBranchId,
        quantity: qty,
        quarantinedQuantity: 0,
        shelfLocation: `Transferred Stock - Rack 1 (${toBranch ? toBranch.code : 'BR2'})`
      };
      window.db.data.batches.push(targetBatch);
    }

    const transferDoc = {
      id: 'TRF-' + Date.now(),
      date: new Date().toISOString(),
      productId: sourceBatch.productId,
      productName: product ? product.name : 'Unknown',
      batchNumber: sourceBatch.batchNumber,
      expiryDate: sourceBatch.expiryDate,
      quantity: qty,
      fromBranchId: sourceBatch.branchId,
      fromBranchName: fromBranch ? fromBranch.name : 'Source Branch',
      toBranchId,
      toBranchName: toBranch ? toBranch.name : 'Target Branch',
      transferredBy: `${user.name} (${user.role})`,
      notes: notes || 'Standard replenishment transfer'
    };

    window.db.data.transfers = window.db.data.transfers || [];
    window.db.data.transfers.unshift(transferDoc);

    window.db.logAudit('INTER_BRANCH_TRANSFER', 'Inventory', `Transferred ${qty} units of ${product ? product.name : 'Product'} (Batch: ${sourceBatch.batchNumber}) from ${fromBranch ? fromBranch.code : 'Origin'} to ${toBranch ? toBranch.code : 'Target'}`);
    window.db.save();
    return transferDoc;
  }
}

// Global Inventory Engine Singleton
window.inventoryEngine = new InventoryEngine();
