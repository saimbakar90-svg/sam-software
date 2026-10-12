/**
 * USMAN PHARMACY - Core Data Engine & Local Storage Repository
 * Provides reactive persistence, seed catalog (medicines & cosmetics),
 * double-entry accounting state, batch-level tracking, and multi-branch support.
 */

const DB_KEY = 'usman_pharmacy_db_v1';

// Initial seed date anchor (Dynamic relative to today)
function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getPastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const DEFAULT_SETTINGS = {
  storeName: 'USMAN PHARMACY & COSMETICS',
  tagline: 'Medical Store, Clinical Pharmacy & Luxury Cosmetics ERP',
  logoUrl: 'assets/logo.jpg',
  address: 'Shop 12-14, Executive Commercial Center, Rawalpindi / Islamabad, Pakistan',
  phone: '+92 (051) 555-7890 / +92 300 5551234',
  ntn: '7392014-8',
  strn: '3277876123456',
  drapLicense: 'DRAP/RL-PB/2021/8841',
  currency: 'PKR',
  taxRate: 0, // In Pakistan, most life-saving prescription medicines are sales tax exempt
  cosmeticsTaxRate: 18, // 18% GST for cosmetics
  fbrPosEnabled: true,
  fbrPosFee: 1, // PKR 1 POS fee
  language: 'en', // 'en' or 'ur'
  activeBranch: 'BR-01',
  activeUser: 'USR-01',
  expiryThresholds: [180, 150, 90, 60, 30, 15, 7, 3, 1, 0],
  simulatedDaysAdvance: 0, // Time-machine simulation tool
  aiApiKey: '',
  aiVoiceEnabled: true,
  aiSpeechRate: 1.0,
  aiVoiceLang: 'en-US' // or 'ur-PK'
};

const SEED_BRANCHES = [
  { id: 'BR-01', name: 'Main Commercial Branch (Rawalpindi)', code: 'MAIN-RWP', phone: '051-5557890', isMain: true },
  { id: 'BR-02', name: 'Executive Care & Cosmetics (F-7 Islamabad)', code: 'EXEC-ISB', phone: '051-2821100', isMain: false }
];

const SEED_USERS = [
  { id: 'USR-01', name: 'Usman Khan', role: 'Owner', email: 'owner@usmanpharmacy.pk', pin: '1122', permissions: ['all'] },
  { id: 'USR-02', name: 'Dr. Zainab Bibi', role: 'Administrator', email: 'zainab.rph@usmanpharmacy.pk', pin: '2233', permissions: ['all'] },
  { id: 'USR-03', name: 'Hamza Ali', role: 'Manager', email: 'hamza.manager@usmanpharmacy.pk', pin: '3344', permissions: ['sales', 'inventory', 'purchase', 'reports', 'discounts_high'] },
  { id: 'USR-04', name: 'Bilal Ahmed', role: 'Cashier', email: 'bilal.pos@usmanpharmacy.pk', pin: '4455', permissions: ['sales', 'shift', 'discounts_low'] },
  { id: 'USR-05', name: 'Ayesha Tariq', role: 'Accountant', email: 'ayesha.accounts@usmanpharmacy.pk', pin: '5566', permissions: ['accounts', 'reports', 'purchases', 'audit'] },
  { id: 'USR-06', name: 'Rashid Mehmood', role: 'Inventory Manager', email: 'rashid.store@usmanpharmacy.pk', pin: '6677', permissions: ['inventory', 'batches', 'purchases', 'expiry_center'] }
];

const SEED_SUPPLIERS = [
  { id: 'SUP-01', name: 'Getz Pharma Distribution Rawalpindi', contactPerson: 'Khurram Shehzad', phone: '051-5551234', ntn: '0892341-2', balance: 45000, creditLimit: 250000, terms: '30 Days Net' },
  { id: 'SUP-02', name: 'GSK Pakistan Distribution Islamabad', contactPerson: 'Naveed Akhtar', phone: '051-2824567', ntn: '1478523-9', balance: 82500, creditLimit: 300000, terms: '15 Days Net' },
  { id: 'SUP-03', name: 'Abbott Laboratories Supply Chain', contactPerson: 'Tariq Munir', phone: '051-4439811', ntn: '2984102-4', balance: 32000, creditLimit: 200000, terms: '30 Days Net' },
  { id: 'SUP-04', name: 'Martin Dow Healthcare Distributors', contactPerson: 'Saad Ur Rehman', phone: '051-5471928', ntn: '3819203-1', balance: 18400, creditLimit: 150000, terms: '21 Days Net' },
  { id: 'SUP-05', name: 'Beauty Brands & Cosmetics Importers Lahore', contactPerson: 'Mrs. Saima Malik', phone: '042-3571829', ntn: '4729103-5', balance: 64000, creditLimit: 180000, terms: 'Cash / 7 Days' }
];

const SEED_CUSTOMERS = [
  { id: 'CUST-00', name: 'Walk-in Cash Customer', phone: 'N/A', balance: 0, creditLimit: 0, isWalkIn: true },
  { id: 'CUST-01', name: 'Dr. Aslam Malik (Family Khata)', phone: '0300-9876543', balance: 4250, creditLimit: 25000, address: 'House 44, St 12, F-8/2 Islamabad' },
  { id: 'CUST-02', name: 'Haji Bashir Ahmad', phone: '0321-5544332', balance: 1800, creditLimit: 15000, address: 'Commercial Market, Rawalpindi' },
  { id: 'CUST-03', name: 'Farhana Naz (VIP Cosmetics)', phone: '0333-7788990', balance: 0, creditLimit: 20000, address: 'Chaklala Scheme 3' },
  { id: 'CUST-04', name: 'Prof. Tariq Mehmood', phone: '0345-1234567', balance: 6200, creditLimit: 30000, address: 'Westridge, Rawalpindi' }
];

