import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stocks: {
          include: { godown: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "SKU",
      "Product Name",
      "Barcode",
      "Category",
      "Brand",
      "Unit",
      "Purchase Price (INR)",
      "Selling Price (INR)",
      "GST Rate (%)",
      "HSN Code",
      "Total Stock",
      "Min Stock Alert",
      "Total Inventory Value (INR)",
    ];

    const rows = products.map((p) => {
      const totalStock = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      const val = totalStock * p.purchasePrice;
      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.barcode || ""}"`,
        `"${p.category}"`,
        `"${p.brand || ""}"`,
        `"${p.unit}"`,
        p.purchasePrice,
        p.sellingPrice,
        p.gstRate,
        `"${p.hsnCode || ""}"`,
        totalStock,
        p.minStockAlert,
        val,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="maruti_traders_inventory_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
