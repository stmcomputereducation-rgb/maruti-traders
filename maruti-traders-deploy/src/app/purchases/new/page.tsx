"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ProductCombobox from "@/components/ui/ProductCombobox";
import PartyCombobox from "@/components/ui/PartyCombobox";
import { formatINR, calculateGST } from "@/lib/formatters";
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Truck,
  Building,
  Save,
  X,
  CreditCard,
} from "lucide-react";

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function normalizeUnit(u?: string): "SQ.FT" | "BOX" | "PIECE" {
    if (!u) return "SQ.FT";
    const upper = u.toUpperCase().replace(/\./g, "").trim();
    if (upper === "BOX" || upper === "BOXES") return "BOX";
    if (upper === "PIECE" || upper === "PCS" || upper === "PC" || upper === "SLAB") return "PIECE";
    return "SQ.FT";
  }

  // Form Fields
  const [supplierInput, setSupplierInput] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [manualSupplier, setManualSupplier] = useState({
    name: "",
    phone: "",
    city: "Jalod",
    address: "",
    gstin: "",
  });
  const [selectedGodownId, setSelectedGodownId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");

  // Payment
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CHEQUE" | "CREDIT" | "SPLIT">("CASH");
  const [splitCash, setSplitCash] = useState<number | string>("");
  const [splitUpi, setSplitUpi] = useState<number | string>("");
  const [splitCheque, setSplitCheque] = useState<number | string>("");
  const [splitChequeRef, setSplitChequeRef] = useState("");

  // Items
  const [items, setItems] = useState<any[]>([
    {
      productId: "manual",
      productName: "",
      unit: "SQ.FT",
      quantity: 50,
      unitPrice: 0,
      discountAmount: 0,
      gstRate: 18,
      isManual: true,
    },
  ]);

  // Quick Supplier Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    address: "",
    city: "Jalod",
    gstin: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [suppRes, prodRes, godownRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/products"),
        fetch("/api/godowns"),
      ]);

      if (suppRes.ok) {
        const d = await suppRes.json();
        const sList = d.suppliers || [];
        setSuppliers(sList);
        if (sList.length > 0) {
          const firstS = sList[0];
          setSelectedSupplierId(firstS.id);
          setSupplierInput(firstS.name);
          setManualSupplier({
            name: firstS.name,
            phone: firstS.phone?.startsWith("NA-") ? "" : firstS.phone || "",
            city: firstS.city || "Jalod",
            address: firstS.address || "",
            gstin: firstS.gstin || "",
          });
        }
      }

      let loadedProducts: any[] = [];
      if (prodRes.ok) {
        const d = await prodRes.json();
        loadedProducts = d.products || [];
        setProducts(loadedProducts);
        if (loadedProducts.length > 0) {
          const firstP = loadedProducts[0];
          setItems([
            {
              productId: firstP.id,
              productName: firstP.name,
              unit: normalizeUnit(firstP.unit),
              quantity: 50,
              unitPrice: firstP.purchasePrice || 0,
              discountAmount: 0,
              gstRate: firstP.gstRate || 18,
              isManual: false,
            },
          ]);
        }
      }

      if (godownRes.ok) {
        const d = await godownRes.json();
        setGodowns(d.godowns || []);
        if (d.godowns.length > 0) setSelectedGodownId(d.godowns[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSupplierChange(val: string) {
    setSupplierInput(val);
    const found = suppliers.find(
      (s) =>
        s.name.toLowerCase() === val.toLowerCase() ||
        `${s.name} - ${s.phone}`.toLowerCase() === val.toLowerCase() ||
        s.phone === val
    );
    if (found) {
      setSelectedSupplierId(found.id);
      setManualSupplier({
        name: found.name,
        phone: found.phone?.startsWith("NA-") ? "" : found.phone || "",
        city: found.city || "Jalod",
        address: found.address || "",
        gstin: found.gstin || "",
      });
    } else {
      setSelectedSupplierId("");
      setManualSupplier((prev) => ({
        ...prev,
        name: val,
      }));
    }
  }

  function handleSupplierSelect(party: any) {
    setSelectedSupplierId(party.id);
    setSupplierInput(party.name);
    setManualSupplier({
      name: party.name,
      phone: party.phone?.startsWith("NA-") ? "" : party.phone || "",
      city: party.city || "Jalod",
      address: party.address || "",
      gstin: party.gstin || "",
    });
  }

  function handleProductSelect(index: number, found: any) {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: found.id,
      productName: found.name,
      unit: normalizeUnit(found.unit),
      quantity: updated[index].quantity || 50,
      unitPrice: found.purchasePrice ?? updated[index].unitPrice,
      gstRate: found.gstRate !== undefined ? found.gstRate : 18,
      isManual: false,
    };
    setItems(updated);
  }

  function handleProductInputChange(index: number, val: string) {
    const updated = [...items];
    const found = products.find(
      (p) =>
        p.name.toLowerCase() === val.toLowerCase() ||
        `${p.name} (${p.sku})`.toLowerCase() === val.toLowerCase()
    );

    if (found) {
      updated[index] = {
        ...updated[index],
        productId: found.id,
        productName: found.name,
        unit: normalizeUnit(found.unit),
        quantity: updated[index].quantity || 50,
        unitPrice: found.purchasePrice ?? updated[index].unitPrice,
        gstRate: found.gstRate !== undefined ? found.gstRate : 18,
        isManual: false,
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: "manual",
        productName: val,
        isManual: true,
      };
    }
    setItems(updated);
  }

  function updateItemField(index: number, field: string, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      {
        productId: "manual",
        productName: "",
        unit: "SQ.FT",
        quantity: 50,
        unitPrice: 0,
        discountAmount: 0,
        gstRate: 18,
        isManual: true,
      },
    ]);
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  // Calculations
  let subtotal = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  items.forEach((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discountAmount) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;

    const lineSubtotal = qty * rate;
    const taxable = Math.max(0, lineSubtotal - disc);
    const gst = calculateGST(taxable, gstRate, false);

    subtotal += lineSubtotal;
    totalTaxable += taxable;
    totalCgst += gst.cgstAmount;
    totalSgst += gst.sgstAmount;
  });

  const totalTax = totalCgst + totalSgst;
  const grandTotal = Math.round(totalTaxable + totalTax - (parseFloat(discountAmount as any) || 0));

  let effectivePaid = 0;
  if (paymentMode === "CREDIT") {
    effectivePaid = 0;
  } else if (paymentMode === "SPLIT") {
    const c = parseFloat(splitCash as any) || 0;
    const u = parseFloat(splitUpi as any) || 0;
    const ch = parseFloat(splitCheque as any) || 0;
    effectivePaid = c + u + ch;
  } else {
    effectivePaid = paidAmount === "" ? grandTotal : parseFloat(paidAmount as any) || 0;
  }
  const balanceDue = Math.max(0, grandTotal - effectivePaid);

  async function handleQuickAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      if (res.ok) {
        const d = await res.json();
        setSuppliers([d.supplier, ...suppliers]);
        setSelectedSupplierId(d.supplier.id);
        setIsQuickSupplierOpen(false);
        setNewSupplier({ name: "", phone: "", address: "", city: "Ahmedabad", gstin: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add supplier");
      }
    } catch {
      alert("Error adding supplier");
    }
  }

  async function handleSavePurchase() {
    const suppName = (manualSupplier.name || supplierInput).trim();
    if (!suppName) {
      alert("Please enter or select supplier / quarry name");
      return;
    }

    if (!selectedGodownId) {
      alert("Please select a receiving godown");
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName || !item.productName.trim()) {
        alert(`Please enter a product name for Inward Item #${i + 1}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: selectedSupplierId || null,
        supplierData: {
          ...manualSupplier,
          name: suppName,
          city: manualSupplier.city || "Jalod",
        },
        supplierName: suppName,
        godownId: selectedGodownId,
        billNumber,
        billDate,
        items: items.map((it) => ({
          productId: it.productId || "manual",
          productName: it.productName.trim(),
          unit: normalizeUnit(it.unit),
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          discountAmount: parseFloat(it.discountAmount) || 0,
          gstRate: parseFloat(it.gstRate) || 0,
          isManual: it.productId === "manual" || it.isManual,
        })),
        discountAmount,
        paidAmount: effectivePaid,
        paymentMode: paymentMode === "SPLIT"
          ? `SPLIT (Cash: ₹${parseFloat(splitCash as any) || 0}, UPI: ₹${parseFloat(splitUpi as any) || 0}${parseFloat(splitCheque as any) > 0 ? `, Cheque: ₹${parseFloat(splitCheque as any)}` : ""})`
          : paymentMode,
        splitPayments: paymentMode === "SPLIT" ? [
          ...(parseFloat(splitCash as any) > 0 ? [{ mode: "CASH", amount: parseFloat(splitCash as any) }] : []),
          ...(parseFloat(splitUpi as any) > 0 ? [{ mode: "UPI", amount: parseFloat(splitUpi as any) }] : []),
          ...(parseFloat(splitCheque as any) > 0 ? [{
            mode: "CHEQUE",
            amount: parseFloat(splitCheque as any),
            referenceNumber: splitChequeRef.trim() || undefined
          }] : []),
        ] : null,
        notes,
        status: "RECEIVED",
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Purchase bill saved and stock received into godown!");
        router.push("/purchases");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record purchase");
        setSaving(false);
      }
    } catch {
      alert("Error recording purchase");
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link
              href="/purchases"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-navy-900">Record Inward Purchase Bill</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Increases inventory in chosen godown and posts to Supplier Khata Ledger
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePurchase}
            disabled={saving}
            className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 self-start sm:self-auto"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Receiving..." : "Receive Goods & Post Bill"}</span>
          </button>
        </div>

        {/* Supplier & Bill Info Grid */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Supplier / Quarry Name *
              </label>
              {selectedSupplierId ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Supplier Selected • Payable: {formatINR(suppliers.find((s) => s.id === selectedSupplierId)?.currentBalance || 0)}
                </span>
              ) : supplierInput.trim() ? (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  ✨ Custom Supplier
                </span>
              ) : null}
            </div>

            <div>
              <PartyCombobox
                value={supplierInput}
                onChange={handleSupplierChange}
                onSelectParty={handleSupplierSelect}
                parties={suppliers}
                placeholder="Search registered supplier or type custom quarry name..."
                partyType="supplier"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 98290 12345"
                  value={manualSupplier.phone}
                  onChange={(e) => setManualSupplier({ ...manualSupplier, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">City</label>
                <input
                  type="text"
                  placeholder="Jalod"
                  value={manualSupplier.city}
                  onChange={(e) => setManualSupplier({ ...manualSupplier, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="GST No."
                  value={manualSupplier.gstin}
                  onChange={(e) => setManualSupplier({ ...manualSupplier, gstin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono uppercase focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Supplier Invoice / Bill No.
            </label>
            <input
              type="text"
              placeholder="e.g. AST/2026/894"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Receive at Godown *
            </label>
            <select
              value={selectedGodownId}
              onChange={(e) => setSelectedGodownId(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-medium"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-navy-900">Inward Items Received</h3>
              <p className="text-[11px] text-slate-500">Select catalog item or type custom item name in the same box</p>
            </div>
          </div>

          {/* Mobile Inward Item Cards (Phones - No Horizontal Scroll) */}
          <div className="block md:hidden space-y-3 mt-3">
            {items.map((item, index) => {
              const lineSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
              const taxable = Math.max(0, lineSubtotal - (parseFloat(item.discountAmount) || 0));
              const gst = calculateGST(taxable, parseFloat(item.gstRate) || 0, false);
              const lineTotal = taxable + gst.totalTax;

              return (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Inward Item #{index + 1}</span>
                      {item.productId && item.productId !== "manual" ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          ✓ Catalog
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          ✨ Custom
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-rose-500 hover:text-rose-700 p-1 flex items-center space-x-1 text-[11px]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                      Product Name (Select or Type)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="col-span-2">
                        <ProductCombobox
                          value={item.productName}
                          onChange={(val) => handleProductInputChange(index, val)}
                          onSelectProduct={(p) => handleProductSelect(index, p)}
                          products={products}
                          priceType="purchasePrice"
                          showStock={false}
                          placeholder="Search or type product..."
                          required
                        />
                      </div>
                      <select
                        value={normalizeUnit(item.unit)}
                        onChange={(e) => updateItemField(index, "unit", e.target.value)}
                        className="col-span-1 border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs bg-white font-bold text-center"
                      >
                        <option value="SQ.FT">SQ.FT</option>
                        <option value="BOX">BOX</option>
                        <option value="PIECE">PIECE</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Received Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Purchase Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItemField(index, "unitPrice", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 items-end">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Disc (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.discountAmount}
                        onChange={(e) => updateItemField(index, "discountAmount", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-right font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">GST %</label>
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItemField(index, "gstRate", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-center bg-white font-medium"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block uppercase">Total</span>
                      <span className="font-mono font-black text-xs text-navy-900">{formatINR(lineTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-visible mt-3">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left w-2/5">Product (Type or Select)</th>
                  <th className="py-2.5 px-2 text-center w-24">Unit</th>
                  <th className="py-2.5 px-3 text-center w-24">Received Qty</th>
                  <th className="py-2.5 px-3 text-right w-28">Purchase Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-24">Disc (₹)</th>
                  <th className="py-2.5 px-3 text-center w-24">GST %</th>
                  <th className="py-2.5 px-3 text-right w-32">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                  const taxable = Math.max(0, lineSubtotal - (parseFloat(item.discountAmount) || 0));
                  const gst = calculateGST(taxable, parseFloat(item.gstRate) || 0, false);
                  const lineTotal = taxable + gst.totalTax;

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 relative">
                        <ProductCombobox
                          value={item.productName}
                          onChange={(val) => handleProductInputChange(index, val)}
                          onSelectProduct={(p) => handleProductSelect(index, p)}
                          products={products}
                          priceType="purchasePrice"
                          showStock={false}
                          placeholder="Type or select product..."
                          required
                        />
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <select
                          value={normalizeUnit(item.unit)}
                          onChange={(e) => updateItemField(index, "unit", e.target.value)}
                          className="w-full border border-slate-300 rounded px-1.5 py-1.5 text-xs bg-white font-bold text-center"
                        >
                          <option value="SQ.FT">SQ.FT</option>
                          <option value="BOX">BOX</option>
                          <option value="PIECE">PIECE</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-center font-mono font-bold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItemField(index, "unitPrice", e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right font-mono font-bold"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.discountAmount}
                          onChange={(e) => updateItemField(index, "discountAmount", e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right font-mono"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItemField(index, "gstRate", e.target.value)}
                          className="w-full border border-slate-300 rounded px-1 py-1.5 text-xs text-center bg-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-navy-900 font-mono">
                        {formatINR(lineTotal)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 rounded-lg text-xs font-bold transition border border-navy-200"
            >
              <Plus className="h-3.5 w-3.5 text-navy-700" />
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* Settlement and Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="font-bold text-sm text-navy-900 pb-2 border-b border-slate-200">
              Payment to Supplier
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: "CASH", label: "💵 Cash", desc: "Full or Partial" },
                  { id: "UPI", label: "📱 UPI / Online", desc: "Online Payment" },
                  { id: "CHEQUE", label: "🏦 Cheque", desc: "Bank Cheque" },
                  { id: "CREDIT", label: "📋 Credit", desc: "Full Udhaar" },
                  { id: "SPLIT", label: "🔀 Split", desc: "Cash + UPI + Cheque" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(item.id as any);
                      if (item.id === "CREDIT") {
                        setPaidAmount(0);
                      } else if (item.id === "SPLIT") {
                        if (!splitCash && !splitUpi && !splitCheque) {
                          const half = Math.round(grandTotal / 2);
                          setSplitCash(half);
                          setSplitUpi(grandTotal - half);
                        }
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentMode === item.id
                        ? "bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-navy-900/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className={`text-[10px] mt-0.5 ${paymentMode === item.id ? "text-slate-300" : "text-slate-400"}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split Mode Form */}
            {paymentMode === "SPLIT" ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold text-navy-900">
                    Split Payment Mode (Cash + UPI + Cheque + Baki Credit)
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-800">
                    Bill Total: {formatINR(grandTotal)}
                  </span>
                </div>

                {/* Quick Split Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quick Split:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.round(grandTotal / 2);
                      setSplitCash(half);
                      setSplitUpi(grandTotal - half);
                      setSplitCheque("");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-700 shadow-2xs transition"
                  >
                    💵 Cash + 📱 UPI (50:50)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.round(grandTotal / 2);
                      setSplitCash(half);
                      setSplitCheque(grandTotal - half);
                      setSplitUpi("");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-700 shadow-2xs transition"
                  >
                    💵 Cash + 🏦 Cheque (50:50)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.round(grandTotal / 2);
                      setSplitUpi(half);
                      setSplitCheque(grandTotal - half);
                      setSplitCash("");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-700 shadow-2xs transition"
                  >
                    📱 UPI + 🏦 Cheque (50:50)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const oneThird = Math.round(grandTotal / 3);
                      setSplitCash(oneThird);
                      setSplitUpi(oneThird);
                      setSplitCheque(grandTotal - (oneThird * 2));
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-700 shadow-2xs transition"
                  >
                    All 3 (1/3 each)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitCash("");
                      setSplitUpi("");
                      setSplitCheque("");
                      setSplitChequeRef("");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 font-medium text-rose-700 transition"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      💵 Cash Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="₹0"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      📱 UPI Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      placeholder="₹0"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      🏦 Cheque Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={splitCheque}
                      onChange={(e) => setSplitCheque(e.target.value)}
                      placeholder="₹0"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {parseFloat(splitCheque as any) > 0 && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      🏦 Cheque No. / Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={splitChequeRef}
                      onChange={(e) => setSplitChequeRef(e.target.value)}
                      placeholder="e.g. Cheque #504128 - SBI / HDFC Bank"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Total Paid to Supplier:</span>
                    <span className="font-black text-emerald-700 text-sm font-mono">{formatINR(effectivePaid)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Balance Credit (Payable):</span>
                    <span className="font-black text-rose-700 text-sm font-mono">{formatINR(balanceDue)}</span>
                  </div>
                </div>

                {balanceDue > 0 ? (
                  <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-950 font-semibold flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>
                      Baki bache <strong>{formatINR(balanceDue)}</strong> supplier ke Khate me <strong>Credit (Udhaar / Payable)</strong> automatically record ho jayenge.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 font-semibold flex items-center space-x-1.5">
                    <span>✅</span>
                    <span>Full Bill Paid to Supplier (No Remaining Payable).</span>
                  </div>
                )}
              </div>
            ) : paymentMode === "CREDIT" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Full Credit / Udhaar Purchase</span>
                  <span className="font-mono text-sm">{formatINR(grandTotal)}</span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  ℹ️ Abhi <strong>₹0</strong> pay hoga. Poora <strong>{formatINR(grandTotal)}</strong> supplier ke Khate (Ledger) me <strong>Credit (Payable / Udhaar)</strong> automatically chala jayega.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">Amount Paid (₹)</label>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(grandTotal)}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Full ({formatINR(grandTotal)})
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={paidAmount}
                      placeholder={`Full: ${grandTotal}`}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-navy-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Balance Credit / Payable (₹)
                    </label>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-rose-700">
                      {formatINR(balanceDue)}
                    </div>
                  </div>
                </div>

                {balanceDue > 0 ? (
                  <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-950 font-semibold flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>
                      Abhi <strong>{formatINR(effectivePaid)}</strong> pay hue hain. Baki bache <strong>{formatINR(balanceDue)}</strong> automatically supplier ke Khate (Ledger) me <strong>Credit (Udhaar)</strong> chala jayega.
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 font-semibold flex items-center space-x-1.5">
                    <span>✅</span>
                    <span>Full Bill Paid via {paymentMode}.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-1.5 sm:space-y-2 text-xs text-slate-600">
              <h3 className="font-bold text-xs sm:text-sm text-navy-900 pb-2 border-b border-slate-200">
                Purchase Bill Summary
              </h3>
              <div className="flex justify-between pt-1 sm:pt-2">
                <span>Taxable Total:</span>
                <span className="font-mono">{formatINR(totalTaxable)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span className="font-mono">{formatINR(totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1.5 sm:pt-2 border-t border-slate-200 text-xs sm:text-sm">
                <span>Grand Total:</span>
                <span className="text-sm sm:text-base font-black text-navy-900">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSavePurchase}
                disabled={saving}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {saving ? "Processing..." : "Confirm & Inward Stock"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Add Supplier Modal */}
        {isQuickSupplierOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Quick Add Supplier</h3>
                <button onClick={() => setIsQuickSupplierOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddSupplier} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Astral Poly Technik Ltd"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9879011223 (Optional)"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    value={newSupplier.city}
                    onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">GSTIN</label>
                  <input
                    type="text"
                    placeholder="24AABCA9876C1Z3"
                    value={newSupplier.gstin}
                    onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickSupplierOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
