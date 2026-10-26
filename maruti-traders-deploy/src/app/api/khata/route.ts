export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const customerId = searchParams.get("customerId");
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search") || "";

    const where: any = { location };
    if (entityType && entityType !== "ALL") where.entityType = entityType;
    if (customerId) where.customerId = customerId;
    if (supplierId) where.supplierId = supplierId;

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { notes: { contains: search } },
        { customer: { name: { contains: search } } },
        { supplier: { name: { contains: search } } },
      ];
    }

    const [entries, totalCustomersBalance, totalSuppliersBalance] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, currentBalance: true } },
          supplier: { select: { id: true, name: true, phone: true, currentBalance: true } },
        },
        orderBy: { entryDate: "desc" },
        take: 200,
      }),
      prisma.customer.aggregate({
        where: { location, isActive: true },
        _sum: { currentBalance: true },
      }),
      prisma.supplier.aggregate({
        where: { location, isActive: true },
        _sum: { currentBalance: true },
      }),
    ]);

    return NextResponse.json({
      location,
      entries,
      totalReceivables: totalCustomersBalance._sum.currentBalance || 0,
      totalPayables: totalSuppliersBalance._sum.currentBalance || 0,
    });
  } catch (error) {
    console.error("Khata GET error:", error);
    return NextResponse.json({ error: "Failed to fetch ledger entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    const body = await req.json();

    const {
      entityType,
      partyId,
      amount,
      entryType,
      paymentMode = "CASH",
      referenceNumber,
      entryDate,
      notes,
    } = body;

    const parsedAmount = parseFloat(amount);
    if (!partyId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Party and valid amount are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payCount = await tx.payment.count({ where: { location } });
      const codePrefix = entityType === "CUSTOMER" ? "REC" : "PAY";
      const paymentNumber = `${codePrefix}-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, "0")}`;

      if (entityType === "CUSTOMER") {
        const cust = await tx.customer.findUnique({ where: { id: partyId } });
        if (!cust) throw new Error("Customer not found");

        const newBalance = cust.currentBalance - parsedAmount;

        const payment = await tx.payment.create({
          data: {
            location,
            paymentNumber,
            type: "RECEIPT",
            customerId: partyId,
            amount: parsedAmount,
            paymentDate: entryDate ? new Date(entryDate) : new Date(),
            paymentMode,
            referenceNumber: referenceNumber || null,
            notes: notes || "Payment received via Khata Book",
            createdById: session?.id,
          },
        });

        const entry = await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "CUSTOMER",
            customerId: partyId,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            transactionType: "PAYMENT_RECEIVED",
            debit: 0,
            credit: parsedAmount,
            balance: newBalance,
            referenceType: "PAYMENT",
            referenceId: payment.id,
            referenceNumber: paymentNumber,
            notes: notes || `Payment received (${paymentMode})`,
            createdById: session?.id,
          },
        });

        await tx.customer.update({
          where: { id: partyId },
          data: { currentBalance: newBalance },
        });

        return entry;
      } else {
        const supp = await tx.supplier.findUnique({ where: { id: partyId } });
        if (!supp) throw new Error("Supplier not found");

        const newBalance = supp.currentBalance - parsedAmount;

        const payment = await tx.payment.create({
          data: {
            location,
            paymentNumber,
            type: "PAYMENT",
            supplierId: partyId,
            amount: parsedAmount,
            paymentDate: entryDate ? new Date(entryDate) : new Date(),
            paymentMode,
            referenceNumber: referenceNumber || null,
            notes: notes || "Supplier payment made via Khata Book",
            createdById: session?.id,
          },
        });

        const entry = await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "SUPPLIER",
            supplierId: partyId,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            transactionType: "PAYMENT_PAID",
            debit: parsedAmount,
            credit: 0,
            balance: newBalance,
            referenceType: "PAYMENT",
            referenceId: payment.id,
            referenceNumber: paymentNumber,
            notes: notes || `Supplier payment (${paymentMode})`,
            createdById: session?.id,
          },
        });

        await tx.supplier.update({
          where: { id: partyId },
          data: { currentBalance: newBalance },
        });

        return entry;
      }
    });

    return NextResponse.json({ success: true, entry: result }, { status: 201 });
  } catch (error: any) {
    console.error("Khata POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to record transaction" }, { status: 400 });
  }
}