const SEED_PRODUCTS = [
  // PHARMACEUTICALS
  {
    id: 'PRD-001',
    barcode: '8964000101',
    name: 'Augmentin 625mg Tablets',
    genericName: 'Amoxicillin + Clavulanic Acid',
    brand: 'Augmentin',
    category: 'Pharmaceutical',
    subCategory: 'Antibiotic (Rx)',
    dosageForm: 'Tablet',
    strength: '625mg',
    manufacturer: 'GlaxoSmithKline Pakistan',
    supplierId: 'SUP-02',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 2,
    baseUnitsPerSubUnit: 7, // 14 tabs per box
    minStockLevel: 20,
    requiresPrescription: true,
    isScheduleG: false,
    drapRegNo: '003291',
    taxRate: 0,
    storageTemp: 'Below 25°C, Dry Place'
  },
  {
    id: 'PRD-002',
    barcode: '8964000102',
    name: 'Panadol 500mg Tablets',
    genericName: 'Paracetamol',
    brand: 'Panadol',
    category: 'Pharmaceutical',
    subCategory: 'Analgesic & Antipyretic (OTC)',
    dosageForm: 'Tablet',
    strength: '500mg',
    manufacturer: 'GlaxoSmithKline Pakistan',
    supplierId: 'SUP-02',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 20,
    baseUnitsPerSubUnit: 10, // 200 tabs per box
    minStockLevel: 50,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '001142',
    taxRate: 0,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-003',
    barcode: '8964000103',
    name: 'Risek 20mg Capsules',
    genericName: 'Omeprazole',
    brand: 'Risek',
    category: 'Pharmaceutical',
    subCategory: 'Proton Pump Inhibitor (Anti-Ulcer)',
    dosageForm: 'Capsule',
    strength: '20mg',
    manufacturer: 'Getz Pharma (Pvt) Ltd',
    supplierId: 'SUP-01',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 2,
    baseUnitsPerSubUnit: 7, // 14 caps per box
    minStockLevel: 30,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '028441',
    taxRate: 0,
    storageTemp: 'Protect from moisture'
  },
  {
    id: 'PRD-004',
    barcode: '8964000104',
    name: 'Brufen 400mg Tablets',
    genericName: 'Ibuprofen',
    brand: 'Brufen',
    category: 'Pharmaceutical',
    subCategory: 'NSAID / Pain Relief',
    dosageForm: 'Tablet',
    strength: '400mg',
    manufacturer: 'Abbott Laboratories Pakistan',
    supplierId: 'SUP-03',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 25,
    baseUnitsPerSubUnit: 10, // 250 tabs per box
    minStockLevel: 40,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '002874',
    taxRate: 0,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-005',
    barcode: '8964000105',
    name: 'Arinac Forte Tablets',
    genericName: 'Ibuprofen 400mg + Pseudoephedrine 60mg',
    brand: 'Arinac',
    category: 'Pharmaceutical',
    subCategory: 'Cold & Sinus Decongestant',
    dosageForm: 'Tablet',
    strength: '400mg + 60mg',
    manufacturer: 'Abbott Laboratories Pakistan',
    supplierId: 'SUP-03',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 10,
    baseUnitsPerSubUnit: 10, // 100 tabs per box
    minStockLevel: 25,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '018942',
    taxRate: 0,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-006',
    barcode: '8964000106',
    name: 'Softin 10mg Tablets',
    genericName: 'Loratadine',
    brand: 'Softin',
    category: 'Pharmaceutical',
    subCategory: 'Antihistamine / Anti-Allergy',
    dosageForm: 'Tablet',
    strength: '10mg',
    manufacturer: 'Martin Dow Healthcare',
    supplierId: 'SUP-04',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 3,
    baseUnitsPerSubUnit: 10, // 30 tabs per box
    minStockLevel: 20,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '031024',
    taxRate: 0,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-007',
    barcode: '8964000107',
    name: 'Glucophage 500mg Tablets',
    genericName: 'Metformin Hydrochloride',
    brand: 'Glucophage',
    category: 'Pharmaceutical',
    subCategory: 'Oral Hypoglycemic (Anti-Diabetic)',
    dosageForm: 'Tablet',
    strength: '500mg',
    manufacturer: 'Martin Dow Healthcare',
    supplierId: 'SUP-04',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 5,
    baseUnitsPerSubUnit: 10, // 50 tabs per box
    minStockLevel: 30,
    requiresPrescription: true,
    isScheduleG: false,
    drapRegNo: '009842',
    taxRate: 0,
    storageTemp: 'Below 30°C'
  },
  {
    id: 'PRD-008',
    barcode: '8964000108',
    name: 'Lipiget 20mg Tablets',
    genericName: 'Atorvastatin Calcium',
    brand: 'Lipiget',
    category: 'Pharmaceutical',
    subCategory: 'Cholesterol & Lipid Regulating',
    dosageForm: 'Tablet',
    strength: '20mg',
    manufacturer: 'Getz Pharma (Pvt) Ltd',
    supplierId: 'SUP-01',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 3,
    baseUnitsPerSubUnit: 10, // 30 tabs per box
    minStockLevel: 20,
    requiresPrescription: true,
    isScheduleG: false,
    drapRegNo: '024519',
    taxRate: 0,
    storageTemp: 'Protect from light'
  },
  {
    id: 'PRD-009',
    barcode: '8964000109',
    name: 'Klaricid 250mg Suspension 60ml',
    genericName: 'Clarithromycin',
    brand: 'Klaricid',
    category: 'Pharmaceutical',
    subCategory: 'Macrolide Antibiotic (Pediatric)',
    dosageForm: 'Suspension',
    strength: '250mg / 5ml',
    manufacturer: 'Abbott Laboratories Pakistan',
    supplierId: 'SUP-03',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 15,
    requiresPrescription: true,
    isScheduleG: false,
    drapRegNo: '015482',
    taxRate: 0,
    storageTemp: 'After reconstitution use within 14 days'
  },
  {
    id: 'PRD-010',
    barcode: '8964000110',
    name: 'Hydryllin Cough Syrup 120ml',
    genericName: 'Aminophylline + Diphenhydramine + Ammonium Chloride',
    brand: 'Hydryllin',
    category: 'Pharmaceutical',
    subCategory: 'Cough & Bronchial Relief',
    dosageForm: 'Syrup',
    strength: 'Standard Formula',
    manufacturer: 'The Searle Company Limited',
    supplierId: 'SUP-01',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 25,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '004128',
    taxRate: 0,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-011',
    barcode: '8964000111',
    name: 'Polyfax Skin Ointment 20g',
    genericName: 'Polymyxin B Sulfate + Bacitracin Zinc',
    brand: 'Polyfax',
    category: 'Pharmaceutical',
    subCategory: 'Topical Antibacterial Ointment',
    dosageForm: 'Ointment',
    strength: 'Topical',
    manufacturer: 'GlaxoSmithKline Pakistan',
    supplierId: 'SUP-02',
    unitType: 'Tube',
    subUnitType: 'Tube',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 30,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: '001099',
    taxRate: 0,
    storageTemp: 'Below 25°C'
  },
  {
    id: 'PRD-012',
    barcode: '8964000112',
    name: 'Rivotril 2mg Tablets (Controlled)',
    genericName: 'Clonazepam',
    brand: 'Rivotril',
    category: 'Pharmaceutical',
    subCategory: 'Schedule G Controlled Drug / Sedative',
    dosageForm: 'Tablet',
    strength: '2mg',
    manufacturer: 'Roche Pakistan',
    supplierId: 'SUP-01',
    unitType: 'Box',
    subUnitType: 'Strip',
    subUnitsPerUnit: 3,
    baseUnitsPerSubUnit: 10,
    minStockLevel: 10,
    requiresPrescription: true,
    isScheduleG: true,
    drapRegNo: '007812',
    taxRate: 0,
    storageTemp: 'Locked Controlled Cabinet'
  },

  // COSMETICS & BEAUTY
  {
    id: 'PRD-013',
    barcode: '8964000201',
    name: 'CeraVe Hydrating Facial Cleanser 236ml',
    genericName: 'Ceramides + Hyaluronic Acid Formula',
    brand: 'CeraVe',
    category: 'Cosmetics',
    subCategory: 'Skincare / Face Wash',
    dosageForm: 'Bottle',
    strength: '236ml (8 fl oz)',
    manufacturer: 'L\'Oréal Cosmetique Active',
    supplierId: 'SUP-05',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 12,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-IMP-2022',
    taxRate: 18,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-014',
    barcode: '8964000202',
    name: 'The Ordinary Niacinamide 10% + Zinc 1% 30ml',
    genericName: 'Niacinamide 10% + Zinc 1%',
    brand: 'The Ordinary',
    category: 'Cosmetics',
    subCategory: 'Skincare / Serum',
    dosageForm: 'Dropper Bottle',
    strength: '30ml',
    manufacturer: 'Deciem Canada',
    supplierId: 'SUP-05',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 15,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-IMP-2023',
    taxRate: 18,
    storageTemp: 'Cool, Dark Place'
  },
  {
    id: 'PRD-015',
    barcode: '8964000203',
    name: 'Bioderma Photoderm Max SPF 50+ Sunscreen 40ml',
    genericName: 'Cellular Bioprotection Sunscreen',
    brand: 'Bioderma',
    category: 'Cosmetics',
    subCategory: 'Skincare / Sun Protection',
    dosageForm: 'Tube',
    strength: '40ml Cream',
    manufacturer: 'NAOS Bioderma France',
    supplierId: 'SUP-05',
    unitType: 'Tube',
    subUnitType: 'Tube',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 10,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-IMP-2021',
    taxRate: 18,
    storageTemp: 'Below 30°C'
  },
  {
    id: 'PRD-016',
    barcode: '8964000204',
    name: 'L\'Oreal Infallible 24H Fresh Wear (Shade 120)',
    genericName: 'Longwear Liquid Foundation',
    brand: 'L\'Oréal Paris',
    category: 'Cosmetics',
    subCategory: 'Makeup / Complexion',
    dosageForm: 'Pump Bottle',
    strength: '30ml - Shade 120 Vanilla',
    manufacturer: 'L\'Oréal Paris International',
    supplierId: 'SUP-05',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 8,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-IMP-2024',
    taxRate: 18,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-017',
    barcode: '8964000205',
    name: 'Maybelline Lash Sensational Sky High Mascara',
    genericName: 'Volumizing & Lengthening Formula',
    brand: 'Maybelline New York',
    category: 'Cosmetics',
    subCategory: 'Makeup / Eye Care',
    dosageForm: 'Tube & Wand',
    strength: '7.2ml Very Black',
    manufacturer: 'Maybelline USA / L\'Oréal',
    supplierId: 'SUP-05',
    unitType: 'Piece',
    subUnitType: 'Piece',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 10,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-IMP-2022',
    taxRate: 18,
    storageTemp: 'Room Temperature'
  },
  {
    id: 'PRD-018',
    barcode: '8964000206',
    name: 'J. Junaid Jamshed Zarar EDP Perfume 100ml',
    genericName: 'Luxury Citrus & Amber Eau De Parfum',
    brand: 'J. Fragrances',
    category: 'Cosmetics',
    subCategory: 'Fragrance / Perfume',
    dosageForm: 'Glass Spray Bottle',
    strength: '100ml Spray',
    manufacturer: 'Junaid Jamshed Pvt Ltd Pakistan',
    supplierId: 'SUP-05',
    unitType: 'Bottle',
    subUnitType: 'Bottle',
    subUnitsPerUnit: 1,
    baseUnitsPerSubUnit: 1,
    minStockLevel: 6,
    requiresPrescription: false,
    isScheduleG: false,
    drapRegNo: 'COSM-PK-2020',
    taxRate: 18,
    storageTemp: 'Away from heat / flame'
  }
];

