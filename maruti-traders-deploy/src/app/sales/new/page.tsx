"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ProductCombobox from "@/components/ui/ProductCombobox";
import PartyCombobox from "@/components/ui/PartyCombobox";
import { formatINR, calculateGST } from "@/lib/formatters";
import {
  Receipt,
  Plus,
  Trash2,
  UserPlus,
  ArrowLeft,
  Barcode,
  Search,
  CheckCircle,
  CreditCard,
  Building,
  Save,
  X,
} from "lucide-react";

export default function NewSalePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
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
  const [customerInput, setCustomerInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [manualCustomer, setManualCustomer] = useState({
    name: "",
    phone: "",
    city: "Jalod",
    address: "",
    gstin: "",
  });
  const [selectedGodownId, setSelectedGodownId] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);

  // Payment Fields
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CHEQUE" | "CREDIT" | "SPLIT">("CASH");
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [splitCash, setSplitCash] = useState<number | string>("");
  const [splitUpi, setSplitUpi] = useState<number | string>("");
  const [splitCheque, setSplitCheque] = useState<number | string>("");
  const [splitChequeRef, setSplitChequeRef] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Items List
  const [items, setItems] = useState<any[]>([
    {
      productId: "manual",
      productName: "",
      unit: "SQ.FT",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      gstRate: 18,
      availableStock: "--",
      isManual: true,
    },
  ]);

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
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
      const [custRes, prodRes, godownRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/godowns"),
      ]);

      if (custRes.ok) {
        const d = await custRes.json();
        const cList = d.customers || [];
        setCustomers(cList);
        if (cList.length > 0) {
          const firstC = cList[0];
          setSelectedCustomerId(firstC.id);
          setCustomerInput(firstC.name);
          setManualCustomer({
            name: firstC.name,
            phone: firstC.phone?.startsWith("NA-") ? "" : firstC.phone || "",
            city: firstC.city || "Jalod",
            address: firstC.address || "",
            gstin: firstC.gstin || "",
          });
        }
      }

      let loadedProducts: any[] = [];
      if (prodRes.ok) {
        const d = await prodRes.json();
        loadedProducts = d.products || [];
        setProducts(loadedProducts);
      }

      if (godownRes.ok) {
        const d = await godownRes.json();
        setGodowns(d.godowns || []);
        if (d.godowns.length > 0) {
          const defaultGodownId = d.godowns[0].id;
          setSelectedGodownId(defaultGodownId);

          if (loadedProducts.length > 0) {
            const firstP = loadedProducts[0];
            const stockInGodown =
              firstP.godownStocks?.find((g: any) => g.godownId === defaultGodownId)?.quantity || 0;
            setItems([
              {
                productId: firstP.id,
                productName: firstP.name,
                unit: normalizeUnit(firstP.unit),
                quantity: 1,
                unitPrice: firstP.sellingPrice || 0,
                discountAmount: 0,
                gstRate: firstP.gstRate || 18,
                availableStock: stockInGodown,
                isManual: false,
              },
            ]);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Update available stocks when Godown changes
  function handleGodownChange(newGodownId: string) {
    setSelectedGodownId(newGodownId);
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.productId === "manual" || item.isManual) return item;
        const prod = products.find((p) => p.id === item.productId);
        const stockInGodown =
          prod?.godownStocks?.find((g: any) => g.godownId === newGodownId)?.quantity || 0;
        return {
          ...item,
          availableStock: stockInGodown,
        };
      })
    );
  }

  function handleCustomerChange(val: string) {
    setCustomerInput(val);
    const found = customers.find(
      (c) =>
        c.name.toLowerCase() === val.toLowerCase() ||
        `${c.name} - ${c.phone}`.toLowerCase() === val.toLowerCase() ||
        c.phone === val
    );
    if (found) {
      setSelectedCustomerId(found.id);
      setManualCustomer({
        name: found.name,
        phone: found.phone?.startsWith("NA-") ? "" : found.phone || "",
        city: found.city || "Jalod",
        address: found.address || "",
        gstin: found.gstin || "",
      });
    } else {
      setSelectedCustomerId("");
      setManualCustomer((prev) => ({
        ...prev,
        name: val,
      }));
    }
  }

  function handleProductInputChange(index: number, val: string) {
    const updated = [...items];
    const found = products.find(
      (p) =>
        p.name.toLowerCase() === val.toLowerCase() ||
        `${p.name} (${p.sku})`.toLowerCase() === val.toLowerCase()
    );

    if (found) {
      const stockInGodown =
        found.godownStocks?.find((g: any) => g.godownId === selectedGodownId)?.quantity || 0;
      updated[index] = {
        ...updated[index],
        productId: found.id,
        productName: found.name,
        unit: normalizeUnit(found.unit),
        unitPrice: found.sellingPrice ?? updated[index].unitPrice,
        gstRate: found.gstRate !== undefined ? found.gstRate : 18,
        availableStock: stockInGodown,
        isManual: false,
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: "manual",
        productName: val,
        availableStock: "--",
        isManual: true,
      };
    }
    setItems(updated);
  }

  function handleProductSelect(index: number, product: any) {
    const updated = [...items];
    const stockInGodown =
      product.godownStocks?.find((g: any) => g.godownId === selectedGodownId)?.quantity || 0;
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      unit: normalizeUnit(product.unit),
      unitPrice: product.sellingPrice ?? updated[index].unitPrice,
      gstRate: product.gstRate !== undefined ? product.gstRate : 18,
      availableStock: stockInGodown,
      isManual: false,
    };
    setItems(updated);
  }

  function handleCustomerSelect(party: any) {
    setSelectedCustomerId(party.id);
    setCustomerInput(party.name);
    setManualCustomer({
      name: party.name,
      phone: party.phone?.startsWith("NA-") ? "" : party.phone || "",
      city: party.city || "Jalod",
      address: party.address || "",
      gstin: party.gstin || "",
    });
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
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        gstRate: 18,
        availableStock: "--",
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
  let totalIgst = 0;

  items.forEach((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discountAmount) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;

    const lineSubtotal = qty * rate;
    const taxable = Math.max(0, lineSubtotal - disc);
    const gst = calculateGST(taxable, gstRate, isInterState);

    subtotal += lineSubtotal;
    totalTaxable += taxable;
    totalCgst += gst.cgstAmount;
    totalSgst += gst.sgstAmount;
    totalIgst += gst.igstAmount;
  });

  const totalTax = totalCgst + totalSgst + totalIgst;
  const rawTotal = totalTaxable + totalTax - (parseFloat(invoiceDiscount as any) || 0);
  const grandTotal = Math.round(rawTotal);
  const roundOff = (grandTotal - rawTotal).toFixed(2);

  // When paidAmount is untouched, default to grandTotal. In split mode, sum components.
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

  async function handleQuickAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const d = await res.json();
        setCustomers([d.customer, ...customers]);
        setSelectedCustomerId(d.customer.id);
        setIsQuickCustomerOpen(false);
        setNewCustomer({ name: "", phone: "", address: "", city: "Surat", gstin: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add customer");
      }
    } catch {
      alert("Error adding customer");
    }
  }

  async function handleFinalizeInvoice() {
    const custName = (manualCustomer.name || customerInput).trim();
    if (!custName) {
      alert("Please enter or select customer / buyer name");
      return;
    }

    if (!selectedGodownId) {
      alert("Please select a source godown");
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName || !item.productName.trim()) {
        alert(`Please enter a product name for Item #${i + 1}`);
        return;
      }
      if (item.productId !== "manual" && item.availableStock !== "--" && item.quantity > item.availableStock) {
        if (
          !confirm(
            `Warning: "${item.productName}" requested ${item.quantity} ${item.unit}, but available stock is only ${item.availableStock}. Proceed anyway?`
          )
        ) {
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomerId || null,
        customerData: {
          ...manualCustomer,
          name: custName,
          city: manualCustomer.city || "Jalod",
        },
        customerName: custName,
        godownId: selectedGodownId,
        invoiceDate,
        dueDate: dueDate || null,
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
        discountAmount: invoiceDiscount,
        roundOff: parseFloat(roundOff),
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
        referenceNumber,
        notes,
        isInterState,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/sales/${data.invoice.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to finalize invoice");
        setSaving(false);
      }
    } catch (e) {
      alert("An unexpected error occurred while saving the invoice");
      setSaving(false);
    }
  }

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link
              href="/sales"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-navy-900">New Tax Invoice & Cash Memo</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">Real-time stock deduction and Khata Ledger posting</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinalizeInvoice}
              disabled={saving}
              className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Finalizing..." : "Finalize & Generate Invoice"}</span>
            </button>
          </div>
        </div>

        {/* Customer & Billing Info Grid */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Customer Selection: Unified Single Box (Search or Type) */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer / Buyer *
              </label>
              {selectedCustomerObj ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Party Selected • Khata: {formatINR(selectedCustomerObj.currentBalance)}
                </span>
              ) : customerInput.trim() ? (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  ✨ Custom Customer
                </span>
              ) : null}
            </div>

            <div>
              <PartyCombobox
                value={customerInput}
                onChange={handleCustomerChange}
                onSelectParty={handleCustomerSelect}
                parties={customers}
                placeholder="Search registered customer or type custom name..."
                partyType="customer"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 98250 12345"
                  value={manualCustomer.phone}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">City</label>
                <input
                  type="text"
                  placeholder="Jalod"
                  value={manualCustomer.city}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="GST No."
                  value={manualCustomer.gstin}
                  onChange={(e) => setManualCustomer({ ...manualCustomer, gstin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Source Godown Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Deduct Stock From Godown *
            </label>
            <select
              value={selectedGodownId}
              onChange={(e) => handleGodownChange(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bill Date *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-sm text-navy-900">Products & Quantities</h3>
            <div className="flex items-center space-x-3">
              <label className="text-xs text-slate-600 flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="font-medium">Inter-state (IGST 18% instead of CGST+SGST)</span>
              </label>
            </div>
          </div>

          {/* Mobile Item Cards (Phones - No Horizontal Scroll) */}
          <div className="block md:hidden space-y-3 mt-3">
            {items.map((item, index) => {
              const lineSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
              const taxable = Math.max(0, lineSubtotal - (parseFloat(item.discountAmount) || 0));
              const gst = calculateGST(taxable, parseFloat(item.gstRate) || 0, isInterState);
              const lineTotal = taxable + gst.totalTax;

              return (
                <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Item #{index + 1}</span>
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
                      Product Name & Unit (Select or Type)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="col-span-3">
                        <ProductCombobox
                          value={item.productName}
                          onChange={(val) => handleProductInputChange(index, val)}
                          onSelectProduct={(p) => handleProductSelect(index, p)}
                          products={products}
                          priceType="sellingPrice"
                          showStock={true}
                          selectedGodownId={selectedGodownId}
                          placeholder="Select or type product name..."
                          required
                        />
                      </div>
                      <select
                        value={normalizeUnit(item.unit)}
                        onChange={(e) => updateItemField(index, "unit", e.target.value)}
                        className="col-span-1 border border-slate-300 rounded-lg px-1 py-1.5 text-xs bg-white font-bold text-center"
                      >
                        <option value="SQ.FT">SQ.FT</option>
                        <option value="BOX">BOX</option>
                        <option value="PIECE">PIECE</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Avail Stock</label>
                      <div className="text-[11px] font-mono font-bold py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-center">
                        {item.productId !== "manual" && item.availableStock !== "--"
                          ? `${item.availableStock} ${item.unit}`
                          : "--"}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Qty</label>
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
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Rate (₹)</label>
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
                  <th className="py-2.5 px-3 text-center w-28">Avail Stock</th>
                  <th className="py-2.5 px-3 text-center w-20">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-20">Disc (₹)</th>
                  <th className="py-2.5 px-3 text-center w-20">GST %</th>
                  <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                  const taxable = Math.max(0, lineSubtotal - (parseFloat(item.discountAmount) || 0));
                  const gst = calculateGST(taxable, parseFloat(item.gstRate) || 0, isInterState);
                  const lineTotal = taxable + gst.totalTax;

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 relative">
                        <ProductCombobox
                          value={item.productName}
                          onChange={(val) => handleProductInputChange(index, val)}
                          onSelectProduct={(p) => handleProductSelect(index, p)}
                          products={products}
                          priceType="sellingPrice"
                          showStock={true}
                          selectedGodownId={selectedGodownId}
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

                      <td className="py-2.5 px-3 text-center font-mono">
                        {item.productId !== "manual" && item.availableStock !== "--" ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.availableStock <= 0
                                ? "bg-rose-100 text-rose-800"
                                : item.availableStock < item.quantity
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.availableStock} {item.unit}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            Custom
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-center font-mono"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItemField(index, "unitPrice", e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right font-mono"
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

          <div className="mt-3 flex items-center">
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition border border-emerald-300 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-700" />
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* Invoice Summary & Payment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment & Remarks Panel */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="font-bold text-sm text-navy-900 pb-2 border-b border-slate-200 flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Payment Details & Settlement</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: "CASH", label: "💵 Cash", desc: "Full or Partial" },
                  { id: "UPI", label: "📱 UPI / QR", desc: "Online Payment" },
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
                      💵 Cash Amount (₹)
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
                      📱 UPI Amount (₹)
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
                      🏦 Cheque Amount (₹)
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
                    <span className="text-[10px] text-slate-500 block font-semibold">Total Paid Now:</span>
                    <span className="font-black text-emerald-700 text-sm font-mono">{formatINR(effectivePaid)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Balance Credit (Udhaar):</span>
                    <span className="font-black text-amber-800 text-sm font-mono">{formatINR(balanceDue)}</span>
                  </div>
                </div>

                {balanceDue > 0 ? (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-950 font-semibold flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>
                      Baki bache <strong>{formatINR(balanceDue)}</strong> automatically party ke Khate me <strong>Credit (Udhaar)</strong> record ho jayenge.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 font-semibold flex items-center space-x-1.5">
                    <span>✅</span>
                    <span>Poora payment receive ho raha hai (No Due Balance).</span>
                  </div>
                )}
              </div>
            ) : paymentMode === "CREDIT" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Full Credit / Udhaar Bill</span>
                  <span className="font-mono text-sm">{formatINR(grandTotal)}</span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  ℹ️ Abhi <strong>₹0</strong> receive hoga. Poora <strong>{formatINR(grandTotal)}</strong> customer ke Khate (Ledger) me <strong>Credit (Udhaar)</strong> automatically chala jayega.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">Amount Paid Now (₹)</label>
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
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Balance Credit (Udhaar) (₹)
                    </label>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono text-amber-800">
                      {formatINR(balanceDue)}
                    </div>
                  </div>
                </div>

                {balanceDue > 0 ? (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-950 font-semibold flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>
                      Abhi <strong>{formatINR(effectivePaid)}</strong> receive hue hain. Baki bache <strong>{formatINR(balanceDue)}</strong> automatically party ke Khate (Ledger) me <strong>Credit (Udhaar)</strong> chala jayega.
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 font-semibold flex items-center space-x-1.5">
                    <span>✅</span>
                    <span>Full Payment Received via {paymentMode}.</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Payment Ref No. / UPI UTR / Cheque No.
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/329482910394 or Cheque #004921"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Remarks / Delivery Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered via tempo GJ-05-BX-4421"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-navy-900 pb-2 border-b border-slate-200">
                Tax & Bill Computation (GST Breakdown)
              </h3>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Line Subtotal:</span>
                  <span className="font-mono font-medium">{formatINR(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Extra Bill Discount (₹):</span>
                  <input
                    type="number"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 border border-slate-300 rounded px-2 py-1 text-right font-mono"
                  />
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold text-slate-800">
                  <span>Taxable Amount:</span>
                  <span className="font-mono">{formatINR(totalTaxable)}</span>
                </div>

                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>CGST (Central Tax):</span>
                      <span className="font-mono">{formatINR(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>SGST (Gujarat State Tax):</span>
                      <span className="font-mono">{formatINR(totalSgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-500">
                    <span>IGST (Integrated Tax):</span>
                    <span className="font-mono">{formatINR(totalIgst)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">₹{roundOff}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-slate-900 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Grand Total
                </span>
                <p className="text-lg sm:text-2xl font-black text-navy-900">{formatINR(grandTotal)}</p>
              </div>

              <button
                onClick={handleFinalizeInvoice}
                disabled={saving}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Finalizing..." : "Finalize Invoice"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Add Customer Modal */}
        {isQuickCustomerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Quick Add Customer</h3>
                <button onClick={() => setIsQuickCustomerOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjaybhai Patel"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Mobile Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210 (Optional)"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">City / Address</label>
                  <input
                    type="text"
                    placeholder="Surat"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="24AABCM1234P1Z8"
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Save & Select
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
