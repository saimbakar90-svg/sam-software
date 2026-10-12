/**
 * USMAN PHARMACY - Dedicated Expiry & Alerts Center Engine
 * Implements configurable advance expiry alerts (180, 150, 90, 60, 30, 15, 7, 3, 1, 0 days, expired),
 * severity classifications, quarantine & supplier return workflows,
 * mandatory disposition recording for resolutions, and POS sale blocking.
 */

class ExpiryEngine {
  constructor() {
    this.thresholds = [180, 150, 90, 60, 30, 15, 7, 3, 1, 0];
  }

  // Calculate days difference relative to simulated date
  getDaysRemaining(expiryDateStr) {
    if (!expiryDateStr) return 0;
    const simDate = window.db.getSimulatedDate();
    // Normalize to midnight for consistent date comparison
    const target = new Date(expiryDateStr + 'T00:00:00');
    const current = new Date(simDate.getFullYear(), simDate.getMonth(), simDate.getDate());
    const diffMs = target.getTime() - current.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Classify alert severity and category
  classify(daysRemaining, isQuarantined = false, isResolved = false) {
    if (isResolved) {
      return {
        severity: 'Resolved',
        badgeClass: 'badge-resolved',
        label: 'Resolved / Documented',
        actionNeeded: 'None (Archived Disposition)'
      };
    }

    if (isQuarantined) {
      return {
        severity: 'Quarantined',
        badgeClass: 'badge-quarantine',
        label: 'In Quarantine Isolation',
        actionNeeded: 'Process Supplier Return or Regulatory Destruction'
      };
    }

    if (daysRemaining < 0) {
      return {
        severity: 'Critical',
        subCategory: 'Expired Stock',
        badgeClass: 'badge-critical-expired',
        label: `Expired (${Math.abs(daysRemaining)}d ago)`,
        actionNeeded: 'URGENT: Move to Quarantine immediately & block POS!'
      };
    }

    if (daysRemaining === 0) {
      return {
        severity: 'Critical',
        subCategory: 'Expiry Reached',
        badgeClass: 'badge-critical',
        label: 'Expiry Reached Today (0d)',
        actionNeeded: 'URGENT: Remove from active dispensing shelf!'
      };
    }

    if (daysRemaining <= 7) {
      return {
        severity: 'Critical',
        subCategory: 'Within 7 Days',
        badgeClass: 'badge-critical',
        label: `Critical (${daysRemaining}d left)`,
        actionNeeded: 'Prepare immediate supplier return or expedite dispensing'
      };
    }

    if (daysRemaining <= 15) {
      return {
        severity: 'High',
        subCategory: 'Within 15 Days',
        badgeClass: 'badge-high',
        label: `High Risk (${daysRemaining}d left)`,
        actionNeeded: 'Notify supplier for return authorization / prioritize FEFO'
      };
    }

    if (daysRemaining <= 30) {
      return {
        severity: 'Warning',
        subCategory: 'Within 30 Days',
        badgeClass: 'badge-warning',
        label: `Warning (${daysRemaining}d left)`,
        actionNeeded: 'Check supplier return agreement / transfer to high-volume counter'
      };
    }

    if (daysRemaining <= 60) {
      return {
        severity: 'Upcoming',
        subCategory: 'Within 60 Days',
        badgeClass: 'badge-upcoming',
        label: `Upcoming 60d (${daysRemaining}d left)`,
        actionNeeded: 'Monitor movement velocity & reorder restraint'
      };
    }

    if (daysRemaining <= 90) {
      return {
        severity: 'Upcoming',
        subCategory: 'Within 90 Days',
        badgeClass: 'badge-upcoming',
        label: `Upcoming 90d (${daysRemaining}d left)`,
        actionNeeded: 'Routine review during bi-weekly inventory audit'
      };
    }

    if (daysRemaining <= 150) {
      return {
        severity: 'Upcoming',
        subCategory: 'Within 150 Days',
        badgeClass: 'badge-upcoming-light',
        label: `Upcoming 150d (${daysRemaining}d left)`,
        actionNeeded: 'Forecast sales run-rate against batch quantity'
      };
    }

    if (daysRemaining <= 180) {
      return {
        severity: 'Upcoming',
        subCategory: 'Within 180 Days',
        badgeClass: 'badge-upcoming-light',
        label: `Upcoming 180d (${daysRemaining}d left)`,
        actionNeeded: 'Advance notification logged'
      };
    }

    return {
      severity: 'Safe',
      subCategory: 'Healthy Stock',
      badgeClass: 'badge-safe',
      label: `Safe (${daysRemaining}d left)`,
      actionNeeded: 'Standard stock management'
    };
  }

  // Retrieve all batch alerts enriched with product, supplier & financial details
  getAllAlerts(options = {}) {
    const { branchId, severityFilter, categoryFilter, searchKeyword } = options;
    const simDate = window.db.getSimulatedDate();
    const batches = window.db.data.batches || [];
    const products = window.db.data.products || [];
    const suppliers = window.db.data.suppliers || [];
    const expiryActions = window.db.data.expiryActions || [];

    const alerts = [];

    batches.forEach(batch => {
      // Branch filter
      if (branchId && batch.branchId !== branchId) return;

      const product = products.find(p => p.id === batch.productId);
      if (!product) return;

      // Category filter
      if (categoryFilter && product.category !== categoryFilter) return;

      const supplier = suppliers.find(s => s.id === product.supplierId);
      const daysRemaining = this.getDaysRemaining(batch.expiryDate);
      const isQuarantined = batch.status === 'QUARANTINED' || (batch.quarantinedQuantity > 0 && batch.quantity === 0);
      const isResolved = batch.status === 'RESOLVED';

      const classification = this.classify(daysRemaining, isQuarantined, isResolved);

      // Only include batches that have <= 180 days or are already expired/quarantined
      if (daysRemaining > 180 && !isQuarantined && !isResolved) return;

      // Filter by severity
      if (severityFilter && severityFilter !== 'ALL' && classification.severity !== severityFilter) return;

      // Text search
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const match =
          product.name.toLowerCase().includes(kw) ||
          product.genericName.toLowerCase().includes(kw) ||
          batch.batchNumber.toLowerCase().includes(kw) ||
          (product.barcode && product.barcode.includes(kw)) ||
          (supplier && supplier.name.toLowerCase().includes(kw));
        if (!match) return;
      }

      const totalCostValue = (batch.quantity || 0) * (batch.purchaseCost || 0);
      const quarantinedCostValue = (batch.quarantinedQuantity || 0) * (batch.purchaseCost || 0);

      // Find last recorded action
      const recentActions = expiryActions
        .filter(a => a.batchId === batch.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const lastAction = recentActions[0] || null;

      alerts.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        brand: product.brand,
        category: product.category,
        subCategory: product.subCategory,
        dosageForm: product.dosageForm,
        strength: product.strength,
        unitType: product.unitType,
        subUnitType: product.subUnitType,
        expiryDate: batch.expiryDate,
        daysRemaining,
        quantity: batch.quantity,
        quarantinedQuantity: batch.quarantinedQuantity || 0,
        purchaseCost: batch.purchaseCost,
        retailPrice: batch.retailPrice,
        totalCostValue,
        quarantinedCostValue,
        supplierName: supplier ? supplier.name : 'Unknown Supplier',
        supplierId: supplier ? supplier.id : null,
        invoiceRef: batch.supplierInvoiceRef || 'N/A',
        shelfLocation: batch.shelfLocation || 'Unassigned Shelf',
        branchId: batch.branchId,
        status: batch.status,
        classification,
        lastAction,
        actionHistory: recentActions,
        isSellable: this.isBatchSellable(batch).sellable
      });
    });