// Rich batches spanning each configured threshold
// (Expired, 3-7d critical, 15d high, 30d warning, 60d, 90d, 150d, 180d, and fresh 2027+)
const SEED_BATCHES = [
  // 1. EXPIRED BATCH (strictly blocked in POS!)
  {
    id: 'BAT-001',
    productId: 'PRD-002', // Panadol 500mg
    batchNumber: 'PND-24-X99',
    expiryDate: getPastDate(12), // 12 days ago
    manufacturingDate: getPastDate(740),
    branchId: 'BR-01',
    shelfLocation: 'Rack A-01 (Top Shelf)',
    purchaseCost: 480.00, // per box
    retailPrice: 580.00,  // per box
    quantity: 16, // boxes
    quarantinedQuantity: 0,
    status: 'EXPIRED', // Flagged
    supplierInvoiceRef: 'GSK-INV-2023-882',
    receivedDate: getPastDate(720)
  },
  // 2. CRITICAL BATCH (< 7 Days)
  {
    id: 'BAT-002',
    productId: 'PRD-004', // Brufen 400mg
    batchNumber: 'BRF-24-C04',
    expiryDate: getFutureDate(4), // 4 days remaining!
    manufacturingDate: getPastDate(720),
    branchId: 'BR-01',
    shelfLocation: 'Rack B-03',
    purchaseCost: 920.00,
    retailPrice: 1080.00,
    quantity: 14,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'ABT-INV-2024-104',
    receivedDate: getPastDate(360)
  },
  // 3. HIGH BATCH (< 15 Days)
  {
    id: 'BAT-003',
    productId: 'PRD-006', // Softin 10mg
    batchNumber: 'SFT-24-H11',
    expiryDate: getFutureDate(11), // 11 days remaining
    manufacturingDate: getPastDate(700),
    branchId: 'BR-01',
    shelfLocation: 'Rack C-02',
    purchaseCost: 340.00,
    retailPrice: 420.00,
    quantity: 22,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'MD-INV-2024-512',
    receivedDate: getPastDate(300)
  },
  // 4. WARNING BATCH (< 30 Days)
  {
    id: 'BAT-004',
    productId: 'PRD-003', // Risek 20mg
    batchNumber: 'RSK-24-W22',
    expiryDate: getFutureDate(22), // 22 days remaining
    manufacturingDate: getPastDate(650),
    branchId: 'BR-01',
    shelfLocation: 'Rack A-04',
    purchaseCost: 310.00,
    retailPrice: 385.00,
    quantity: 35,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GTZ-INV-2024-771',
    receivedDate: getPastDate(250)
  },
  // 5. UPCOMING BATCH (< 60 Days)
  {
    id: 'BAT-005',
    productId: 'PRD-001', // Augmentin 625mg
    batchNumber: 'AUG-24-U45',
    expiryDate: getFutureDate(45), // 45 days remaining
    manufacturingDate: getPastDate(500),
    branchId: 'BR-01',
    shelfLocation: 'Rack A-02 (Secure Fridge 20°C)',
    purchaseCost: 460.00,
    retailPrice: 560.00,
    quantity: 28,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GSK-INV-2024-904',
    receivedDate: getPastDate(180)
  },
  // 6. UPCOMING BATCH (< 90 Days)
  {
    id: 'BAT-006',
    productId: 'PRD-007', // Glucophage 500mg
    batchNumber: 'GLC-24-U75',
    expiryDate: getFutureDate(75), // 75 days remaining
    manufacturingDate: getPastDate(400),
    branchId: 'BR-01',
    shelfLocation: 'Rack B-01',
    purchaseCost: 220.00,
    retailPrice: 275.00,
    quantity: 45,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'MD-INV-2024-633',
    receivedDate: getPastDate(120)
  },
  // 7. UPCOMING BATCH (< 150 Days)
  {
    id: 'BAT-007',
    productId: 'PRD-008', // Lipiget 20mg
    batchNumber: 'LPG-25-U130',
    expiryDate: getFutureDate(130), // 130 days remaining
    manufacturingDate: getPastDate(300),
    branchId: 'BR-01',
    shelfLocation: 'Rack B-05',
    purchaseCost: 490.00,
    retailPrice: 590.00,
    quantity: 30,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GTZ-INV-2024-819',
    receivedDate: getPastDate(90)
  },
  // 8. UPCOMING COSMETICS (< 180 Days)
  {
    id: 'BAT-008',
    productId: 'PRD-013', // CeraVe Cleanser
    batchNumber: 'CRV-25-U165',
    expiryDate: getFutureDate(165), // 165 days remaining
    manufacturingDate: getPastDate(200),
    branchId: 'BR-01',
    shelfLocation: 'Cosmetics Showcase Glass 1',
    purchaseCost: 2450.00,
    retailPrice: 3200.00,
    quantity: 18,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2024-118',
    receivedDate: getPastDate(60)
  },
  // 9. HEALTHY / FRESH BATCHES (2027-2028 FEFO backups)
  {
    id: 'BAT-009',
    productId: 'PRD-001', // Augmentin 625mg Fresh
    batchNumber: 'AUG-26-FRESH',
    expiryDate: getFutureDate(520),
    manufacturingDate: getPastDate(60),
    branchId: 'BR-01',
    shelfLocation: 'Rack A-02',
    purchaseCost: 470.00,
    retailPrice: 575.00,
    quantity: 60,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GSK-INV-2025-012',
    receivedDate: getPastDate(30)
  },
  {
    id: 'BAT-010',
    productId: 'PRD-002', // Panadol 500mg Fresh
    batchNumber: 'PND-26-FRESH',
    expiryDate: getFutureDate(600),
    manufacturingDate: getPastDate(45),
    branchId: 'BR-01',
    shelfLocation: 'Rack A-01',
    purchaseCost: 490.00,
    retailPrice: 595.00,
    quantity: 120,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GSK-INV-2025-012',
    receivedDate: getPastDate(30)
  },
  {
    id: 'BAT-011',
    productId: 'PRD-005', // Arinac Forte
    batchNumber: 'ARN-26-901',
    expiryDate: getFutureDate(410),
    manufacturingDate: getPastDate(90),
    branchId: 'BR-01',
    shelfLocation: 'Rack B-02',
    purchaseCost: 650.00,
    retailPrice: 790.00,
    quantity: 50,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'ABT-INV-2025-004',
    receivedDate: getPastDate(40)
  },
  {
    id: 'BAT-012',
    productId: 'PRD-009', // Klaricid Susp
    batchNumber: 'KLR-26-112',
    expiryDate: getFutureDate(380),
    manufacturingDate: getPastDate(80),
    branchId: 'BR-01',
    shelfLocation: 'Rack D-01',
    purchaseCost: 680.00,
    retailPrice: 820.00,
    quantity: 24,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'ABT-INV-2025-004',
    receivedDate: getPastDate(40)
  },
  {
    id: 'BAT-013',
    productId: 'PRD-010', // Hydryllin Syrup
    batchNumber: 'HYD-26-778',
    expiryDate: getFutureDate(490),
    manufacturingDate: getPastDate(60),
    branchId: 'BR-01',
    shelfLocation: 'Rack D-03',
    purchaseCost: 145.00,
    retailPrice: 175.00,
    quantity: 75,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GTZ-INV-2025-091',
    receivedDate: getPastDate(30)
  },
  {
    id: 'BAT-014',
    productId: 'PRD-011', // Polyfax Skin
    batchNumber: 'PFX-26-304',
    expiryDate: getFutureDate(430),
    manufacturingDate: getPastDate(100),
    branchId: 'BR-01',
    shelfLocation: 'Rack C-05',
    purchaseCost: 95.00,
    retailPrice: 120.00,
    quantity: 80,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GSK-INV-2025-012',
    receivedDate: getPastDate(30)
  },
  {
    id: 'BAT-015',
    productId: 'PRD-012', // Rivotril 2mg Controlled
    batchNumber: 'RVT-26-CTRL',
    expiryDate: getFutureDate(340),
    manufacturingDate: getPastDate(70),
    branchId: 'BR-01',
    shelfLocation: 'LOCKED SAFE #1',
    purchaseCost: 380.00,
    retailPrice: 470.00,
    quantity: 18,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GTZ-INV-2025-091',
    receivedDate: getPastDate(30)
  },
  {
    id: 'BAT-016',
    productId: 'PRD-014', // The Ordinary Niacinamide
    batchNumber: 'ORD-26-881',
    expiryDate: getFutureDate(460),
    manufacturingDate: getPastDate(80),
    branchId: 'BR-01',
    shelfLocation: 'Cosmetics Showcase Glass 2',
    purchaseCost: 2600.00,
    retailPrice: 3450.00,
    quantity: 25,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2025-021',
    receivedDate: getPastDate(20)
  },
  {
    id: 'BAT-017',
    productId: 'PRD-015', // Bioderma Sunscreen
    batchNumber: 'BIO-26-552',
    expiryDate: getFutureDate(420),
    manufacturingDate: getPastDate(90),
    branchId: 'BR-01',
    shelfLocation: 'Cosmetics Showcase Glass 2',
    purchaseCost: 3100.00,
    retailPrice: 3950.00,
    quantity: 15,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2025-021',
    receivedDate: getPastDate(20)
  },
  {
    id: 'BAT-018',
    productId: 'PRD-016', // L'Oreal Infallible
    batchNumber: 'LOR-26-120',
    expiryDate: getFutureDate(510),
    manufacturingDate: getPastDate(60),
    branchId: 'BR-01',
    shelfLocation: 'Cosmetics Showcase Glass 3',
    purchaseCost: 3400.00,
    retailPrice: 4400.00,
    quantity: 12,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2025-021',
    receivedDate: getPastDate(20)
  },
  {
    id: 'BAT-019',
    productId: 'PRD-017', // Maybelline Sky High
    batchNumber: 'MAY-26-702',
    expiryDate: getFutureDate(480),
    manufacturingDate: getPastDate(70),
    branchId: 'BR-01',
    shelfLocation: 'Cosmetics Stand 1',
    purchaseCost: 2300.00,
    retailPrice: 2950.00,
    quantity: 20,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2025-021',
    receivedDate: getPastDate(20)
  },
  {
    id: 'BAT-020',
    productId: 'PRD-018', // J. Zarar Perfume
    batchNumber: 'JJZ-26-004',
    expiryDate: getFutureDate(700),
    manufacturingDate: getPastDate(50),
    branchId: 'BR-01',
    shelfLocation: 'Luxury Fragrance Cabinet',
    purchaseCost: 4200.00,
    retailPrice: 5600.00,
    quantity: 16,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'BB-INV-2025-021',
    receivedDate: getPastDate(20)
  },
  // Branch 2 batches for inter-branch transfer demonstrations
  {
    id: 'BAT-021',
    productId: 'PRD-002', // Panadol at Branch 2
    batchNumber: 'PND-26-BR2',
    expiryDate: getFutureDate(590),
    manufacturingDate: getPastDate(45),
    branchId: 'BR-02',
    shelfLocation: 'F-7 Rack 1',
    purchaseCost: 490.00,
    retailPrice: 595.00,
    quantity: 40,
    quarantinedQuantity: 0,
    status: 'ACTIVE',
    supplierInvoiceRef: 'GSK-INV-2025-012',
    receivedDate: getPastDate(30)
  }
];

