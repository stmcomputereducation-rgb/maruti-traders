export type LocationCode = "JALOD" | "DAHOD";
export const LOCATION_COOKIE = "maruti_location";

export interface BranchProfile {
  code: LocationCode;
  name: string;
  tagline: string;
  state: string;
  district: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  invoicePrefix: string;
  badgeColor: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  marbleSpecialty: string;
  heroImage: string;
}

export interface AuthorizedGodown {
  id: string;
  code: string;
  name: string;
  location: LocationCode;
  city: string;
  state: string;
  address: string;
  managerName: string;
  contactPhone: string;
}

export const AUTHORIZED_GODOWNS: Record<string, AuthorizedGodown> = {
  JALOD: {
    id: "cmvj8fnqp0003arg5cej4eeiy",
    code: "JALOD",
    name: "Jalod Godown",
    location: "JALOD",
    city: "Jalod",
    state: "Gujarat",
    address: "Plot 1-2, Industrial Area Highway, Jalod",
    managerName: "Sanjay Bhai",
    contactPhone: "+91 98250 11223",
  },
  DAHOD: {
    id: "cmvj8fnsw0005arg527n6akat",
    code: "DAHOD",
    name: "Dahod Godown",
    location: "DAHOD",
    city: "Dahod",
    state: "Gujarat",
    address: "Plot 18-20, GIDC Godhra Road, Station Area, Dahod",
    managerName: "Jignesh Patel",
    contactPhone: "+91 98765 43210",
  },
};
// Backward compatibility alias
AUTHORIZED_GODOWNS.LODHA = AUTHORIZED_GODOWNS.JALOD;

export const BRANCH_CONFIGS: Record<string, BranchProfile> = {
  JALOD: {
    code: "JALOD",
    name: "Maruti Traders (Jalod Branch)",
    tagline: "Premium Italian & Imported Marble Slabs",
    state: "Gujarat",
    district: "Jalod",
    city: "Jalod",
    address: "Plot No. 12-15, Marble & Granite Industrial Area, Main Road, Jalod - 389170, Gujarat",
    phone: "+91 98290 12345",
    email: "jalod@marutitraders.com",
    gstin: "24AABCM9012J1Z4",
    pan: "AABCM9012J",
    invoicePrefix: "MT-JAL-",
    badgeColor: "emerald",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-500",
    accentText: "text-emerald-700",
    marbleSpecialty: "Italian Statuario, Makrana Pure White, Botticino Classic, Brazilian Quartzite",
    heroImage: "/uploads/marbles/statuario-1.svg",
  },
  DAHOD: {
    code: "DAHOD",
    name: "Maruti Traders (Dahod Branch)",
    tagline: "Indian Marble, Granite Blocks & Composite Stones",
    state: "Gujarat",
    district: "Dahod",
    city: "Dahod",
    address: "Survey No. 88, Godhra Bypass Road, Near APMC Market, Dahod - 389151, Gujarat",
    phone: "+91 98250 54321",
    email: "dahod@marutitraders.com",
    gstin: "24AABCM9012D1Z9",
    pan: "AABCM9012D",
    invoicePrefix: "MT-DAH-",
    badgeColor: "blue",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-500",
    accentText: "text-blue-700",
    marbleSpecialty: "Rajasthan Green, Black Galaxy Granite, Alaska White, Katni Beige",
    heroImage: "/uploads/marbles/black-galaxy-1.svg",
  },
};
// Backward compatibility alias
BRANCH_CONFIGS.LODHA = BRANCH_CONFIGS.JALOD;
