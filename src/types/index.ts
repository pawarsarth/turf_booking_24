export type Role = 'USER' | 'OWNER' | 'ADMIN';
export type Sport = 'FOOTBALL' | 'CRICKET' | 'BASKETBALL';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface Turf {
  id: string; name: string; description: string; location: string;
  address: string; city: string; sport: Sport[]; pricePerHour: number;
  images: string[]; amenities: string[]; openTime: string; closeTime: string;
  isActive: boolean; ownerId: string; owner?: { name: string; phone?: string };
  ownerPhone?: string; ownerEmail?: string; createdAt: string;
}
export interface TimeSlot { id: string; turfId: string; date: string; startTime: string; endTime: string; isBooked: boolean; }
export interface Booking {
  id: string; userId: string; turfId: string; slotId: string; date: string;
  startTime: string; endTime: string; totalPrice: number; status: BookingStatus;
  paymentId?: string; paymentOrderId?: string; paymentStatus: PaymentStatus;
  ownerRevealed: boolean; notes?: string;
  turf?: Turf & { name: string; city: string; location: string; images: string[] };
  slot?: TimeSlot; ownerContact?: { ownerPhone?: string; ownerEmail?: string } | null;
  createdAt: string;
}
export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  bookingId?: string;
  bookingAmount?: number;
  showBookButton?: boolean;
}
