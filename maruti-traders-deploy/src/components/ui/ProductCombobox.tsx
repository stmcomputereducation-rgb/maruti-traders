"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  sku?: string;
  unit?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  currentStock?: number;
  gstRate?: number;
  godownStocks?: Array<{ godownId: string; quantity: number }>;
}

interface ProductComboboxProps {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct?: (product: any) => void;
  products: any[];
  placeholder?: string;
  priceType?: "sellingPrice" | "purchasePrice";
  showStock?: boolean;
  selectedGodownId?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
}

export default function ProductCombobox({
  value,
  onChange,
  onSelectProduct,
  products = [],
  placeholder = "Select or type product name...",
  priceType = "sellingPrice",
  showStock = false,
  selectedGodownId,
  className = "",
  inputClassName = "",
  required = false,
}: ProductComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Smart upward/downward positioning based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 260) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Filter products based on search query
  const filtered = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const skuMatch = p.sku?.toLowerCase().includes(q);
    return nameMatch || skuMatch;
  });

  function handleSelect(product: any) {
    onChange(product.name);
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setSearchQuery("");
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    setSearchQuery(val);
    if (!isOpen) setIsOpen(true);
  }

  function handleToggleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      setSearchQuery("");
    }
    setIsOpen((prev) => !prev);
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? "z-[250]" : "z-10"} ${className}`}
    >
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onClick={() => {
            if (!isOpen) {
              setSearchQuery("");
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className={`w-full pr-8 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium focus:ring-2 focus:ring-navy-500 shadow-2xs transition ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={handleToggleOpen}
          className="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-400 hover:text-navy-900 transition cursor-pointer"
          title="Open product list"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-navy-800" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          className={`absolute left-0 z-[300] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs w-full min-w-full md:min-w-[420px] max-w-lg ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Header */}
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-200">
            <span>Product Catalog ({filtered.length})</span>
            <span className="text-[9px] text-slate-400 font-normal">Select or type custom</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-xs">
              <p>No catalog product matches "{searchQuery || value}"</p>
              <button
                type="button"
                onClick={() => {
                  onChange(searchQuery || value);
                  setIsOpen(false);
                }}
                className="mt-1.5 inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold text-[11px]"
              >
                <Plus className="h-3 w-3" />
                <span>Use as custom product: "{searchQuery || value}"</span>
              </button>
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = p.name.toLowerCase() === (value || "").toLowerCase();
              const price = priceType === "purchasePrice" ? p.purchasePrice : p.sellingPrice;
              let stock: number | null = null;
              if (showStock && p.godownStocks) {
                stock = selectedGodownId
                  ? p.godownStocks.find((g: any) => g.godownId === selectedGodownId)?.quantity ?? p.currentStock ?? 0
                  : p.currentStock ?? 0;
              } else if (showStock) {
                stock = p.currentStock ?? 0;
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-navy-50/80 transition flex items-center justify-between gap-2 ${
                    isSelected ? "bg-navy-50 text-navy-900 font-bold" : "text-slate-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-navy-950 truncate">{p.name}</span>
                      {p.sku && (
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                          {p.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>Rate: <strong className="text-slate-700">₹{price || 0}</strong>/{p.unit || "SQ.FT"}</span>
                      {showStock && stock !== null && (
                        <span className={`font-bold ${stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          • Stock: {stock} {p.unit || "SQ.FT"}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-navy-700 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
