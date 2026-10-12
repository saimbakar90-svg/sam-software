/**
 * USMAN PHARMACY - Smart POS & Billing Engine
 * High-speed pharmacy billing, barcode scanner integration,
 * FEFO batch auto-selection, STRICT expired batch blocker,
 * multi-tier unit conversions, customer Khata credit, and thermal receipt printing.
 */

class PosEngine {
  constructor() {
    this.cart = [];
    this.activeCustomerId = 'CUST-00';
    this.discountType = 'fixed'; // 'fixed' or 'percent'
    this.discountValue = 0;
    this.paymentMethod = 'Cash';
    this.amountTendered = 0;
    this.prescriptionDoctor = '';
    this.prescriptionPatient = '';
    this.notes = '';
  }

  resetCart() {
    this.cart = [];
    this.discountValue = 0;
    this.amountTendered = 0;
    this.prescriptionDoctor = '';
    this.prescriptionPatient = '';
    this.notes = '';
  }

  // Add product to cart with FEFO auto-selection
  addItem(productId, batchId = null, unit = 'Box', quantity = 1) {
    const product = window.db.data.products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    const branch = window.db.getCurrentBranch();

    // Select batch
    let batch = null;
    if (batchId) {
      batch = window.db.data.batches.find(b => b.id === batchId);
    } else {
      batch = window.inventoryEngine.getFefoBatchForSale(productId, branch.id, 1);
    }

    if (!batch) {
      throw new Error(`No sellable non-expired stock available for "${product.name}" in this branch!`);
    }

    // STRICT SAFETY CHECK: Verify batch expiry status
    const safetyCheck = window.expiryEngine.isBatchSellable(batch);
    if (!safetyCheck.sellable) {
      throw new Error(`DISPENSING BLOCKED! Batch ${batch.batchNumber} cannot be sold: ${safetyCheck.reason}`);
    }

    // Determine unit conversion & pricing
    const conversion = window.inventoryEngine.getUnitConversion(product, unit);
    const costPerUnit = batch.purchaseCost * conversion.ratioToMainUnit;
    const pricePerUnit = batch.retailPrice * conversion.ratioToMainUnit;

    // Check if already in cart with same batch and unit
    const existingIndex = this.cart.findIndex(item => item.productId === productId && item.batchId === batch.id && item.unit === unit);

    if (existingIndex !== -1) {
      this.cart[existingIndex].quantity += quantity;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * this.cart[existingIndex].pricePerUnit;
      this.cart[existingIndex].cogs = this.cart[existingIndex].quantity * this.cart[existingIndex].costPerUnit;
    } else {
      this.cart.push({
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        category: product.category,
        brand: product.brand,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        shelfLocation: batch.shelfLocation,
        unit: unit,
        ratioToMainUnit: conversion.ratioToMainUnit,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        costPerUnit: costPerUnit,
        subtotal: quantity * pricePerUnit,
        cogs: quantity * costPerUnit,
        taxRate: product.taxRate || 0,
        requiresPrescription: product.requiresPrescription || false
      });
    }

    return this.getTotals();
  }

  updateItemQuantity(index, quantity) {
    if (index < 0 || index >= this.cart.length) return;
    const qty = Number(quantity);
    if (qty <= 0) {
      this.cart.splice(index, 1);
    } else {
      const item = this.cart[index];
      item.quantity = qty;
      item.subtotal = qty * item.pricePerUnit;
      item.cogs = qty * item.costPerUnit;
    }
  }

  removeItem(index) {
    if (index >= 0 && index < this.cart.length) {
      this.cart.splice(index, 1);
    }
  }

