/**
 * USMAN PHARMACY - Purchase & Supplier Management Engine
 * Implements goods receiving, pharma bonus schemes (10+1 bonus stock costing),
 * batch creation upon invoice receipt, supplier ledgers, and price comparisons.
 */

class PurchaseEngine {
  // Add a complete purchase invoice
  receivePurchaseInvoice(invoiceData) {
    const {
      supplierId,
      invoiceNo,
      invoiceDate,
      branchId,
      items, // array of { productId, batchNumber, expiryDate, quantity (paid), bonusQty, unitCost, retailPrice, shelfLocation }
      paidAmount,
      notes
    } = invoiceData;

    const supplier = window.db.data.suppliers.find(s => s.id === supplierId);
    if (!supplier) throw new Error('Supplier record not found');
    const branch = window.db.data.branches.find(b => b.id === branchId) || window.db.getCurrentBranch();
    const user = window.db.getCurrentUser();

    if (!items || items.length === 0) {
      throw new Error('Purchase invoice must contain at least one item');
    }

    let invoiceTotalCost = 0;
    const processedItems = [];

    // Process each item, compute bonus-diluted cost, and add/update batch
    items.forEach(item => {
      const paidQty = Number(item.quantity) || 0;
      const bonusQty = Number(item.bonusQty) || 0;
      const totalUnitsReceived = paidQty + bonusQty;

      if (totalUnitsReceived <= 0) {
        throw new Error('Received quantity must be greater than zero');
      }

      const itemCostTotal = paidQty * Number(item.unitCost);
      invoiceTotalCost += itemCostTotal;

      // Effective unit cost with bonus dilution (DRAP / IFRS compliant costing)
      const effectiveUnitCost = itemCostTotal / totalUnitsReceived;

      // Create new batch record or update existing
      const existingBatch = window.db.data.batches.find(b =>
        b.productId === item.productId &&
        b.batchNumber === item.batchNumber &&
        b.branchId === branch.id
      );

      let batchId = '';
      if (existingBatch) {
        existingBatch.quantity += totalUnitsReceived;
        existingBatch.purchaseCost = effectiveUnitCost;
        existingBatch.retailPrice = Number(item.retailPrice);
        existingBatch.expiryDate = item.expiryDate;
        batchId = existingBatch.id;
      } else {
        const newBatch = {
          id: 'BAT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          productId: item.productId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          manufacturingDate: item.manufacturingDate || window.db.getSimulatedDate().toISOString().split('T')[0],
          branchId: branch.id,
          shelfLocation: item.shelfLocation || 'Main Inventory Shelf',
          purchaseCost: effectiveUnitCost,
          retailPrice: Number(item.retailPrice),
          quantity: totalUnitsReceived,
          quarantinedQuantity: 0,
          status: 'ACTIVE',
          supplierInvoiceRef: invoiceNo,
          receivedDate: window.db.getSimulatedDate().toISOString().split('T')[0]
        };
        window.db.data.batches.push(newBatch);
        batchId = newBatch.id;
      }

      processedItems.push({
        productId: item.productId,
        productName: (window.db.data.products.find(p => p.id === item.productId) || {}).name,
        batchId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        paidQuantity: paidQty,
        bonusQuantity: bonusQty,
        totalQuantity: totalUnitsReceived,
        billedUnitCost: Number(item.unitCost),
        effectiveUnitCost: effectiveUnitCost,
        retailPrice: Number(item.retailPrice),
        itemTotalCost: itemCostTotal
      });
    });

    const paymentAmount = Number(paidAmount) || 0;
    const unpaidBalance = Math.max(0, invoiceTotalCost - paymentAmount);

    // Update supplier ledger balance
    supplier.balance = (supplier.balance || 0) + unpaidBalance;

    const purchaseRecord = {
      id: 'PUR-' + new Date().getFullYear() + '-' + String(window.db.data.purchases.length + 1).padStart(4, '0'),
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNo: invoiceNo,
      invoiceDate: invoiceDate || window.db.getSimulatedDate().toISOString().split('T')[0],
      branchId: branch.id,
      branchName: branch.name,
      receivedBy: `${user.name} (${user.role})`,
      items: processedItems,
      totalAmount: invoiceTotalCost,
      paidAmount: paymentAmount,
      balanceDue: unpaidBalance,
      status: unpaidBalance === 0 ? 'PAID' : (paymentAmount > 0 ? 'PARTIAL' : 'UNPAID'),
      notes: notes || 'Standard goods receipt verified against physical delivery challan.'
    };

    window.db.data.purchases = window.db.data.purchases || [];
    window.db.data.purchases.unshift(purchaseRecord);

    window.db.logAudit('PURCHASE_RECEIPT', 'Purchases', `Received Invoice #${invoiceNo} from ${supplier.name}. Total: PKR ${invoiceTotalCost.toLocaleString()} (Paid: ${paymentAmount}, Due: ${unpaidBalance})`);
    window.db.save();

    return purchaseRecord;
  }

  // Pay Supplier Account
  paySupplier(supplierId, paymentAmount, paymentMethod, referenceNo, notes) {
    const supplier = window.db.data.suppliers.find(s => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found');
    const amt = Number(paymentAmount);
    if (amt <= 0) throw new Error('Payment amount must be greater than zero');

    const previousBalance = supplier.balance || 0;
    supplier.balance = Math.max(0, previousBalance - amt);

    const paymentVoucher = {
      id: 'SPV-' + Date.now(),
      supplierId,
      supplierName: supplier.name,
      paymentDate: window.db.getSimulatedDate().toISOString(),
      amount: amt,
      previousBalance,
      remainingBalance: supplier.balance,
      paymentMethod,
      referenceNo: referenceNo || 'Direct Payment',
      paidBy: window.db.getCurrentUser().name,
      notes
    };

    window.db.data.supplierPayments = window.db.data.supplierPayments || [];
    window.db.data.supplierPayments.unshift(paymentVoucher);

    window.db.logAudit('SUPPLIER_PAYMENT', 'Purchases', `Paid PKR ${amt.toLocaleString()} to ${supplier.name} via ${paymentMethod}. New balance: PKR ${supplier.balance.toLocaleString()}`);
    window.db.save();

    return paymentVoucher;
  }
}

// Global Purchase Engine Singleton
window.purchaseEngine = new PurchaseEngine();
