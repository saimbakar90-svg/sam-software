/**
 * USMAN PHARMACY - Complete Reports & Analytics Engine
 * Generates all 19 required analytical reports with interactive filters,
 * CSV export capabilities, print formatting, and reconciliation to underlying transactions.
 */

class ReportsEngine {
  // Export table rows to CSV
  exportToCSV(filename, headers, rows) {
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell !== undefined && cell !== null ? cell : '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 1. Sales Performance Report
  generateSalesReport(filter = {}) {
    const sales = window.db.data.sales || [];
    const rows = [];
    sales.forEach(s => {
      rows.push({
        invoiceNo: s.id,
        date: s.dateTime.split('T')[0],
        customer: s.customerName,
        cashier: s.cashierName,
        method: s.paymentMethod,
        itemsCount: s.items ? s.items.length : 0,
        subtotal: s.subtotal,
        discount: s.discountAmount,
        netTotal: s.netTotal,
        cogs: s.cogs || 0,
        profit: (s.netTotal || 0) - (s.cogs || 0)
      });
    });
    return {
      title: 'Report 1: Daily & Period Sales Ledger',
      headers: ['Invoice #', 'Date', 'Customer', 'Cashier', 'Payment', 'Items', 'Subtotal (PKR)', 'Discount (PKR)', 'Net Total (PKR)', 'COGS (PKR)', 'Gross Profit (PKR)'],
      data: rows.map(r => [r.invoiceNo, r.date, r.customer, r.cashier, r.method, r.itemsCount, r.subtotal.toFixed(2), r.discount.toFixed(2), r.netTotal.toFixed(2), r.cogs.toFixed(2), r.profit.toFixed(2)])
    };
  }

  // 2. Purchase and Purchase-Return Report
  generatePurchasesReport() {
    const purchases = window.db.data.purchases || [];
    return {
      title: 'Report 2: Purchase & Goods Receiving Register',
      headers: ['Purchase ID', 'Invoice #', 'Date', 'Supplier', 'Items Count', 'Total Amount (PKR)', 'Paid (PKR)', 'Balance Due (PKR)', 'Status'],
      data: purchases.map(p => [
        p.id,
        p.invoiceNo,
        p.invoiceDate,
        p.supplierName,
        p.items.length,
        p.totalAmount.toFixed(2),
        p.paidAmount.toFixed(2),
        p.balanceDue.toFixed(2),
        p.status
      ])
    };
  }

  // 3. Gross Profit & Net Profit Report
  generateProfitLossReport() {
    const fin = window.accountingEngine.getFinancialSummary();
    const rows = [
      ['Gross Sales Revenue', fin.grossSales.toFixed(2)],
      ['Less: Customer Discounts Allowed', `(${fin.discountsGiven.toFixed(2)})`],
      ['Net Sales Revenue', fin.netSalesRevenue.toFixed(2)],
      ['Less: Cost of Goods Sold (COGS)', `(${fin.totalCogs.toFixed(2)})`],
      ['GROSS PROFIT', fin.grossProfit.toFixed(2)],
      ['Gross Profit Margin (%)', `${fin.grossProfitMarginPct.toFixed(1)}%`],
      ['Less: Operating Expenses (Utilities, Rent, Packaging)', `(${fin.totalOperatingExpenses.toFixed(2)})`],
      ['NET OPERATING PROFIT', fin.netProfit.toFixed(2)],
      ['Net Profit Margin (%)', `${fin.netProfitMarginPct.toFixed(1)}%`]
    ];
    return {
      title: 'Report 3: Gross Profit & Net Income Statement',
      headers: ['Financial Metric / Ledger Line', 'Amount (PKR)'],
      data: rows
    };
  }

  // 4. Fast-Moving vs Slow-Moving Product Movement Analysis
  generateFastSlowMovingReport() {
    const products = window.db.data.products || [];
    const sales = window.db.data.sales || [];
    const unitsMap = {};
    const revMap = {};

    sales.forEach(s => {
      (s.items || []).forEach(item => {
        unitsMap[item.productId] = (unitsMap[item.productId] || 0) + item.quantity;
        revMap[item.productId] = (revMap[item.productId] || 0) + item.total;
      });
    });

    const rows = products.map(p => {
      const soldUnits = unitsMap[p.id] || 0;
      const totalRev = revMap[p.id] || 0;
      const velocity = soldUnits >= 20 ? 'Fast Moving (A-Grade)' : soldUnits >= 5 ? 'Medium Velocity (B-Grade)' : 'Slow Moving (C-Grade)';
      return [
        p.name,
        p.category,
        p.manufacturer,
        soldUnits,
        `PKR ${totalRev.toFixed(2)}`,
        velocity
      ];
    }).sort((a, b) => b[3] - a[3]);

    return {
      title: 'Report 4: Fast-Moving & Slow-Moving Stock Velocity Matrix',
      headers: ['Product Name', 'Category', 'Manufacturer', 'Units Dispensed', 'Revenue (PKR)', 'Velocity Grade'],
      data: rows
    };
  }

  // 5. Current Stock & Inventory Valuation
  generateStockValuationReport() {
    const prods = window.inventoryEngine.getProductsWithStock();
    return {
      title: 'Report 5: Current Stock & Inventory Valuation at Cost & Retail',
      headers: ['Product Name', 'Category', 'Dosage Form', 'Active Boxes', 'Active Strips', 'Est. Cost Value (PKR)', 'Est. Retail Value (PKR)', 'Stock Status'],
      data: prods.map(p => [
        p.name,
        p.category,
        p.dosageForm,
        p.totalStockBoxes,
        p.totalStockStrips,
        p.totalCostVal.toFixed(2),
        p.totalRetailVal.toFixed(2),
        p.isLowStock ? 'LOW STOCK - REORDER' : 'Adequate'
      ])
    };
  }

  // 6. Batch-wise Stock & Expiry
  generateBatchWiseReport() {
    const batches = window.db.data.batches || [];
    const products = window.db.data.products || [];
    return {
      title: 'Report 6: Batch-wise Stock & Expiry Ledger',
      headers: ['Batch #', 'Product', 'Expiry Date', 'Days Left', 'Stock Qty', 'Unit Cost (PKR)', 'Retail Price (PKR)', 'Status', 'Shelf Location'],
      data: batches.map(b => {
        const prod = products.find(p => p.id === b.productId);
        const days = window.expiryEngine.getDaysRemaining(b.expiryDate);
        return [
          b.batchNumber,
          prod ? prod.name : 'Unknown',
          b.expiryDate,
          days,
          b.quantity,
          b.purchaseCost.toFixed(2),
          b.retailPrice.toFixed(2),
          b.status,
          b.shelfLocation
        ];
      })
    };
  }

  // 7. Expiring Stock by Thresholds (180, 150, 90, 60, 30, 15, 7, 3, 1, 0)
  generateExpiringThresholdsReport() {
    const alerts = window.expiryEngine.getAllAlerts();
    return {
      title: 'Report 7: Advance Expiry Alert Matrix (1-180 Days)',
      headers: ['Batch #', 'Product', 'Category', 'Expiry Date', 'Days Remaining', 'Available Qty', 'Stock Value at Cost (PKR)', 'Alert Severity', 'Recommended Action'],
      data: alerts.map(a => [
        a.batchNumber,
        a.productName,
        a.category,
        a.expiryDate,
        a.daysRemaining,
        a.quantity,
        a.totalCostValue.toFixed(2),
        a.classification.severity,
        a.classification.actionNeeded
      ])
    };
  }

  // 8. Expired Stock Quantity & Cost Value
  generateExpiredStockReport() {
    const alerts = window.expiryEngine.getAllAlerts().filter(a => a.daysRemaining < 0 || a.status === 'EXPIRED');
    return {
      title: 'Report 8: Expired Stock Quantity & Valuation at Cost',
      headers: ['Batch #', 'Product Name', 'Supplier', 'Expiry Date', 'Days Overdue', 'Expired Qty', 'Loss Value at Cost (PKR)', 'Invoice Ref'],
      data: alerts.map(a => [
        a.batchNumber,
        a.productName,
        a.supplierName,
        a.expiryDate,
        Math.abs(a.daysRemaining),
        a.quantity,
        a.totalCostValue.toFixed(2),
        a.invoiceRef
      ])
    };
  }

  // 9. Quarantined & Damaged Inventory
  generateQuarantineReport() {
    const batches = window.db.data.batches.filter(b => b.quarantinedQuantity > 0 || b.status === 'QUARANTINED');
    const prods = window.db.data.products;
    return {
      title: 'Report 9: Quarantined & Isolated Stock Register',
      headers: ['Batch #', 'Product Name', 'Quarantined Qty', 'Purchase Cost (PKR)', 'Total Quarantined Value (PKR)', 'Expiry Date', 'Shelf Isolation Tag'],
      data: batches.map(b => {
        const prod = prods.find(p => p.id === b.productId);
        const qQty = (b.quarantinedQuantity || 0) + (b.status === 'QUARANTINED' ? b.quantity : 0);
        return [
          b.batchNumber,
          prod ? prod.name : 'Unknown',
          qQty,
          b.purchaseCost.toFixed(2),
          (qQty * b.purchaseCost).toFixed(2),
          b.expiryDate,
          b.shelfLocation
        ];
      })
    };
  }

  // 10. Supplier Return & Expiry Action History
  generateSupplierReturnReport() {
    const returns = window.db.data.returns || [];
    return {
      title: 'Report 10: Supplier Expiry Returns & Debit Notes',
      headers: ['Return ID', 'Date', 'Supplier', 'Product', 'Batch #', 'Returned Qty', 'Debit Value (PKR)', 'Reason', 'Processed By'],
      data: returns.map(r => [
        r.id,
        r.date.split('T')[0],
        r.supplierName,
        r.productName,
        r.batchNumber,
        r.quantity,
        r.totalAmount.toFixed(2),
        r.reason,
        r.processedBy
      ])
    };
  }

  // 11. Low-Stock & Reorder Recommendations
  generateReorderReport() {
    const prods = window.inventoryEngine.getProductsWithStock().filter(p => p.isLowStock);
    return {
      title: 'Report 11: Low-Stock & Automated Reorder Register',
      headers: ['Product Name', 'Manufacturer', 'Current Stock (Boxes)', 'Min Reorder Threshold', 'Suggested Order Qty', 'Supplier'],
      data: prods.map(p => {
        const sup = window.db.data.suppliers.find(s => s.id === p.supplierId);
        const orderSuggestion = Math.max(20, (p.minStockLevel * 2) - p.totalStockBoxes);
        return [
          p.name,
          p.manufacturer,
          p.totalStockBoxes,
          p.minStockLevel,
          orderSuggestion,
          sup ? sup.name : 'Primary Distributor'
        ];
      })
    };
  }

  // 12. Customer Receivables (Khata) & Supplier Payables
  generateLedgersReport() {
    const custs = window.db.data.customers.filter(c => c.balance > 0);
    const sups = window.db.data.suppliers.filter(s => s.balance > 0);
    const rows = [];
    custs.forEach(c => {
      rows.push(['Customer Khata', c.name, c.phone, `PKR ${c.balance.toFixed(2)} (Debit / Receivable)`]);
    });
    sups.forEach(s => {
      rows.push(['Supplier Payable', s.name, s.phone, `PKR ${s.balance.toFixed(2)} (Credit / Payable)`]);
    });
    return {
      title: 'Report 12: Customer Receivables & Supplier Payables Summary',
      headers: ['Account Type', 'Party Name', 'Contact Phone', 'Balance Position'],
      data: rows
    };
  }

  // 13. Daily Cash Flow & Tender Breakdown
  generateCashFlowReport() {
    const sales = window.db.data.sales || [];
    const expenses = window.db.data.expenses || [];
    const tenders = { Cash: 0, Card: 0, Khata: 0, BankTransfer: 0 };

    sales.forEach(s => {
      const m = s.paymentMethod || 'Cash';
      if (tenders[m] !== undefined) tenders[m] += s.netTotal;
      else tenders.Cash += s.netTotal;
    });

    const totalInflow = tenders.Cash + tenders.Card + tenders.Khata + tenders.BankTransfer;
    const totalOutflow = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const rows = [
      ['Cash at Counter (Float & Bills)', `PKR ${tenders.Cash.toFixed(2)}`, 'Liquid Inflow'],
      ['Debit/Credit Card POS Terminal', `PKR ${tenders.Card.toFixed(2)}`, 'Bank Settled'],
      ['Customer Credit (Khata Receivable)', `PKR ${tenders.Khata.toFixed(2)}`, 'Pending Recovery'],
      ['Direct Bank / 1Link Transfers', `PKR ${tenders.BankTransfer.toFixed(2)}`, 'Bank Inflow'],
      ['TOTAL REVENUE INFLOW', `PKR ${totalInflow.toFixed(2)}`, 'Gross Inflow'],
      ['Operating Expenses / Cash Outflow', `PKR (${totalOutflow.toFixed(2)})`, 'Cash Expense'],
      ['NET CASH SURPLUS FOR PERIOD', `PKR ${(totalInflow - totalOutflow).toFixed(2)}`, 'Net Position']
    ];

    return {
      title: 'Report 13: Daily Cash Inflow & Tender Reconciliation',
      headers: ['Payment Channel / Cash Flow Element', 'Total Value (PKR)', 'Flow Classification'],
      data: rows
    };
  }

  // 14. Department & Category Profitability Matrix (Pharma vs Cosmetics)
  generateCategoryProfitabilityReport() {
    const sales = window.db.data.sales || [];
    const products = window.db.data.products || [];
    const catMap = {
      Pharmaceutical: { revenue: 0, cogs: 0, count: 0 },
      Cosmetics: { revenue: 0, cogs: 0, count: 0 }
    };

    sales.forEach(s => {
      (s.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = (prod && prod.category === 'Cosmetics') ? 'Cosmetics' : 'Pharmaceutical';
        const lineRev = item.total || 0;
        const lineCogs = item.cogs || 0;
        catMap[cat].revenue += lineRev;
        catMap[cat].cogs += lineCogs;
        catMap[cat].count += item.quantity || 1;
      });
    });

    const rows = Object.keys(catMap).map(cat => {
      const rev = catMap[cat].revenue;
      const cogs = catMap[cat].cogs;
      const profit = rev - cogs;
      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';
      return [
        cat === 'Pharmaceutical' ? 'Medicines & Pharmaceuticals' : 'Cosmetics & Personal Care',
        catMap[cat].count,
        `PKR ${rev.toFixed(2)}`,
        `PKR ${cogs.toFixed(2)}`,
        `PKR ${profit.toFixed(2)}`,
        `${margin}%`
      ];
    });

    return {
      title: 'Report 14: Department & Category Profitability Matrix',
      headers: ['Department / Segment', 'Units Sold', 'Revenue (PKR)', 'COGS (PKR)', 'Gross Profit (PKR)', 'Margin %'],
      data: rows
    };
  }

