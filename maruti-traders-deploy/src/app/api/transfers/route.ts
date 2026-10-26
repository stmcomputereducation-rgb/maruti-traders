export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);

    const transfers = await prisma.stockTransfer.findMany({
      where: { location },
      include: {
        sourceGodown: { select: { id: true, name: true, code: true, city: true } },
        destinationGodown: { select: { id: true, name: true, code: true, city: true } },
        dispatchedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, finish: true, thickness: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ location, transfers });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);

    const body = await req.json();
    const { sourceGodownId, destinationGodownId, items, notes, dispatchImmediately } = body;

    if (!sourceGodownId || !destinationGodownId || !items || items.length === 0) {
      return NextResponse.json({ error: "Source, Destination, and items are required" }, { status: 400 });
    }

    if (sourceGodownId === destinationGodownId) {
      return NextResponse.json({ error: "Source and destination godown cannot be identical. Transfers must be between Jalod and Dahod." }, { status: 400 });
    }

    // Verify both godowns are authorized Jalod or Dahod godowns
    const [sourceGdw, destGdw] = await Promise.all([
      prisma.godown.findUnique({ where: { id: sourceGodownId } }),
      prisma.godown.findUnique({ where: { id: destinationGodownId } }),
    ]);

    if (!sourceGdw || !destGdw) {
      return NextResponse.json({ error: "Invalid godown specified" }, { status: 400 });
    }

    const ALLOWED_CODES = ["JALOD", "DAHOD", "LODHA"];
    if (!ALLOWED_CODES.includes(sourceGdw.code) || !ALLOWED_CODES.includes(destGdw.code)) {
      return NextResponse.json(
        { error: "Stock transfers are strictly authorized only between Jalod Godown and Dahod Godown." },
        { status: 403 }
      );
    }

    if (sourceGdw.code === destGdw.code) {
      return NextResponse.json({ error: "Cannot transfer stock from a godown to itself." }, { status: 400 });
    }


    const transferNumber = `TRF-${location.slice(0, 3)}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify source stock availability
      for (const item of items) {
        const sourceStock = await tx.stock.findUnique({
          where: {
            godownId_productId: {
              godownId: sourceGodownId,
              productId: item.productId,
            },
          },
        });

        if (!sourceStock || sourceStock.quantity < item.quantity) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          throw new Error(
            `Insufficient stock for "${prod?.name || item.productId}". Available: ${sourceStock?.quantity || 0}, Requested: ${item.quantity}`
          );
        }
      }

      const initialStatus = dispatchImmediately ? "DISPATCHED" : "DRAFT";

      const transfer = await tx.stockTransfer.create({
        data: {
          location,
          transferNumber,
          sourceGodownId,
          destinationGodownId,
          status: initialStatus,
          notes: notes || null,
          dispatchedById: dispatchImmediately ? session?.id || null : null,
          dispatchedAt: dispatchImmediately ? new Date() : null,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantityRequested: parseFloat(i.quantity),
              quantityReceived: null,
            })),
          },
        },
        include: { items: true },
      });

      // If immediately dispatched, deduct source godown stock
      if (dispatchImmediately) {
        for (const item of items) {
          const qty = parseFloat(item.quantity);
          const currentStock = await tx.stock.findUnique({
            where: {
              godownId_productId: {
                godownId: sourceGodownId,
                productId: item.productId,
              },
            },
          });

          const prev = currentStock?.quantity || 0;
          const next = prev - qty;

          await tx.stock.update({
            where: {
              godownId_productId: {
                godownId: sourceGodownId,
                productId: item.productId,
              },
            },
            data: { quantity: next },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId: sourceGodownId,
              type: "TRANSFER_OUT",
              quantity: -qty,
              previousStock: prev,
              newStock: next,
              referenceType: "TRANSFER",
              referenceId: transfer.id,
              notes: `Dispatched to ${destinationGodownId} via ${transferNumber}`,
              userId: session?.id,
            },
          });
        }
      }

      return transfer;
    });

    return NextResponse.json({ success: true, transfer: result }, { status: 201 });
  } catch (error: any) {
    console.error("Transfer POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create transfer" }, { status: 400 });
  }
}
