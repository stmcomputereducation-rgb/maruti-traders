import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [customer, company] = await Promise.all([
      prisma.customer.findUnique({
        where: { id },
        include: {
          salesInvoices: {
            orderBy: { invoiceDate: "desc" },
            include: { items: { include: { product: true } } },
          },
          paymentsReceived: {
            orderBy: { paymentDate: "desc" },
          },
          ledgerEntries: {
            orderBy: { entryDate: "desc" },
          },
        },
      }),
      prisma.companyProfile.findFirst(),
    ]);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer, company });
  } catch (error) {
    console.error("Single customer GET error:", error);
    return NextResponse.json({ error: "Failed to load customer profile" }, { status: 500 });
  }
}
