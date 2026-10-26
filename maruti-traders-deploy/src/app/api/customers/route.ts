export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";
import { BRANCH_CONFIGS } from "@/lib/location";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = { location, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { salesInvoices: true, paymentsReceived: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ location, customers });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

    const body = await req.json();
    const {
      name,
      companyName,
      phone,
      alternatePhone,
      email,
      address,
      city = branch.city,
      state = branch.state,
      pincode,
      gstin,
      pan,
      openingBalance = 0,
      creditLimit = 200000,
      paymentTermsDays = 30,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const trimmedPhone = phone && typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (trimmedPhone) {
      const existing = await prisma.customer.findUnique({
        where: {
          location_phone: {
            location,
            phone: trimmedPhone,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: `Customer with phone number ${trimmedPhone} already exists in ${location}` }, { status: 400 });
      }
    }

    const parsedOpening = parseFloat(openingBalance) || 0;

    const customer = await prisma.$transaction(async (tx) => {
      const cust = await tx.customer.create({
        data: {
          location,
          name: name.trim(),
          companyName: companyName || null,
          phone: trimmedPhone,
          alternatePhone: alternatePhone || null,
          email: email || null,
          address: address || branch.city,
          city,
          state,
          pincode: pincode || null,
          gstin: gstin || null,
          pan: pan || null,
          openingBalance: parsedOpening,
          currentBalance: parsedOpening,
          creditLimit: parseFloat(creditLimit) || 200000,
          paymentTermsDays: parseInt(paymentTermsDays) || 30,
          notes: notes || null,
        },
      });

      if (parsedOpening !== 0) {
        await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "CUSTOMER",
            customerId: cust.id,
            entryDate: new Date(),
            transactionType: "OPENING_BALANCE",
            debit: parsedOpening > 0 ? parsedOpening : 0,
            credit: parsedOpening < 0 ? Math.abs(parsedOpening) : 0,
            balance: parsedOpening,
            referenceType: "MANUAL",
            notes: "Opening balance setup",
            createdById: session?.id,
          },
        });
      }

      return cust;
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error("Customer POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create customer" }, { status: 500 });
  }
}
