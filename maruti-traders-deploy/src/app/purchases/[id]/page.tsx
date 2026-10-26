"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, amountToWords } from "@/lib/formatters";
import {
  Printer,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Truck,
  Building,
  Share2,
  X,
  AlertTriangle,
  Receipt,
  FileText,
} from "lucide-react";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [purchase, setPurchase] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPurchase();
  }, [id]);

  async function fetchPurchase() {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/${id}`);
      if (res.ok) {
        const d = await res.json();
        setPurchase(d.purchase);
        setCompany(d.company);
      } else {
        router.push("/purchases");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePurchase() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/purchases");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove purchase");
      }
    } catch {
      alert("Error removing purchase record");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading || !purchase) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">
          Loading purchase details...
        </div>
      </AppLayout>
    );
  }

  const purchaseLoc: LocationCode = (purchase.location?.toUpperCase() === "DAHOD" ? "DAHOD" : "JALOD");
  const branch = BRANCH_CONFIGS[purchaseLoc] || BRANCH_CONFIGS.JALOD;

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
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Actions Bar (Hidden during Print) */}
        <div className="no-print bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link
              href="/purchases"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">{purchase.purchaseNumber}</h1>
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold">
                  {branch.name}
                </span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                    purchase.paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : purchase.paymentStatus === "PARTIALLY_PAID"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {purchase.paymentStatus}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Supplier Bill: <strong>{purchase.billNumber || "N/A"}</strong> • Date: {formatDate(purchase.billDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Print Bill</span>
            </button>

            {/* Edit Purchase Button */}
            <Link
              href={`/purchases/${purchase.id}/edit`}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition"
            >
              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Edit</span>
            </Link>

            {/* Remove Purchase Button */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Remove</span>
            </button>
          </div>
        </div>

        {/* Goods Inward / Purchase Bill A4 Document */}
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
              <span className="inline-block bg-blue-900 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider mb-1.5 sm:mb-2">
                Purchase Bill / Inward
              </span>
              <p className="font-mono text-sm sm:text-base font-black text-slate-900">{purchase.purchaseNumber}</p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                Bill No: <strong className="text-slate-800">{purchase.billNumber || "Direct Inward"}</strong>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Bill Date: {formatDate(purchase.billDate)}</p>
              {purchase.receivedDate && (
                <p className="text-[11px] sm:text-xs text-slate-500">Received Date: {formatDate(purchase.receivedDate)}</p>
              )}
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">
                Destination Godown: <strong>{purchase.godown?.name}</strong>
              </p>
            </div>
          </div>

          {/* Supplier & Consignment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 sm:gap-6 py-3.5 sm:py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Supplier / Manufacturer Details:
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">{purchase.supplier?.name}</p>
              {purchase.supplier?.companyName && (
                <p className="font-medium text-slate-700">{purchase.supplier.companyName}</p>
              )}
              <p className="text-slate-600 mt-0.5">{purchase.supplier?.address}</p>
              <p className="text-slate-600">
                {purchase.supplier?.city}, {purchase.supplier?.state}
              </p>
              <p className="mt-1">
                Mobile: <strong>{purchase.supplier?.phone}</strong>
              </p>
              {purchase.supplier?.gstin && (
                <p className="font-mono mt-0.5">
                  GSTIN: <strong>{purchase.supplier.gstin}</strong>
                </p>
              )}
            </div>

            <div className="text-left sm:text-right print:text-right space-y-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Payment & Inward Status
              </span>
              <p className="text-slate-700">
                Payment Mode: <strong className="text-slate-900">{purchase.paymentMode}</strong>
              </p>
              <p className="text-slate-700">
                Payment Status:{" "}
                <strong
                  className={
                    purchase.paymentStatus === "PAID"
                      ? "text-emerald-700 font-bold"
                      : "text-amber-700 font-bold"
                  }
                >
                  {purchase.paymentStatus}
                </strong>
              </p>
              <p className="text-slate-700">
                Consignment Status: <strong className="text-blue-900">{purchase.status}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                Inward Godown: <strong>{purchase.godown?.name}</strong> ({purchase.godown?.city})
              </p>
            </div>
          </div>

          {/* Items: Mobile Card List (Screen Only on Mobile - No Horizontal Scroll) */}
          <div className="block sm:hidden print:hidden py-3 divide-y divide-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
              Inward Items ({purchase.items.length})
            </span>
            {purchase.items.map((item: any, idx: number) => (
              <div key={item.id} className="py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900">
                    <span className="text-slate-400 font-mono mr-1.5">#{idx + 1}</span>
                    {item.product?.name || item.description}
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
                    <span className="font-bold text-blue-900">{item.quantity} {item.unit || item.product?.unit || "SQ.FT"}</span>
                    <span className="text-[10px] text-slate-400 ml-1">@ {formatINR(item.unitPrice)}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    HSN: {item.product?.hsnCode || "6802"} • GST {item.gstRate}%
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
                  <th className="py-2 text-left font-bold">Product Details</th>
                  <th className="py-2 text-center font-bold">HSN</th>
                  <th className="py-2 text-center font-bold">Qty / Unit</th>
                  <th className="py-2 text-right font-bold">Rate (₹)</th>
                  <th className="py-2 text-right font-bold">Discount</th>
                  <th className="py-2 text-right font-bold">Taxable</th>
                  <th className="py-2 text-center font-bold">GST</th>
                  <th className="py-2 text-right font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td className="py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-slate-900">
                      {item.product?.name || item.description}
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                        SKU: {item.product?.sku} {item.product?.category && `• ${item.product.category}`}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono text-slate-600">{item.product?.hsnCode || "6802"}</td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      {item.quantity} {item.unit || item.product?.unit || "SQ.FT"}
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

          {/* Calculations & Summary */}
          <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 print:grid print:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t-2 border-slate-200 text-xs">
            <div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-700">Amount in Words:</span>
                <br />
                <strong className="text-slate-900">{amountToWords(purchase.grandTotal)}</strong>
              </p>

              {purchase.notes && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px]">
                  <span className="font-bold text-slate-700 block mb-0.5">Consignment Notes:</span>
                  <p className="text-slate-600">{purchase.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-right">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="font-mono font-medium">{formatINR(purchase.taxableAmount)}</span>
              </div>
              {purchase.cgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST (Central Tax):</span>
                  <span className="font-mono">{formatINR(purchase.cgstAmount)}</span>
                </div>
              )}
              {purchase.sgstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST (State Tax):</span>
                  <span className="font-mono">{formatINR(purchase.sgstAmount)}</span>
                </div>
              )}
              {purchase.igstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-mono">{formatINR(purchase.igstAmount)}</span>
                </div>
              )}
              {purchase.discountAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatINR(purchase.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                <span>Total Bill Value:</span>
                <span className="text-base">{formatINR(purchase.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatINR(purchase.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Payable:</span>
                <span className="font-mono">{formatINR(purchase.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatures */}
          <div className="flex flex-col sm:flex-row print:flex-row justify-between gap-4 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 text-xs">
            <div className="max-w-md">
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Goods Receipt Declaration:
              </span>
              <p className="text-[11px] text-slate-500">
                Materials listed above were inspected and received in good order and credited to supplier ledger at {comp.name}, {branch.city}.
              </p>
            </div>

            <div className="text-center sm:text-right print:text-right flex flex-col justify-end items-center sm:items-end print:items-end pt-4 sm:pt-0">
              <p className="font-bold text-slate-900 mb-8 sm:mb-10">Goods Verified & Received By</p>
              <p className="text-xs text-slate-600 border-t border-slate-300 pt-1 w-48 text-center">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 text-slate-900">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Remove Purchase Bill?</h3>
                <p className="text-xs text-slate-500 font-mono">{purchase.purchaseNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove this purchase consignment from <strong>{purchase.supplier?.name}</strong> (Bill value: <strong>{formatINR(purchase.grandTotal)}</strong>)?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1 mb-5">
              <p className="font-bold">⚠️ Warning:</p>
              <p>• Inwarded marble stock will be automatically deducted from godown stock.</p>
              <p>• Supplier ledger and current outstanding balance will be reversed.</p>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePurchase}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-rose-900/20"
              >
                {isDeleting ? <span>Removing...</span> : <span>Confirm Remove</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
