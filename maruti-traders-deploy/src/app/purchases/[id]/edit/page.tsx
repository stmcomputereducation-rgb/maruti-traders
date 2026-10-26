"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  CreditCard,
  Edit2,
} from "lucide-react";

function normalizeUnit(unit?: string): string {
  if (!unit) return "SQ.FT";
  const u = unit.toUpperCase().trim();
  if (u === "SQFT" || u === "SQ.FT" || u === "SQ_FT" || u === "SQM" || u === "SQMT" || u === "SLAB") return "SQ.FT";
  if (u === "BOX" || u === "BOXES") return "BOX";
  if (u === "PIECE" || u === "PIECES" || u === "PCS" || u === "PC" || u === "BAG" || u === "TON" || u === "CFT" || u === "MTR") return "PIECE";
  return "SQ.FT";
}

export default function EditPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchaseNumber, setPurchaseNumber] = useState("");

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
  const [billDate, setBillDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [notes, setNotes] = useState("");

  // Payment
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CHEQUE" | "CREDIT" | "SPLIT">("CASH");
  const [splitCash, setSplitCash] = useState<number | string>("");
  const [splitUpi, setSplitUpi] = useState<number | string>("");
  const [splitCheque, setSplitCheque] = useState<number | string>("");
  const [splitChequeRef, setSplitChequeRef] = useState("");

  // Items
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [purRes, suppRes, prodRes, godownRes] = await Promise.all([
        fetch(`/api/purchases/${id}`),
        fetch("/api/suppliers"),
        fetch("/api/products"),
        fetch("/api/godowns"),
      ]);

      if (!purRes.ok) {
        router.push("/purchases");
        return;
      }

      const purData = await purRes.json();
      const p = purData.purchase;
      setPurchaseNumber(p.purchaseNumber);
      setSelectedSupplierId(p.supplierId || "");
      const suppName = p.supplier?.name || p.supplierName || "";
      setSupplierInput(suppName);
      if (p.supplier) {
        setManualSupplier({
          name: p.supplier.name || "",
          phone: p.supplier.phone?.startsWith("NA-") ? "" : p.supplier.phone || "",
          city: p.supplier.city || "Jalod",
          address: p.supplier.address || "",
          gstin: p.supplier.gstin || "",
        });
      } else {
        setManualSupplier({
          name: suppName,
          phone: "",
          city: "Jalod",
          address: "",
          gstin: "",
        });
      }

      setSelectedGodownId(p.godownId || "");
      setBillNumber(p.billNumber || "");
      setBillDate(p.billDate ? p.billDate.split("T")[0] : "");
      setReceivedDate(p.receivedDate ? p.receivedDate.split("T")[0] : "");
      setDiscountAmount(p.discountAmount || 0);
      setPaidAmount(p.paidAmount ?? 0);
      const splitArr = p.payments || [];
      if (splitArr.length > 1 || p.paymentMode === "SPLIT") {
        setPaymentMode("SPLIT");
        const cashPay = splitArr.find((x: any) => x.paymentMode === "CASH")?.amount || "";
        const upiPay = splitArr.find((x: any) => x.paymentMode === "UPI")?.amount || "";
        const chkPay = splitArr.find((x: any) => x.paymentMode === "CHEQUE")?.amount || "";
        setSplitCash(cashPay);
        setSplitUpi(upiPay);
        setSplitCheque(chkPay);
      } else if (p.paymentMode === "CREDIT" || (Number(p.paidAmount) === 0 && Number(p.grandTotal) > 0)) {
        setPaymentMode("CREDIT");
      } else if (["CASH", "UPI", "CHEQUE"].includes(p.paymentMode)) {
        setPaymentMode(p.paymentMode as any);
      } else {
        setPaymentMode("CASH");
      }
      setNotes(p.notes || "");

      // Prepopulate items
      const loadedItems = (p.items || []).map((it: any) => ({
        productId: it.productId || "manual",
        productName: it.product?.name || it.description || "",
        unit: normalizeUnit(it.product?.unit || it.unit),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount || 0,
        gstRate: it.gstRate || 18,
        slabDetails: it.slabDetails || "",
        isManual: !it.productId || it.productId === "manual",
      }));
      setItems(loadedItems.length > 0 ? loadedItems : []);

      if (suppRes.ok) {
        const d = await suppRes.json();
        setSuppliers(d.suppliers || []);
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
      }
      if (godownRes.ok) {
        const d = await godownRes.json();
        setGodowns(d.godowns || []);
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

  function updateItemField(index: number, field: string, val: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
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

  async function handleSaveEditedPurchase() {
    const suppName = (manualSupplier.name || supplierInput).trim();
    if (!suppName) {
      alert("Please enter or select supplier / quarry name");
      return;
    }

    if (!selectedGodownId) {
      alert("Please select a receiving godown");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName?.trim()) {
        alert(`Please enter a product name for Inward Item #${i + 1}`);
        return;
      }
    }

    let splitPaymentsList: { mode: string; amount: number; referenceNumber?: string }[] | undefined = undefined;
    if (paymentMode === "SPLIT") {
      const c = parseFloat(splitCash as any) || 0;
      const u = parseFloat(splitUpi as any) || 0;
      const ch = parseFloat(splitCheque as any) || 0;
      splitPaymentsList = [];
      if (c > 0) splitPaymentsList.push({ mode: "CASH", amount: c });
      if (u > 0) splitPaymentsList.push({ mode: "UPI", amount: u });
      if (ch > 0) splitPaymentsList.push({
        mode: "CHEQUE",
        amount: ch,
        referenceNumber: splitChequeRef.trim() || undefined
      });
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: selectedSupplierId || null,
        supplierData: !selectedSupplierId ? manualSupplier : null,
        supplierName: suppName,
        godownId: selectedGodownId,
        billNumber,
        billDate,
        receivedDate,
        items: items.map((it) => ({
          productId: it.productId === "manual" ? null : it.productId,
          productName: it.productName,
          unit: normalizeUnit(it.unit),
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          discountAmount: parseFloat(it.discountAmount) || 0,
          gstRate: parseFloat(it.gstRate) || 0,
          isManual: !it.productId || it.productId === "manual",
          slabDetails: it.slabDetails || "",
        })),
        discountAmount: parseFloat(discountAmount as any) || 0,
        paidAmount: effectivePaid,
        paymentMode,
        splitPayments: splitPaymentsList,
        notes,
        status: "RECEIVED",
      };

      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/purchases/${id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update purchase");
      }
    } catch {
      alert("An unexpected error occurred while saving changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">
          Loading purchase for editing...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link
              href={`/purchases/${id}`}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate">
                  Edit Purchase: {purchaseNumber}
                </h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold">
                  Editing Mode
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Update supplier bill info, quantities, purchase rates, or godown inward
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/purchases/${id}`}
              className="px-3 sm:px-4 py-2 border border-slate-300 rounded-lg sm:rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              onClick={handleSaveEditedPurchase}
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Consignment & Supplier Details Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
          <h3 className="font-bold text-sm text-navy-900 pb-3 border-b border-slate-100">
            Supplier & Consignment Information
          </h3>

          <div className="space-y-4 mt-4 text-xs">
            {/* Single Unified Supplier Box (Select or Type) */}
            <div className="bg-slate-50/70 p-3 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Supplier / Quarry Name * (Select or Type)
                  </label>
                  {selectedSupplierId ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      ✓ Registered Supplier
                    </span>
                  ) : supplierInput.trim() ? (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      ✨ Custom Supplier
                    </span>
                  ) : null}
                </div>
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

              {/* Supplier Details (Phone, City, GSTIN) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="9829012345"
                    value={manualSupplier.phone}
                    onChange={(e) => setManualSupplier({ ...manualSupplier, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">City / Location</label>
                  <input
                    type="text"
                    placeholder="Jalod / Kishangarh"
                    value={manualSupplier.city}
                    onChange={(e) => setManualSupplier({ ...manualSupplier, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="24AABCA9876C1Z3"
                    value={manualSupplier.gstin}
                    onChange={(e) => setManualSupplier({ ...manualSupplier, gstin: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Consignment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Receiving Godown */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Receiving Godown *</label>
                <select
                  value={selectedGodownId}
                  onChange={(e) => setSelectedGodownId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Bill # */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Supplier Bill # / Invoice</label>
                <input
                  type="text"
                  placeholder="e.g. INV-9923"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bill Date */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Items */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-navy-900">Inward Items / Products</h3>
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

        {/* Totals, Settlement & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-4">
            <h3 className="font-bold text-sm text-navy-900 pb-2 border-b border-slate-100">
              Payment & Settlement
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

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bill Discount (₹)</label>
              <input
                type="number"
                step="any"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Consignment notes, truck number, quarry batch details..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-navy-900 pb-2 border-b border-slate-100">
              Bill Summary
            </h3>

            <div className="space-y-2 py-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Item Total):</span>
                <span className="font-mono font-medium">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatINR(totalTaxable)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST (CGST + SGST):</span>
                <span className="font-mono">{formatINR(totalTax)}</span>
              </div>
              {Number(discountAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Bill Discount:</span>
                  <span className="font-mono text-emerald-600">-{formatINR(Number(discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-navy-900">
                <span>Grand Total:</span>
                <span className="text-base text-navy-900">{formatINR(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span className="font-mono">{formatINR(effectivePaid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Payable (Udhaar):</span>
                <span className="font-mono">{formatINR(balanceDue)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <Link
                href={`/purchases/${id}`}
                className="w-1/2 sm:w-auto text-center px-3.5 sm:px-4 py-2 border border-slate-300 rounded-lg sm:rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
              <button
                onClick={handleSaveEditedPurchase}
                disabled={saving}
                className="w-1/2 sm:w-auto justify-center px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