// Initial Sales History
const SEED_SALES = [
  {
    id: 'INV-2026-001',
    branchId: 'BR-01',
    customerId: 'CUST-00',
    customerName: 'Walk-in Cash Customer',
    cashierId: 'USR-04',
    cashierName: 'Bilal Ahmed',
    dateTime: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      {
        productId: 'PRD-001',
        productName: 'Augmentin 625mg Tablets',
        batchId: 'BAT-009',
        batchNumber: 'AUG-26-FRESH',
        expiryDate: getFutureDate(520),
        unit: 'Box',
        quantity: 2,
        costRate: 470.00,
        sellRate: 575.00,
        subtotal: 1150.00,
        cogs: 940.00
      },
      {
        productId: 'PRD-002',
        productName: 'Panadol 500mg Tablets',
        batchId: 'BAT-010',
        batchNumber: 'PND-26-FRESH',
        expiryDate: getFutureDate(600),
        unit: 'Strip', // sold by strip! (10 tabs)
        quantity: 3,
        costRate: 24.50, // 490 / 20 strips
        sellRate: 29.75, // 595 / 20 strips
        subtotal: 89.25,
        cogs: 73.50
      }
    ],
    subtotal: 1239.25,
    discountAmount: 39.25,
    taxAmount: 0,
    fbrFee: 1.00,
    netTotal: 1201.00,
    paymentMethod: 'Cash',
    paidAmount: 1500.00,
    changeReturned: 299.00,
    status: 'COMPLETED',
    notes: 'Prescription verified'
  },
  {
    id: 'INV-2026-002',
    branchId: 'BR-01',
    customerId: 'CUST-01',
    customerName: 'Dr. Aslam Malik (Family Khata)',
    cashierId: 'USR-04',
    cashierName: 'Bilal Ahmed',
    dateTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    items: [
      {
        productId: 'PRD-014',
        productName: 'The Ordinary Niacinamide 10% + Zinc 1% 30ml',
        batchId: 'BAT-016',
        batchNumber: 'ORD-26-881',
        expiryDate: getFutureDate(460),
        unit: 'Bottle',
        quantity: 1,
        costRate: 2600.00,
        sellRate: 3450.00,
        subtotal: 3450.00,
        cogs: 2600.00
      },
      {
        productId: 'PRD-003',
        productName: 'Risek 20mg Capsules',
        batchId: 'BAT-004',
        batchNumber: 'RSK-24-W22',
        expiryDate: getFutureDate(22),
        unit: 'Box',
        quantity: 2,
        costRate: 310.00,
        sellRate: 385.00,
        subtotal: 770.00,
        cogs: 620.00
      }
    ],
    subtotal: 4220.00,
    discountAmount: 100.00,
    taxAmount: 621.00, // 18% on cosmetics portion
    fbrFee: 1.00,
    netTotal: 4742.00,
    paymentMethod: 'Credit / Khata',
    paidAmount: 0.00,
    changeReturned: 0.00,
    status: 'COMPLETED',
    notes: 'Khata debit recorded'
  }
];

