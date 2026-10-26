export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCanonicalInvoicePdf } from "@/lib/invoicePdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { searchParams } = new URL(req.url);
    const forceRegenerate = searchParams.get("refresh") === "true";

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        godown: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfBuffer = await getCanonicalInvoicePdf(invoice, forceRegenerate);


    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PDF generation endpoint error:", error);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
