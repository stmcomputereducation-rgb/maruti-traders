"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface PartyItem {
  id: string;
  name: string;
  phone?: string;
  city?: string;
  address?: string;
  gstin?: string;
  outstandingBalance?: number;
}

interface PartyComboboxProps {
  value: string;
  onChange: (val: string) => void;
  onSelectParty?: (party: PartyItem) => void;
  parties: PartyItem[];
  placeholder?: string;
  partyType?: "customer" | "supplier";
  className?: string;
  inputClassName?: string;
  required?: boolean;
}

export default function PartyCombobox({
  value,
  onChange,
  onSelectParty,
  parties = [],
  placeholder = "Select or type party name...",
  partyType = "customer",
  className = "",
  inputClassName = "",
  required = false,
}: PartyComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const filtered = parties.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const phoneMatch = p.phone?.toLowerCase().includes(q);
    const cityMatch = p.city?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || cityMatch;
  });

  function handleSelect(party: PartyItem) {
    onChange(party.name);
    if (onSelectParty) {
      onSelectParty(party);
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
          className={`w-full pr-8 border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold text-navy-900 focus:ring-2 focus:ring-navy-500 shadow-2xs transition ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={handleToggleOpen}
          className="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-400 hover:text-navy-900 transition cursor-pointer"
          title={`Open ${partyType} list`}
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
          className={`absolute left-0 z-[300] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs w-full min-w-full md:min-w-[360px] max-w-lg ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-200">
            <span>{partyType === "customer" ? "Registered Customers" : "Registered Suppliers"} ({filtered.length})</span>
            <span className="text-[9px] text-slate-400 font-normal">Select or type custom</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-xs">
              <p>No party matches "{searchQuery || value}"</p>
              <p className="text-[10px] text-blue-600 mt-1 font-semibold">
                Will be saved as new custom {partyType}.
              </p>
            </div>
          ) : (
            filtered.map((party) => {
              const isSelected = party.name.toLowerCase() === (value || "").toLowerCase();
              return (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => handleSelect(party)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-navy-50/80 transition flex items-center justify-between gap-2 ${
                    isSelected ? "bg-navy-50 text-navy-900 font-bold" : "text-slate-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-navy-950 truncate">{party.name}</span>
                      {party.city && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                          {party.city}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>Ph: {party.phone || "N/A"}</span>
                      {party.gstin && <span>• GST: {party.gstin}</span>}
                      {party.outstandingBalance !== undefined && party.outstandingBalance > 0 && (
                        <span className="text-rose-600 font-bold">
                          • Due: ₹{party.outstandingBalance}
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
