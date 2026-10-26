export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        godown: true,
        salesperson: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const loc: LocationCode = (invoice.location?.toUpperCase() === "DAHOD" ? "DAHOD" : "JALOD");
    let company = await prisma.companyProfile.findFirst({
      where: { location: loc },
    });

    if (!company) {
      const b = BRANCH_CONFIGS[loc] || BRANCH_CONFIGS.JALOD;
      company = {
        id: `maruti_${loc.toLowerCase()}`,
        location: loc,
        name: b.name,
        branchTitle: b.name,
        tagline: b.tagline,
        address: b.address,
        city: b.city,
        state: b.state,
        pincode: "327001",
        phone: b.phone,
        alternatePhone: null,
        email: b.email,
        gstin: b.gstin,
        pan: b.pan,
        bankName: "ICICI Bank Ltd.",
        accountNumber: "023405009876",
        ifscCode: "ICIC0000234",
        branch: b.city,
        upiId: `marutitraders.${loc.toLowerCase()}@icici`,
        termsAndConditions: `1. Goods once sold will not be taken back.\n2. Marble is natural stone; variation is normal.\n3. Subject to ${b.city} jurisdiction only.`,
        invoicePrefix: b.invoicePrefix,
        currencySymbol: "₹",
        logoUrl: null,
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ invoice, company });
  } catch (error) {
    console.error("Single invoice GET error:", error);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionUserFromRequest(req);
    const { id } = params;
    const body = await req.json();
    const { action, reason } = body; // "CANCEL"

    if (action === "CANCEL") {
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });

      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      if (invoice.status === "CANCELLED") {
        return NextResponse.json({ error: "Invoice is already cancelled" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Revert stock
        for (const item of invoice.items) {
          const currentStock = await tx.stock.findUnique({
            where: {
              godownId_productId: {
                godownId: invoice.godownId,
                productId: item.productId,
              },
            },
          });

          const prev = currentStock?.quantity || 0;
          const next = prev + item.quantity;

          await tx.stock.update({
            where: {
              godownId_productId: {
                godownId: invoice.godownId,
                productId: item.productId,
              },
            },
            data: { quantity: next },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId: invoice.godownId,
              type: "RETURN",
              quantity: item.quantity,
              previousStock: prev,
              newStock: next,
              referenceType: "INVOICE_CANCELLED",
              referenceId: invoice.id,
              notes: `Stock returned due to cancellation of invoice #${invoice.invoiceNumber}. Reason: ${reason || "N/A"}`,
              userId: session?.id,
            },
          });
        }

        // 2. Revert Khata ledger & Customer Balance
        const netCustomerAdjustment = invoice.grandTotal - invoice.paidAmount;
        const currentBal = invoice.customer.currentBalance;
        const newBal = currentBal - netCustomerAdjustment;

        await tx.ledgerEntry.create({
          data: {
            location: invoice.location,
            entityType: "CUSTOMER",
            customerId: invoice.customerId,
            entryDate: new Date(),
            transactionType: "ADJUSTMENT",
            debit: 0,
            credit: netCustomerAdjustment > 0 ? netCustomerAdjustment : 0,
            balance: newBal,
            referenceType: "INVOICE",
            referenceId: invoice.id,
            referenceNumber: invoice.invoiceNumber,
            notes: `Invoice Cancellation Adjustment (${reason || "Customer request"})`,
            createdById: session?.id,
          },
        });

        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: newBal },
        });

        // 3. Mark invoice cancelled
        await tx.salesInvoice.update({
          where: { id },
          data: {
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            balanceDue: 0,
            notes: `${invoice.notes || ""}\n[CANCELLED: ${reason || "No reason given"}]`,
          },
        });
      });

      return NextResponse.json({ success: true, message: "Invoice cancelled and stock restored" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Invoice action error:", error);
    return NextResponse.json({ error: error.message || "Failed to process action" }, { status: 500 });
  }
}
