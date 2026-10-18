export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin';
  rollNumber?: string;
  roomNumber?: string;
  block?: string;
  bedId?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  bloodGroup?: string;
  profileImage?: string;
  course?: string;
  feesPending?: number;
  checkInStatus?: string;
}

export interface Room {
  id: number;
  roomNo: string;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  type: string;
  rentPerSemester: number;
  amenities: string;
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
  occupants: Partial<User>[];
  availableBeds: number;
}

export interface Complaint {
  id: number;
  title: string;
  category: string;
  priority?: 'Low' | 'Normal' | 'High' | 'Urgent';
  description?: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
  adminRemarks?: string;
  image?: string;
  date?: string;
  createdAt?: string;
  resolvedAt?: string;
  userId?: number;
  User?: Partial<User>;
}

export interface GatePass {
  id: number;
  reason: string;
  passType?: 'Day Out' | 'Night Stay' | 'Home Visit' | 'Emergency Leave';
  from: string;
  to: string;
  departureTime?: string;
  returnTime?: string;
  destination?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Used' | 'Expired';
  parentConsent?: string;
  adminRemarks?: string;
  passToken?: string;
  studentId: number;
  createdAt?: string;
  User?: Partial<User>;
}

export interface MessMenuDay {
  Breakfast: { item: string; time: string };
  Lunch: { item: string; time: string };
  Snacks: { item: string; time: string };
  Dinner: { item: string; time: string };
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  category: string;
  postedBy: string;
  createdAt?: string;
}

export interface FeeRecord {
  id: number;
  studentId: number;
  title: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate?: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  receiptNumber?: string;
}

export interface LostItem {
  id: string;
  item: string;
  location: string;
  contact: string;
  type: 'LOST' | 'FOUND';
  date: string;
  description?: string;
  image?: string | null;
  proofImage?: string | null;
  foundBy?: string | null;
  isResolved?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  user: string;
  time: string;
  self: boolean;
  senderId?: number;
  isNotice?: boolean;
}