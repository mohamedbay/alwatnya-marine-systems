
export type ProductType = 'Engine' | 'Boat' | 'SparePart' | 'Equipment' | 'Maintenance' | 'Fluid';

export interface Product {
  id: string;
  name: string;
  category: ProductType;
  stock: number;
  price: number; // LYD
  costUSD: number; // USD
  supplierId: string;
  minStock: number;
  location: string;
}

export type CustomerType = 'Permanent' | 'WalkIn';

export interface Customer {
  id: string;
  name: string;
  contact: string;
  type: CustomerType;
  balance: number; // LYD (Positive = Credit, Negative = Debit/Owe us)
}

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  laborCost: number;
  total: number;
  paymentMethod: 'Cash' | 'Check' | 'Transfer' | 'Credit'; // Credit adds to debt
  status: 'Completed' | 'Pending';
  invoiceType: 'Sale' | 'Maintenance' | 'Supply'; // Added invoiceType
  maintenanceDevice?: string;
  notes?: string;
  createdBy: string; // User ID
}

export interface SupplyInvoice {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    costUSD: number;
    priceLYD: number;
  }[];
  totalUSD: number;
  totalLYD: number;
  notes?: string;
  createdBy: string;
}

export type MaintenanceStatus = 'Entered' | 'Inspected' | 'In Progress' | 'Finished' | 'Delivered';

export interface MaintenancePart {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface MaintenanceRecord {
  id: string;
  date: string; // Date entered
  completionDate?: string;
  customerId: string;
  customerName: string; 
  technician: string;
  deviceInfo: string; // Boat/Engine Name
  serviceType: string;
  inspectionNotes: string; // Diagnosis
  status: MaintenanceStatus;
  
  // Financials
  laborCost: number; // Cost of work
  partsUsed: MaintenancePart[]; // Parts from inventory
  totalCost: number; // labor + parts
  paidAmount: number;
  remainingAmount: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export interface EmailMessage {
  id: string;
  inbox: 'sales@alwatnya.com.ly' | 'info@alwatnya.com.ly';
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
}

export type Permission = 'dashboard' | 'sales' | 'inventory' | 'maintenance' | 'customers' | 'accounting' | 'settings' | 'reports' | 'messages' | 'archive';

export interface User {
  id: string;
  username: string;
  name: string;
  password: string; // In a real app, this should be hashed
  role: 'Admin' | 'User';
  permissions: Permission[];
}