    // Sort: Critical & Expired first, then by earliest expiry date
    alerts.sort((a, b) => {
      if (a.classification.severity === 'Critical' && b.classification.severity !== 'Critical') return -1;
      if (b.classification.severity === 'Critical' && a.classification.severity !== 'Critical') return 1;
      return a.daysRemaining - b.daysRemaining;
    });

    return alerts;
  }

  // Dashboard KPI Counters
  getSummary(branchId) {
    const alerts = this.getAllAlerts({ branchId });
    const summary = {
      criticalCount: 0,
      highCount: 0,
      warningCount: 0,
      upcomingCount: 0,
      expiredCount: 0,
      quarantinedCount: 0,
      resolvedCount: 0,
      totalCostAtRisk: 0,
      expiredCostValue: 0,
      quarantinedCostValue: 0
    };

    alerts.forEach(a => {
      if (a.daysRemaining < 0 || a.classification.subCategory === 'Expired Stock') {
        summary.expiredCount++;
        summary.expiredCostValue += a.totalCostValue;
      }
      if (a.status === 'QUARANTINED') {
        summary.quarantinedCount++;
        summary.quarantinedCostValue += a.quarantinedCostValue;
      }
      if (a.classification.severity === 'Critical') summary.criticalCount++;
      if (a.classification.severity === 'High') summary.highCount++;
      if (a.classification.severity === 'Warning') summary.warningCount++;
      if (a.classification.severity === 'Upcoming') summary.upcomingCount++;
      if (a.status === 'RESOLVED') summary.resolvedCount++;

      // Stock at risk (excluding resolved)
      if (a.status !== 'RESOLVED' && a.daysRemaining <= 90) {
        summary.totalCostAtRisk += a.totalCostValue;
      }
    });

    return summary;
  }

  // Strict POS Expired Batch Checker
  isBatchSellable(batch) {
    if (!batch) return { sellable: false, reason: 'Invalid Batch' };
    if (batch.status === 'QUARANTINED') {
      return { sellable: false, reason: 'Batch is currently held in QUARANTINE isolation.' };
    }
    if (batch.status === 'EXPIRED') {
      return { sellable: false, reason: 'Batch is strictly EXPIRED. Dispensing prohibited by DRAP regulations!' };
    }
    const daysRemaining = this.getDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0) {
      return { sellable: false, reason: `Batch EXPIRED ${Math.abs(daysRemaining)} days ago on ${batch.expiryDate}. Sale strictly BLOCKED!` };
    }
    if (batch.quantity <= 0) {
      return { sellable: false, reason: 'Stock quantity is zero.' };
    }
    return { sellable: true, reason: 'Batch is active and compliant.' };
  }

  // Workflow 1: Move Batch to Quarantine
  quarantineBatch(batchId, quantityToQuarantine, reason, notes) {
    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const user = window.db.getCurrentUser();
    const qty = Number(quantityToQuarantine);

    if (qty <= 0 || qty > batch.quantity) {
      throw new Error(`Invalid quarantine quantity. Available: ${batch.quantity}`);
    }

    batch.quantity -= qty;
    batch.quarantinedQuantity = (batch.quarantinedQuantity || 0) + qty;
    if (batch.quantity === 0) {
      batch.status = 'QUARANTINED';
    }

    const actionEntry = {
      id: 'ACT-' + Date.now(),
      batchId,
      productName: (window.db.data.products.find(p => p.id === batch.productId) || {}).name,
      batchNumber: batch.batchNumber,
      actionType: 'MOVED_TO_QUARANTINE',
      actionSummary: `Moved ${qty} units to Quarantine. Reason: ${reason}`,
      staffName: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString(),
      status: 'QUARANTINED',
      notes: notes || 'Quarantine isolation tag attached. Barcode sale blocked.'
    };

    window.db.data.expiryActions.unshift(actionEntry);
    window.db.logAudit('EXPIRY_QUARANTINE', 'Expiry & Alerts Center', `Batch ${batch.batchNumber}: ${qty} units moved to quarantine by ${user.name}. Reason: ${reason}`);
    window.db.save();

    return { success: true, action: actionEntry };
  }

  // Workflow 2: Process Return to Supplier
  returnToSupplier(batchId, quantity, supplierId, reason, notes) {
    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === batch.productId);
    const supplier = window.db.data.suppliers.find(s => s.id === supplierId);
    const user = window.db.getCurrentUser();
    const qty = Number(quantity);

    const available = batch.quantity + (batch.quarantinedQuantity || 0);
    if (qty <= 0 || qty > available) {
      throw new Error(`Invalid return quantity. Available active+quarantined: ${available}`);
    }

    // Deduct from batch
    if (batch.quarantinedQuantity >= qty) {
      batch.quarantinedQuantity -= qty;
    } else {
      const remainder = qty - (batch.quarantinedQuantity || 0);
      batch.quarantinedQuantity = 0;
      batch.quantity -= remainder;
    }

    const returnCostValue = qty * batch.purchaseCost;

    // Supplier ledger credit / debit note
    if (supplier) {
      supplier.balance = Math.max(0, supplier.balance - returnCostValue);
    }

    // Record formal return voucher
    const returnVoucher = {
      id: 'RET-' + Date.now(),
      date: new Date().toISOString(),
      batchId,
      batchNumber: batch.batchNumber,
      productId: product ? product.id : null,
      productName: product ? product.name : 'Unknown Product',
      supplierId,
      supplierName: supplier ? supplier.name : 'Unknown',
      quantity: qty,
      unitCost: batch.purchaseCost,
      totalAmount: returnCostValue,
      reason,
      status: 'APPROVED',
      processedBy: `${user.name} (${user.role})`,
      notes
    };

    window.db.data.returns = window.db.data.returns || [];
    window.db.data.returns.unshift(returnVoucher);

    const actionEntry = {
      id: 'ACT-' + Date.now(),
      batchId,
      productName: product ? product.name : 'Unknown',
      batchNumber: batch.batchNumber,
      actionType: 'RETURNED_TO_SUPPLIER',
      actionSummary: `Processed Supplier Return #${returnVoucher.id}: ${qty} units valued at PKR ${returnCostValue.toLocaleString()}.`,
      staffName: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString(),
      status: 'RESOLVED',
      notes: `Debit note generated for ${supplier ? supplier.name : 'Supplier'}. Reason: ${reason}. Notes: ${notes}`
    };

    window.db.data.expiryActions.unshift(actionEntry);
    window.db.logAudit('SUPPLIER_EXPIRY_RETURN', 'Expiry & Alerts Center', `Batch ${batch.batchNumber} returned to ${supplier ? supplier.name : 'Supplier'}. Qty: ${qty}, PKR ${returnCostValue}.`);
    window.db.save();

    return { success: true, returnVoucher, action: actionEntry };
  }

  // Workflow 3: Mark Alert as Resolved (STRICT REQUIREMENT: must record verified disposition)
  resolveAlert(batchId, dispositionType, dispositionReason, notes) {
    if (!dispositionType || !dispositionReason || dispositionReason.trim().length < 5) {
      throw new Error('Mandatory Policy: Cannot resolve alert without selecting a verified disposition type and providing a substantive reason (min 5 characters)!');
    }

    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === batch.productId);
    const user = window.db.getCurrentUser();

    batch.status = 'RESOLVED';

    const actionEntry = {
      id: 'ACT-' + Date.now(),
      batchId,
      productName: product ? product.name : 'Unknown',
      batchNumber: batch.batchNumber,
      actionType: 'ALERT_RESOLVED',
      actionSummary: `Disposition: [${dispositionType}]. Reason: ${dispositionReason}`,
      staffName: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString(),
      status: 'RESOLVED',
      notes: notes || 'Verified regulatory disposition completed.'
    };

    window.db.data.expiryActions.unshift(actionEntry);
    window.db.logAudit('EXPIRY_RESOLVED', 'Expiry & Alerts Center', `Alert for batch ${batch.batchNumber} resolved. Type: ${dispositionType}, Reason: ${dispositionReason}`);
    window.db.save();

    return { success: true, action: actionEntry };
  }

  // Workflow 4: Assign Staff Responsible
  assignStaff(batchId, staffName, deadlineDate, taskNote) {
    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === batch.productId);
    const user = window.db.getCurrentUser();

    const actionEntry = {
      id: 'ACT-' + Date.now(),
      batchId,
      productName: product ? product.name : 'Unknown',
      batchNumber: batch.batchNumber,
      actionType: 'STAFF_ASSIGNED',
      actionSummary: `Assigned to ${staffName}. Target Action Deadline: ${deadlineDate || 'Immediate'}`,
      staffName: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString(),
      status: 'ASSIGNED',
      notes: taskNote || 'Staff tasked with supplier replacement coordination.'
    };

    window.db.data.expiryActions.unshift(actionEntry);
    window.db.logAudit('EXPIRY_TASK_ASSIGN', 'Expiry & Alerts Center', `Batch ${batch.batchNumber} assigned to ${staffName}`);
    window.db.save();

    return { success: true, action: actionEntry };
  }

  // Workflow 5: Add Audit Note
  addNote(batchId, noteText) {
    if (!noteText || !noteText.trim()) throw new Error('Note text cannot be empty');
    const batch = window.db.data.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const product = window.db.data.products.find(p => p.id === batch.productId);
    const user = window.db.getCurrentUser();

    const actionEntry = {
      id: 'ACT-' + Date.now(),
      batchId,
      productName: product ? product.name : 'Unknown',
      batchNumber: batch.batchNumber,
      actionType: 'NOTE_ADDED',
      actionSummary: noteText.trim(),
      staffName: `${user.name} (${user.role})`,
      timestamp: new Date().toISOString(),
      status: batch.status || 'NOTE',
      notes: ''
    };

    window.db.data.expiryActions.unshift(actionEntry);
    window.db.save();
    return { success: true, action: actionEntry };
  }
}

// Global Expiry Engine Singleton
window.expiryEngine = new ExpiryEngine();
