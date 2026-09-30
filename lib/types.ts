export type SessionStatus = "upcoming" | "active" | "completed";
export type PayStatus = "pending" | "paid";

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface Court {
  id: string;
  name: string;
  price: number;
  playerIds: string[];
  paidBy?: string;
}

export interface Shuttle {
  id: string;
  name: string;
  /** Harga satu slope/tube utuh (mis. 1 tube isi 12 = Rp111.000). */
  packPrice: number;
  /** Isi satu slope — pembagi harga, jadi harga per butir = packPrice / packSize. */
  packSize: number;
  /** Berapa butir yang dipakai untuk item ini (dipakai bersama semua pemain di sini). */
  used: number;
  playerIds: string[];
  paidBy?: string;
}

export interface AddCost {
  id: string;
  name: string;
  category: string;
  amount: number;
}

export interface Session {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
  status: SessionStatus;
  shareCode: string;
  playerIds: string[];
  courts: Court[];
  shuttlecocks: Shuttle[];
  additionalCosts: AddCost[];
  payments: Record<string, PayStatus>;
  /** Data-URL gambar QR pembayaran (hasil upload, tersimpan di kolom payment_qr). */
  paymentQr?: string;
}

export const ADD_COST_CATEGORIES = [
  "Booking Admin",
  "Parkir",
  "Sewa Raket",
  "Konsumsi",
  "Lainnya",
] as const;
