const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Maruti Traders Marble ERP (Jalod & Dahod locations)...");

  // 1. Company Profiles for both locations
  await prisma.companyProfile.upsert({
    where: { location: "JALOD" },
    update: {},
    create: {
      location: "JALOD",
      name: "Maruti Traders",
      branchTitle: "Jalod Main Marble Yard & Processing Depot",
      tagline: "Exotic Italian Marble, Makrana Slabs & Natural Stone",
      address: "Plot 1-4, Maruti Marble Complex, NH 927A Banswara Highway",
      city: "Jalod",
      state: "Rajasthan",
      pincode: "327001",
      phone: "+91 98250 11223",
      alternatePhone: "+91 98765 43210",
      email: "jalod@marutitraders.com",
      gstin: "08AABCM1234P1Z4",
      pan: "AABCM1234P",
      invoicePrefix: "MT-LOD",
      bankName: "State Bank of India",
      accountNumber: "394857291039",
      ifscCode: "SBIN0004123",
      branch: "Jalod Highway Branch",
      upiId: "marutitraders.jalod@sbi",
      termsAndConditions: "1. Marble is a natural rock; natural veins, fissures and shade variations are inherent.\n2. Rates quoted are per Square Feet (SQFT).\n3. Breakage during transit on customer account.\n4. Subject to Banswara/Jalod jurisdiction.",
      currencySymbol: "₹",
    },
  });

  await prisma.companyProfile.upsert({
    where: { location: "DAHOD" },
    update: {},
    create: {
      location: "DAHOD",
      name: "Maruti Traders",
      branchTitle: "Dahod Marble & Granite Yard",
      tagline: "Wholesale Marble Slabs, South Indian Granite & Architectural Stones",
      address: "Plot No. 18-22, Phase 1, GIDC Industrial Estate, Godhra Road",
      city: "Dahod",
      state: "Gujarat",
      pincode: "389151",
      phone: "+91 98765 43210",
      alternatePhone: "+91 98250 12345",
      email: "dahod@marutitraders.com",
      gstin: "24AABCM1234P1Z8",
      pan: "AABCM1234P",
      invoicePrefix: "MT-DAH",
      bankName: "State Bank of India",
      accountNumber: "482019385920",
      ifscCode: "SBIN0001048",
      branch: "Dahod Main Commercial Branch",
      upiId: "marutitraders.dahod@sbi",
      termsAndConditions: "1. Rates are net per SQFT excluding loading/crane charges.\n2. Goods once checked and dispatched will not be taken back.\n3. Subject to Dahod jurisdiction only.",
      currencySymbol: "₹",
    },
  });

  // 2. Admin User
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@marutitraders.com" },
    update: {
      name: "Admin",
      role: "ADMIN",
      allowedLocations: "JALOD,DAHOD",
    },
    create: {
      name: "Admin",
      email: "admin@marutitraders.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      phone: "+91 98765 43210",
      allowedLocations: "JALOD,DAHOD",
    },
  });

  // 3. Godowns for Jalod
  const jalodG1 = await prisma.godown.upsert({
    where: { location_code: { location: "JALOD", code: "LOD-GDW-01" } },
    update: {},
    create: {
      location: "JALOD",
      code: "LOD-GDW-01",
      name: "Jalod Central Slab Yard & Crane Bay",
      address: "Plot 1-2, NH 927A Highway",
      city: "Jalod",
      managerName: "Sanjay Bhai",
      contactPhone: "+91 98250 11223",
      isActive: true,
    },
  });

  const jalodG2 = await prisma.godown.upsert({
    where: { location_code: { location: "JALOD", code: "LOD-GDW-02" } },
    update: {},
    create: {
      location: "JALOD",
      code: "LOD-GDW-02",
      name: "Jalod Highway Polishing Shed",
      address: "Shed 4, Industrial Zone",
      city: "Jalod",
      managerName: "Kailash Sharma",
      contactPhone: "+91 98250 77889",
      isActive: true,
    },
  });

  // 4. Godowns for Dahod
  const dahodG1 = await prisma.godown.upsert({
    where: { location_code: { location: "DAHOD", code: "DAH-GDW-01" } },
    update: {},
    create: {
      location: "DAHOD",
      code: "DAH-GDW-01",
      name: "Dahod Central GIDC Marble Yard",
      address: "Plot 18-20, GIDC Godhra Road",
      city: "Dahod",
      managerName: "Jignesh Patel",
      contactPhone: "+91 98765 43210",
      isActive: true,
    },
  });

  const dahodG2 = await prisma.godown.upsert({
    where: { location_code: { location: "DAHOD", code: "DAH-GDW-02" } },
    update: {},
    create: {
      location: "DAHOD",
      code: "DAH-GDW-02",
      name: "Godhra Road Open Stockyard",
      address: "Survey 102, Bypass Road",
      city: "Dahod",
      managerName: "Mahesh Baria",
      contactPhone: "+91 98980 44556",
      isActive: true,
    },
  });

  // 5. Jalod Marble Products
  const jalodMarbles = [
    {
      location: "JALOD",
      name: "Italian Statuario White Marble Slabs",
      sku: "MRB-LOD-STAT-01",
      barcode: "8908001001",
      category: "Italian Marble",
      subcategory: "White Marble",
      brand: "Carrara Quarry, Italy",
      size: "9.5 x 6.2 ft",
      colour: "Pure White with Grey Veins",
      finish: "Mirror Polished",
      thickness: "18mm",
      slabCount: 45,
      totalSqft: 2650,
      unit: "SQFT",
      description: "First choice imported Italian Statuario with distinctive dramatic grey veins. Ideal for luxury living rooms, lobbies and feature walls.",
      photoUrl: "/uploads/marbles/statuario-1.svg",
      photos: JSON.stringify(["/uploads/marbles/statuario-1.svg", "/uploads/marbles/statuario-2.svg"]),
      purchasePrice: 380,
      sellingPrice: 520,
      wholesalePrice: 470,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 500,
      openingStock: 2650,
    },
    {
      location: "JALOD",
      name: "Botticino Classico Italian Marble",
      sku: "MRB-LOD-BOTT-02",
      barcode: "8908001002",
      category: "Italian Marble",
      subcategory: "Beige Marble",
      brand: "Brescia, Italy",
      size: "8.5 x 5.5 ft",
      colour: "Warm Beige Cream",
      finish: "Polished",
      thickness: "18mm",
      slabCount: 60,
      totalSqft: 2800,
      unit: "SQFT",
      description: "Timeless Italian Botticino with light golden clouding and compact texture. Premium flooring marble.",
      photoUrl: "/uploads/marbles/botticino-1.svg",
      photos: JSON.stringify(["/uploads/marbles/botticino-1.svg"]),
      purchasePrice: 190,
      sellingPrice: 275,
      wholesalePrice: 245,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 600,
      openingStock: 2800,
    },
    {
      location: "JALOD",
      name: "Makrana Pure White Marble",
      sku: "MRB-LOD-MAKR-03",
      barcode: "8908001003",
      category: "Makrana Marble",
      subcategory: "Indian Marble",
      brand: "Makrana Mines, Rajasthan",
      size: "7.0 x 4.5 ft",
      colour: "Calcite Pure White",
      finish: "High Polish",
      thickness: "20mm",
      slabCount: 80,
      totalSqft: 2520,
      unit: "SQFT",
      description: "Authentic 98% calcium Makrana marble that never turns yellow and improves sheen with age.",
      photoUrl: "/uploads/marbles/makrana-1.svg",
      photos: JSON.stringify(["/uploads/marbles/makrana-1.svg"]),
      purchasePrice: 280,
      sellingPrice: 395,
      wholesalePrice: 350,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 500,
      openingStock: 2520,
    },
    {
      location: "JALOD",
      name: "Nero Marquina Black Marble Slabs",
      sku: "MRB-LOD-MARQ-04",
      barcode: "8908001004",
      category: "Imported Marble",
      subcategory: "Black Marble",
      brand: "Basque Country, Spain",
      size: "8.0 x 5.0 ft",
      colour: "Deep Black with White Lightning",
      finish: "Polished",
      thickness: "18mm",
      slabCount: 40,
      totalSqft: 1600,
      unit: "SQFT",
      description: "High density deep black marble with striking white calcite veins.",
      photoUrl: "/uploads/marbles/black-marquina-1.svg",
      photos: JSON.stringify(["/uploads/marbles/black-marquina-1.svg"]),
      purchasePrice: 210,
      sellingPrice: 310,
      wholesalePrice: 275,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 400,
      openingStock: 1600,
    },
    {
      location: "JALOD",
      name: "Emerald Green Translucent Onyx",
      sku: "MRB-LOD-ONYX-05",
      barcode: "8908001005",
      category: "Onyx",
      subcategory: "Exotic Onyx",
      brand: "Iran / Salta",
      size: "7.5 x 5.0 ft",
      colour: "Emerald Green & Amber",
      finish: "Bookmatched Polish",
      thickness: "18mm",
      slabCount: 25,
      totalSqft: 937,
      unit: "SQFT",
      description: "Exquisite translucent onyx designed for backlit vanity counters, bars, and reception backdrops.",
      photoUrl: "/uploads/marbles/emerald-onyx-1.svg",
      photos: JSON.stringify(["/uploads/marbles/emerald-onyx-1.svg"]),
      purchasePrice: 580,
      sellingPrice: 850,
      wholesalePrice: 760,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 200,
      openingStock: 937,
    },
    {
      location: "JALOD",
      name: "Alaska White Exotic Granite Slabs",
      sku: "MRB-LOD-ALSK-06",
      barcode: "8908001006",
      category: "Granite",
      subcategory: "Exotic Granite",
      brand: "Madurai Mines",
      size: "10.0 x 6.0 ft",
      colour: "Frosty White & Silver Quartz",
      finish: "Leather & Flamed",
      thickness: "20mm",
      slabCount: 50,
      totalSqft: 3000,
      unit: "SQFT",
      description: "Durable natural granite with icy white crystals and grey-black feldspar veins.",
      photoUrl: "/uploads/marbles/alaska-white-1.svg",
      photos: JSON.stringify(["/uploads/marbles/alaska-white-1.svg"]),
      purchasePrice: 130,
      sellingPrice: 195,
      wholesalePrice: 170,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 800,
      openingStock: 3000,
    },
  ];

  for (const m of jalodMarbles) {
    const prod = await prisma.product.upsert({
      where: { location_sku: { location: "JALOD", sku: m.sku } },
      update: m,
      create: m,
    });

    await prisma.stock.upsert({
      where: { godownId_productId: { godownId: jalodG1.id, productId: prod.id } },
      update: { quantity: Math.round(m.totalSqft * 0.7), slabCount: Math.round(m.slabCount * 0.7) },
      create: {
        godownId: jalodG1.id,
        productId: prod.id,
        quantity: Math.round(m.totalSqft * 0.7),
        slabCount: Math.round(m.slabCount * 0.7),
        minStockLevel: m.minStockAlert,
      },
    });

    await prisma.stock.upsert({
      where: { godownId_productId: { godownId: jalodG2.id, productId: prod.id } },
      update: { quantity: Math.round(m.totalSqft * 0.3), slabCount: Math.round(m.slabCount * 0.3) },
      create: {
        godownId: jalodG2.id,
        productId: prod.id,
        quantity: Math.round(m.totalSqft * 0.3),
        slabCount: Math.round(m.slabCount * 0.3),
        minStockLevel: m.minStockAlert,
      },
    });
  }

  // 6. Dahod Marble Products (Completely separate data!)
  const dahodMarbles = [
    {
      location: "DAHOD",
      name: "Black Galaxy South Indian Granite Slabs",
      sku: "MRB-DAH-GLXY-01",
      barcode: "8908002001",
      category: "Granite",
      subcategory: "Premium Granite",
      brand: "Chimakurthy, AP",
      size: "9.0 x 5.0 ft",
      colour: "Pitch Black with Golden Bronzite Speckles",
      finish: "High Gloss Polish",
      thickness: "18mm",
      slabCount: 75,
      totalSqft: 3375,
      unit: "SQFT",
      description: "Star Galaxy original granite with sparkling golden crystals. Kitchen platform and staircase grade.",
      photoUrl: "/uploads/marbles/black-galaxy-1.svg",
      photos: JSON.stringify(["/uploads/marbles/black-galaxy-1.svg"]),
      purchasePrice: 155,
      sellingPrice: 230,
      wholesalePrice: 205,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 600,
      openingStock: 3375,
    },
    {
      location: "DAHOD",
      name: "Classic Roman Beige Travertine Slabs",
      sku: "MRB-DAH-TRAV-02",
      barcode: "8908002002",
      category: "Travertine",
      subcategory: "Imported Stone",
      brand: "Tivoli, Italy",
      size: "8.5 x 5.2 ft",
      colour: "Warm Earthy Beige",
      finish: "Veincut Honed & Resin Filled",
      thickness: "20mm",
      slabCount: 30,
      totalSqft: 1326,
      unit: "SQFT",
      description: "Natural Roman travertine with horizontal linear banding. Perfect for modern architectural facades.",
      photoUrl: "/uploads/marbles/travertine-1.svg",
      photos: JSON.stringify(["/uploads/marbles/travertine-1.svg"]),
      purchasePrice: 220,
      sellingPrice: 325,
      wholesalePrice: 290,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 400,
      openingStock: 1326,
    },
    {
      location: "DAHOD",
      name: "Katni Wonder Beige Indian Marble",
      sku: "MRB-DAH-KATN-03",
      barcode: "8908002003",
      category: "Indian Marble",
      subcategory: "Beige Marble",
      brand: "Katni Quarry, MP",
      size: "7.0 x 4.5 ft",
      colour: "Cream Beige with Pinkish Tones",
      finish: "Mirror Polished",
      thickness: "16mm",
      slabCount: 110,
      totalSqft: 3465,
      unit: "SQFT",
      description: "Economical and sturdy Indian marble for whole-house flooring and residential flats.",
      photoUrl: "/uploads/marbles/katni-beige-1.svg",
      photos: JSON.stringify(["/uploads/marbles/katni-beige-1.svg"]),
      purchasePrice: 62,
      sellingPrice: 94,
      wholesalePrice: 82,
      gstRate: 18,
      hsnCode: "6802",
      minStockAlert: 800,
      openingStock: 3465,
    },
  ];

  for (const m of dahodMarbles) {
    const prod = await prisma.product.upsert({
      where: { location_sku: { location: "DAHOD", sku: m.sku } },
      update: m,
      create: m,
    });

    await prisma.stock.upsert({
      where: { godownId_productId: { godownId: dahodG1.id, productId: prod.id } },
      update: { quantity: Math.round(m.totalSqft * 0.65), slabCount: Math.round(m.slabCount * 0.65) },
      create: {
        godownId: dahodG1.id,
        productId: prod.id,
        quantity: Math.round(m.totalSqft * 0.65),
        slabCount: Math.round(m.slabCount * 0.65),
        minStockLevel: m.minStockAlert,
      },
    });

    await prisma.stock.upsert({
      where: { godownId_productId: { godownId: dahodG2.id, productId: prod.id } },
      update: { quantity: Math.round(m.totalSqft * 0.35), slabCount: Math.round(m.slabCount * 0.35) },
      create: {
        godownId: dahodG2.id,
        productId: prod.id,
        quantity: Math.round(m.totalSqft * 0.35),
        slabCount: Math.round(m.slabCount * 0.35),
        minStockLevel: m.minStockAlert,
      },
    });
  }

  // 7. Customers in Jalod
  const jalodCustomer = await prisma.customer.upsert({
    where: { location_phone: { location: "JALOD", phone: "9829012345" } },
    update: {},
    create: {
      location: "JALOD",
      name: "Mewar Architects & Developers",
      companyName: "Mewar Infra Ltd",
      phone: "9829012345",
      address: "Palace Road, Near Collectorate",
      city: "Banswara",
      state: "Rajasthan",
      gstin: "08AAGFR8844K1Z2",
      openingBalance: 120000,
      currentBalance: 185000,
      creditLimit: 500000,
      paymentTermsDays: 30,
    },
  });

  // 8. Customers in Dahod
  const dahodCustomer = await prisma.customer.upsert({
    where: { location_phone: { location: "DAHOD", phone: "9898011223" } },
    update: {},
    create: {
      location: "DAHOD",
      name: "Panchmahal Stone & Marble Traders",
      companyName: "Panchmahal Buildcon",
      phone: "9898011223",
      address: "Station Road, Near APMC",
      city: "Dahod",
      state: "Gujarat",
      gstin: "24AAACS7733D1Z9",
      openingBalance: 65000,
      currentBalance: 98400,
      creditLimit: 300000,
      paymentTermsDays: 30,
    },
  });

  // 9. Suppliers
  await prisma.supplier.upsert({
    where: { location_phone: { location: "JALOD", phone: "9829099881" } },
    update: {},
    create: {
      location: "JALOD",
      name: "Kishangarh Global Marble Importers",
      phone: "9829099881",
      address: "Plot 42, Marble Industrial Area Phase 2",
      city: "Kishangarh",
      state: "Rajasthan",
      gstin: "08AABCK4920M1Z2",
      openingBalance: 450000,
      currentBalance: 450000,
    },
  });

  await prisma.supplier.upsert({
    where: { location_phone: { location: "DAHOD", phone: "9825088776" } },
    update: {},
    create: {
      location: "DAHOD",
      name: "Silvassa Marble & Granite Hub",
      phone: "9825088776",
      address: "Survey 118, Naroli Road",
      city: "Silvassa",
      state: "Gujarat / UT",
      gstin: "26AAACH4567J1Z6",
      openingBalance: 280000,
      currentBalance: 280000,
    },
  });

  // 10. Sample Jalod Invoice
  const jalodProd = await prisma.product.findFirst({ where: { location: "JALOD" } });
  if (jalodProd) {
    const inv1 = await prisma.salesInvoice.upsert({
      where: { invoiceNumber: "MT-LOD-2026-0001" },
      update: {},
      create: {
        location: "JALOD",
        invoiceNumber: "MT-LOD-2026-0001",
        invoiceDate: new Date("2026-10-18T10:30:00Z"),
        customerId: jalodCustomer.id,
        godownId: jalodG1.id,
        subTotal: 65000,
        discountAmount: 0,
        taxableAmount: 65000,
        cgstAmount: 5850,
        sgstAmount: 5850,
        totalTax: 11700,
        grandTotal: 76700,
        paidAmount: 50000,
        balanceDue: 26700,
        paymentStatus: "PARTIALLY_PAID",
        paymentMode: "UPI",
        notes: "125 SQFT Statuario Marble Slabs loaded on Truck RJ-03-GA-4412",
        items: {
          create: [
            {
              productId: jalodProd.id,
              description: "Italian Statuario White Marble Slabs (18mm Mirror Polish)",
              hsnCode: "6802",
              slabDetails: "2 Slabs • 9.5 x 6.2 ft",
              quantity: 125,
              unit: "SQFT",
              unitPrice: 520,
              discountAmount: 0,
              gstRate: 18,
              taxableAmount: 65000,
              cgstAmount: 5850,
              sgstAmount: 5850,
              totalAmount: 76700,
            },
          ],
        },
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        location: "JALOD",
        entityType: "CUSTOMER",
        customerId: jalodCustomer.id,
        entryDate: new Date("2026-10-18T10:30:00Z"),
        transactionType: "SALE",
        debit: 76700,
        credit: 0,
        balance: 196700,
        referenceType: "INVOICE",
        referenceId: inv1.id,
        referenceNumber: "MT-LOD-2026-0001",
        notes: "Tax Invoice MT-LOD-2026-0001 (125 SQFT Statuario)",
      },
    });
  }

  // 11. Sample Dahod Invoice
  const dahodProd = await prisma.product.findFirst({ where: { location: "DAHOD" } });
  if (dahodProd) {
    const inv2 = await prisma.salesInvoice.upsert({
      where: { invoiceNumber: "MT-DAH-2026-0001" },
      update: {},
      create: {
        location: "DAHOD",
        invoiceNumber: "MT-DAH-2026-0001",
        invoiceDate: new Date("2026-10-19T11:00:00Z"),
        customerId: dahodCustomer.id,
        godownId: dahodG1.id,
        subTotal: 46000,
        discountAmount: 1000,
        taxableAmount: 45000,
        cgstAmount: 4050,
        sgstAmount: 4050,
        totalTax: 8100,
        grandTotal: 53100,
        paidAmount: 53100,
        balanceDue: 0,
        paymentStatus: "PAID",
        paymentMode: "BANK_TRANSFER",
        notes: "200 SQFT Black Galaxy Granite delivered to Godhra site",
        items: {
          create: [
            {
              productId: dahodProd.id,
              description: "Black Galaxy South Indian Granite Slabs (18mm High Gloss)",
              hsnCode: "6802",
              slabDetails: "4 Slabs • 9 x 5 ft",
              quantity: 200,
              unit: "SQFT",
              unitPrice: 230,
              discountAmount: 1000,
              gstRate: 18,
              taxableAmount: 45000,
              cgstAmount: 4050,
              sgstAmount: 4050,
              totalAmount: 53100,
            },
          ],
        },
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        location: "DAHOD",
        entityType: "CUSTOMER",
        customerId: dahodCustomer.id,
        entryDate: new Date("2026-10-19T11:00:00Z"),
        transactionType: "SALE",
        debit: 53100,
        credit: 0,
        balance: 118100,
        referenceType: "INVOICE",
        referenceId: inv2.id,
        referenceNumber: "MT-DAH-2026-0001",
        notes: "Tax Invoice MT-DAH-2026-0001 (200 SQFT Black Galaxy)",
      },
    });
  }

  console.log("✅ Maruti Traders Marble ERP seeded successfully with JALOD and DAHOD branches!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