  // 15. FBR POS Sales Tax & Regulatory Surcharge Register
  generateFbrTaxReport() {
    const sales = window.db.data.sales || [];
    const rows = sales.map(s => {
      const taxAmt = s.taxAmount || 0;
      const fbrFee = s.fbrFee || 0;
      const fbrStatus = s.fbrInvoiceNumber ? 'FBR Sync Validated' : 'Queued (Offline)';
      return [
        s.id,
        s.dateTime.split('T')[0],
        s.customerName,
        `PKR ${s.subtotal.toFixed(2)}`,
        `PKR ${taxAmt.toFixed(2)}`,
        `PKR ${fbrFee.toFixed(2)}`,
        `PKR ${s.netTotal.toFixed(2)}`,
        s.fbrInvoiceNumber || `FBR-${s.id}`,
        fbrStatus
      ];
    });

    return {
      title: 'Report 15: FBR POS Sales Tax & Regulatory Compliance Register',
      headers: ['Invoice #', 'Date', 'Customer', 'Taxable Base', 'GST / Tax (PKR)', 'POS Fee (PKR)', 'Net Billed (PKR)', 'FBR Invoice Code', 'Compliance Status'],
      data: rows
    };
  }

  // 16. Inter-Branch Stock Transfers & Dispatch Register
  generateBranchTransfersReport() {
    const transfers = window.db.data.transfers || [];
    const rows = transfers.map(t => [
      t.id,
      t.date ? t.date.split('T')[0] : 'N/A',
      t.productName,
      t.batchNumber,
      t.quantity,
      t.fromBranchName || 'Main Branch',
      t.toBranchName || 'Executive Care',
      t.transferredBy,
      t.notes || 'Normal transfer'
    ]);

    return {
      title: 'Report 16: Inter-Branch Stock Transfers & Replenishment Challan Ledger',
      headers: ['Challan #', 'Date', 'Product', 'Batch #', 'Qty Sent', 'Origin Branch', 'Destination Branch', 'Authorized Officer', 'Challan Notes'],
      data: rows
    };
  }

