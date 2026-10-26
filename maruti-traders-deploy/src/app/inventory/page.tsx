"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatNumberIN } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  Warehouse,
  CheckCircle,
  X,
  Upload,
  ShieldAlert,
  Info,
  RotateCcw,
} from "lucide-react";
import { BRANCH_CONFIGS } from "@/lib/location";

export default function InventoryPage() {
  const { location } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);

  // Removal Modal State
  const [productToRemove, setProductToRemove] = useState<any | null>(null);
  const [removalChecking, setRemovalChecking] = useState(false);
  const [removalAudit, setRemovalAudit] = useState<any | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Photo upload state (Starts empty - NO default photo attached!)
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Streamlined Form State (Product Name, Size / Box / Piece, Quantity & Unit, Godown)
  const [formData, setFormData] = useState({
    name: "",
    size: "",
    quantity: 0,
    unit: "SQ.FT",
    godownId: "",
  });

  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  useEffect(() => {
    fetchProducts();
    fetchGodowns();
  }, [search, filterLowStock, statusFilter, location]);

  async function fetchGodowns() {
    try {
      const res = await fetch("/api/godowns");
      if (res.ok) {
        const data = await res.json();
        setGodowns(data.godowns || []);
      }
    } catch (e) {
      console.error("Failed to fetch godowns:", e);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      let url = `/api/products?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      if (filterLowStock) url += `&filter=low`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Handle uploading photos to /api/upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const body = new FormData();
        body.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) newUrls.push(data.url);
        } else {
          const err = await res.json();
          alert(err.error || "Failed to upload photo");
        }
      }
      setUploadedPhotos((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  function removePhoto(idx: number) {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function openAddModal() {
    setEditingProduct(null);
    setUploadedPhotos([]); // EMPTY: No pre-attached photo!
    setFormData({
      name: "",
      size: "",
      quantity: 100,
      unit: "SQ.FT",
      godownId: godowns[0]?.id || "",
    });
    setIsAddModalOpen(true);
  }

  function openEditModal(prod: any) {
    setEditingProduct(prod);
    setUploadedPhotos(prod.photosList || (prod.photoUrl ? [prod.photoUrl] : []));
    setFormData({
      name: prod.name || "",
      size: prod.size || "",
      quantity: prod.totalStock || prod.totalSqft || 0,
      unit: prod.unit || "SQ.FT",
      godownId: prod.godownStocks?.[0]?.godownId || godowns[0]?.id || "",
    });
    setIsAddModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter Product Name");
      return;
    }

    try {
      const url = "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const stockVal = parseFloat(formData.quantity as any) || 0;
      const payload = {
        name: formData.name.trim(),
        size: formData.size.trim(),
        openingStock: stockVal,
        totalSqft: stockVal,
        unit: formData.unit,
        godownId: formData.godownId || godowns[0]?.id || "",
        category: "General",
        finish: "Standard",
        thickness: "",
        photos: uploadedPhotos,
        photoUrl: uploadedPhotos[0] || null,
        purchasePrice: 0,
        sellingPrice: 0,
        gstRate: 0,
        minStockAlert: 0,
        id: editingProduct?.id,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setEditingProduct(null);
        setNotificationMsg({
          type: "success",
          text: `Product "${formData.name}" successfully ${editingProduct ? "updated" : "added"}!`,
        });
        setTimeout(() => setNotificationMsg(null), 4000);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save product");
      }
    } catch {
      alert("An unexpected error occurred while saving the product");
    }
  }

  // Open Removal Confirmation Dialog
  async function initiateProductRemoval(prod: any) {
    setProductToRemove(prod);
    setRemovalChecking(true);
    setRemovalAudit(null);
    try {
      const res = await fetch(`/api/products/${prod.id}`);
      if (res.ok) {
        const audit = await res.json();
        setRemovalAudit(audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRemovalChecking(false);
    }
  }

  // Confirm Removal Execution
  async function handleConfirmRemove() {
    if (!productToRemove) return;
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/products/${productToRemove.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setNotificationMsg({
          type: "success",
          text: data.message || `Product "${productToRemove.name}" removed successfully.`,
        });
        setTimeout(() => setNotificationMsg(null), 5000);
        setProductToRemove(null);
        if (viewingProduct?.id === productToRemove.id) {
          setViewingProduct(null);
        }
        fetchProducts();
      } else {
        alert(data.error || "Failed to remove product");
      }
    } catch {
      alert("Error removing product");
    } finally {
      setIsRemoving(false);
    }
  }

  // Reactivate archived product
  async function handleReactivate(prod: any) {
    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        setNotificationMsg({
          type: "success",
          text: `Product "${prod.name}" successfully reactivated and restored to active inventory.`,
        });
        setTimeout(() => setNotificationMsg(null), 4000);
        fetchProducts();
      }
    } catch {
      alert("Failed to reactivate product");
    }
  }

  // Filtered by selected unit if chosen
  const filteredProducts = products.filter((p) => {
    if (selectedUnit === "ALL") return true;
    const pUnit = (p.unit || "").toUpperCase();
    if (selectedUnit === "SQ.FT") return pUnit === "SQ.FT" || pUnit === "SQFT";
    return pUnit === selectedUnit;
  });

  const totalStockQty = filteredProducts.reduce((acc, p) => acc + (p.totalStock || 0), 0);
  const lowStockCount = filteredProducts.filter((p) => p.isLowStock || p.isOutOfStock).length;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Notification Toast */}
        {notificationMsg && (
          <div
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex items-center justify-between text-xs font-bold transition shadow-md ${
              notificationMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg.text}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate whitespace-nowrap">
                Product Inventory & Stock
              </h1>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 whitespace-nowrap">
                {branch.name}
              </span>
              <span className="bg-slate-100 text-slate-700 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-slate-200 whitespace-nowrap">
                {products.length} {statusFilter === "active" ? "Active" : "Archived"}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Manage product names, size / box / piece packaging, and real-time stock
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 shrink-0">
            {/* Active vs Archived status pill */}
            <div className="bg-slate-100 p-0.5 sm:p-1 rounded-xl flex space-x-0.5 sm:space-x-1 border border-slate-200 text-[11px] sm:text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === "active"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active Products
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === "archived"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Archived
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-md transition whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Total Products
            </span>
            <p className="text-base sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 whitespace-nowrap">
              {filteredProducts.length} Items
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate whitespace-nowrap">
              In {branch.name} inventory
            </p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Total Stock Quantity
            </span>
            <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 whitespace-nowrap">
              {formatNumberIN(totalStockQty)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate whitespace-nowrap">
              Across all godowns
            </p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 col-span-2 md:col-span-1 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Low Stock Filter
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate whitespace-nowrap">
                {filterLowStock ? "Showing Low/Out" : `${lowStockCount} Need Attention`}
              </p>
            </div>
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`p-2 sm:p-2.5 rounded-lg border transition shrink-0 ${
                filterLowStock
                  ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
              }`}
              title="Toggle Low Stock Alert"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-2 sm:gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, size / box / piece, godown..."
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full md:w-48 px-2.5 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 text-slate-800 bg-white"
            >
              <option value="ALL">All Units</option>
              <option value="SQ.FT">SQ.FT</option>
              <option value="BOX">BOX</option>
              <option value="PIECE">PIECE</option>
            </select>
          </div>
        </div>

        {/* Products List: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Cards (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No products found for {branch.name} ({statusFilter}).
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const godownNames = (p.godownStocks || [])
                  .filter((gs: any) => gs.quantity > 0)
                  .map((gs: any) => gs.godownName)
                  .join(", ") || (godowns[0]?.name || "Main Godown");

                const primaryImg = p.photoUrl || (p.photosList && p.photosList[0]) || null;

                return (
                  <div key={p.id} className="p-3 hover:bg-slate-50 transition space-y-2">
                    <div className="flex items-start space-x-2.5">
                      {primaryImg && (
                        <img
                          src={primaryImg}
                          alt={p.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0 bg-slate-100"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                              <h3
                                onClick={() => setViewingProduct(p)}
                                className="font-bold text-xs text-slate-900 truncate hover:text-emerald-700 cursor-pointer"
                                title={p.name}
                              >
                                {p.name}
                              </h3>
                            </div>

                            {p.size && (
                              <div className="mt-1 flex items-center space-x-1">
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  Size / Pkg: {p.size}
                                </span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                              <Warehouse className="h-3 w-3 shrink-0" />
                              <span className="truncate">{godownNames}</span>
                            </div>
                          </div>

                          <div>
                            {!p.isActive ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                Archived
                              </span>
                            ) : p.isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Out
                              </span>
                            ) : p.isLowStock ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Low
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Quantity</span>
                        <span className="font-extrabold text-sm text-emerald-700 font-mono">
                          {formatNumberIN(p.totalStock)}
                        </span>
                        <span className="ml-1 text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                          {p.unit || "SQ.FT"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Eye className="h-3 w-3 inline mr-0.5" /> Details
                        </button>
                        {p.isActive ? (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                            >
                              <Edit2 className="h-3 w-3 inline mr-0.5" /> Edit
                            </button>
                            <button
                              onClick={() => initiateProductRemoval(p)}
                              className="px-2 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            >
                              <Trash2 className="h-3 w-3 inline mr-0.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReactivate(p)}
                            className="px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            <RotateCcw className="h-3 w-3 inline mr-0.5" /> Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-14 text-center">Photo</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Size / Box / Piece</th>
                  <th className="py-3 px-3">Godown Location</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No products found for {branch.name} ({statusFilter}).
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const godownNames = (p.godownStocks || [])
                      .filter((gs: any) => gs.quantity > 0)
                      .map((gs: any) => gs.godownName)
                      .join(", ") || (godowns[0]?.name || "Main Godown");
                    const primaryImg = p.photoUrl || (p.photosList && p.photosList[0]) || null;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Photo */}
                        <td className="py-2.5 px-3 text-center">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 mx-auto bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p
                            className="font-bold text-slate-900 text-xs sm:text-sm hover:text-emerald-700 cursor-pointer truncate max-w-[320px]"
                            onClick={() => setViewingProduct(p)}
                            title={p.name}
                          >
                            {p.name}
                          </p>
                        </td>

                        {/* Size / Box / Piece */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.size ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {p.size}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Godown Location */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 text-slate-600">
                            <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-xs">{godownNames}</span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-black text-emerald-700 text-xs sm:text-sm font-mono">
                            {formatNumberIN(p.totalStock)}
                          </span>
                          <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {p.unit || "SQ.FT"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {!p.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              Archived
                            </span>
                          ) : p.isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : p.isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap min-w-[110px]">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setViewingProduct(p)}
                              className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {p.isActive ? (
                              <>
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit Product"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => initiateProductRemoval(p)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Remove Product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleReactivate(p)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Reactivate Product"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Product Details View */}
        {viewingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 text-slate-900 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{viewingProduct.name}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                    Branch: {branch.name}
                  </p>
                </div>
                <button
                  onClick={() => setViewingProduct(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {/* Photo Gallery if attached */}
                {((viewingProduct.photosList && viewingProduct.photosList.length > 0) || viewingProduct.photoUrl) && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(viewingProduct.photosList?.length > 0 ? viewingProduct.photosList : [viewingProduct.photoUrl]).map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={viewingProduct.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-50"
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Product Name</span>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingProduct.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Size / Box / Piece</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{viewingProduct.size || "Standard"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Available Quantity</span>
                    <p className="font-extrabold text-emerald-700 text-sm mt-0.5 font-mono">
                      {formatNumberIN(viewingProduct.totalStock)} {viewingProduct.unit || "SQ.FT"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {viewingProduct.isActive ? "Active" : "Archived"}
                    </p>
                  </div>
                </div>

                {/* Godown Breakdown */}
                {viewingProduct.godownStocks && viewingProduct.godownStocks.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Godown Breakdown</span>
                    {viewingProduct.godownStocks.map((gs: any) => (
                      <div key={gs.godownId} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-slate-100">
                        <span className="font-medium text-slate-700">{gs.godownName}</span>
                        <span className="font-bold font-mono text-slate-900">
                          {formatNumberIN(gs.quantity)} {viewingProduct.unit || "SQ.FT"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                {viewingProduct.isActive && (
                  <button
                    onClick={() => {
                      const prod = viewingProduct;
                      setViewingProduct(null);
                      initiateProductRemoval(prod);
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}

                <div className="flex items-center space-x-2 ml-auto">
                  {viewingProduct.isActive && (
                    <button
                      onClick={() => {
                        const prod = viewingProduct;
                        setViewingProduct(null);
                        openEditModal(prod);
                      }}
                      className="px-3.5 py-1.5 bg-navy-900 text-white hover:bg-navy-800 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={() => setViewingProduct(null)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmation Dialog for Remove Product */}
        {productToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Confirm Product Removal</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500">Authorized Action</p>
                  </div>
                </div>
                <button
                  onClick={() => setProductToRemove(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Product To Remove:</p>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{productToRemove.name}</h4>
                  {productToRemove.size && (
                    <p className="text-[11px] text-slate-600 mt-0.5">Size / Pkg: {productToRemove.size}</p>
                  )}
                </div>

                {removalChecking ? (
                  <div className="py-4 text-center text-xs text-slate-500">Checking historical records & stock...</div>
                ) : (
                  <>
                    {(productToRemove.totalStock > 0 || (removalAudit && removalAudit.totalStock > 0)) && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Remaining Stock Alert</p>
                            <p className="mt-0.5 text-[11px] text-amber-900">
                              This product currently has{" "}
                              <strong>
                                {removalAudit?.totalStock || productToRemove.totalStock} {productToRemove.unit || "SQ.FT"}
                              </strong>{" "}
                              of stock available in the godown.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {removalAudit?.hasHistory || productToRemove.totalStock > 0 ? (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs">
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Safe Deactivation & Archive Policy</p>
                            <p className="mt-0.5 text-[11px] text-blue-800">
                              This product has transaction records. It will be safely archived and hidden from active lists, while keeping previous invoices accurate.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-800 text-xs">
                        This product has no transactions or remaining stock. It will be permanently deleted.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setProductToRemove(null)}
                  disabled={isRemoving}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={isRemoving || removalChecking}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5"
                >
                  {isRemoving ? (
                    <span>Removing...</span>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Confirm Remove</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Product (Clean, Simplified Form) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 text-slate-900 my-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingProduct ? "Edit Product" : `Add New Product — ${branch.name}`}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Enter product name, size, quantity and receiving godown
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
                {/* 1. Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Vitrified Tiles / Ceramic Tile / Marble Slab"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* 2. Size / Box / Piece */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Size / Box / Piece
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. 2x2 ft, 4 Pcs/Box, 600x600 mm"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Photo Upload (Optional - Only visible when attached by user) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Photo (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {uploadedPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shadow-sm group bg-slate-100 shrink-0"
                      >
                        <img src={url} alt="Product" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow transition"
                          title="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}

                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/50 shrink-0">
                      {uploadingPhoto ? (
                        <span className="text-[9px] text-emerald-600 font-semibold animate-pulse">Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-slate-400" />
                          <span className="text-[10px] text-slate-600 font-bold mt-1">+ Photo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Photo tabhi dikhegi jab aap select karke attach karenge.
                  </p>
                </div>

                {/* 3. Quantity & Unit Selection */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="SQ.FT">SQ.FT</option>
                      <option value="BOX">BOX</option>
                      <option value="PIECE">PIECE</option>
                    </select>
                  </div>
                </div>

                {/* 4. Godown Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Receiving Godown *
                  </label>
                  <select
                    value={formData.godownId}
                    onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-slate-900"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    {editingProduct ? "Update Product" : "Save Product"}
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