  // Calculate cart totals
  getTotals() {
    let subtotal = 0;
    let cogs = 0;
    let totalTax = 0;

    this.cart.forEach(item => {
      subtotal += item.subtotal;
      cogs += item.cogs;
      if (item.taxRate > 0) {
        totalTax += (item.subtotal * (item.taxRate / 100));
      }
    });

    let discountAmount = 0;
    if (this.discountType === 'percent') {
      discountAmount = (subtotal * Math.min(100, Math.max(0, this.discountValue))) / 100;
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, this.discountValue));
    }

    const fbrFee = (window.db.data.settings.fbrPosEnabled && subtotal > 0) ? window.db.data.settings.fbrPosFee : 0;
    const netTotal = Math.max(0, (subtotal - discountAmount + totalTax + fbrFee));

    const tender = Number(this.amountTendered) || 0;
    const changeDue = Math.max(0, tender - netTotal);

    return {
      itemCount: this.cart.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      cogs,
      discountAmount,
      totalTax,
      fbrFee,
      netTotal,
      tender,
      changeDue,
      grossProfit: (netTotal - totalTax - fbrFee) - cogs
    };
  }

  // Validate discount limit against user role
  validateDiscount(discountAmount, subtotal) {
    const user = window.db.getCurrentUser();
    const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

    if (user.role === 'Cashier' && discountPct > 5) {
      throw new Error(`Cashier discount limit is 5%. This discount is ${discountPct.toFixed(1)}%. Supervisor or Manager override required!`);
    }
    return true;
  }

  // Process and finalize checkout transaction
  completeSale() {
    if (this.cart.length === 0) {
      throw new Error('Billing cart is empty! Please scan or add items.');
    }

    const totals = this.getTotals();
    this.validateDiscount(totals.discountAmount, totals.subtotal);

    const branch = window.db.getCurrentBranch();
    const user = window.db.getCurrentUser();
    const customer = window.db.data.customers.find(c => c.id === this.activeCustomerId) || window.db.data.customers[0];

    // Final batch stock & expiry re-validation before deducting
    for (const item of this.cart) {
      const batch = window.db.data.batches.find(b => b.id === item.batchId);
      if (!batch) {
        throw new Error(`Batch record missing for ${item.productName}`);
      }
      const safety = window.expiryEngine.isBatchSellable(batch);
      if (!safety.sellable) {
        throw new Error(`CRITICAL ALERT: Sale halted! Batch ${batch.batchNumber} (${item.productName}) is blocked: ${safety.reason}`);
      }
      const qtyToDeductInMainUnits = item.quantity * item.ratioToMainUnit;
      if (batch.quantity < qtyToDeductInMainUnits) {
        throw new Error(`Insufficient stock in Batch ${batch.batchNumber}. Available: ${batch.quantity.toFixed(2)}, Requested: ${qtyToDeductInMainUnits.toFixed(2)}`);
      }
    }

    // Deduct stock from batches
    this.cart.forEach(item => {
      const batch = window.db.data.batches.find(b => b.id === item.batchId);
      const qtyToDeduct = item.quantity * item.ratioToMainUnit;
      batch.quantity -= qtyToDeduct;
    });

    // Credit Khata customer debit balance
    if (this.paymentMethod === 'Credit / Khata') {
      if (customer.isWalkIn) {
        throw new Error('Cannot process Khata credit for Walk-in Cash Customer. Please select a registered account.');
      }
      customer.balance = (customer.balance || 0) + totals.netTotal;
    }

    const invoiceId = 'INV-' + new Date().getFullYear() + '-' + String(window.db.data.sales.length + 1).padStart(4, '0');

    const invoice = {
      id: invoiceId,
      branchId: branch.id,
      branchName: branch.name,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      cashierId: user.id,
      cashierName: user.name,
      dateTime: window.db.getSimulatedDate().toISOString(),
      items: JSON.parse(JSON.stringify(this.cart)),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.totalTax,
      fbrFee: totals.fbrFee,
      netTotal: totals.netTotal,
      cogs: totals.cogs,
      grossProfit: totals.grossProfit,
      paymentMethod: this.paymentMethod,
      paidAmount: this.paymentMethod === 'Credit / Khata' ? 0 : (totals.tender > 0 ? totals.tender : totals.netTotal),
      changeReturned: this.paymentMethod === 'Cash' ? totals.changeDue : 0,
      prescriptionDoctor: this.prescriptionDoctor,
      prescriptionPatient: this.prescriptionPatient,
      notes: this.notes,
      status: 'COMPLETED',
      fbrInvoiceNo: 'FBR-' + Math.floor(100000000000 + Math.random() * 900000000000)
    };

    window.db.data.sales.unshift(invoice);

    window.db.logAudit('POS_SALE', 'Smart POS', `Invoiced #${invoice.id} for ${customer.name}. Amount: PKR ${totals.netTotal.toLocaleString()}, Payment: ${this.paymentMethod}`);
    window.db.save();

    // Reset cart
    this.resetCart();

    return invoice;
  }
}

// Global POS Singleton
window.posEngine = new PosEngine();
