import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [supplier, company] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id },
        include: {
          purchaseInvoices: {
            orderBy: { billDate: "desc" },
            include: { items: { include: { product: true } } },
          },
          paymentsMade: {
            orderBy: { paymentDate: "desc" },
          },
          ledgerEntries: {
            orderBy: { entryDate: "desc" },
          },
        },
      }),
      prisma.companyProfile.findFirst(),
    ]);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ supplier, company });
  } catch (error) {
    console.error("Single supplier GET error:", error);
    return NextResponse.json({ error: "Failed to load supplier profile" }, { status: 500 });
  }
}
