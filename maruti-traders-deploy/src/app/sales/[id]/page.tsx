"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, amountToWords } from "@/lib/formatters";
import { generateInvoiceWhatsAppUrl } from "@/lib/whatsapp";
import {
  Printer,
  Share2,
  Download,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Copy,
  ExternalLink,
  X,
  MessageCircle,
} from "lucide-react";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formatType, setFormatType] = useState<"A4" | "PDF_VIEW" | "THERMAL">("A4");
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  async function fetchInvoice() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`);
      if (res.ok) {
        const d = await res.json();
        setInvoice(d.invoice);
        setCompany(d.company);
        if (d.invoice?.customer?.phone) {
          setCustomPhone(d.invoice.customer.phone);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleDirectPdfDownload() {
    if (!invoice) return;
    const downloadUrl = `/api/sales/${invoice.id}/pdf`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrintCanonicalPdf() {
    if (!invoice) return;
    const printUrl = `/api/sales/${invoice.id}/pdf`;
    let iframe = document.getElementById("canonical-pdf-print-frame") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "canonical-pdf-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }
    iframe.src = printUrl;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        const win = window.open(printUrl, "_blank");
        win?.focus();
      }
    };
  }


  if (loading || !invoice) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">
          Loading invoice details...
        </div>
      </AppLayout>
    );
  }

  const invoiceLoc: LocationCode = (invoice.location?.toUpperCase() === "DAHOD" ? "DAHOD" : "JALOD");
  const branch = BRANCH_CONFIGS[invoiceLoc] || BRANCH_CONFIGS.JALOD;

  const comp = company || {
    name: branch.name,
    tagline: branch.tagline,
    address: branch.address,
    city: branch.city,
    state: branch.state,
    pincode: "327001",
    phone: branch.phone,
    gstin: branch.gstin,
    pan: branch.pan,
    bankName: "ICICI Bank Ltd.",
    accountNumber: "023405009876",
    ifscCode: "ICIC0000234",
    upiId: `marutitraders.${invoiceLoc.toLowerCase()}@icici`,
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const pdfDirectUrl = `${origin}/invoices/${invoice.invoiceNumber}.pdf`;

  const waUrl = generateInvoiceWhatsAppUrl({
    customerName: invoice.customer?.name || "Valued Customer",
    customerPhone: customPhone || invoice.customer?.phone || "",
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    grandTotal: formatINR(invoice.grandTotal),
    paidAmount: formatINR(invoice.paidAmount),
    balanceDue: formatINR(invoice.balanceDue),
    paymentMode: invoice.paymentMode,
    companyName: comp.name,
    companyPhone: comp.phone,
    upiId: comp.upiId,
    pdfDownloadUrl: pdfDirectUrl,
  });

  function copyPdfLink() {
    navigator.clipboard.writeText(pdfDirectUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Actions Bar (Hidden during Print) */}
        <div className="no-print bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link
              href="/sales"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">{invoice.invoiceNumber}</h1>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold">
                  {branch.name}
                </span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                    invoice.status === "CANCELLED"
                      ? "bg-rose-100 text-rose-800"
                      : invoice.paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {invoice.status === "CANCELLED" ? "CANCELLED" : invoice.paymentStatus}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">Bill Date: {formatDate(invoice.invoiceDate)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
            {/* Format toggle: A4 vs Canonical PDF File vs Thermal Receipt */}
            <div className="bg-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl grid grid-cols-3 sm:flex space-x-0.5 sm:space-x-1 border border-slate-200 text-[10px] sm:text-xs font-semibold text-center">
              <button
                onClick={() => setFormatType("A4")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition ${
                  formatType === "A4" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A4 Tax Invoice
              </button>
              <button
                onClick={() => setFormatType("PDF_VIEW")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition ${
                  formatType === "PDF_VIEW"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Canonical PDF
              </button>
              <button
                onClick={() => setFormatType("THERMAL")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition ${
                  formatType === "THERMAL"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thermal Slip
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
              {/* Share WhatsApp Modal Trigger */}
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition"
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Share PDF</span>
              </button>

              {/* Download PDF via API */}
              <button
                onClick={handleDirectPdfDownload}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Download</span>
              </button>

              {/* Print Canonical PDF */}
              <button
                onClick={handlePrintCanonicalPdf}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition"
                title="Print the canonical PDF document with exact margins and layout"
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>


        {/* WhatsApp Document Share Modal */}
        {isWhatsAppModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Share Invoice PDF via WhatsApp</h3>
                    <p className="text-xs text-slate-500">Official document sharing workflow</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Informational alert */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Official Invoice PDF Ready</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        The invoice PDF has been generated and saved. You can download the PDF to attach directly to your WhatsApp chat, or share the direct link below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recipient Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="e.g. 9829012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Direct Link box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice PDF Document Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={pdfDirectUrl}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono text-slate-700"
                    />
                    <button
                      onClick={copyPdfLink}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center space-x-1 shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{linkCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Download PDF button helper */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-800">{invoice.invoiceNumber}.pdf</p>
                      <p className="text-[11px] text-slate-500">Ready to download and attach to chat</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDirectPdfDownload}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    Download
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => setIsWhatsAppModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-900/20"
                  >
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FORMAT 1: A4 GST TAX INVOICE */}
        {formatType === "A4" && (
          <div className="print-card bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-3.5 sm:p-6 md:p-8 max-w-4xl mx-auto text-slate-900 print:p-0 print:border-0 print:shadow-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start pb-4 sm:pb-6 border-b-2 border-slate-900 gap-4">
              <div>
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg sm:text-xl shrink-0">
                    MT
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{comp.name}</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">{comp.tagline}</p>
                  </div>
                </div>
                <div className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs text-slate-600 space-y-0.5">
                  <p>{comp.address}</p>
                  <p>
                    {comp.city}, {comp.state} - {comp.pincode}
                  </p>
                  <p>
                    Phone: <strong className="text-slate-800">{comp.phone}</strong> | Email: {comp.email}
                  </p>
                  <p className="font-mono">
                    GSTIN: <strong className="text-slate-800">{comp.gstin}</strong> | PAN: {comp.pan}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right print:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="inline-block bg-slate-900 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider mb-1.5 sm:mb-2">
                  Tax Invoice
                </span>
                <p className="font-mono text-sm sm:text-base font-black text-slate-900">{invoice.invoiceNumber}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Date: {formatDate(invoice.invoiceDate)}</p>
                {invoice.dueDate && (
                  <p className="text-[11px] sm:text-xs text-slate-500">Due Date: {formatDate(invoice.dueDate)}</p>
                )}
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">
                  Godown: <strong>{invoice.godown?.name}</strong>
                </p>
              </div>
            </div>

            {/* Bill To Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 sm:gap-6 py-3.5 sm:py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Billed To / Customer Details:
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">{invoice.customer.name}</p>
                {invoice.customer.companyName && (
                  <p className="font-medium text-slate-700">{invoice.customer.companyName}</p>
                )}
                <p className="text-slate-600 mt-0.5">{invoice.customer.address}</p>
                <p className="text-slate-600">
                  {invoice.customer.city}, {invoice.customer.state}
                </p>
                <p className="mt-1">
                  Mobile: <strong>{invoice.customer.phone}</strong>
                </p>
                {invoice.customer.gstin && (
                  <p className="font-mono mt-0.5">
                    GSTIN: <strong>{invoice.customer.gstin}</strong>
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right print:text-right space-y-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Payment Terms & Settlement
                </span>
                <p className="text-slate-700">
                  Payment Mode: <strong className="text-slate-900">{invoice.paymentMode}</strong>
                </p>
                <p className="text-slate-700">
                  Payment Status:{" "}
                  <strong
                    className={
                      invoice.paymentStatus === "PAID"
                        ? "text-emerald-700 font-bold"
                        : "text-amber-700 font-bold"
                    }
                  >
                    {invoice.paymentStatus}
                  </strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Place of Supply: <strong>{comp.city}, {comp.state}</strong>
                </p>
              </div>
            </div>

            {/* Items: Mobile Card List (Screen Only on Mobile - No Horizontal Scroll) */}
            <div className="block sm:hidden print:hidden py-3 divide-y divide-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Purchased Items ({invoice.items.length})
              </span>
              {invoice.items.map((item: any, idx: number) => (
                <div key={item.id} className="py-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-slate-900">
                      <span className="text-slate-400 font-mono mr-1.5">#{idx + 1}</span>
                      {item.description || item.product.name}
                    </div>
                    <span className="font-mono font-black text-xs text-slate-900 shrink-0">
                      {formatINR(item.totalAmount)}
                    </span>
                  </div>

                  {item.slabDetails && (
                    <p className="text-[10px] text-slate-500">{item.slabDetails}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <div>
                      <span className="font-bold text-emerald-800">{item.quantity} {item.unit || "SQ.FT"}</span>
                      <span className="text-[10px] text-slate-400 ml-1">@ {formatINR(item.unitPrice)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      HSN: {item.hsnCode || "6802"} • GST {item.gstRate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Items Table (Visible on Desktop Screen & Always on Print) */}
            <div className="hidden sm:block print:block py-4 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-700">
                    <th className="py-2 text-left font-bold w-8">#</th>
                    <th className="py-2 text-left font-bold">Item & Marble Details</th>
                    <th className="py-2 text-center font-bold">HSN</th>
                    <th className="py-2 text-center font-bold">Qty / Unit</th>
                    <th className="py-2 text-right font-bold">Rate (₹)</th>
                    <th className="py-2 text-right font-bold">Disc</th>
                    <th className="py-2 text-right font-bold">Taxable</th>
                    <th className="py-2 text-center font-bold">GST</th>
                    <th className="py-2 text-right font-bold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 font-bold text-slate-900">
                        {item.description || item.product.name}
                        {item.slabDetails && (
                          <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                            {item.slabDetails}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-mono text-slate-600">{item.hsnCode || "6802"}</td>
                      <td className="py-2.5 text-center font-mono font-bold">
                        {item.quantity} {item.unit || "SQ.FT"}
                      </td>
                      <td className="py-2.5 text-right font-mono">{formatINR(item.unitPrice)}</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {item.discountAmount > 0 ? formatINR(item.discountAmount) : "-"}
                      </td>
                      <td className="py-2.5 text-right font-mono">{formatINR(item.taxableAmount)}</td>
                      <td className="py-2.5 text-center font-mono">{item.gstRate}%</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {formatINR(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Bank Summary */}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 print:grid print:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t-2 border-slate-200 text-xs">
              <div>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Amount in Words:</span>
                  <br />
                  <strong className="text-slate-900">{amountToWords(invoice.grandTotal)}</strong>
                </p>

                {/* Bank Details */}
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-700 uppercase block mb-1">
                    Bank Details for IMPS / NEFT / RTGS:
                  </span>
                  <p>Bank Name: {comp.bankName}</p>
                  <p className="font-mono">Account No: {comp.accountNumber}</p>
                  <p className="font-mono">IFSC Code: {comp.ifscCode}</p>
                  <p className="font-mono text-emerald-700 font-bold">UPI ID: {comp.upiId}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-right">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Amount:</span>
                  <span className="font-mono font-medium">{formatINR(invoice.taxableAmount)}</span>
                </div>
                {invoice.cgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central Tax 9%):</span>
                    <span className="font-mono">{formatINR(invoice.cgstAmount)}</span>
                  </div>
                )}
                {invoice.sgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State Tax 9%):</span>
                    <span className="font-mono">{formatINR(invoice.sgstAmount)}</span>
                  </div>
                )}
                {invoice.igstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (18%):</span>
                    <span className="font-mono">{formatINR(invoice.igstAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatINR(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-base">{formatINR(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{formatINR(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatINR(invoice.balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatory Footer */}
            <div className="flex flex-col sm:flex-row print:flex-row justify-between gap-4 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 text-xs">
              <div className="max-w-md">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Terms & Conditions:
                </span>
                <p className="text-[11px] text-slate-500 whitespace-pre-line">
                  {invoice.terms || `1. Goods once sold will not be taken back.\n2. Marble is natural stone; variation is normal.\n3. Subject to ${branch.city} jurisdiction only.`}
                </p>
              </div>

              <div className="text-center sm:text-right print:text-right flex flex-col justify-end items-center sm:items-end print:items-end pt-4 sm:pt-0">
                <p className="font-bold text-slate-900 mb-8 sm:mb-10">For, MARUTI TRADERS</p>
                <p className="text-xs text-slate-600 border-t border-slate-300 pt-1 w-48 text-center">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FORMAT 2: CANONICAL PDF DOCUMENT VIEW */}
        {formatType === "PDF_VIEW" && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-navy-800" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">Canonical Finalized Invoice PDF</h3>
                    <span className="font-mono text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      {invoice.invoiceNumber}.pdf
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This is the finalized immutable document. Download, WhatsApp Share, and Print all reference this exact file.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDirectPdfDownload}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={handlePrintCanonicalPdf}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300 flex items-center space-x-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>
            <iframe
              src={`/api/sales/${invoice.id}/pdf`}
              className="w-full h-[850px] rounded-2xl border border-slate-200 shadow-inner bg-slate-100"
              title={`Canonical Invoice PDF - ${invoice.invoiceNumber}`}
            />
          </div>
        )}

        {/* FORMAT 3: 80mm COMPACT THERMAL RECEIPT */}
        {formatType === "THERMAL" && (
          <div className="print-card bg-white rounded-lg shadow-sm border border-slate-300 p-4 max-w-[320px] mx-auto text-black font-mono text-xs">
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h3 className="font-bold text-sm tracking-wide">{comp.name.toUpperCase()}</h3>
              <p className="text-[10px]">{comp.address}</p>
              <p className="text-[10px]">{comp.city}, {comp.state}</p>
              <p className="text-[10px]">Ph: {comp.phone}</p>
              <p className="text-[10px]">GSTIN: {comp.gstin}</p>
            </div>

            <div className="py-2 border-b border-dashed border-black text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill: {invoice.invoiceNumber}</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div>Customer: {invoice.customer.name}</div>
              <div>Phone: {invoice.customer.phone}</div>
            </div>

            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between font-bold pb-1 text-[11px]">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              {invoice.items.map((item: any) => (
                <div key={item.id} className="py-0.5 text-[10px]">
                  <div className="font-bold truncate">{item.product.name}</div>
                  <div className="flex justify-between text-slate-700">
                    <span>
                      {item.quantity} {item.unit} @ ₹{item.unitPrice}
                    </span>
                    <span>₹{item.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Taxable:</span>
                <span>₹{invoice.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span>₹{invoice.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid ({invoice.paymentMode}):</span>
                <span>₹{invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Due Balance:</span>
                <span>₹{invoice.balanceDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] space-y-0.5">
              <p>UPI ID: {comp.upiId}</p>
              <p>*** Thank You - Visit Again ***</p>
              <p>Goods once sold will not be returned</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
