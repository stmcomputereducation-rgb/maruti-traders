export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { calculateGST } from "@/lib/formatters";
import { getActiveLocationFromReq } from "@/lib/location-server";
import { BRANCH_CONFIGS } from "@/lib/location";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const supplierId = searchParams.get("supplierId");

    const where: any = { location };
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search } },
        { billNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: true,
        godown: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { billDate: "desc" },
    });

    return NextResponse.json({ location, purchases });
  } catch (error) {
    console.error("Purchases GET error:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

    const body = await req.json();
    const {
      supplierId,
      supplierData,
      godownId,
      billNumber,
      billDate,
      receivedDate,
      items,
      discountAmount = 0,
      paidAmount = 0,
      paymentMode = "CASH",
      splitPayments = null,
      notes,
      status = "RECEIVED",
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one purchase item is required" }, { status: 400 });
    }

    if (!godownId) {
      return NextResponse.json({ error: "Please select a receiving godown" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve supplier in this location
      let finalSupplierId = supplierId;
      const suppName = (supplierData?.name || body.supplierName || "").trim();

      if (!finalSupplierId && suppName) {
        let existingSupp = null;
        if (supplierData?.phone?.trim()) {
          existingSupp = await tx.supplier.findFirst({
            where: { location, phone: supplierData.phone.trim() },
          });
        }
        if (!existingSupp) {
          existingSupp = await tx.supplier.findFirst({
            where: {
              location,
              name: { equals: suppName },
            },
          });
        }

        if (existingSupp) {
          finalSupplierId = existingSupp.id;
        } else {
          const safePhone = supplierData?.phone?.trim() || null;
          const createdSupp = await tx.supplier.create({
            data: {
              location,
              name: suppName,
              phone: safePhone,
              address: supplierData?.address || branch.city,
              city: supplierData?.city || branch.city,
              state: supplierData?.state || branch.state,
              gstin: supplierData?.gstin || null,
              openingBalance: 0,
              currentBalance: 0,
            },
          });
          finalSupplierId = createdSupp.id;
        }
      }

      if (!finalSupplierId) {
        throw new Error("Please select a supplier or type a supplier name");
      }

      const supplier = await tx.supplier.findUnique({ where: { id: finalSupplierId } });
      if (!supplier) throw new Error("Supplier not found");

      // 2. Calculate items
      let subTotal = 0;
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;

      const processedItems = [];

      for (const item of items) {
        let prod = null;
        if (item.productId && item.productId !== "manual" && item.productId !== "custom") {
          prod = await tx.product.findUnique({ where: { id: item.productId } });
        }

        const itemName = (item.productName || item.description || "").trim();
        if (!prod && itemName) {
          prod = await tx.product.findFirst({
            where: {
              location,
              name: { equals: itemName },
            },
          });

          if (!prod) {
            const randSku = `PUR-${location.slice(0, 3)}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
            prod = await tx.product.create({
              data: {
                location,
                name: itemName,
                sku: randSku,
                unit: item.unit || "SQFT",
                purchasePrice: parseFloat(item.unitPrice) || 0,
                sellingPrice: (parseFloat(item.unitPrice) || 0) * 1.25,
                gstRate: parseFloat(item.gstRate) !== undefined ? parseFloat(item.gstRate) : 18,
                category: "General",
                openingStock: 0,
                totalSqft: 0,
              },
            });
          }
        }

        if (!prod) throw new Error(`Product not found or name not specified for item`);

        const qty = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.unitPrice) !== undefined ? parseFloat(item.unitPrice) : prod.purchasePrice;
        const lineDiscount = parseFloat(item.discountAmount) || 0;
        const gstRate = parseFloat(item.gstRate) !== undefined ? parseFloat(item.gstRate) : prod.gstRate;

        const lineSubtotal = qty * rate;
        const taxable = Math.max(0, lineSubtotal - lineDiscount);
        const gst = calculateGST(taxable, gstRate, false);
        const lineTotal = taxable + gst.totalTax;

        subTotal += lineSubtotal;
        totalTaxable += taxable;
        totalCgst += gst.cgstAmount;
        totalSgst += gst.sgstAmount;

        processedItems.push({
          productId: prod.id,
          quantity: qty,
          unitPrice: rate,
          discountAmount: lineDiscount,
          gstRate,
          taxableAmount: taxable,
          totalAmount: lineTotal,
        });
      }

      const totalTax = totalCgst + totalSgst;
      const grandTotal = Math.round(totalTaxable + totalTax - (parseFloat(discountAmount) || 0));
      let parsedPaid = parseFloat(paidAmount) || 0;
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        parsedPaid = splitPayments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0);
      }
      const balanceDue = Math.max(0, grandTotal - parsedPaid);

      let paymentStatus = "UNPAID";
      if (parsedPaid >= grandTotal) {
        paymentStatus = "PAID";
      } else if (parsedPaid > 0) {
        paymentStatus = "PARTIALLY_PAID";
      }

      const purCount = await tx.purchaseInvoice.count({ where: { location } });
      let nextSeq = purCount + 1;
      let purchaseNumber = `PUR-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;
      while (await tx.purchaseInvoice.findUnique({ where: { purchaseNumber } })) {
        nextSeq++;
        purchaseNumber = `PUR-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;
      }

      // 3. Create Purchase Invoice
      const purchase = await tx.purchaseInvoice.create({
        data: {
          location,
          purchaseNumber,
          billNumber: billNumber || null,
          billDate: billDate ? new Date(billDate) : new Date(),
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          supplierId: finalSupplierId,
          godownId,
          status,
          subTotal,
          discountAmount: parseFloat(discountAmount) || 0,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: 0,
          totalTax,
          grandTotal,
          paidAmount: parsedPaid,
          balanceDue,
          paymentStatus,
          paymentMode,
          notes: notes || null,
          items: {
            create: processedItems,
          },
        },
        include: { items: true },
      });

      // 4. Increment godown stock and create StockMovement
      if (status === "RECEIVED") {
        for (const item of processedItems) {
          const currentStock = await tx.stock.upsert({
            where: {
              godownId_productId: {
                godownId,
                productId: item.productId,
              },
            },
            create: {
              godownId,
              productId: item.productId,
              quantity: item.quantity,
              slabCount: 0,
              minStockLevel: 500,
            },
            update: {
              quantity: { increment: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId,
              type: "PURCHASE",
              quantity: item.quantity,
              previousStock: currentStock.quantity - item.quantity,
              newStock: currentStock.quantity,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              notes: `Received via Inward Bill #${purchaseNumber}`,
              userId: session?.id,
            },
          });
        }
      }

      // 5. Ledger entries (Initial Bill Credit to Supplier)
      const newBalAfterPurchase = supplier.currentBalance + grandTotal;
      await tx.ledgerEntry.create({
        data: {
          location,
          entityType: "SUPPLIER",
          supplierId: finalSupplierId,
          entryDate: new Date(),
          transactionType: "PURCHASE",
          debit: 0,
          credit: grandTotal,
          balance: newBalAfterPurchase,
          referenceType: "BILL",
          referenceId: purchase.id,
          referenceNumber: billNumber || purchaseNumber,
          notes: `Purchase Bill #${billNumber || purchaseNumber}`,
          createdById: session?.id,
        },
      });

      let runningSupplierBal = newBalAfterPurchase;

      // 6. Handle Split Payments or Single Payment
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        let payCount = await tx.payment.count({ where: { location } });
        for (const sp of splitPayments) {
          const spAmount = parseFloat(sp.amount) || 0;
          if (spAmount <= 0) continue;
          payCount++;
          const paymentNumber = `PAY-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount).padStart(4, "0")}`;
          const spMode = sp.mode || "CASH";

          const pRecord = await tx.payment.create({
            data: {
              location,
              paymentNumber,
              type: "PAYMENT",
              supplierId: finalSupplierId,
              purchaseInvoiceId: purchase.id,
              amount: spAmount,
              paymentDate: new Date(),
              paymentMode: spMode,
              referenceNumber: sp.referenceNumber || null,
              notes: sp.referenceNumber
                ? `Split payment (${spMode} #${sp.referenceNumber}) for Purchase ${purchaseNumber}`
                : `Split payment (${spMode}) for Purchase ${purchaseNumber}`,
              createdById: session?.id,
            },
          });

          runningSupplierBal -= spAmount;
          await tx.ledgerEntry.create({
            data: {
              location,
              entityType: "SUPPLIER",
              supplierId: finalSupplierId,
              entryDate: new Date(),
              transactionType: "PAYMENT_MADE",
              debit: spAmount,
              credit: 0,
              balance: runningSupplierBal,
              referenceType: "PAYMENT",
              referenceId: pRecord.id,
              referenceNumber: sp.referenceNumber || paymentNumber,
              notes: sp.referenceNumber ? `Paid via ${spMode} (${sp.referenceNumber})` : `Paid via ${spMode}`,
              createdById: session?.id,
            },
          });
        }
      } else if (parsedPaid > 0) {
        const payCount = await tx.payment.count({ where: { location } });
        const paymentNumber = `PAY-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, "0")}`;
        const paymentRecord = await tx.payment.create({
          data: {
            location,
            paymentNumber,
            type: "PAYMENT",
            supplierId: finalSupplierId,
            purchaseInvoiceId: purchase.id,
            amount: parsedPaid,
            paymentDate: new Date(),
            paymentMode,
            notes: `Payment for Purchase ${purchaseNumber}`,
            createdById: session?.id,
          },
        });

        runningSupplierBal -= parsedPaid;
        await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "SUPPLIER",
            supplierId: finalSupplierId,
            entryDate: new Date(),
            transactionType: "PAYMENT_MADE",
            debit: parsedPaid,
            credit: 0,
            balance: runningSupplierBal,
            referenceType: "PAYMENT",
            referenceId: paymentRecord?.id,
            referenceNumber: paymentRecord?.paymentNumber || purchaseNumber,
            notes: `Paid via ${paymentMode}`,
            createdById: session?.id,
          },
        });
      }

      // 7. Update Supplier current balance (Remaining balance automatically remains as Credit/Payable)
      await tx.supplier.update({
        where: { id: finalSupplierId },
        data: { currentBalance: runningSupplierBal },
      });

      return purchase;
    });

    return NextResponse.json({ success: true, purchase: result }, { status: 201 });
  } catch (error: any) {
    console.error("Purchases POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save purchase" }, { status: 400 });
  }
}
