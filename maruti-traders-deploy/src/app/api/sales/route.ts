export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { calculateGST } from "@/lib/formatters";
import { getActiveLocationFromReq } from "@/lib/location-server";
import { BRANCH_CONFIGS } from "@/lib/location";
import { generateInvoicePdf } from "@/lib/invoicePdf";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const where: any = { location };
    if (customerId) where.customerId = customerId;
    if (status) where.paymentStatus = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const invoices = await prisma.salesInvoice.findMany({
      where,
      include: {
        customer: true,
        godown: true,
        salesperson: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return NextResponse.json({ location, invoices });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sales invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

    const body = await req.json();
    const {
      customerId,
      customerData,
      godownId,
      invoiceDate,
      dueDate,
      items,
      discountAmount = 0,
      roundOff = 0,
      paidAmount = 0,
      paymentMode = "CASH",
      splitPayments = null,
      referenceNumber,
      notes,
      terms,
      isInterState = false,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!godownId) {
      return NextResponse.json({ error: "Please select a godown" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer in this location
      let finalCustomerId = customerId;
      const custName = (customerData?.name || body.customerName || "").trim();

      if (!finalCustomerId && custName) {
        // Check if customer exists in this location by phone or name
        let existingCust = null;
        if (customerData?.phone?.trim()) {
          existingCust = await tx.customer.findFirst({
            where: { location, phone: customerData.phone.trim() },
          });
        }
        if (!existingCust) {
          existingCust = await tx.customer.findFirst({
            where: {
              location,
              name: { equals: custName },
            },
          });
        }

        if (existingCust) {
          finalCustomerId = existingCust.id;
        } else {
          const safePhone = customerData?.phone?.trim() || null;
          const createdCust = await tx.customer.create({
            data: {
              location,
              name: custName,
              phone: safePhone,
              address: customerData?.address || branch.city,
              city: customerData?.city || branch.city,
              state: customerData?.state || branch.state,
              gstin: customerData?.gstin || null,
              openingBalance: 0,
              currentBalance: 0,
            },
          });
          finalCustomerId = createdCust.id;
        }
      }

      if (!finalCustomerId) {
        throw new Error("Please select a customer or type a customer name");
      }

      const customer = await tx.customer.findUnique({ where: { id: finalCustomerId } });
      if (!customer) {
        throw new Error("Customer not found");
      }

      // 2. Validate line items
      let subTotal = 0;
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const processedItems = [];

      for (const item of items) {
        let prod = null;
        if (item.productId && item.productId !== "manual" && item.productId !== "custom") {
          prod = await tx.product.findUnique({ where: { id: item.productId } });
        }

        const itemName = (item.productName || item.description || "").trim();
        if (!prod && itemName) {
          // Check if product with this name exists in this location
          prod = await tx.product.findFirst({
            where: {
              location,
              name: { equals: itemName },
            },
          });

          if (!prod) {
            const randSku = `ITM-${location.slice(0, 3)}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
            prod = await tx.product.create({
              data: {
                location,
                name: itemName,
                sku: randSku,
                unit: item.unit || "SQFT",
                purchasePrice: parseFloat(item.unitPrice) || 0,
                sellingPrice: parseFloat(item.unitPrice) || 0,
                gstRate: parseFloat(item.gstRate) !== undefined ? parseFloat(item.gstRate) : 18,
                category: "General",
                openingStock: 0,
                totalSqft: 0,
              },
            });
          }
        }

        if (!prod) {
          throw new Error(`Product not found or name not specified for item`);
        }

        const qty = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.unitPrice) !== undefined ? parseFloat(item.unitPrice) : prod.sellingPrice;
        const lineDiscount = parseFloat(item.discountAmount) || 0;
        const gstRate = parseFloat(item.gstRate) !== undefined ? parseFloat(item.gstRate) : prod.gstRate;

        // Check stock in chosen godown
        let stockRow = await tx.stock.findUnique({
          where: {
            godownId_productId: {
              godownId,
              productId: prod.id,
            },
          },
        });

        // If manual product or no stock record in this godown, initialize stock so sale proceeds smoothly
        if (!stockRow) {
          stockRow = await tx.stock.create({
            data: {
              godownId,
              productId: prod.id,
              quantity: qty,
              slabCount: 0,
              minStockLevel: 50,
            },
          });
        } else if (stockRow.quantity < qty && (item.isManual || item.productId === "manual" || item.productId === "custom")) {
          await tx.stock.update({
            where: { id: stockRow.id },
            data: { quantity: qty },
          });
          stockRow.quantity = qty;
        } else if (stockRow.quantity < qty) {
          throw new Error(
            `Insufficient stock for "${prod.name}" in this godown. Available: ${stockRow?.quantity || 0} SQFT, Requested: ${qty} SQFT`
          );
        }

        const lineSubtotal = qty * rate;
        const taxable = Math.max(0, lineSubtotal - lineDiscount);
        const gst = calculateGST(taxable, gstRate, isInterState);
        const lineTotal = taxable + gst.totalTax;

        subTotal += lineSubtotal;
        totalTaxable += taxable;
        totalCgst += gst.cgstAmount;
        totalSgst += gst.sgstAmount;
        totalIgst += gst.igstAmount;

        processedItems.push({
          productId: prod.id,
          description: prod.name,
          hsnCode: prod.hsnCode || "6802",
          slabDetails: item.slabDetails || (prod.size ? `Dimensions: ${prod.size}` : null),
          quantity: qty,
          unit: prod.unit || "SQFT",
          unitPrice: rate,
          discountAmount: lineDiscount,
          gstRate,
          taxableAmount: taxable,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          igstAmount: gst.igstAmount,
          totalAmount: lineTotal,
        });
      }

      const totalTax = totalCgst + totalSgst + totalIgst;
      const rawGrandTotal = totalTaxable + totalTax - (parseFloat(discountAmount) || 0);
      const grandTotal = Math.round(rawGrandTotal + (parseFloat(roundOff) || 0));

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

      // Generate location-specific invoice number: MT-JAL-2026-0001 or MT-DAH-2026-0001
      const count = await tx.salesInvoice.count({ where: { location } });
      let nextSeq = count + 1;
      let invoiceNumber = `${branch.invoicePrefix}${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;
      while (await tx.salesInvoice.findUnique({ where: { invoiceNumber } })) {
        nextSeq++;
        invoiceNumber = `${branch.invoicePrefix}${new Date().getFullYear()}-${String(nextSeq).padStart(4, "0")}`;
      }

      // 3. Create Sales Invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          location,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          customerId: finalCustomerId,
          godownId,
          salespersonId: session?.id || null,
          invoiceType: "TAX_INVOICE",
          status: "FINALIZED",
          subTotal,
          discountAmount: parseFloat(discountAmount) || 0,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          totalTax,
          roundOff: parseFloat(roundOff) || 0,
          grandTotal,
          paidAmount: parsedPaid,
          balanceDue,
          paymentStatus,
          paymentMode,
          notes: notes || null,
          terms: terms || `Subject to ${branch.city} / ${branch.state} jurisdiction only`,
          items: {
            create: processedItems,
          },
        },
        include: { items: true, customer: true, godown: true },
      });

      // 4. Decrement Godown Stock & record StockMovement
      for (const item of processedItems) {
        const currentStock = await tx.stock.findUnique({
          where: {
            godownId_productId: {
              godownId,
              productId: item.productId,
            },
          },
        });

        const prev = currentStock?.quantity || 0;
        const next = prev - item.quantity;

        await tx.stock.update({
          where: {
            godownId_productId: {
              godownId,
              productId: item.productId,
            },
          },
          data: { quantity: next },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            godownId,
            type: "SALE",
            quantity: -item.quantity,
            previousStock: prev,
            newStock: next,
            referenceType: "INVOICE",
            referenceId: invoice.id,
            notes: `Sold via ${invoiceNumber}`,
            userId: session?.id,
          },
        });
      }

      // 6. Khata Book (Ledger) updates - Initial Sale Debit
      const newBalAfterSale = customer.currentBalance + grandTotal;
      await tx.ledgerEntry.create({
        data: {
          location,
          entityType: "CUSTOMER",
          customerId: finalCustomerId,
          entryDate: new Date(),
          transactionType: "SALE",
          debit: grandTotal,
          credit: 0,
          balance: newBalAfterSale,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          referenceNumber: invoiceNumber,
          notes: `Sales Invoice #${invoiceNumber}`,
          createdById: session?.id,
        },
      });

      let runningBalance = newBalAfterSale;

      // Handle Split Payments or Single Payment
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        let payCount = await tx.payment.count({ where: { location } });
        for (const sp of splitPayments) {
          const spAmount = parseFloat(sp.amount) || 0;
          if (spAmount <= 0) continue;
          payCount++;
          const paymentNumber = `REC-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount).padStart(4, "0")}`;
          const spMode = sp.mode || "CASH";

          const pRecord = await tx.payment.create({
            data: {
              location,
              paymentNumber,
              type: "RECEIPT",
              customerId: finalCustomerId,
              salesInvoiceId: invoice.id,
              amount: spAmount,
              paymentDate: new Date(),
              paymentMode: spMode,
              referenceNumber: sp.referenceNumber || referenceNumber || null,
              notes: `Split payment (${spMode}) against invoice ${invoiceNumber}`,
              createdById: session?.id,
            },
          });

          runningBalance -= spAmount;
          await tx.ledgerEntry.create({
            data: {
              location,
              entityType: "CUSTOMER",
              customerId: finalCustomerId,
              entryDate: new Date(),
              transactionType: "PAYMENT_RECEIVED",
              debit: 0,
              credit: spAmount,
              balance: runningBalance,
              referenceType: "PAYMENT",
              referenceId: pRecord.id,
              referenceNumber: paymentNumber,
              notes: `Payment received via ${spMode}`,
              createdById: session?.id,
            },
          });
        }
      } else if (parsedPaid > 0) {
        const payCount = await tx.payment.count({ where: { location } });
        const paymentNumber = `REC-${location.slice(0, 3)}-${new Date().getFullYear()}-${String(payCount + 1).padStart(4, "0")}`;
        const paymentRecord = await tx.payment.create({
          data: {
            location,
            paymentNumber,
            type: "RECEIPT",
            customerId: finalCustomerId,
            salesInvoiceId: invoice.id,
            amount: parsedPaid,
            paymentDate: new Date(),
            paymentMode,
            referenceNumber: referenceNumber || null,
            notes: `Receipt against invoice ${invoiceNumber}`,
            createdById: session?.id,
          },
        });

        runningBalance -= parsedPaid;
        await tx.ledgerEntry.create({
          data: {
            location,
            entityType: "CUSTOMER",
            customerId: finalCustomerId,
            entryDate: new Date(),
            transactionType: "PAYMENT_RECEIVED",
            debit: 0,
            credit: parsedPaid,
            balance: runningBalance,
            referenceType: "PAYMENT",
            referenceId: paymentRecord?.id,
            referenceNumber: paymentRecord?.paymentNumber || invoiceNumber,
            notes: `Payment received (${paymentMode})`,
            createdById: session?.id,
          },
        });
      }

      // 7. Update Customer running balance (Remaining balance automatically remains as Credit/Udhaar)
      await tx.customer.update({
        where: { id: finalCustomerId },
        data: { currentBalance: runningBalance },
      });

      return invoice;
    });

    // Generate persistent PDF asynchronously
    try {
      await generateInvoicePdf(result);
    } catch (pdfErr) {
      console.error("Auto PDF generation error:", pdfErr);
    }

    return NextResponse.json({ success: true, invoice: result }, { status: 201 });
  } catch (error: any) {
    console.error("Sales POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to finalize invoice" }, { status: 400 });
  }
}
