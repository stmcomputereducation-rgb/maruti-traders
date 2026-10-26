export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const [
      salesInvoices,
      purchaseInvoices,
      expenses,
      allStocks,
      customers,
    ] = await Promise.all([
      // Sales
      prisma.salesInvoice.findMany({
        where: {
          location,
          invoiceDate: { gte: startDate, lte: endDate },
          status: "FINALIZED",
        },
        include: { customer: true, godown: true },
      }),
      // Purchases
      prisma.purchaseInvoice.findMany({
        where: {
          location,
          billDate: { gte: startDate, lte: endDate },
          status: "RECEIVED",
        },
        include: { supplier: true, godown: true },
      }),
      // Expenses
      prisma.expense.findMany({
        where: {
          location,
          expenseDate: { gte: startDate, lte: endDate },
        },
      }),
      // Stock
      prisma.stock.findMany({
        where: {
          product: { location },
          godown: { location },
        },
        include: {
          product: true,
          godown: true,
        },
      }),
      // Overdue Customers
      prisma.customer.findMany({
        where: {
          location,
          currentBalance: { gt: 0 },
          isActive: true,
        },
        orderBy: { currentBalance: "desc" },
      }),
    ]);

    // Financial calculations
    const totalSales = salesInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
    const totalSalesTaxable = salesInvoices.reduce((acc, i) => acc + i.taxableAmount, 0);
    const totalOutputGst = salesInvoices.reduce((acc, i) => acc + i.totalTax, 0);
    const totalSalesCollected = salesInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
    const totalSalesPending = salesInvoices.reduce((acc, i) => acc + i.balanceDue, 0);

    const totalPurchases = purchaseInvoices.reduce((acc, p) => acc + p.grandTotal, 0);
    const totalPurchasesTaxable = purchaseInvoices.reduce((acc, p) => acc + p.taxableAmount, 0);
    const totalInputGst = purchaseInvoices.reduce((acc, p) => acc + p.totalTax, 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    const grossProfit = totalSales - totalPurchases;
    const netProfit = grossProfit - totalExpenses;

    const totalStockValuation = allStocks.reduce(
      (acc, s) => acc + s.quantity * s.product.purchasePrice,
      0
    );

    return NextResponse.json({
      location,
      summary: {
        totalSales,
        totalSalesTaxable,
        totalOutputGst,
        totalSalesCollected,
        totalSalesPending,
        totalPurchases,
        totalPurchasesTaxable,
        totalInputGst,
        totalExpenses,
        grossProfit,
        netProfit,
        totalStockValuation,
      },
      salesInvoices,
      purchaseInvoices,
      expenses,
      overdueCustomers: customers,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
