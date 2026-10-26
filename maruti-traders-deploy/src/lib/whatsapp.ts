/**
 * WhatsApp Integration Utilities for Maruti Traders
 * Generates direct wa.me links with formatted messages for Invoices, Receipts, and Khata Reminders
 */

export function cleanIndianPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    // already has 91
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.substring(1);
  }
  return cleaned;
}

export interface InvoiceShareData {
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: string;
  paidAmount: string;
  balanceDue: string;
  paymentMode: string;
  companyName?: string;
  companyPhone?: string;
  upiId?: string;
  pdfDownloadUrl?: string;
}

export function generateInvoiceWhatsAppUrl(data: InvoiceShareData): string {
  const phone = cleanIndianPhoneNumber(data.customerPhone);
  const company = data.companyName || "Maruti Traders";
  const upi = data.upiId ? `\n💳 *Pay via UPI:* ${data.upiId}` : "";
  const pdfSection = data.pdfDownloadUrl
    ? `\n📥 *Download Official Tax Invoice PDF:* \n${data.pdfDownloadUrl}\n`
    : "";

  const message = `🙏 *Namaste ${data.customerName} ji!*

Thank you for your marble order with *${company}*.

📄 *Tax Invoice Summary:*
• *Bill No:* ${data.invoiceNumber}
• *Date:* ${data.invoiceDate}
• *Grand Total:* ${data.grandTotal}
• *Amount Paid:* ${data.paidAmount}
• *Balance Due:* ${data.balanceDue}
• *Payment Mode:* ${data.paymentMode}
${pdfSection}${upi}
For any queries, please contact us at ${data.companyPhone || "+91 98290 12345"}.

Have a wonderful day!`;

  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export interface PaymentReceiptShareData {
  customerName: string;
  customerPhone: string;
  receiptNumber: string;
  paymentDate: string;
  amount: string;
  paymentMode: string;
  currentBalance: string;
  referenceNumber?: string;
  companyName?: string;
}

export function generatePaymentReceiptWhatsAppUrl(data: PaymentReceiptShareData): string {
  const phone = cleanIndianPhoneNumber(data.customerPhone);
  const company = data.companyName || "Maruti Traders";
  const refText = data.referenceNumber ? `\n• *Ref / UTR No:* ${data.referenceNumber}` : "";

  const message = `🙏 *Namaste ${data.customerName} ji!*

We have successfully received your payment at *${company}*.

🧾 *Payment Receipt:*
• *Receipt No:* ${data.receiptNumber}
• *Date:* ${data.paymentDate}
• *Amount Received:* ${data.amount}
• *Mode:* ${data.paymentMode}${refText}
• *Current Outstanding Balance:* ${data.currentBalance}

Thank you for your timely payment!`;

  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export interface KhataReminderData {
  customerName: string;
  customerPhone: string;
  outstandingBalance: string;
  overdueDays?: number;
  companyName?: string;
  companyPhone?: string;
  upiId?: string;
}

export function generateKhataReminderWhatsAppUrl(data: KhataReminderData): string {
  const phone = cleanIndianPhoneNumber(data.customerPhone);
  const company = data.companyName || "Maruti Traders";
  const upi = data.upiId ? `\n💳 *Pay instantly via UPI:* ${data.upiId}` : "";

  const message = `🙏 *Namaste ${data.customerName} ji!*

This is a gentle reminder from *${company}* regarding your pending account balance.

📊 *Account Status:*
• *Outstanding Balance:* ${data.outstandingBalance}
${data.overdueDays ? `• *Overdue Period:* ${data.overdueDays} days\n` : ""}${upi}

Kindly arrange the payment at your earliest convenience. If you have already paid, please ignore this message or share the transaction receipt with us at ${data.companyPhone || "+91 98765 43210"}.

Thank you!
*${company}*`;

  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
