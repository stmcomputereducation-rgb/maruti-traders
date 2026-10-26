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

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchaseInvoices: true, paymentsMade: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ location, suppliers });
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
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
      email,
      address,
      city = "Kishangarh",
      state = "Rajasthan",
      pincode,
      gstin,
      pan,
      openingBalance = 0,
      paymentTermsDays = 30,
      bankDetails,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const trimmedPhone = phone && typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (trimmedPhone) {
      const existing = await prisma.supplier.findUnique({
        where: {
          location_phone: {
            location,
            phone: trimmedPhone,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: `Supplier with phone number ${trimmedPhone} already exists in ${location}` }, { status: 400 });
      }
    }

    const parsedOpening = parseFloat(openingBalance) || 0;

    const supplier = await prisma.$transaction(async (tx) => {
      const supp = await tx.supplier.create({
        data: {
          location,
          name: name.trim(),
          companyName: companyName || null,
          phone: trimmedPhone,
          email: email || null,
          address: address || "Marble Industrial Area",
          city,
          state,
          pincode: pincode || null,
          gstin: gstin || null,
          pan: pan || null,
          openingBalance: parsedOpening,
          currentBalance: parsedOpening,
          paymentTermsDays: parseInt(paymentTermsDays) || 30,
          bankDetails: bankDetails || null,
          notes: notes || null,
        },
      });

      if (parsedOpening !== 0) {
        await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "SUPPLIER",
            supplierId: supp.id,
            entryDate: new Date(),
            transactionType: "OPENING_BALANCE",
            debit: 0,
            credit: parsedOpening,
            balance: parsedOpening,
            referenceType: "OPENING_BALANCE",
            notes: "Opening balance setup",
            createdById: session?.id,
          },
        });
      }

      return supp;
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error: any) {
    console.error("Supplier POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create supplier" }, { status: 500 });
  }
}
