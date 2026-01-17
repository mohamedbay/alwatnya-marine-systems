
import { Product, Customer, Sale, MaintenanceRecord, Supplier, User, EmailMessage } from './types';

export const MOCK_USERS: User[] = [
  { 
    id: 'U001', 
    username: 'admin', 
    name: 'المدير العام', 
    password: '123', 
    role: 'Admin', 
    permissions: ['dashboard', 'sales', 'inventory', 'maintenance', 'customers', 'accounting', 'settings', 'reports', 'messages'] 
  },
  { 
    id: 'U002', 
    username: 'sales', 
    name: 'موظف مبيعات', 
    password: '123', 
    role: 'User', 
    permissions: ['dashboard', 'sales', 'customers', 'messages'] 
  },
  { 
    id: 'U003', 
    username: 'tech', 
    name: 'مهندس صيانة', 
    password: '123', 
    role: 'User', 
    permissions: ['dashboard', 'maintenance'] 
  }
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'P001', name: 'محرك ياماها 200 حصان', category: 'Engine', stock: 5, price: 45000, costUSD: 6000, supplierId: 'S001', minStock: 2, location: 'المخزن الرئيسي' },
  { id: 'P002', name: 'سترة نجاة احترافية', category: 'Equipment', stock: 50, price: 350, costUSD: 40, supplierId: 'S002', minStock: 20, location: 'المعرض' },
  { id: 'P003', name: 'جهاز ملاحة جارمن', category: 'Equipment', stock: 12, price: 3200, costUSD: 450, supplierId: 'S002', minStock: 5, location: 'المعرض' },
  { id: 'P004', name: 'قارب صيد 25 قدم', category: 'Boat', stock: 2, price: 185000, costUSD: 25000, supplierId: 'S001', minStock: 1, location: 'الساحة' },
  { id: 'P005', name: 'زيت محركات 5 لتر', category: 'Fluid', stock: 100, price: 150, costUSD: 15, supplierId: 'S003', minStock: 30, location: 'المخزن الرئيسي' },
  { id: 'P006', name: 'شمعات احتراق V8', category: 'SparePart', stock: 8, price: 65, costUSD: 5, supplierId: 'S003', minStock: 10, location: 'المخزن الرئيسي' },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C001', name: 'أحمد الفارسي', contact: '0911234567', type: 'Permanent', balance: 0 },
  { id: 'C002', name: 'شركة البحر الأحمر', contact: '0929988776', type: 'Permanent', balance: -15000 }, // Negative means they owe us
];

export const MOCK_SALES: Sale[] = [
  { 
    id: 'INV-1001', 
    date: '2024-05-20', 
    customerId: 'C001', 
    customerName: 'أحمد الفارسي', 
    customerType: 'Permanent',
    items: [{ productId: 'P002', productName: 'سترة نجاة احترافية', quantity: 2, price: 350 }], 
    total: 700, 
    paymentMethod: 'Cash', 
    status: 'Completed',
    createdBy: 'U001'
  },
];

export const MOCK_MAINTENANCE: MaintenanceRecord[] = [
  { 
    id: 'JOB-2024-001', 
    date: '2024-05-18', 
    completionDate: '2024-05-20',
    customerId: 'C001', 
    customerName: 'أحمد الفارسي', 
    deviceInfo: 'قارب 25 قدم - محرك ياماها',
    technician: 'عمر علي', 
    serviceType: 'فحص دوري', 
    inspectionNotes: 'تم تغيير الزيوت والفلاتر.', 
    status: 'Finished', 
    laborCost: 500,
    partsUsed: [{ productId: 'P005', productName: 'زيت محركات 5 لتر', quantity: 2, price: 150 }],
    totalCost: 800, 
    paidAmount: 800,
    remainingAmount: 0
  },
  { 
    id: 'JOB-2024-002', 
    date: '2024-05-22', 
    customerId: 'C002', 
    customerName: 'شركة البحر الأحمر', 
    deviceInfo: 'جت سكي Kawaski',
    technician: 'خالد ياسين', 
    serviceType: 'إصلاح هيكل', 
    inspectionNotes: 'يوجد كسر في المقدمة يحتاج فيبر جلاس.', 
    status: 'In Progress', 
    laborCost: 1500,
    partsUsed: [],
    totalCost: 1500, 
    paidAmount: 500,
    remainingAmount: 1000
  },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'S001', name: 'Yamaha Japan', contact: '+81-9000', email: 'sales@yamaha.com' },
  { id: 'S002', name: 'Marine Safety Co', contact: '+971-5000', email: 'info@marinesafety.ae' },
];

export const MOCK_MESSAGES: EmailMessage[] = [
  {
    id: 'MSG-001',
    inbox: 'sales@alwatnya.com.ly',
    sender: 'محمد الليبي',
    senderEmail: 'mohamed@example.com',
    subject: 'استفسار بخصوص محرك 200 حصان',
    body: 'السلام عليكم،\n\nنرجو منكم إفادتنا بسعر محرك ياماها 200 حصان مع التركيب.\n\nشكراً.',
    date: '2024-05-23T10:30:00',
    isRead: false,
    hasAttachment: false
  },
  {
    id: 'MSG-002',
    inbox: 'info@alwatnya.com.ly',
    sender: 'شركة الشحن العالمية',
    senderEmail: 'logistics@globalshipping.com',
    subject: 'فاتورة الشحنة رقم #9988',
    body: 'مرفق لكم فاتورة الشحنة الأخيرة. يرجى المراجعة والسداد.',
    date: '2024-05-22T14:15:00',
    isRead: true,
    hasAttachment: true
  },
  {
    id: 'MSG-003',
    inbox: 'sales@alwatnya.com.ly',
    sender: 'علي التاجوري',
    senderEmail: 'ali.taj@gmail.com',
    subject: 'طلب عرض سعر معدات سلامة',
    body: 'نحتاج عدد 50 سترة نجاة و 5 أجهزة GPS.\nهل توجد كمية متوفرة؟',
    date: '2024-05-21T09:00:00',
    isRead: true,
    hasAttachment: false
  }
];