// Initial Operating Expenses
const SEED_EXPENSES = [
  { id: 'EXP-01', branchId: 'BR-01', category: 'Electricity / Utility', title: 'IESCO Commercial Power Bill', amount: 34500, date: getPastDate(4), paidBy: 'Bank Transfer (Meezan Bank)', notes: 'Shop air conditioning & cold chain fridge power' },
  { id: 'EXP-02', branchId: 'BR-01', category: 'Packaging & Supplies', title: 'Custom Printed Medicine Bags & Thermal Rolls', amount: 8200, date: getPastDate(2), paidBy: 'Cash', notes: '100 thermal rolls + 2000 pharma envelopes' },
  { id: 'EXP-03', branchId: 'BR-01', category: 'Tea & Refreshment', title: 'Staff Daily Refreshment', amount: 2400, date: getPastDate(1), paidBy: 'Cash', notes: 'Weekly pharmacy staff tea' }
];

// Expiry Alert Action Log / Audit History
const SEED_EXPIRY_ACTIONS = [
  {
    id: 'ACT-001',
    batchId: 'BAT-001',
    productName: 'Panadol 500mg Tablets',
    batchNumber: 'PND-24-X99',
    actionType: 'EXPIRED_DETECTED',
    actionSummary: 'System flagged batch as expired. Auto-blocked in POS checkout.',
    staffName: 'System Security Engine',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'UNRESOLVED',
    notes: 'Awaiting quarantine or supplier return authorization.'
  }
];

