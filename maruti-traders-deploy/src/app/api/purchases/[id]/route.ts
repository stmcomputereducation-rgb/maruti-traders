export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { calculateGST } from "@/lib/formatters";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const purchase = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        godown: true,
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const loc: LocationCode = (purchase.location?.toUpperCase() === "DAHOD" ? "DAHOD" : "JALOD");
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
        termsAndConditions: `1. Goods received in sound condition and verified against Delivery Challan.\n2. Natural marble variance accepted.\n3. Subject to ${b.city} jurisdiction only.`,
        invoicePrefix: b.invoicePrefix,
        currencySymbol: "₹",
        logoUrl: null,
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ purchase, company });
  } catch (error) {
    console.error("Single purchase GET error:", error);
    return NextResponse.json({ error: "Failed to load purchase" }, { status: 500 });
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

    const {
      supplierId,
      supplierData,
      supplierName,
      godownId,
      billNumber,
      billDate,
      receivedDate,
      items,
      discountAmount = 0,
      paidAmount = 0,
      paymentMode = "CASH",
      splitPayments,
      notes,
      status = "RECEIVED",
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one purchase item is required" }, { status: 400 });
    }

    if (!godownId) {
      return NextResponse.json({ error: "Please select a receiving godown" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Fetch existing purchase
      const existing = await tx.purchaseInvoice.findUnique({
        where: { id },
        include: { items: true, supplier: true },
      });

      if (!existing) throw new Error("Purchase invoice not found");

      // 2. Revert previous stock if was RECEIVED
      if (existing.status === "RECEIVED") {
        for (const oldItem of existing.items) {
          const currentStock = await tx.stock.findUnique({
            where: {
              godownId_productId: {
                godownId: existing.godownId,
                productId: oldItem.productId,
              },
            },
          });

          const prevQty = currentStock?.quantity || 0;
          const nextQty = Math.max(0, prevQty - oldItem.quantity);

          await tx.stock.update({
            where: {
              godownId_productId: {
                godownId: existing.godownId,
                productId: oldItem.productId,
              },
            },
            data: { quantity: nextQty },
          });

          await tx.stockMovement.create({
            data: {
              productId: oldItem.productId,
              godownId: existing.godownId,
              type: "ADJUSTMENT",
              quantity: -oldItem.quantity,
              previousStock: prevQty,
              newStock: nextQty,
              referenceType: "PURCHASE_EDIT",
              referenceId: existing.id,
              notes: `Stock adjusted during edit of Purchase #${existing.purchaseNumber}`,
              userId: session?.id,
            },
          });
        }
      }

      // 3. Revert previous supplier balance
      const oldNetOwed = existing.grandTotal - existing.paidAmount;
      const prevSupp = await tx.supplier.findUnique({ where: { id: existing.supplierId } });
      if (prevSupp) {
        await tx.supplier.update({
          where: { id: existing.supplierId },
          data: { currentBalance: prevSupp.currentBalance - oldNetOwed },
        });
      }

      // Resolve final supplier
      let finalSupplierId = supplierId || existing.supplierId;
      const sName = (supplierData?.name || supplierName || "").trim();
      if (!supplierId && sName) {
        let existingSupp = null;
        if (supplierData?.phone?.trim()) {
          existingSupp = await tx.supplier.findFirst({
            where: { location: existing.location, phone: supplierData.phone.trim() },
          });
        }
        if (!existingSupp) {
          existingSupp = await tx.supplier.findFirst({
            where: { location: existing.location, name: { equals: sName } },
          });
        }
        if (existingSupp) {
          finalSupplierId = existingSupp.id;
        } else {
          const safePhone = supplierData?.phone?.trim() || `NA-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
          const createdSupp = await tx.supplier.create({
            data: {
              location: existing.location,
              name: sName,
              phone: safePhone,
              address: supplierData?.address || "Jalod",
              city: supplierData?.city || "Jalod",
              state: supplierData?.state || "Gujarat",
              gstin: supplierData?.gstin || null,
              openingBalance: 0,
              currentBalance: 0,
            },
          });
          finalSupplierId = createdSupp.id;
        }
      }

      // 4. Calculate new items
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
            where: { location: existing.location, name: { equals: itemName } },
          });

          if (!prod) {
            const randSku = `PUR-${existing.location.slice(0, 3)}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
            prod = await tx.product.create({
              data: {
                location: existing.location,
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

        if (!prod) throw new Error(`Product not found: ${item.productId || itemName}`);

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
          slabDetails: item.slabDetails || null,
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

      let finalPaid = parseFloat(paidAmount) || 0;
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        finalPaid = splitPayments.reduce((sum: number, sp: any) => sum + (parseFloat(sp.amount) || 0), 0);
      }
      const balanceDue = Math.max(0, grandTotal - finalPaid);

      let paymentStatus = "UNPAID";
      if (finalPaid >= grandTotal) {
        paymentStatus = "PAID";
      } else if (finalPaid > 0) {
        paymentStatus = "PARTIALLY_PAID";
      }

      // 5. Delete old items and payments
      await tx.purchaseInvoiceItem.deleteMany({ where: { purchaseId: id } });
      await tx.payment.deleteMany({ where: { purchaseInvoiceId: id } });

      // 6. Update Purchase Invoice
      const updatedPurchase = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          supplierId: finalSupplierId,
          godownId,
          billNumber: billNumber || null,
          billDate: billDate ? new Date(billDate) : new Date(),
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          status,
          subTotal,
          discountAmount: parseFloat(discountAmount) || 0,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          totalTax,
          grandTotal,
          paidAmount: finalPaid,
          balanceDue,
          paymentStatus,
          paymentMode: Array.isArray(splitPayments) && splitPayments.length > 0 ? "SPLIT" : paymentMode,
          notes: notes || null,
          items: {
            create: processedItems,
          },
        },
        include: { items: true },
      });

      // 7. Apply new stock additions if RECEIVED
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
              referenceType: "PURCHASE_EDIT",
              referenceId: updatedPurchase.id,
              notes: `Stock updated via edited Purchase Bill #${updatedPurchase.purchaseNumber}`,
              userId: session?.id,
            },
          });
        }
      }

      // 8. Re-apply supplier balance and ledger
      const targetSupplier = await tx.supplier.findUnique({ where: { id: finalSupplierId } });
      if (targetSupplier) {
        const balAfterBill = targetSupplier.currentBalance + grandTotal;

        await tx.ledgerEntry.create({
          data: {
            location: updatedPurchase.location,
            entityType: "SUPPLIER",
            supplierId: finalSupplierId,
            entryDate: new Date(),
            transactionType: "PURCHASE_UPDATED",
            debit: 0,
            credit: grandTotal,
            balance: balAfterBill,
            referenceType: "BILL",
            referenceId: updatedPurchase.id,
            referenceNumber: billNumber || updatedPurchase.purchaseNumber,
            notes: `Purchase #${billNumber || updatedPurchase.purchaseNumber} updated`,
            createdById: session?.id,
          },
        });

        let runningSupplierBal = balAfterBill;

        if (Array.isArray(splitPayments) && splitPayments.length > 0) {
          let payCount = await tx.payment.count({ where: { location: updatedPurchase.location } });
          for (const sp of splitPayments) {
            const spAmount = parseFloat(sp.amount) || 0;
            if (spAmount <= 0) continue;
            payCount++;
            const paymentNumber = `PAY-${updatedPurchase.location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount).padStart(4, "0")}`;
            const spMode = sp.mode || "CASH";

            const pRecord = await tx.payment.create({
              data: {
                location: updatedPurchase.location,
                paymentNumber,
                type: "PAYMENT",
                supplierId: finalSupplierId,
                purchaseInvoiceId: updatedPurchase.id,
                amount: spAmount,
                paymentDate: new Date(),
                paymentMode: spMode,
                referenceNumber: sp.referenceNumber || null,
                notes: sp.referenceNumber
                  ? `Split payment (${spMode} #${sp.referenceNumber}) for Purchase ${updatedPurchase.purchaseNumber}`
                  : `Split payment (${spMode}) for Purchase ${updatedPurchase.purchaseNumber}`,
                createdById: session?.id,
              },
            });

            runningSupplierBal -= spAmount;
            await tx.ledgerEntry.create({
              data: {
                location: updatedPurchase.location,
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
        } else if (finalPaid > 0) {
          const payCount = await tx.payment.count({ where: { location: updatedPurchase.location } });
          const paymentNumber = `PAY-${updatedPurchase.location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, "0")}`;
          const paymentRecord = await tx.payment.create({
            data: {
              location: updatedPurchase.location,
              paymentNumber,
              type: "PAYMENT",
              supplierId: finalSupplierId,
              purchaseInvoiceId: updatedPurchase.id,
              amount: finalPaid,
              paymentDate: new Date(),
              paymentMode,
              notes: `Payment for Purchase ${updatedPurchase.purchaseNumber}`,
              createdById: session?.id,
            },
          });

          runningSupplierBal -= finalPaid;
          await tx.ledgerEntry.create({
            data: {
              location: updatedPurchase.location,
              entityType: "SUPPLIER",
              supplierId: finalSupplierId,
              entryDate: new Date(),
              transactionType: "PAYMENT_MADE",
              debit: finalPaid,
              credit: 0,
              balance: runningSupplierBal,
              referenceType: "PAYMENT",
              referenceId: paymentRecord.id,
              referenceNumber: paymentNumber,
              notes: `Paid via ${paymentMode}`,
              createdById: session?.id,
            },
          });
        }

        await tx.supplier.update({
          where: { id: finalSupplierId },
          data: { currentBalance: runningSupplierBal },
        });
      }

      return updatedPurchase;
    });

    return NextResponse.json({ success: true, purchase: updated });
  } catch (error: any) {
    console.error("Purchase update PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update purchase" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionUserFromRequest(req);
    const { id } = params;

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseInvoice.findUnique({
        where: { id },
        include: { items: true, supplier: true },
      });

      if (!purchase) throw new Error("Purchase invoice not found");

      // 1. Revert stock
      if (purchase.status === "RECEIVED") {
        for (const item of purchase.items) {
          const currentStock = await tx.stock.findUnique({
            where: {
              godownId_productId: {
                godownId: purchase.godownId,
                productId: item.productId,
              },
            },
          });

          const prev = currentStock?.quantity || 0;
          const next = Math.max(0, prev - item.quantity);

          await tx.stock.update({
            where: {
              godownId_productId: {
                godownId: purchase.godownId,
                productId: item.productId,
              },
            },
            data: { quantity: next },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              godownId: purchase.godownId,
              type: "PURCHASE_RETURN",
              quantity: -item.quantity,
              previousStock: prev,
              newStock: next,
              referenceType: "PURCHASE_DELETED",
              referenceId: purchase.id,
              notes: `Stock removed due to deletion of purchase bill #${purchase.purchaseNumber}`,
              userId: session?.id,
            },
          });
        }
      }

      // 2. Revert Supplier Balance & Ledger
      const netSupplierOwed = purchase.grandTotal - purchase.paidAmount;
      const supp = await tx.supplier.findUnique({ where: { id: purchase.supplierId } });
      if (supp) {
        const newBal = supp.currentBalance - netSupplierOwed;
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: { currentBalance: newBal },
        });

        await tx.ledgerEntry.create({
          data: {
            location: purchase.location,
            entityType: "SUPPLIER",
            supplierId: purchase.supplierId,
            entryDate: new Date(),
            transactionType: "PURCHASE_CANCELLED",
            debit: netSupplierOwed > 0 ? netSupplierOwed : 0,
            credit: 0,
            balance: newBal,
            referenceType: "BILL_CANCELLED",
            referenceId: purchase.id,
            referenceNumber: purchase.purchaseNumber,
            notes: `Purchase Bill #${purchase.purchaseNumber} deleted and ledger reverted`,
            createdById: session?.id,
          },
        });
      }

      // 3. Delete payments linked
      await tx.payment.deleteMany({
        where: { purchaseInvoiceId: id },
      });

      // 4. Delete items and purchase invoice
      await tx.purchaseInvoiceItem.deleteMany({
        where: { purchaseId: id },
      });

      await tx.purchaseInvoice.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Purchase consignment successfully removed and stock/ledger reverted.",
    });
  } catch (error: any) {
    console.error("Purchase deletion DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove purchase" }, { status: 400 });
  }
}
