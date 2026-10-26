export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("filter") === "low";
    const status = searchParams.get("status"); // "active", "archived", "all"
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {
      location,
    };

    if (status === "archived") {
      where.isActive = false;
    } else if (status === "all" || includeInactive) {
      // show all
    } else {
      where.isActive = true; // default active only
    }


    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
        { brand: { contains: search } },
        { colour: { contains: search } },
        { finish: { contains: search } },
      ];
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        stocks: {
          include: {
            godown: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const categories = await prisma.product.findMany({
      where: { location, isActive: true },
      select: { category: true },
      distinct: ["category"],
    });

    // Compute total stock and apply lowStock filter if requested
    const formatted = products.map((p) => {
      const totalStock = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      const isLowStock = totalStock <= p.minStockAlert;
      const isOutOfStock = totalStock <= 0;
      const valuation = totalStock * p.purchasePrice;

      let parsedPhotos: string[] = [];
      try {
        if (p.photos) {
          parsedPhotos = JSON.parse(p.photos);
        }
      } catch {
        parsedPhotos = [];
      }
      if (parsedPhotos.length === 0 && p.photoUrl) {
        parsedPhotos = [p.photoUrl];
      }

      return {
        ...p,
        photosList: parsedPhotos,
        totalStock,
        isLowStock,
        isOutOfStock,
        valuation,
        godownStocks: p.stocks.map((s) => ({
          godownId: s.godownId,
          godownName: s.godown.name,
          godownCode: s.godown.code,
          quantity: s.quantity,
          slabCount: s.slabCount,
        })),
      };
    });

    const finalProducts = lowStockOnly
      ? formatted.filter((p) => p.isLowStock || p.isOutOfStock)
      : formatted;

    return NextResponse.json({
      location,
      products: finalProducts,
      categories: categories.map((c) => c.category),
      totalCount: finalProducts.length,
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);

    const body = await req.json();
    const {
      name,
      sku,
      barcode,
      category,
      subcategory,
      brand,
      model,
      size,
      colour,
      finish,
      thickness,
      slabCount,
      totalSqft,
      unit,
      description,
      photoUrl,
      photos,
      purchasePrice,
      sellingPrice,
      wholesalePrice,
      gstRate,
      hsnCode,
      minStockAlert,
      openingStock,
      godownId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    let finalSku = (sku || "").trim().toUpperCase();
    if (!finalSku) {
      finalSku = `PRD-${location.slice(0, 3)}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const existingSku = await prisma.product.findUnique({
      where: {
        location_sku: {
          location,
          sku: finalSku,
        },
      },
    });

    if (existingSku) {
      if (sku) {
        return NextResponse.json({ error: `Product with SKU ${sku} already exists in ${location}` }, { status: 400 });
      }
      finalSku = `PRD-${location.slice(0, 3)}-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const photosJson = Array.isArray(photos) ? JSON.stringify(photos) : photos || null;
    const primaryPhoto = photoUrl || (Array.isArray(photos) && photos[0]) || null;

    // Database transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          location,
          name: name.trim(),
          sku: finalSku,
          barcode: barcode || null,
          category: category || "General",
          subcategory: subcategory || null,
          brand: brand || null,
          model: model || null,
          size: size || null,
          colour: colour || null,
          finish: finish || "Standard",
          thickness: thickness || "",
          slabCount: parseFloat(slabCount) || 0,
          totalSqft: parseFloat(totalSqft) || parseFloat(openingStock) || 0,
          unit: unit || "SQ.FT",
          description: description || null,
          photoUrl: primaryPhoto,
          photos: photosJson,
          purchasePrice: parseFloat(purchasePrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
          gstRate: parseFloat(gstRate) || 0,
          hsnCode: hsnCode || "6802",
          minStockAlert: parseFloat(minStockAlert) || 0,
          openingStock: parseFloat(openingStock) || 0,
          isActive: true,
        },
      });

      // Fetch active godowns for this location only!
      const locationGodowns = await tx.godown.findMany({
        where: { location, isActive: true },
      });

      const targetGodownId = godownId || locationGodowns[0]?.id;

      for (const g of locationGodowns) {
        const isTarget = g.id === targetGodownId;
        const qty = isTarget ? parseFloat(openingStock) || 0 : 0;
        const slabs = isTarget ? parseFloat(slabCount) || 0 : 0;
        await tx.stock.create({
          data: {
            godownId: g.id,
            productId: prod.id,
            quantity: qty,
            slabCount: slabs,
            minStockLevel: parseFloat(minStockAlert) || 500,
          },
        });
      }

      if (parseFloat(openingStock) > 0 && targetGodownId) {
        await tx.stockMovement.create({
          data: {
            productId: prod.id,
            godownId: targetGodownId,
            type: "ADJUSTMENT",
            quantity: parseFloat(openingStock),
            previousStock: 0,
            newStock: parseFloat(openingStock),
            referenceType: "OPENING_STOCK",
            notes: "Initial product opening stock recorded",
            userId: session?.id,
          },
        });
      }

      return prod;
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, photos, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const photosJson = Array.isArray(photos) ? JSON.stringify(photos) : photos;
    const primaryPhoto = data.photoUrl || (Array.isArray(photos) && photos[0]) || undefined;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        brand: data.brand,
        size: data.size,
        colour: data.colour,
        finish: data.finish,
        thickness: data.thickness,
        slabCount: data.slabCount !== undefined ? parseFloat(data.slabCount) : undefined,
        totalSqft: data.totalSqft !== undefined ? parseFloat(data.totalSqft) : undefined,
        unit: data.unit,
        description: data.description,
        photoUrl: primaryPhoto,
        photos: photosJson,
        purchasePrice: data.purchasePrice !== undefined ? parseFloat(data.purchasePrice) : undefined,
        sellingPrice: data.sellingPrice !== undefined ? parseFloat(data.sellingPrice) : undefined,
        wholesalePrice: data.wholesalePrice ? parseFloat(data.wholesalePrice) : null,
        gstRate: data.gstRate !== undefined ? parseFloat(data.gstRate) : undefined,
        hsnCode: data.hsnCode,
        minStockAlert: data.minStockAlert !== undefined ? parseFloat(data.minStockAlert) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    if (data.openingStock !== undefined && data.godownId) {
      const stockQty = parseFloat(data.openingStock) || 0;
      await prisma.stock.upsert({
        where: {
          godownId_productId: {
            godownId: data.godownId,
            productId: id,
          },
        },
        update: {
          quantity: stockQty,
        },
        create: {
          godownId: data.godownId,
          productId: id,
          quantity: stockQty,
          slabCount: 0,
          minStockLevel: 0,
        },
      });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    if (session && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can remove products" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

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

