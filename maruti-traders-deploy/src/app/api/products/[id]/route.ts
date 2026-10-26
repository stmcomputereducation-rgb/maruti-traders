export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stocks: {
          include: { godown: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [salesCount, purchaseCount, transferCount] = await Promise.all([
      prisma.salesInvoiceItem.count({ where: { productId: id } }),
      prisma.purchaseInvoiceItem.count({ where: { productId: id } }),
      prisma.stockTransferItem.count({ where: { productId: id } }),
    ]);

    const totalStock = product.stocks.reduce((acc, s) => acc + s.quantity, 0);
    const hasHistory = salesCount > 0 || purchaseCount > 0 || transferCount > 0;
    const canPermanentlyDelete = !hasHistory && totalStock === 0;

    return NextResponse.json({
      product,
      totalStock,
      salesCount,
      purchaseCount,
      transferCount,
      hasHistory,
      canPermanentlyDelete,
    });
  } catch (error) {
    console.error("Product GET by ID error:", error);
    return NextResponse.json({ error: "Failed to fetch product details" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionUserFromRequest(req);
    // Allow admin deletion / removal
    if (session && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can remove products" }, { status: 403 });
    }

    const { id } = params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { stocks: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [salesCount, purchaseCount, transferCount, movementCount] = await Promise.all([
      prisma.salesInvoiceItem.count({ where: { productId: id } }),
      prisma.purchaseInvoiceItem.count({ where: { productId: id } }),
      prisma.stockTransferItem.count({ where: { productId: id } }),
      prisma.stockMovement.count({
        where: { productId: id, referenceType: { not: "OPENING_STOCK" } },
      }),
    ]);

    const totalStock = product.stocks.reduce((acc, s) => acc + s.quantity, 0);
    const hasHistoricalTransactions = salesCount > 0 || purchaseCount > 0 || transferCount > 0 || movementCount > 0;

    // RULE 1: If product has historical records or existing stock, do NOT permanently delete.
    // Instead, safely archive & deactivate it to protect audit trails and invoice referential integrity.
    if (hasHistoricalTransactions || totalStock > 0) {
      const updated = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        action: "DEACTIVATED",
        product: updated,
        message: `Product "${product.name}" (${product.sku}) has been safely archived & deactivated. Historical invoices and stock logs remain fully preserved.`,
        remainingStock: totalStock,
        transactionsCount: salesCount + purchaseCount + transferCount,
      });
    }

    // RULE 2: If product has NO historical records and 0 stock, allow permanent deletion.
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.stock.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      action: "PERMANENTLY_DELETED",
      message: `Product "${product.name}" (${product.sku}) has been permanently deleted from inventory.`,
    });
  } catch (error: any) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove product" }, { status: 500 });
  }
}

// Reactivate product if desired
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Product PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product status" }, { status: 500 });
  }
}
