export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";

    const where: any = { location };
    if (category && category !== "ALL") where.category = category;
    if (search) {
      where.OR = [
        { expenseNumber: { contains: search } },
        { description: { contains: search } },
        { vendorName: { contains: search } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        creator: { select: { name: true } },
        approver: { select: { name: true } },
      },
      orderBy: { expenseDate: "desc" },
    });

    const categoryTotals = await prisma.expense.groupBy({
      by: ["category"],
      where: { location },
      _sum: { amount: true },
    });

    const totalAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

    return NextResponse.json({
      location,
      expenses,
      categoryTotals,
      totalAmount,
    });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    const body = await req.json();

    const {
      category = "MISC",
      amount,
      expenseDate,
      paymentMode = "CASH",
      referenceNumber,
      description,
      vendorName,
    } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Valid expense amount is required" }, { status: 400 });
    }

    const count = await prisma.expense.count({ where: { location } });
    const expenseNumber = `EXP-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const expense = await prisma.expense.create({
      data: {
        location,
        expenseNumber,
        category,
        amount: parsedAmount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMode,
        referenceNumber: referenceNumber || null,
        description: description || "General business expense",
        vendorName: vendorName || null,
        createdById: session?.id || null,
        approvedById: session?.id || null,
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error: any) {
    console.error("Expense POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to record expense" }, { status: 500 });
  }
}