// Security Audit Log
const SEED_AUDIT_LOGS = [
  {
    id: 'LOG-001',
    user: 'Usman Khan (Owner)',
    action: 'SYSTEM_INITIALIZATION',
    module: 'Core System',
    details: 'USMAN PHARMACY ERP v1.0 initialized with DRAP and FBR compliance profiles.',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
  },
  {
    id: 'LOG-002',
    user: 'Bilal Ahmed (Cashier)',
    action: 'POS_SHIFT_START',
    module: 'Smart POS',
    details: 'Morning billing shift opened with PKR 5,000 cash drawer float.',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

// Cashier Shifts
const SEED_SHIFTS = [
  {
    id: 'SHF-01',
    branchId: 'BR-01',
    cashierId: 'USR-04',
    cashierName: 'Bilal Ahmed',
    startTime: new Date(Date.now() - 3600000 * 6).toISOString(),
    endTime: null,
    openingCash: 5000.00,
    expectedCash: 6201.00,
    actualClosingCash: null,
    status: 'OPEN'
  }
];

class DBService {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Self-heal suppliers if missing
        if (!parsed.suppliers || !Array.isArray(parsed.suppliers) || parsed.suppliers.length === 0) {
          parsed.suppliers = [...SEED_SUPPLIERS];
        }
        // Self-heal purchases if missing or corrupted
        if (!parsed.purchases || !Array.isArray(parsed.purchases) || parsed.purchases.length === 0) {
          parsed.purchases = this.getDefaultPurchases();
        } else {
          // Normalize existing purchases so no undefined fields crash views
          parsed.purchases.forEach(p => {
            p.invoiceDate = p.invoiceDate || p.date || new Date().toISOString().split('T')[0];
            p.totalAmount = Number(p.totalAmount) || 0;
            p.paidAmount = Number(p.paidAmount) || 0;
            p.balanceDue = Number(p.balanceDue !== undefined ? p.balanceDue : (p.totalAmount - p.paidAmount)) || 0;
            p.status = p.status || (p.balanceDue <= 0 ? 'PAID' : 'UNPAID');
            p.supplierName = p.supplierName || 'Distributor Supply';
          });
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read localStorage, initializing default state', e);
    }
    return this.getInitialState();
  }

  getDefaultPurchases() {
    return [
      {
        id: 'PUR-2026-001',
        supplierId: 'SUP-01',
        supplierName: 'Getz Pharma Distribution Rawalpindi',
        invoiceNo: 'GTZ-INV-2026-091',
        invoiceDate: getPastDate(12),
        branchId: 'BR-01',
        branchName: 'Main Commercial Branch (Rawalpindi)',
        receivedBy: 'Usman Khan (Owner)',
        items: [
          { productId: 'PRD-003', batchNumber: 'RSK-24-W22', expiryDate: getFutureDate(22), paidQuantity: 35, bonusQuantity: 3, totalQuantity: 38, billedUnitCost: 310, effectiveUnitCost: 285.52, retailPrice: 380, itemTotalCost: 10850 },
          { productId: 'PRD-010', batchNumber: 'HYD-26-778', expiryDate: getFutureDate(490), paidQuantity: 75, bonusQuantity: 5, totalQuantity: 80, billedUnitCost: 145, effectiveUnitCost: 135.93, retailPrice: 180, itemTotalCost: 10875 }
        ],
        totalAmount: 21725,
        paidAmount: 21725,
        balanceDue: 0,
        status: 'PAID',
        notes: '10+1 Scheme applied. Verified against physical DC # 9912.'
      },
      {
        id: 'PUR-2026-002',
        supplierId: 'SUP-02',
        supplierName: 'GSK Pakistan Distribution Islamabad',
        invoiceNo: 'GSK-2026-8812',
        invoiceDate: getPastDate(7),
        branchId: 'BR-01',
        branchName: 'Main Commercial Branch (Rawalpindi)',
        receivedBy: 'Rashid Mehmood (Inventory Manager)',
        items: [
          { productId: 'PRD-001', batchNumber: 'AUG-27-01', expiryDate: getFutureDate(420), paidQuantity: 50, bonusQuantity: 5, totalQuantity: 55, billedUnitCost: 450, effectiveUnitCost: 409.09, retailPrice: 550, itemTotalCost: 22500 },
          { productId: 'PRD-002', batchNumber: 'PAN-28-09', expiryDate: getFutureDate(720), paidQuantity: 100, bonusQuantity: 10, totalQuantity: 110, billedUnitCost: 280, effectiveUnitCost: 254.55, retailPrice: 340, itemTotalCost: 28000 }
        ],
        totalAmount: 50500,
        paidAmount: 30000,
        balanceDue: 20500,
        status: 'PARTIAL',
        notes: 'Delivery received in cold-chain safe carrier.'
      },
      {
        id: 'PUR-2026-003',
        supplierId: 'SUP-03',
        supplierName: 'Abbott Laboratories Supply Chain',
        invoiceNo: 'ABT-PKG-5521',
        invoiceDate: getPastDate(3),
        branchId: 'BR-02',
        branchName: 'Executive Care & Cosmetics (F-7 Islamabad)',
        receivedBy: 'Dr. Zainab Bibi (Administrator)',
        items: [
          { productId: 'PRD-004', batchNumber: 'BRU-27-K11', expiryDate: getFutureDate(510), paidQuantity: 40, bonusQuantity: 4, totalQuantity: 44, billedUnitCost: 180, effectiveUnitCost: 163.64, retailPrice: 220, itemTotalCost: 7200 },
          { productId: 'PRD-005', batchNumber: 'SRB-26-88', expiryDate: getFutureDate(380), paidQuantity: 30, bonusQuantity: 0, totalQuantity: 30, billedUnitCost: 320, effectiveUnitCost: 320.00, retailPrice: 395, itemTotalCost: 9600 }
        ],
        totalAmount: 16800,
        paidAmount: 16800,
        balanceDue: 0,
        status: 'PAID',
        notes: 'Direct distributor delivery. Inspected and approved.'
      },
      {
        id: 'PUR-2026-004',
        supplierId: 'SUP-05',
        supplierName: 'Beauty Brands & Cosmetics Importers Lahore',
        invoiceNo: 'BB-LHR-9041',
        invoiceDate: getPastDate(1),
        branchId: 'BR-02',
        branchName: 'Executive Care & Cosmetics (F-7 Islamabad)',
        receivedBy: 'Hamza Ali (Manager)',
        items: [
          { productId: 'PRD-008', batchNumber: 'CRV-26-44', expiryDate: getFutureDate(600), paidQuantity: 25, bonusQuantity: 2, totalQuantity: 27, billedUnitCost: 2800, effectiveUnitCost: 2592.59, retailPrice: 3850, itemTotalCost: 70000 }
        ],
        totalAmount: 70000,
        paidAmount: 35000,
        balanceDue: 35000,
        status: 'PARTIAL',
        notes: 'High-end cosmetics batch verified with customs import clearance.'
      }
    ];
  }

  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  getInitialState() {
    return {
      settings: { ...DEFAULT_SETTINGS },
      branches: [...SEED_BRANCHES],
      users: [...SEED_USERS],
      suppliers: [...SEED_SUPPLIERS],
      customers: [...SEED_CUSTOMERS],
      products: [...SEED_PRODUCTS],
      batches: [...SEED_BATCHES],
      sales: [...SEED_SALES],
      expenses: [...SEED_EXPENSES],
      expiryActions: [...SEED_EXPIRY_ACTIONS],
      auditLogs: [...SEED_AUDIT_LOGS],
      shifts: [...SEED_SHIFTS],
      purchases: this.getDefaultPurchases(),
      returns: [],
      quarantineLog: []
    };
  }

  resetToDefault() {
    this.data = this.getInitialState();
    this.save();
    return this.data;
  }

  exportJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.products && parsed.batches) {
        this.data = parsed;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid JSON file', e);
      return false;
    }
  }

  logAudit(action, module, details) {
    const user = this.getCurrentUser();
    const entry = {
      id: 'LOG-' + Date.now(),
      user: `${user.name} (${user.role})`,
      action,
      module,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  getCurrentUser() {
    const user = this.data.users.find(u => u.id === this.data.settings.activeUser);
    return user || this.data.users[0];
  }

  getCurrentBranch() {
    const branch = this.data.branches.find(b => b.id === this.data.settings.activeBranch);
    return branch || this.data.branches[0];
  }

  // Time simulation engine
  getSimulatedDate() {
    const d = new Date();
    d.setDate(d.getDate() + (this.data.settings.simulatedDaysAdvance || 0));
    return d;
  }

  advanceSimulationDays(days) {
    this.data.settings.simulatedDaysAdvance = (this.data.settings.simulatedDaysAdvance || 0) + days;
    this.logAudit('SIMULATE_DATE_ADVANCE', 'Time Machine', `System clock advanced by ${days} days. Total simulation offset: ${this.data.settings.simulatedDaysAdvance} days.`);
    this.save();
  }

  resetSimulationDays() {
    this.data.settings.simulatedDaysAdvance = 0;
    this.logAudit('SIMULATE_DATE_RESET', 'Time Machine', 'System clock simulation reset to real-time.');
    this.save();
  }
}

// Global DB Singleton
window.db = new DBService();
