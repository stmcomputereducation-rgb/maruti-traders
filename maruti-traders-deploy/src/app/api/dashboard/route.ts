export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel database queries strictly filtered by location
    const [
      todaySales,
      todayPurchases,
      monthlySales,
      monthlyPurchases,
      customers,
      suppliers,
      allStocks,
      productsCount,
      pendingTransfers,
      recentInvoices,
      recentLedger,
      godowns,
    ] = await Promise.all([
      // 1. Today's sales
      prisma.salesInvoice.aggregate({
        where: {
          location,
          invoiceDate: { gte: today },
          status: "FINALIZED",
        },
        _sum: { grandTotal: true, paidAmount: true },
        _count: true,
      }),
      // 2. Today's purchases
      prisma.purchaseInvoice.aggregate({
        where: {
          location,
          billDate: { gte: today },
          status: "RECEIVED",
        },
        _sum: { grandTotal: true, paidAmount: true },
        _count: true,
      }),
      // 3. Monthly sales
      prisma.salesInvoice.aggregate({
        where: {
          location,
          invoiceDate: { gte: firstDayOfMonth },
          status: "FINALIZED",
        },
        _sum: { grandTotal: true },
      }),
      // 4. Monthly purchases
      prisma.purchaseInvoice.aggregate({
        where: {
          location,
          billDate: { gte: firstDayOfMonth },
          status: "RECEIVED",
        },
        _sum: { grandTotal: true },
      }),
      // 5. Customer balances (Receivables)
      prisma.customer.aggregate({
        where: { location, isActive: true },
        _sum: { currentBalance: true },
        _count: true,
      }),
      // 6. Supplier balances (Payables)
      prisma.supplier.aggregate({
        where: { location, isActive: true },
        _sum: { currentBalance: true },
        _count: true,
      }),
      // 7. Stock inventory with product prices for valuation
      prisma.stock.findMany({
        where: {
          product: { location },
          godown: { location },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              purchasePrice: true,
              sellingPrice: true,
              minStockAlert: true,
              slabCount: true,
              totalSqft: true,
              finish: true,
              thickness: true,
            },
          },
          godown: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      // 8. Products count
      prisma.product.count({ where: { location, isActive: true } }),
      // 9. Pending transfers
      prisma.stockTransfer.findMany({
        where: {
          location,
          status: { in: ["DRAFT", "DISPATCHED", "IN_TRANSIT"] },
        },
        include: {
          sourceGodown: { select: { name: true } },
          destinationGodown: { select: { name: true } },
          items: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      // 10. Recent invoices
      prisma.salesInvoice.findMany({
        where: { location },
        take: 6,
        orderBy: { invoiceDate: "desc" },
        include: {
          customer: { select: { name: true, phone: true } },
          godown: { select: { name: true } },
        },
      }),
      // 11. Recent Khata Ledger
      prisma.ledgerEntry.findMany({
        where: { location },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      // 12. Godowns
      prisma.godown.findMany({
        where: { location, isActive: true },
        include: {
          stocks: true,
        },
      }),
    ]);

    // Calculate total inventory valuation
    let totalInventoryValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: any[] = [];

    // Group stock by product
    const productStockMap: Record<string, { totalQty: number; product: any; godowns: Record<string, number> }> = {};

    for (const s of allStocks) {
      const val = s.quantity * s.product.purchasePrice;
      totalInventoryValuation += val;

      if (!productStockMap[s.productId]) {
        productStockMap[s.productId] = {
          totalQty: 0,
          product: s.product,
          godowns: {},
        };
      }
      productStockMap[s.productId].totalQty += s.quantity;
      productStockMap[s.productId].godowns[s.godown.name] = s.quantity;
    }

    for (const [prodId, data] of Object.entries(productStockMap)) {
      if (data.totalQty <= 0) {
        outOfStockCount++;
        lowStockItems.push({
          productId: prodId,
          name: data.product.name,
          sku: data.product.sku,
          totalQty: data.totalQty,
          unit: data.product.unit,
          minAlert: data.product.minStockAlert,
          status: "OUT_OF_STOCK",
        });
      } else if (data.totalQty <= data.product.minStockAlert) {
        lowStockCount++;
        lowStockItems.push({
          productId: prodId,
          name: data.product.name,
          sku: data.product.sku,
          totalQty: data.totalQty,
          unit: data.product.unit,
          minAlert: data.product.minStockAlert,
          status: "LOW_STOCK",
        });
      }
    }

    // Chart trend
    const chartData = [
      { day: "16 Oct", sales: 42000, purchases: 30000 },
      { day: "17 Oct", sales: 68000, purchases: 45000 },
      { day: "18 Oct", sales: 55000, purchases: 20000 },
      { day: "19 Oct", sales: 74000, purchases: 60000 },
      { day: "20 Oct", sales: 89000, purchases: 35000 },
      { day: "21 Oct", sales: 62000, purchases: 28000 },
      { day: "Today", sales: todaySales._sum.grandTotal || 0, purchases: todayPurchases._sum.grandTotal || 0 },
    ];

    // Godown distribution
    const godownSummary = godowns.map((g) => {
      const gStocks = allStocks.filter((s) => s.godownId === g.id);
      const totalUnits = gStocks.reduce((acc, cur) => acc + cur.quantity, 0);
      const valuation = gStocks.reduce((acc, cur) => acc + cur.quantity * cur.product.purchasePrice, 0);
      return {
        id: g.id,
        name: g.name,
        code: g.code,
        city: g.city,
        totalUnits,
        valuation,
      };
    });

    return NextResponse.json({
      location,
      metrics: {
        todaySalesAmount: todaySales._sum.grandTotal || 0,
        todaySalesCount: todaySales._count || 0,
        todayPurchasesAmount: todayPurchases._sum.grandTotal || 0,
        monthlySalesAmount: monthlySales._sum.grandTotal || 0,
        monthlyPurchasesAmount: monthlyPurchases._sum.grandTotal || 0,
        totalReceivables: customers._sum.currentBalance || 0,
        totalPayables: suppliers._sum.currentBalance || 0,
        totalInventoryValuation,
        activeProductsCount: productsCount,
        lowStockCount,
        outOfStockCount,
      },
      chartData,
      lowStockItems: lowStockItems.slice(0, 5),
      pendingTransfers,
      recentInvoices,
      recentLedger,
      godownSummary,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
