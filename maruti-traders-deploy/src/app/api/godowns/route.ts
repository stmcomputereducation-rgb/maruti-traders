export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveLocationFromReq } from "@/lib/location-server";

// Exactly two authorized godowns in the business: JALOD and DAHOD
const AUTHORIZED_GODOWN_CODES = ["JALOD", "DAHOD", "LODHA"];

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const includeBoth = searchParams.get("all") === "true" || searchParams.get("scope") === "all";

    // Strictly fetch only the active authorized godowns (LODHA and DAHOD)
    const whereClause: any = {
      isActive: true,
      code: { in: AUTHORIZED_GODOWN_CODES },
    };

    if (!includeBoth) {
      whereClause.location = location;
    }

    const godowns = await prisma.godown.findMany({
      where: whereClause,
      include: {
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                purchasePrice: true,
                sellingPrice: true,
                slabCount: true,
                totalSqft: true,
                finish: true,
                thickness: true,
                location: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const formatted = godowns.map((g) => {
      // Filter stocks to products matching godown location
      const relevantStocks = g.stocks.filter((s) => s.product.location === g.location && s.product.isActive);
      const totalUnits = relevantStocks.reduce((acc, s) => acc + s.quantity, 0);
      const totalSlabs = relevantStocks.reduce((acc, s) => acc + s.slabCount, 0);
      const totalValuation = relevantStocks.reduce((acc, s) => acc + s.quantity * s.product.purchasePrice, 0);

      return {
        id: g.id,
        location: g.location,
        code: g.code,
        name: g.name,
        address: g.address,
        city: g.city,
        managerName: g.managerName,
        contactPhone: g.contactPhone,
        isActive: g.isActive,
        isAuthorized: true,
        totalUnits,
        totalSlabs,
        totalValuation,
        stocks: relevantStocks.map((s) => ({
          productId: s.productId,
          productName: s.product.name,
          sku: s.product.sku,
          unit: s.product.unit,
          quantity: s.quantity,
          slabCount: s.slabCount,
          valuation: s.quantity * s.product.purchasePrice,
        })),
      };
    });

    return NextResponse.json({ location, godowns: formatted, authorizedGodowns: AUTHORIZED_GODOWN_CODES });
  } catch (error) {
    console.error("Godowns GET error:", error);
    return NextResponse.json({ error: "Failed to fetch godowns" }, { status: 500 });
  }
}

// POST is strictly prohibited: Maruti Traders has exactly two authorized godowns (JALOD & DAHOD)
export async function POST() {
  return NextResponse.json(
    {
      error: "Only Jalod and Dahod godowns are authorized. Creating additional godowns is prohibited.",
      code: "GODOWN_CREATION_RESTRICTED",
    },
    { status: 403 }
  );
}

// PUT: Only allow updating manager/contact details of the two authorized godowns
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, managerName, contactPhone, address } = body;

    if (!id) {
      return NextResponse.json({ error: "Godown ID is required" }, { status: 400 });
    }

    const existing = await prisma.godown.findUnique({ where: { id } });
    if (!existing || !AUTHORIZED_GODOWN_CODES.includes(existing.code)) {
      return NextResponse.json(
        { error: "Only authorized Jalod and Dahod godowns may be updated." },
        { status: 403 }
      );
    }

    const updated = await prisma.godown.update({
      where: { id },
      data: {
        managerName: managerName !== undefined ? managerName : existing.managerName,
        contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
        address: address !== undefined ? address : existing.address,
      },
    });

    return NextResponse.json({ success: true, godown: updated });
  } catch (error: any) {
    console.error("Godown PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update godown" }, { status: 500 });
  }
}

// DELETE is strictly prohibited
export async function DELETE() {
  return NextResponse.json(
    { error: "Deleting authorized godowns is prohibited. The two authorized godowns are fixed.", code: "DELETE_PROHIBITED" },
    { status: 403 }
  );
}
