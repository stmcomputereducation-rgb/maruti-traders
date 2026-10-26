/**
 * Maruti Traders ERP - Formatting & Calculation Utilities
 * Enforces Indian Standards: INR (₹), Lakhs/Crores, DD-MM-YYYY, IST Timezone
 */

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatNumberIN(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = String(hours).padStart(2, "0");

  return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
}

export function toInputDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return new Date().toISOString().split("T")[0];
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
}

// Convert numbers to Indian Words (for Tax Invoices)
export function amountToWords(num: number): string {
  if (isNaN(num) || num === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return tens[ten] + (rest > 0 ? " " + ones[rest] : "");
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) {
      res += ones[hundred] + " Hundred";
      if (rest > 0) res += " and ";
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let remaining = integerPart;
  let words = "";

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    words += convertTwoDigits(crore) + " Crore ";
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + " Lakh ";
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + " Thousand ";
  }

  if (remaining > 0) {
    words += convertThreeDigits(remaining) + " ";
  }

  words = words.trim() + " Rupees";

  if (decimalPart > 0) {
    words += " and " + convertTwoDigits(decimalPart) + " Paise";
  }

  return words + " Only";
}

export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  isInterState: boolean = false
) {
  const totalTax = (taxableAmount * gstRate) / 100;
  if (isInterState) {
    return {
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax,
    };
  } else {
    const half = totalTax / 2;
    return {
      cgstAmount: half,
      sgstAmount: half,
      igstAmount: 0,
      totalTax,
    };
  }
}
