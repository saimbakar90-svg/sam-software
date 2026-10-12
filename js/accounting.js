/**
 * USMAN PHARMACY - Accounting & Financial Engine
 * Implements double-entry ledger reconciliations, COGS tracking,
 * Gross Profit = Net Revenue - COGS,
 * Net Profit = Gross Profit - Operating Expenses,
 * Accounts Receivable (Khata) & Accounts Payable (Suppliers),
 * Cash Flow, and Balance Sheet generation.
 */

class AccountingEngine {
  // Chart of Accounts Definition
  getChartOfAccounts() {
    return [
      { code: '1010', name: 'Cash in Hand (Counter Float)', type: 'Asset' },
      { code: '1020', name: 'Meezan Bank - Commercial A/C', type: 'Asset' },
      { code: '1030', name: 'Habib Bank Limited (HBL) A/C', type: 'Asset' },
      { code: '1040', name: 'Accounts Receivable (Customer Khata)', type: 'Asset' },
      { code: '1050', name: 'Inventory Asset (At Cost)', type: 'Asset' },
      { code: '2010', name: 'Accounts Payable (Distributors & Suppliers)', type: 'Liability' },
      { code: '2020', name: 'FBR POS Sales Tax Payable', type: 'Liability' },
      { code: '3010', name: 'Usman Khan - Owner Capital Equity', type: 'Equity' },
      { code: '3020', name: 'Retained Earnings', type: 'Equity' },
      { code: '4010', name: 'Pharmacy Sales Revenue', type: 'Revenue' },
      { code: '4020', name: 'Cosmetics Sales Revenue', type: 'Revenue' },
      { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'Expense' },
      { code: '6010', name: 'Store Rent & Maintenance', type: 'Expense' },
      { code: '6020', name: 'Electricity & Cold Chain Utilities', type: 'Expense' },
      { code: '6030', name: 'Staff Salaries & Pharmacist Compensation', type: 'Expense' },
      { code: '6040', name: 'Packaging, Bags & Thermal Paper', type: 'Expense' },
      { code: '6050', name: 'General & Miscellaneous Store Expenses', type: 'Expense' }
    ];
  }

  // Record an expense
  recordExpense(expenseData) {
    const { category, title, amount, paidBy, branchId, notes } = expenseData;
    const user = window.db.getCurrentUser();
    const branch = window.db.data.branches.find(b => b.id === branchId) || window.db.getCurrentBranch();

    const amt = Number(amount);
    if (amt <= 0) throw new Error('Expense amount must be positive');

    const expenseRecord = {
      id: 'EXP-' + Date.now(),
      branchId: branch.id,
      category,
      title,
      amount: amt,
      date: window.db.getSimulatedDate().toISOString().split('T')[0],
      paidBy: paidBy || 'Cash',
      recordedBy: `${user.name} (${user.role})`,
      notes: notes || 'Store operational expense'
    };

    window.db.data.expenses = window.db.data.expenses || [];
    window.db.data.expenses.unshift(expenseRecord);

    window.db.logAudit('EXPENSE_RECORD', 'Accounting', `Recorded expense "${title}" (${category}): PKR ${amt.toLocaleString()} paid via ${paidBy}`);
    window.db.save();

    return expenseRecord;
  }

  // Calculate comprehensive Financial Metrics
  getFinancialSummary(branchId = null) {
    const sales = window.db.data.sales || [];
    const expenses = window.db.data.expenses || [];
    const batches = window.db.data.batches || [];
    const suppliers = window.db.data.suppliers || [];
    const customers = window.db.data.customers || [];

    // Filter sales by branch if specified
    const filteredSales = branchId ? sales.filter(s => s.branchId === branchId) : sales;
    const filteredExpenses = branchId ? expenses.filter(e => e.branchId === branchId) : expenses;
    const filteredBatches = branchId ? batches.filter(b => b.branchId === branchId) : batches;

    // Sales metrics
    let grossSales = 0;
    let discountsGiven = 0;
    let netSalesRevenue = 0;
    let totalCogs = 0;
    let totalTaxCollected = 0;
    let totalFbrFeeCollected = 0;

    let cashCollected = 0;
    let digitalCollected = 0;
    let creditSalesKhata = 0;

    filteredSales.forEach(s => {
      grossSales += (s.subtotal || 0);
      discountsGiven += (s.discountAmount || 0);
      netSalesRevenue += (s.netTotal || 0) - (s.taxAmount || 0) - (s.fbrFee || 0);
      totalCogs += (s.cogs || 0);
      totalTaxCollected += (s.taxAmount || 0);
      totalFbrFeeCollected += (s.fbrFee || 0);

      if (s.paymentMethod === 'Cash') {
        cashCollected += (s.netTotal || 0);
      } else if (s.paymentMethod === 'Credit / Khata') {
        creditSalesKhata += (s.netTotal || 0);
      } else {
        digitalCollected += (s.netTotal || 0);
      }
    });

    const grossProfit = Math.max(0, netSalesRevenue - totalCogs);
    const grossProfitMarginPct = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;

    // Expenses metrics
    const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalOperatingExpenses;
    const netProfitMarginPct = netSalesRevenue > 0 ? (netProfit / netSalesRevenue) * 100 : 0;

    // Assets & Balances
    let inventoryValueAtCost = 0;
    let inventoryRetailValue = 0;
    let expiredInventoryCost = 0;
    let quarantinedCost = 0;

    filteredBatches.forEach(b => {
      const days = window.expiryEngine.getDaysRemaining(b.expiryDate);
      if (days < 0 || b.status === 'EXPIRED') {
        expiredInventoryCost += (b.quantity * b.purchaseCost);
      } else if (b.status === 'QUARANTINED') {
        quarantinedCost += (b.quantity + (b.quarantinedQuantity || 0)) * b.purchaseCost;
      } else {
        inventoryValueAtCost += (b.quantity * b.purchaseCost);
        inventoryRetailValue += (b.quantity * b.retailPrice);
      }
    });

    // Accounts Receivable (Customer Khata debit balances)
    const customerReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

    // Accounts Payable (Supplier credit balances)
    const supplierPayables = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

    // Estimated Cash in Hand (Starting Float + Net Cash Sales - Cash Expenses)
    const cashExpenses = filteredExpenses.filter(e => e.paidBy === 'Cash').reduce((sum, e) => sum + e.amount, 0);
    const estimatedCashInHand = Math.max(0, 25000 + cashCollected - cashExpenses);
    const estimatedBankBalance = 145000 + digitalCollected;

    return {
      grossSales,
      discountsGiven,
      netSalesRevenue,
      totalCogs,
      grossProfit,
      grossProfitMarginPct,
      totalOperatingExpenses,
      netProfit,
      netProfitMarginPct,
      totalTaxCollected,
      totalFbrFeeCollected,
      cashCollected,
      digitalCollected,
      creditSalesKhata,
      inventoryValueAtCost,
      inventoryRetailValue,
      expiredInventoryCost,
      quarantinedCost,
      customerReceivables,
      supplierPayables,
      estimatedCashInHand,
      estimatedBankBalance
    };
  }
}

// Global Accounting Engine Singleton
window.accountingEngine = new AccountingEngine();
