import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest, isAuthorized } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionUserFromRequest(req);
    const { id } = params;
    const body = await req.json();
    const { action } = body; // "DISPATCH", "RECEIVE", "CANCEL"

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (action === "DISPATCH") {
      if (transfer.status !== "DRAFT") {
        return NextResponse.json({ error: "Only DRAFT transfers can be dispatched" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Deduct from source godown
        for (const item of transfer.items) {
          const current = await tx.stock.findUnique({
            where: {
              godownId_productId: {
                godownId: transfer.sourceGodownId,
                productId: item.productId,
              },
            },
          });

          if (!current || current.quantity < item.quantityRequested) {
            throw new Error(`Insufficient stock in source godown for dispatch.`);
          }

          const prev = current.quantity;
          const next = prev - item.quantityRequested;

          await tx.stock.update({
            where: {
              godownId_productId: {
                godownId: transfer.sourceGodownId,
                productId: item.productId,
              },
            },
            data: { quantity: next },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId: transfer.sourceGodownId,
              type: "TRANSFER_OUT",
              quantity: -item.quantityRequested,
              previousStock: prev,
              newStock: next,
              referenceType: "TRANSFER",
              referenceId: transfer.id,
              notes: `Dispatched to destination godown`,
              userId: session?.id,
            },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: {
            status: "DISPATCHED",
            dispatchedById: session?.id || null,
            dispatchedAt: new Date(),
          },
        });
      });

      return NextResponse.json({ success: true, message: "Transfer dispatched successfully" });
    }

    if (action === "RECEIVE") {
      if (transfer.status !== "DISPATCHED" && transfer.status !== "IN_TRANSIT") {
        return NextResponse.json(
          { error: "Only DISPATCHED or IN_TRANSIT transfers can be marked as received" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Increment destination godown stock
        for (const item of transfer.items) {
          const receivedQty = item.quantityRequested;

          const current = await tx.stock.upsert({
            where: {
              godownId_productId: {
                godownId: transfer.destinationGodownId,
                productId: item.productId,
              },
            },
            create: {
              godownId: transfer.destinationGodownId,
              productId: item.productId,
              quantity: receivedQty,
              minStockLevel: 10,
            },
            update: {
              quantity: { increment: receivedQty },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId: transfer.destinationGodownId,
              type: "TRANSFER_IN",
              quantity: receivedQty,
              previousStock: current.quantity - receivedQty,
              newStock: current.quantity,
              referenceType: "TRANSFER",
              referenceId: transfer.id,
              notes: `Stock received from ${transfer.transferNumber}`,
              userId: session?.id,
            },
          });

          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: receivedQty },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: {
            status: "RECEIVED",
            receivedById: session?.id || null,
            receivedAt: new Date(),
          },
        });
      });

      return NextResponse.json({ success: true, message: "Stock received and destination inventory updated" });
    }

    if (action === "CANCEL") {
      if (transfer.status === "RECEIVED") {
        return NextResponse.json({ error: "Cannot cancel an already received transfer" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // If it was already dispatched, return the stock to source godown
        if (transfer.status === "DISPATCHED" || transfer.status === "IN_TRANSIT") {
          for (const item of transfer.items) {
            await tx.stock.update({
              where: {
                godownId_productId: {
                  godownId: transfer.sourceGodownId,
                  productId: item.productId,
                },
              },
              data: { quantity: { increment: item.quantityRequested } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                godownId: transfer.sourceGodownId,
                type: "ADJUSTMENT",
                quantity: item.quantityRequested,
                referenceType: "TRANSFER_CANCELLED",
                referenceId: transfer.id,
                notes: `Restored stock from cancelled transfer ${transfer.transferNumber}`,
                userId: session?.id,
              },
            });
          }
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      });

      return NextResponse.json({ success: true, message: "Transfer cancelled and stock restored" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Transfer status update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update transfer status" }, { status: 500 });
  }
}