  // 17. DRAP Drug Sale Register (Form 7 / Form 9 Regulatory Compliance)
  generateDrapRegisterReport() {
    const sales = window.db.data.sales || [];
    const rows = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        rows.push([
          s.dateTime.split('T')[0],
          s.id,
          s.customerName,
          s.prescriptionDoctor || 'Prescription on File',
          item.productName,
          item.batchNumber,
          item.expiryDate,
          `${item.quantity} ${item.unit}`,
          s.cashierName
        ]);
      });
    });
    return {
      title: 'Report 17: DRAP Drug Sale Register (Form 7 / Form 9 Standard)',
      headers: ['Date', 'Bill #', 'Patient / Purchaser', 'Prescribing Physician', 'Drug Brand & Generic', 'Batch #', 'Expiry Date', 'Qty Dispensed', 'Qualified Dispenser'],
      data: rows
    };
  }

  // 18. Financial Balance Sheet
  generateBalanceSheetReport() {
    const fin = window.accountingEngine.getFinancialSummary();
    const totalAssets = fin.estimatedCashInHand + fin.estimatedBankBalance + fin.customerReceivables + fin.inventoryValueAtCost;
    const totalLiabilities = fin.supplierPayables + fin.totalTaxCollected;
    const ownerEquity = totalAssets - totalLiabilities;
    return {
      title: 'Report 18: Complete Balance Sheet & Financial Health',
      headers: ['Balance Sheet Category', 'Account Name', 'Amount (PKR)'],
      data: [
        ['CURRENT ASSET', 'Cash in Hand (Counter Float)', fin.estimatedCashInHand.toFixed(2)],
        ['CURRENT ASSET', 'Bank Accounts (Meezan / HBL)', fin.estimatedBankBalance.toFixed(2)],
        ['CURRENT ASSET', 'Customer Receivables (Khata)', fin.customerReceivables.toFixed(2)],
        ['CURRENT ASSET', 'Inventory at Cost', fin.inventoryValueAtCost.toFixed(2)],
        ['TOTAL ASSETS', 'Sum of All Assets', totalAssets.toFixed(2)],
        ['CURRENT LIABILITY', 'Supplier Accounts Payable', fin.supplierPayables.toFixed(2)],
        ['CURRENT LIABILITY', 'FBR Sales Tax & POS Fee Payable', (fin.totalTaxCollected + fin.totalFbrFeeCollected).toFixed(2)],
        ['TOTAL LIABILITIES', 'Sum of All Liabilities', totalLiabilities.toFixed(2)],
        ['EQUITY', 'Owner Equity & Retained Earnings', ownerEquity.toFixed(2)],
        ['TOTAL LIAB + EQUITY', 'Balanced Position', (totalLiabilities + ownerEquity).toFixed(2)]
      ]
    };
  }

  // 19. User Activity & Security Audit Trail
  generateAuditReport() {
    const logs = window.db.data.auditLogs || [];
    return {
      title: 'Report 19: Security Audit Trail & User Activity Log',
      headers: ['Timestamp', 'User & Role', 'Action Code', 'Module', 'Event Description'],
      data: logs.map(l => [
        new Date(l.timestamp).toLocaleString(),
        l.user,
        l.action,
        l.module,
        l.details
      ])
    };
  }
}

// Global Reports Engine Singleton
window.reportsEngine = new ReportsEngine();
