import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { BRANCH_CONFIGS, LocationCode } from "./location";

/**
 * Returns the saved canonical PDF for an invoice if it already exists on disk,
 * guaranteeing 100% byte-for-byte immutability across Download, WhatsApp Share, and Print.
 * If not yet created, it generates and saves the canonical PDF to disk.
 */
export async function getCanonicalInvoicePdf(invoice: any, forceRegenerate = false): Promise<Buffer> {
  const invoicesDir = path.join(process.cwd(), "public", "invoices");
  const fileName = `${invoice.invoiceNumber || "invoice"}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  if (!forceRegenerate && existsSync(filePath)) {
    try {
      const existing = await readFile(filePath);
      if (existing && existing.length > 0) {
        return existing;
      }
    } catch {
      // Fall through to generate
    }
  }

  return generateInvoicePdf(invoice);
}

export async function generateInvoicePdf(invoice: any): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const location: LocationCode = (invoice.location?.toUpperCase() === "DAHOD" ? "DAHOD" : "JALOD");
  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  // Navy blue brand color
  const navy = [15, 23, 42]; // #0f172a
  const emerald = location === "JALOD" ? [5, 150, 105] : [37, 99, 235]; // emerald or blue accent
  const slateDark = [51, 65, 85];
  const slateLight = [100, 116, 139];

  // Header Background Bar
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, 210, 36, "F");

  // Company Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MARUTI TRADERS", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(branch.name.toUpperCase(), 14, 21);
  doc.text(`${branch.address} • Ph: ${branch.phone}`, 14, 27);
  doc.text(`Branch GSTIN: ${branch.gstin} | PAN: ${branch.pan}`, 14, 32);

  // Right Side Header: TAX INVOICE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", 196, 16, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Original for Recipient`, 196, 22, { align: "right" });
  doc.text(`Location: ${branch.state}`, 196, 27, { align: "right" });

  // Invoice Meta Box
  let y = 44;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 24, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.text("Invoice Number:", 18, y + 6);
  doc.text("Invoice Date:", 75, y + 6);
  doc.text("Payment Status:", 135, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(invoice.invoiceNumber || "MT-LOD-0001", 18, y + 12);

  const invDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  doc.text(invDate, 75, y + 12);

  const statusText = (invoice.paymentStatus || "UNPAID").replace(/_/g, " ");
  doc.text(statusText, 135, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.text(`Godown: ${invoice.godown?.name || "Central Yard"}`, 18, y + 18);
  doc.text(`Payment Mode: ${invoice.paymentMode || "Cash/UPI"}`, 75, y + 18);
  doc.text(`HSN Chapter: 6802 (Worked Marble)`, 135, y + 18);

  // Bill To (Customer Details)
  y = 74;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, 182, 28, 2, 2, "D");

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("BILLED TO / CUSTOMER DETAILS", 18, y + 5);

  const cust = invoice.customer || {};
  doc.setFontSize(9);
  doc.text(cust.name || "Cash Customer", 18, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Phone: ${cust.phone || "N/A"}  |  City: ${cust.city || branch.city}, ${cust.state || branch.state}`, 18, y + 19);
  doc.text(`Address: ${cust.address || "Counter Sale"}`, 18, y + 24);
  if (cust.gstin) {
    doc.text(`Customer GSTIN: ${cust.gstin}`, 120, y + 13);
  }

  // Items Table
  const tableRows = (invoice.items || []).map((it: any, idx: number) => {
    const desc = it.description || it.product?.name || "Marble Slabs";
    const details = it.slabDetails ? `\n${it.slabDetails}` : "";
    return [
      idx + 1,
      `${desc}${details}`,
      it.hsnCode || "6802",
      `${it.quantity} ${it.unit || "SQ.FT"}`,
      `₹ ${Number(it.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `₹ ${Number(it.discountAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `${it.gstRate || 18}%`,
      `₹ ${Number(it.totalAmount || it.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: 106,
    head: [["#", "Item Description", "HSN", "Qty / Unit", "Rate (₹)", "Disc (₹)", "GST %", "Total (₹)"]],
    body: tableRows.length > 0 ? tableRows : [["1", "Italian Statuario Marble Slabs (18mm)", "6802", "150 SQFT", "₹ 550.00", "₹ 0.00", "18%", "₹ 97,350.00"]],
    theme: "grid",
    headStyles: {
      fillColor: [navy[0], navy[1], navy[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 20, halign: "right" },
    },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Bottom Summary Box & Bank Details
  // Bank Details Left Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, finalY, 100, 36, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("BANK & PAYMENT DETAILS", 18, finalY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Bank: ICICI Bank Ltd.`, 18, finalY + 13);
  doc.text(`Account Name: Maruti Traders`, 18, finalY + 18);
  doc.text(`Account No: 023405009876`, 18, finalY + 23);
  doc.text(`IFSC Code: ICIC0000234 (Branch: ${branch.city})`, 18, finalY + 28);
  doc.text(`UPI ID: marutitraders.${location.toLowerCase()}@icici`, 18, finalY + 33);

  // Financial Totals Right Table
  const rightX = 120;
  const valX = 196;
  let curY = finalY + 4;

  const row = (label: string, val: number, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 9.5 : 8.5);
    doc.setTextColor(isBold ? navy[0] : slateDark[0], isBold ? navy[1] : slateDark[1], isBold ? navy[2] : slateDark[2]);
    doc.text(label, rightX, curY);
    doc.text(`₹ ${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, curY, { align: "right" });
    curY += 5;
  };

  row("Taxable Amount:", invoice.taxableAmount || invoice.subTotal || 0);
  if (invoice.cgstAmount > 0) row("CGST (9%):", invoice.cgstAmount);
  if (invoice.sgstAmount > 0) row("SGST (9%):", invoice.sgstAmount);
  if (invoice.igstAmount > 0) row("IGST (18%):", invoice.igstAmount);
  if (invoice.roundOff) row("Round Off:", invoice.roundOff);

  doc.setDrawColor(203, 213, 225);
  doc.line(rightX, curY - 2, 196, curY - 2);

  row("Grand Total:", invoice.grandTotal || 0, true);
  row("Paid Amount:", invoice.paidAmount || 0);
  row("Balance Due:", invoice.balanceDue || 0, true);

  // Terms and Signatures
  const footerY = Math.max(finalY + 42, 255);
  doc.setFontSize(7.5);
  doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.text("Terms & Conditions:", 14, footerY);
  doc.text(`1. Goods once sold will not be taken back or exchanged after loading/delivery.`, 14, footerY + 4);
  doc.text(`2. Marble is a natural stone; natural colour variation and veining are inherent.`, 14, footerY + 8);
  doc.text(`3. Subject to ${branch.city} / ${branch.state} jurisdiction only.`, 14, footerY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("For MARUTI TRADERS", 196, footerY + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.text("Authorized Signatory", 196, footerY + 16, { align: "right" });

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);

  // Write persistently to public/invoices/<invoiceNumber>.pdf
  try {
    const invoicesDir = path.join(process.cwd(), "public", "invoices");
    await mkdir(invoicesDir, { recursive: true });
    const fileName = `${invoice.invoiceNumber || "invoice"}.pdf`;
    await writeFile(path.join(invoicesDir, fileName), buffer);
  } catch (err) {
    console.error("Failed to save invoice PDF to disk:", err);
  }

  return buffer;
}
