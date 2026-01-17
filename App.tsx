
import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Wrench, 
  Users, 
  PieChart as PieChartIcon, 
  Settings, 
  Menu, 
  X, 
  Search, 
  Plus, 
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Anchor,
  Trash2,
  Edit,
  Save,
  Phone,
  Printer,
  FileText,
  LogOut,
  Calendar as CalendarIcon,
  ChevronLeft,
  Eye,
  MapPin,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Briefcase,
  User as UserIcon,
  Shield,
  Key,
  MessageCircle,
  Share2,
  Filter,
  BarChart3,
  ClipboardList,
  CheckSquare,
  Clock,
  Banknote,
  CreditCard,
  ChevronDown,
  FileBarChart,
  Mail,
  Send,
  Paperclip,
  RefreshCw,
  Inbox,
  Archive,
  LogIn
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_SALES, MOCK_MAINTENANCE, MOCK_USERS, MOCK_SUPPLIERS, MOCK_MESSAGES, MOCK_SUPPLY_INVOICES } from './constants';
import { Product, Customer, Sale, MaintenanceRecord, MaintenancePart, User, Permission, MaintenanceStatus, ProductType, EmailMessage, CustomerType, SupplyInvoice } from './types';

// --- Visual Identity Constants (For Charts Only) ---
const CHART_COLORS = ['#0B2C4D', '#2E8B57', '#F4A261', '#C0392B', '#3498DB', '#9B59B6'];

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  const rounded = Math.round(amount || 0);
  return `${rounded.toLocaleString('ar-LY')} دل`;
};

const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
};

const triggerPrint = (title: string = 'طباعة') => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  const element = document.querySelector('.print-area') as HTMLElement | null;
  if (!element) {
    window.print();
    return;
  }
  const printWindow = window.open('', '_blank', 'width=900,height=650');
  if (!printWindow) {
    window.print();
    return;
  }

  const head = document.querySelector('head');
  const headStyles = head
    ? Array.from(head.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(node => node.outerHTML)
        .join('\n')
    : '';

  printWindow.document.open();
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        ${headStyles}
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background: #F8FAFC; }
          .print-area { width: 21cm; min-height: 29.7cm; margin: 0 auto; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body class="bg-[var(--surface)] text-[var(--text)]">
        ${element.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

const downloadPdfFromPrintArea = async (fileName: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const element = document.querySelector('.print-area') as HTMLElement | null;
  if (!element) {
    alert('تعذر العثور على محتوى الفاتورة للتصدير كملف PDF.');
    return;
  }
  const worker = (html2pdf as any)()
    .set({
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
    .from(element);
  await worker.save();
};

const sharePdfFromPrintArea = async (fileName: string, message: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const element = document.querySelector('.print-area') as HTMLElement | null;
  if (!element) {
    alert('تعذر العثور على محتوى الفاتورة للتصدير كملف PDF.');
    return;
  }
  const worker = (html2pdf as any)()
    .set({
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
    .from(element);

  try {
    const blob: Blob = await worker.outputPdf('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const nav: any = navigator;
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: fileName,
        text: message
      });
    } else {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      alert('تم فتح ملف PDF في تبويب جديد، يمكن حفظه ثم مشاركته في الواتساب أو التلغرام.');
    }
  } catch (error) {
    alert('حدث خطأ أثناء تجهيز ملف PDF للمشاركة. يمكنك استخدام زر الطباعة ثم حفظ كـ PDF.');
  }
};

const PRODUCT_CATEGORIES_AR: Record<ProductType, string> = {
  'Engine': 'محركات',
  'Boat': 'قوارب',
  'SparePart': 'قطع غيار',
  'Equipment': 'معدات بحرية',
  'Maintenance': 'مواد صيانة',
  'Fluid': 'زيوت وسوائل'
};

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  Entered: 'تم الاستلام',
  Inspected: 'تم الفحص',
  'In Progress': 'قيد العمل',
  Finished: 'جاهز للتسليم',
  Delivered: 'تم التسليم'
};

const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'Entered',
  'Inspected',
  'In Progress',
  'Finished',
  'Delivered'
];

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props} 
    className={`w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm ${props.className}`} 
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    {...props} 
    className={`w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm ${props.className}`} 
  >
    {props.children}
  </select>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    {...props} 
    className={`w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm ${props.className}`} 
  />
);

const Modal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}> = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
    full: 'w-[95vw] h-[95vh]'
  };

  return (
    <div className="fixed inset-0 bg-[#0B2C4D]/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in no-print">
      <div className={`bg-[var(--surface)] rounded-2xl ${sizeClasses[size]} shadow-2xl flex flex-col max-h-[95vh] w-full overflow-hidden border border-white/20`}>
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-[var(--primary)] to-[#123E6B]">
          <h3 className="font-bold text-xl text-white">{title}</h3>
          {showCloseButton && (
            <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-[var(--surface)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const InventoryReportTemplateA4: React.FC<{ 
  products: Product[], 
  user: User 
}> = ({ products, user }) => {
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div
      className="print-area w-full bg-[#F8FAFC] text-black font-sans text-[11px] p-10 dir-rtl flex flex-col"
      style={{ width: '21cm', minHeight: '29.7cm', margin: '0 auto', padding: '1.5cm' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-blue-900/20 pb-6 mb-8 bg-[#0B2C4D] p-6 rounded-xl text-white">
         <div className="flex items-center gap-6">
            <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-20 w-auto object-contain brightness-0 invert" />
            <div className="text-right">
               <h1 className="text-xl font-black text-white">الشركة الوطنية للمعدات البحرية</h1>
               <p className="text-[10px] font-bold text-blue-200 tracking-wider">AL-WATANYA MARINE SYSTEMS</p>
            </div>
         </div>
         <div className="text-left">
            <h2 className="text-2xl font-black text-white mb-1">كشف المخزون العام</h2>
            <p className="text-blue-200 font-bold">General Inventory Report</p>
            <p className="text-white font-black mt-2">بتاريخ: {new Date().toLocaleDateString('ar-LY')}</p>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
         <div className="border-2 border-gray-900 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">إجمالي قيمة المخزن (بيع)</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(totalStockValue)}</p>
         </div>
         <div className="border border-gray-200 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">إجمالي عدد القطع</p>
            <p className="text-lg font-black text-blue-700">{totalItems} قطعة</p>
         </div>
         <div className="border border-gray-200 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">أصناف تحتاج طلب (نواقص)</p>
            <p className="text-lg font-black text-red-600">{lowStockItems} صنف</p>
         </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1">
         <table className="w-full text-right border-collapse">
            <thead>
               <tr className="bg-gray-900 text-white">
                  <th className="py-2 px-3 border border-gray-700 w-10 text-center">#</th>
                  <th className="py-2 px-3 border border-gray-700 w-24">رقم الصنف</th>
                  <th className="py-2 px-3 border border-gray-700">اسم المنتج / Item Name</th>
                  <th className="py-2 px-3 border border-gray-700 w-24">التصنيف</th>
                  <th className="py-2 px-3 border border-gray-700 w-20 text-center">الكمية</th>
                  <th className="py-2 px-3 border border-gray-700 w-32 text-center">السعر</th>
                  <th className="py-2 px-3 border border-gray-700 w-32 text-center">الموقع</th>
               </tr>
            </thead>
            <tbody>
               {products.map((product, i) => (
                  <tr key={product.id} className="border-b border-gray-100 font-bold">
                     <td className="py-2 px-3 text-center border-x border-gray-50 text-gray-400">{i + 1}</td>
                     <td className="py-2 px-3 border-x border-gray-50 font-mono text-[9px]">{product.id}</td>
                     <td className="py-2 px-3 border-x border-gray-50">{product.name}</td>
                     <td className="py-2 px-3 border-x border-gray-50 text-[9px]">{PRODUCT_CATEGORIES_AR[product.category] || product.category}</td>
                     <td className={`py-2 px-3 border-x border-gray-50 text-center ${product.stock <= product.minStock ? 'text-red-600' : ''}`}>
                        {product.stock}
                     </td>
                     <td className="py-2 px-3 border-x border-gray-50 text-center">{formatCurrency(product.price)}</td>
                     <td className="py-2 px-3 border-x border-gray-50 text-center text-gray-500">{product.location}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Footer Signature */}
      <div className="mt-12 pt-8 border-t-2 border-gray-100 grid grid-cols-3 gap-8 text-center">
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">أمين المخزن</p>
            <div className="border-b border-gray-300 w-32 mx-auto"></div>
         </div>
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">مدير المشتريات</p>
            <p className="font-black text-gray-900 text-sm">صلاح أمنيصير</p>
         </div>
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">المدير العام</p>
            <p className="font-black text-gray-900 text-sm">محمد أبوديب</p>
         </div>
      </div>

      <div className="mt-8 text-center text-gray-400 font-bold text-[9px]">
         <p>تم استخراج هذا الكشف بواسطة: {user.name} | بتاريخ: {new Date().toLocaleString('ar-LY')}</p>
      </div>
    </div>
  );
};

// --- Custom Searchable Select Component ---
const SearchableProductSelect: React.FC<{
  products: Product[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}> = ({ products, selectedId, onSelect, placeholder = 'اختر منتج...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(p => p.id === selectedId);

  useEffect(() => {
    if (!selectedId) setSearch('');
  }, [selectedId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] flex justify-between items-center cursor-pointer focus-within:ring-2 focus-within:ring-[var(--primary)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedProduct ? 'text-[var(--text)] font-medium' : 'text-[var(--text-secondary)]'}>
          {selectedProduct ? `${selectedProduct.name} - ${formatCurrency(selectedProduct.price)}` : placeholder}
        </span>
        <ChevronDown size={18} className="text-[var(--text-secondary)]" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]">
            <input
              autoFocus
              type="text"
              placeholder="ابحث عن اسم المنتج..."
              className="w-full p-2 bg-[var(--bg)] rounded text-sm focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-[var(--text-secondary)] text-sm">لا توجد منتجات مطابقة</div>
          ) : (
            filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  onSelect(p.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`p-3 text-sm hover:bg-[var(--bg)] cursor-pointer border-b border-[var(--bg)] last:border-0 flex justify-between items-center ${selectedId === p.id ? 'bg-[#F0F9FF]' : ''}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-[var(--text-secondary)] text-xs">
                  {formatCurrency(p.price)} | متاح: {p.stock}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// --- Sales Form Components ---

const NewSaleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  onSave: (sale: Sale) => void;
  currentUser: User;
}> = ({ isOpen, onClose, products, customers, onSave, currentUser }) => {
  const [customerType, setCustomerType] = useState<CustomerType>('WalkIn');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Transfer' | 'Credit'>('Cash');
  const [items, setItems] = useState<{ productId: string, productName: string, quantity: number, price: number }[]>([]);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [maintenanceDevice, setMaintenanceDevice] = useState('');
  const [notes, setNotes] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = itemsTotal + laborCost;

  const currentCustomerName = customerType === 'Permanent' 
    ? (customers.find(c => c.id === selectedCustomerId)?.name || '')
    : manualCustomerName;

  const addItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItemIndex = items.findIndex(item => item.productId === productId);
    if (existingItemIndex !== -1) {
      const newItems = [...items];
      newItems[existingItemIndex].quantity += 1;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price
      }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, q: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, q);
    setItems(newItems);
  };

  const handleSubmit = () => {
    const hasItems = items.length > 0;
    const hasLabor = laborCost > 0;
    
    if (!currentCustomerName) {
      alert('يرجى اختيار العميل');
      return;
    }

    if (!hasItems && !hasLabor) {
      alert('يرجى إضافة منتجات أو تكلفة يد عاملة (صيانة)');
      return;
    }

    if (hasLabor && !hasItems && !maintenanceDevice) {
      alert('يرجى إدخال بيانات المحرك أو القارب لفاتورة الصيانة');
      return;
    }

    const newSale: Sale = {
      id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      customerId: customerType === 'Permanent' ? selectedCustomerId : 'WALKIN',
      customerName: currentCustomerName,
      customerType,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      })),
      laborCost,
      total,
      paymentMethod,
      status: 'Completed',
      invoiceType: laborCost > 0 ? 'Maintenance' : 'Sale',
      maintenanceDevice,
      notes,
      createdBy: currentUser.id
    };

    onSave(newSale);
    onClose();
    // Reset form
    setManualCustomerName('');
    setSelectedCustomerId('');
    setItems([]);
    setLaborCost(0);
    setMaintenanceDevice('');
    setNotes('');
    setIsPreview(false);
  };

  if (isPreview) {
    const tempSale: Sale = {
      id: 'PREVIEW',
      date: new Date().toISOString().split('T')[0],
      customerId: customerType === 'Permanent' ? selectedCustomerId : 'PREVIEW',
      customerName: currentCustomerName,
      customerType,
      items: items,
      laborCost,
      total,
      paymentMethod,
      status: 'Completed',
      invoiceType: laborCost > 0 ? 'Maintenance' : 'Sale',
      maintenanceDevice,
      notes,
      createdBy: currentUser.id
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="معاينة الفاتورة قبل الطباعة" size="lg" showCloseButton={false}>
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] print:scale-100">
              <InvoiceTemplateA4 sale={tempSale} products={products} user={currentUser} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between items-stretch md:items-center no-print bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <button onClick={() => setIsPreview(false)} className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-600 flex items-center gap-2">
              <ChevronLeft size={18} /> العودة للتعديل
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => downloadPdfFromPrintArea('sale-invoice.pdf')}
                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
              >
                <FileText size={18} /> تحميل كملف PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  sharePdfFromPrintArea(
                    'sale-invoice.pdf',
                    'فاتورة مبيعات من الشركة الوطنية للمعدات البحرية'
                  )
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Share2 size={18} /> مشاركة PDF
              </button>
              <button onClick={() => { triggerPrint('فاتورة مبيعات'); handleSubmit(); }} className="px-10 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-900/20 transition-all flex items-center gap-3">
                <Printer size={20} /> طباعة وتأكيد الفاتورة
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إصدار فاتورة مبيعات" size="lg">
      <div className="space-y-8">
        {/* Customer Section */}
        <div className="bg-gray-50/50 p-4 md:p-6 rounded-3xl border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">نوع الزبون</label>
              <div className="flex p-1 bg-gray-100 rounded-2xl w-full md:w-auto">
                <button 
                  onClick={() => setCustomerType('WalkIn')}
                  className={`flex-1 px-3 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold text-center transition-all ${customerType === 'WalkIn' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
                >
                  زبون عادي (نقدي)
                </button>
                <button 
                  onClick={() => setCustomerType('Permanent')}
                  className={`flex-1 px-3 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold text-center transition-all ${customerType === 'Permanent' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
                >
                  زبون دائم (مسجل)
                </button>
              </div>
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">طريقة الدفع</label>
              <Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="!bg-white">
                <option value="Cash">نقداً</option>
                <option value="Check">صك مصدق</option>
                <option value="Transfer">تحويل</option>
                <option value="Credit">آجل (دين)</option>
              </Select>
            </div>
          </div>

          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  {customerType === 'Permanent' ? 'اختر الزبون من القائمة' : 'اسم الزبون'}
                </label>
                {customerType === 'Permanent' ? (
                  <Select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="!bg-white">
                    <option value="">-- اختر زبون --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (الرصيد: {formatCurrency(c.balance)})</option>
                    ))}
                  </Select>
                ) : (
                  <Input 
                    placeholder="أدخل اسم الزبون هنا..." 
                    value={manualCustomerName} 
                    onChange={e => setManualCustomerName(e.target.value)} 
                    className="!bg-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">بيانات المحرك / القارب (للصيانة)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-blue-500">
                    <Anchor size={16} />
                  </div>
                  <Input 
                    placeholder="مثال: ياماها 200 - قارب صيد 25 قدم..." 
                    value={maintenanceDevice} 
                    onChange={e => setMaintenanceDevice(e.target.value)} 
                    className="!bg-white pr-10 border-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="font-black text-[var(--primary)] text-lg">الأصناف والبضائع</h4>
              <p className="text-xs text-gray-400 font-bold">ابحث عن الصنف في المخزن لإضافته</p>
            </div>
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
              {items.length} أصناف مضافة
            </span>
          </div>
          
          <div className="relative">
            <SearchableProductSelect 
              products={products} 
              selectedId="" 
              onSelect={addItem} 
              placeholder="ابحث بالاسم أو الباركود..." 
            />
          </div>

          <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
            {items.length === 0 && laborCost === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-300">
                <ShoppingCart size={48} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="font-bold text-sm">قائمة المشتريات فارغة</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-right border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase">الصنف</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center w-32">الكمية</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center w-32">الإجمالي</th>
                      <th className="p-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                <td className="p-4">
                          <p className="font-black text-[var(--primary)]">{item.productName}</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-bold text-gray-400">{formatCurrency(item.price)} للوحدة</span>
                            {products.find(p => p.id === item.productId) && (
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[9px] text-gray-500 font-bold">
                                {PRODUCT_CATEGORIES_AR[products.find(p => p.id === item.productId)!.category]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                            >-</button>
                            <input 
                              type="number"
                              className="w-12 text-center font-black bg-transparent focus:outline-none"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                            />
                            <button 
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                            >+</button>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-black text-[var(--primary)]">{formatCurrency(item.price * item.quantity)}</span>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => removeItem(index)} 
                            className="text-gray-300 hover:text-red-500 transition-colors p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Labor Cost Row */}
                    <tr className="bg-blue-50/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Wrench size={16} />
                          </div>
                          <div>
                            <p className="font-black text-blue-700">قيمة اليد العاملة</p>
                            <p className="text-[10px] font-bold text-blue-400">تكلفة الخدمات والصيانة</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"></td>
                      <td className="p-4 text-center">
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full p-2 bg-white border border-blue-100 rounded-xl text-center font-black text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={laborCost || ''}
                          onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            <h4 className="font-black text-gray-700">ملاحظات إضافية</h4>
          </div>
          <TextArea 
            placeholder="أدخل أي ملاحظات تظهر في الفاتورة هنا..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="!bg-gray-50/50"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-100">
          <div className="bg-[var(--primary)] text-white p-6 rounded-[2rem] min-w-[240px] shadow-xl shadow-blue-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">إجمالي الفاتورة</p>
            <p className="text-3xl font-black tracking-tighter">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-all">إلغاء</button>
            <button 
              onClick={() => setIsPreview(true)} 
              disabled={items.length === 0 || !currentCustomerName}
              className="px-12 py-4 bg-[var(--primary)] text-white rounded-2xl font-black hover:shadow-2xl hover:shadow-blue-900/30 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-3"
            >
              <Eye size={20} /> معاينة الفاتورة
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const DebtPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  currentUser: User;
  onConfirm: (sale: Sale, amount: number) => void;
}> = ({ isOpen, onClose, customers, products, currentUser, onConfirm }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Transfer'>('Cash');
  const [notes, setNotes] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const debtCustomers = customers.filter(c => c.balance < 0);

  const resetForm = () => {
    setSelectedCustomerId('');
    setAmount(0);
    setPaymentMethod('Cash');
    setNotes('');
    setIsPreview(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenPreview = () => {
    if (!selectedCustomer) {
      alert('يرجى اختيار العميل');
      return;
    }
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ سداد صحيح');
      return;
    }
    setIsPreview(true);
  };

  if (isPreview && selectedCustomer) {
    const paymentSale: Sale = {
      id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerType: selectedCustomer.type,
      items: [
        {
          productId: 'DEBT-PAYMENT',
          productName: 'سداد دين سابق',
          quantity: 1,
          price: amount
        }
      ],
      laborCost: 0,
      total: amount,
      paymentMethod,
      status: 'Completed',
      invoiceType: 'Sale',
      maintenanceDevice: undefined,
      notes: notes || 'سداد جزء من الدين المستحق على العميل',
      createdBy: currentUser.id
    };

    const newBalance = selectedCustomer.balance + amount;

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="معاينة سند سداد الدين"
        size="lg"
        showCloseButton={false}
      >
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] print:scale-100">
              <InvoiceTemplateA4 sale={paymentSale} products={products} user={currentUser} />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-bold text-gray-500">الرصيد قبل السداد:</span>
              <span className="font-black text-red-600">{formatCurrency(selectedCustomer.balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-500">المبلغ المدفوع:</span>
              <span className="font-black text-green-600">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-500">الرصيد بعد السداد:</span>
              <span
                className={`font-black ${
                  newBalance < 0 ? 'text-red-600' : newBalance > 0 ? 'text-green-600' : 'text-gray-800'
                }`}
              >
                {formatCurrency(newBalance)}
              </span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between items-stretch md:items-center no-print bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <button
              onClick={() => setIsPreview(false)}
              className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-600 flex items-center gap-2"
            >
              <ChevronLeft size={18} /> العودة للتعديل
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => downloadPdfFromPrintArea('debt-payment.pdf')}
                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
              >
                <FileText size={18} /> تحميل كملف PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  sharePdfFromPrintArea(
                    'debt-payment.pdf',
                    'سند سداد دين من الشركة الوطنية للمعدات البحرية'
                  )
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Share2 size={18} /> مشاركة PDF
              </button>
              <button
                onClick={() => {
                  triggerPrint('سند سداد دين');
                  onConfirm(paymentSale, amount);
                  handleClose();
                }}
                className="px-10 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-900/20 transition-all flex items-center gap-3"
              >
                <Printer size={20} /> طباعة وتسجيل السداد
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="تسديد دين عميل" size="md">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-[var(--primary)] mb-1">اختر العميل</label>
          <Select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
            <option value="">اختر العميل...</option>
            {(debtCustomers.length > 0 ? debtCustomers : customers).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} – {formatCurrency(c.balance)}
              </option>
            ))}
          </Select>
          {debtCustomers.length === 0 && (
            <p className="mt-1 text-[10px] text-gray-500 font-bold">
              لا توجد أرصدة مدينة حالياً، يمكنك اختيار أي عميل لإصدار سند تحصيل.
            </p>
          )}
        </div>
        {selectedCustomer && (
          <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="font-bold text-[var(--text-secondary)]">الرصيد الحالي:</span>
              <span
                className={`font-black ${
                  selectedCustomer.balance < 0
                    ? 'text-red-600'
                    : selectedCustomer.balance > 0
                    ? 'text-green-600'
                    : 'text-gray-700'
                }`}
              >
                {formatCurrency(selectedCustomer.balance)}
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[var(--primary)] mb-1">مبلغ السداد (LYD)</label>
            <Input
              type="number"
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--primary)] mb-1">طريقة الدفع</label>
            <Select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as 'Cash' | 'Check' | 'Transfer')}
            >
              <option value="Cash">نقداً</option>
              <option value="Check">صك</option>
              <option value="Transfer">تحويل</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[var(--primary)] mb-1">ملاحظات</label>
          <TextArea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="مثال: سداد جزء من الفاتورة رقم ..."
          />
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button onClick={handleClose} className="btn-secondary px-6 py-2 rounded-lg font-bold">
            إلغاء
          </button>
          <button
            onClick={handleOpenPreview}
            className="btn-primary px-8 py-2 rounded-lg font-bold shadow-sm"
          >
            معاينة قبل الطباعة
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Report Templates ---

const DailySalesReportTemplateA4: React.FC<{ 
  sales: Sale[], 
  user: User,
  date: string 
}> = ({ sales, user, date }) => {
  const todaySales = sales.filter(s => s.date.startsWith(date));
  const totals = todaySales.reduce((acc, s) => {
    acc.total += s.total;
    if (s.paymentMethod === 'Cash') acc.cash += s.total;
    if (s.paymentMethod === 'Credit') acc.credit += s.total;
    if (s.paymentMethod === 'Check') acc.check += s.total;
    return acc;
  }, { total: 0, cash: 0, credit: 0, check: 0 });

  return (
    <div
      className="print-area w-full bg-[#F8FAFC] text-black font-sans text-[11px] p-10 dir-rtl flex flex-col"
      style={{ width: '21cm', minHeight: '29.7cm', margin: '0 auto', padding: '1.5cm' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-blue-900/20 pb-6 mb-8 bg-[#0B2C4D] p-6 rounded-xl text-white">
         <div className="flex items-center gap-6">
            <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-20 w-auto object-contain brightness-0 invert" />
            <div className="text-right">
               <h1 className="text-xl font-black text-white">الشركة الوطنية للمعدات البحرية</h1>
               <p className="text-[10px] font-bold text-blue-200 tracking-wider">AL-WATANYA MARINE SYSTEMS</p>
            </div>
         </div>
         <div className="text-left">
            <h2 className="text-2xl font-black text-white mb-1">تقرير المبيعات اليومي</h2>
            <p className="text-blue-200 font-bold">Daily Sales Report</p>
            <p className="text-white font-black mt-2">التاريخ: {formatDate(date)}</p>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
         <div className="border-2 border-gray-900 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">إجمالي المبيعات</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(totals.total)}</p>
         </div>
         <div className="border border-gray-200 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">المحصل نقداً</p>
            <p className="text-lg font-black text-green-700">{formatCurrency(totals.cash)}</p>
         </div>
         <div className="border border-gray-200 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">المبيعات الآجلة</p>
            <p className="text-lg font-black text-orange-700">{formatCurrency(totals.credit)}</p>
         </div>
         <div className="border border-gray-200 p-3 rounded-lg text-center">
            <p className="text-[9px] font-black text-gray-500 mb-1">إجمالي الصكوك</p>
            <p className="text-lg font-black text-blue-700">{formatCurrency(totals.check)}</p>
         </div>
      </div>

      {/* Sales Table */}
      <div className="flex-1">
         <table className="w-full text-right border-collapse">
            <thead>
               <tr className="bg-gray-900 text-white">
                  <th className="py-2 px-3 border border-gray-700 w-10 text-center">#</th>
                  <th className="py-2 px-3 border border-gray-700 w-24">رقم الفاتورة</th>
                  <th className="py-2 px-3 border border-gray-700">العميل</th>
                  <th className="py-2 px-3 border border-gray-700 w-32">المحرك/القارب</th>
                  <th className="py-2 px-3 border border-gray-700 w-24">طريقة الدفع</th>
                  <th className="py-2 px-3 border border-gray-700 w-32 text-center">القيمة</th>
               </tr>
            </thead>
            <tbody>
               {todaySales.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="py-10 text-center text-gray-400 font-bold">لا توجد مبيعات مسجلة لهذا اليوم</td>
                  </tr>
               ) : (
                  todaySales.map((sale, i) => (
                     <tr key={sale.id} className="border-b border-gray-100 font-bold">
                        <td className="py-2 px-3 text-center border-x border-gray-50 text-gray-400">{i + 1}</td>
                        <td className="py-2 px-3 border-x border-gray-50">{sale.id}</td>
                        <td className="py-2 px-3 border-x border-gray-50">{sale.customerName}</td>
                        <td className="py-2 px-3 border-x border-gray-50 text-blue-600">{sale.maintenanceDevice || '-'}</td>
                        <td className="py-2 px-3 border-x border-gray-50">
                           {sale.paymentMethod === 'Cash' ? 'نقداً' : sale.paymentMethod === 'Credit' ? 'آجل' : sale.paymentMethod === 'Check' ? 'صك' : 'تحويل'}
                        </td>
                        <td className="py-2 px-3 border-x border-gray-50 text-center">{formatCurrency(sale.total)}</td>
                     </tr>
                  ))
               )}
            </tbody>
            <tfoot>
               <tr className="bg-gray-50 font-black">
                  <td colSpan={5} className="py-3 px-3 text-left border border-gray-200">الإجمالي العام لليوم:</td>
                  <td className="py-3 px-3 text-center border border-gray-200 text-lg">{formatCurrency(totals.total)}</td>
               </tr>
            </tfoot>
         </table>
      </div>

      {/* Footer Signature */}
      <div className="mt-12 pt-8 border-t-2 border-gray-100 grid grid-cols-3 gap-8 text-center">
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">المحاسب</p>
            <div className="border-b border-gray-300 w-32 mx-auto"></div>
         </div>
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">مدير المبيعات</p>
            <p className="font-black text-gray-900 text-sm">صلاح أمنيصير</p>
         </div>
         <div>
            <p className="text-[10px] font-black text-gray-400 mb-6 uppercase">المدير العام</p>
            <p className="font-black text-gray-900 text-sm">محمد أبوديب</p>
         </div>
      </div>

      <div className="mt-8 text-center text-gray-400 font-bold text-[9px]">
         <p>تم استخراج هذا التقرير بواسطة: {user.name} | بتاريخ: {new Date().toLocaleString('ar-LY')}</p>
      </div>
    </div>
  );
};

const InvoiceTemplateA4: React.FC<{ sale: Sale, products: Product[], user: User }> = ({ sale, user }) => {
  const itemsTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return (
    <div
      className="print-area w-full bg-[#F8FAFC] text-black font-sans text-[12px] border border-gray-100 shadow-sm print:shadow-none print:border-0 print:p-0 dir-rtl flex flex-col"
      style={{ width: '21cm', minHeight: '29.7cm', margin: '0 auto', padding: '1.5cm' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-blue-900/10 pb-6 mb-8 bg-[#0B2C4D] p-6 rounded-xl text-white">
         <div className="flex items-center gap-6">
            <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-24 w-auto object-contain brightness-0 invert" />
            <div className="text-right">
               <h1 className="text-2xl font-black text-white">الشركة الوطنية للمعدات البحرية</h1>
               <p className="text-sm font-bold text-blue-200 tracking-wider">AL-WATANYA MARINE SYSTEMS</p>
            </div>
         </div>
         <div className="text-left">
            <h2 className="text-3xl font-black text-white mb-1">فاتورة مبيعات</h2>
            <p className="text-blue-200 font-bold">Sales Invoice</p>
         </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-2 bg-white/60 border border-gray-100 rounded-lg p-4">
            <div className="flex gap-2">
               <span className="text-gray-500 font-bold w-24">رقم الفاتورة:</span>
               <span className="font-black text-gray-900">{sale.id}</span>
            </div>
            <div className="flex gap-2">
               <span className="text-gray-500 font-bold w-24">التاريخ:</span>
               <span className="font-bold text-gray-900">{formatDate(sale.date)} {formatTime(sale.date)}</span>
            </div>
            <div className="flex gap-2">
               <span className="text-gray-500 font-bold w-24">طريقة الدفع:</span>
               <span className="font-bold text-gray-900">
                  {sale.paymentMethod === 'Cash' ? 'نقداً' : sale.paymentMethod === 'Check' ? 'صك' : sale.paymentMethod === 'Transfer' ? 'تحويل' : 'آجل'}
               </span>
            </div>
         </div>
         <div className="space-y-2 bg-white/60 border border-gray-100 rounded-lg p-4">
            <div className="flex gap-2">
               <span className="text-gray-500 font-bold w-24">العميل:</span>
               <span className="font-black text-gray-900 text-lg">{sale.customerName}</span>
            </div>
            {sale.maintenanceDevice && (
               <div className="flex gap-2">
                  <span className="text-gray-500 font-bold w-24">المحرك/القارب:</span>
                  <span className="font-bold text-blue-600">{sale.maintenanceDevice}</span>
               </div>
            )}
            <div className="flex gap-2">
               <span className="text-gray-500 font-bold w-24">نوع العميل:</span>
               <span className="font-bold text-gray-700">{sale.customerType === 'Permanent' ? 'عميل مسجل' : 'عميل نقدي'}</span>
            </div>
         </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 mb-8">
        <table className="w-full text-right border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-3 px-4 w-12 text-gray-500 font-black text-center border border-gray-300">#</th>
              <th className="py-3 px-4 text-gray-500 font-black border border-gray-300">البيان / Description</th>
              <th className="py-3 px-4 w-24 text-gray-500 font-black text-center border border-gray-300">الكمية</th>
              <th className="py-3 px-4 w-32 text-gray-500 font-black text-center border border-gray-300">السعر</th>
              <th className="py-3 px-4 w-32 text-gray-500 font-black text-center border border-gray-300">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.length > 0 ? (
              sale.items.map((item, i) => (
                <tr key={i} className="font-bold">
                  <td className="py-3 px-4 text-center text-gray-400 border border-gray-200">{i + 1}</td>
                  <td className="py-3 px-4 text-gray-900 border border-gray-200">{item.productName}</td>
                  <td className="py-3 px-4 text-center text-gray-900 border border-gray-200">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-900 border border-gray-200">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-4 text-center text-gray-900 border border-gray-200">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))
            ) : (
              <tr className="font-bold">
                <td className="py-8 px-4 text-center text-gray-400 border border-gray-200">1</td>
                <td className="py-8 px-4 text-gray-900 border border-gray-200">
                  <p className="text-lg mb-1">أعمال صيانة وإصلاح</p>
                  <p className="text-xs text-blue-600 font-bold">{sale.maintenanceDevice || 'صيانة عامة للمعدات البحرية'}</p>
                </td>
                <td className="py-8 px-4 text-center text-gray-900 border border-gray-200">1</td>
                <td className="py-8 px-4 text-center text-gray-900 border border-gray-200">{formatCurrency(sale.laborCost)}</td>
                <td className="py-8 px-4 text-center text-gray-900 border border-gray-200">{formatCurrency(sale.laborCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals and Footer */}
      <div className="grid grid-cols-2 gap-12 pt-6 border-t-2 border-gray-200">
         <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
               <p className="text-[10px] font-black text-gray-400 uppercase mb-2">ملاحظات / Notes</p>
               <div className="text-xs font-bold text-gray-600 whitespace-pre-line leading-relaxed">
                  {sale.notes ? sale.notes : (
                    <>
                      - البضاعة التي لا ترد ولا تستبدل بعد 3 أيام.<br/>
                      - يجب إحضار الفاتورة الأصلية عند المراجعة.<br/>
                      - الضمان يسري فقط على عيوب التصنيع.
                    </>
                  )}
               </div>
            </div>
            <div className="text-[10px] font-bold text-gray-400">
               <p>الموظف: {user.name}</p>
               <p>تاريخ الطباعة: {new Date().toLocaleString('ar-LY')}</p>
            </div>
         </div>
         
         <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
               <span className="text-gray-500 font-bold">إجمالي الأصناف:</span>
               <span className="font-bold text-gray-900">{formatCurrency(itemsTotal)}</span>
            </div>
            {sale.laborCost > 0 && (
               <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-bold">قيمة اليد العاملة:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(sale.laborCost)}</span>
               </div>
            )}
            <div className="flex justify-between items-center py-4 px-4 bg-gray-900 rounded-lg mt-4 shadow-lg">
               <span className="text-white font-black text-lg">الإجمالي النهائي:</span>
               <span className="text-white font-black text-2xl tracking-tighter">{formatCurrency(sale.total)}</span>
            </div>
         </div>
      </div>

      {/* Contacts */}
      <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8 text-sm">
         <div>
            <p className="text-gray-400 font-black text-[10px] uppercase mb-2">إدارة المبيعات</p>
            <p className="font-black text-gray-900">صلاح أمنيصير</p>
            <p className="text-gray-500" dir="ltr">0925186705</p>
         </div>
         <div className="text-left">
            <p className="text-gray-400 font-black text-[10px] uppercase mb-2">الإدارة العامة</p>
            <p className="font-black text-gray-900">محمد أبوديب</p>
            <p className="text-gray-500" dir="ltr">0925034701</p>
         </div>
      </div>

      <div className="mt-8 text-center text-gray-400 font-bold text-[10px]">
         <p>طرابلس - تاجوراء (بالقرب من جزيرة دوران تاجوراء)</p>
         <p className="mt-1">شكراً لتعاملكم معنا</p>
      </div>
    </div>
  );
};

// ... (Other template components like InventoryReportTemplate, MaintenanceJobCard remain similar structure, just update classes if needed, omitted here to save space but they follow same pattern)

// ... (DashboardView, SalesView, etc.)

const SupplyInvoiceTemplateA4: React.FC<{ invoice: SupplyInvoice, user: User }> = ({ invoice, user }) => {
  return (
    <div className="print-area w-[210mm] min-h-[297mm] bg-white p-[15mm] mx-auto text-right dir-rtl shadow-lg border border-gray-100 relative" id="supply-invoice-template">
      {/* Header with Blue Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#0B2C4D]"></div>
      
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-5">
          <div className="bg-[#0B2C4D] p-4 rounded-2xl shadow-md">
            <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-16 w-auto object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0B2C4D] tracking-tight">الشركة الوطنية للمعدات البحرية</h1>
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.3em] mt-1">AL-WATANYA MARINE SYSTEMS</p>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500 font-bold">
               <span className="flex items-center gap-1"><Phone size={12} className="text-[#0B2C4D]" /> 091-0000000</span>
               <span className="flex items-center gap-1"><MapPin size={12} className="text-[#0B2C4D]" /> طرابلس - تاجوراء</span>
            </div>
          </div>
        </div>
        <div className="text-left">
           <div className="bg-gray-100 px-6 py-3 rounded-xl border-r-4 border-[#0B2C4D]">
              <h2 className="text-xl font-black text-[#0B2C4D]">فاتورة توريد بضاعة</h2>
              <p className="text-xs font-bold text-gray-500 mt-1">رقم الفاتورة: {invoice.id}</p>
           </div>
           <div className="mt-4 text-[11px] font-bold text-gray-500 space-y-1">
              <p>تاريخ الفاتورة: {formatDate(invoice.date)}</p>
              <p>توقيت التسجيل: {formatTime(invoice.date)}</p>
              <p>الموظف المسؤول: {user.name}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
           <h3 className="text-xs font-black text-[#0B2C4D] uppercase mb-3 border-b border-blue-200 pb-2">بيانات المورد</h3>
           <p className="text-base font-black text-gray-800 mb-1">{invoice.supplierName}</p>
           <p className="text-xs text-gray-500 font-bold">معرف المورد: {invoice.supplierId}</p>
        </div>
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
           <h3 className="text-xs font-black text-gray-500 uppercase mb-3 border-b border-gray-200 pb-2">ملاحظات الشحنة</h3>
           <p className="text-xs text-gray-600 font-bold leading-relaxed">{invoice.notes || 'لا توجد ملاحظات إضافية على هذه الشحنة'}</p>
        </div>
      </div>

      <table className="w-full mb-10 border-collapse">
        <thead>
          <tr className="bg-[#0B2C4D] text-white">
            <th className="py-4 px-4 text-right rounded-r-xl text-xs font-black">#</th>
            <th className="py-4 px-4 text-right text-xs font-black">المنتج / البيان</th>
            <th className="py-4 px-4 text-center text-xs font-black">الكمية</th>
            <th className="py-4 px-4 text-center text-xs font-black">سعر التكلفة ($)</th>
            <th className="py-4 px-4 text-center text-xs font-black">سعر البيع (دل)</th>
            <th className="py-4 px-4 text-left rounded-l-xl text-xs font-black">الإجمالي ($)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-4 text-xs font-bold text-gray-400">{(index + 1).toString().padStart(2, '0')}</td>
              <td className="py-4 px-4">
                <p className="text-sm font-black text-gray-800">{item.productName}</p>
                <p className="text-[10px] text-gray-400 font-bold">كود: {item.productId}</p>
              </td>
              <td className="py-4 px-4 text-center text-sm font-black text-gray-700">{item.quantity}</td>
              <td className="py-4 px-4 text-center text-sm font-bold text-gray-600">{formatUSD(item.costUSD)}</td>
              <td className="py-4 px-4 text-center text-sm font-bold text-gray-600">{formatCurrency(item.priceLYD)}</td>
              <td className="py-4 px-4 text-left text-sm font-black text-[#0B2C4D]">{formatUSD(item.costUSD * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-20">
        <div className="w-72 space-y-3">
          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
             <span className="text-xs font-bold text-gray-500">إجمالي التكلفة (USD)</span>
             <span className="text-base font-black text-gray-800">{formatUSD(invoice.totalUSD)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-4 bg-[#0B2C4D] text-white rounded-xl shadow-lg">
             <span className="text-sm font-bold">إجمالي القيمة السوقية (LYD)</span>
             <span className="text-xl font-black">{formatCurrency(invoice.totalLYD)}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-10 pt-10 border-t border-gray-100">
         <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 mb-8 uppercase">توقيع الموظف</p>
            <div className="h-px bg-gray-200 w-32 mx-auto mb-2"></div>
            <p className="text-xs font-bold text-gray-700">{user.name}</p>
         </div>
         <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 mb-8 uppercase">ختم المخازن</p>
            <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-full mx-auto flex items-center justify-center">
               <span className="text-[8px] text-gray-300 font-black">STAMP HERE</span>
            </div>
         </div>
         <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 mb-8 uppercase">اعتماد المدير العام</p>
            <div className="h-px bg-gray-200 w-32 mx-auto mb-2"></div>
            <p className="text-xs font-bold text-gray-400">...........................</p>
         </div>
      </div>

      <div className="mt-10 text-center text-gray-400 font-bold text-[10px]">
         <p>طرابلس - تاجوراء (بالقرب من جزيرة دوران تاجوراء)</p>
         <p className="mt-1">تم إصدار هذه الفاتورة آلياً بواسطة منظومة الوطنية</p>
      </div>
    </div>
  );
};

const ArchiveView: React.FC<{
  sales: Sale[],
  supplyInvoices: SupplyInvoice[],
  products: Product[],
  currentUser: User
}> = ({ sales, supplyInvoices, products, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Sale' | 'Maintenance' | 'Supply'>('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<SupplyInvoice | null>(null);

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || s.invoiceType === filterType;
    return matchesSearch && matchesType && filterType !== 'Supply';
  });

  const filteredSupplies = supplyInvoices.filter(s => {
    const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || filterType === 'Supply';
    return matchesSearch && matchesType;
  });

  const allItems = [
    ...filteredSales.map(s => ({ ...s, type: 'Sale' as const, original: s })),
    ...filteredSupplies.map(s => ({ ...s, type: 'Supply' as const, original: s }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">أرشيف الفواتير الشامل</h2>
          <p className="text-[var(--text-secondary)] text-sm">البحث والمعاينة لجميع فواتير المبيعات، الصيانة، والتوريد</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <Input 
            placeholder="بحث برقم الفاتورة أو اسم العميل/المورد..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full bg-[var(--surface)] pr-10 h-12" 
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="h-12 min-w-[150px]"
          >
            <option value="All">جميع الأنواع</option>
            <option value="Sale">فواتير مبيعات</option>
            <option value="Maintenance">فواتير صيانة</option>
            <option value="Supply">فواتير توريد</option>
          </Select>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right custom-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>الجهة (عميل/مورد)</th>
                <th>النوع</th>
                <th>الإجمالي</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {allItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-20 text-gray-400 font-bold">لا توجد فواتير مطابقة للبحث</td></tr>
              ) : (
                allItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="font-mono font-bold text-[var(--primary)]">{item.id}</td>
                    <td className="text-sm font-medium">{formatDate(item.date)}</td>
                    <td className="font-bold">
                      {'customerName' in item ? item.customerName : item.supplierName}
                    </td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                        item.type === 'Supply' ? 'bg-purple-100 text-purple-700' :
                        ('invoiceType' in item && item.invoiceType === 'Maintenance') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.type === 'Supply' ? 'توريد بضاعة' : 
                         ('invoiceType' in item && item.invoiceType === 'Maintenance') ? 'صيانة' : 'مبيعات'}
                      </span>
                    </td>
                    <td className="font-black text-[var(--primary)]">
                      {'total' in item ? formatCurrency(item.total) : formatCurrency(item.totalLYD)}
                    </td>
                    <td className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (item.type === 'Supply') {
                            setSelectedSupply(item.original as SupplyInvoice);
                          } else {
                            setSelectedSale(item.original as Sale);
                          }
                        }} 
                        className="bg-white border border-gray-200 p-2 hover:bg-gray-50 rounded-xl text-[var(--info)] shadow-sm transition-all" 
                        title="عرض ومعاينة"
                      >
                        <Eye size={18}/>
                      </button>
                      <button 
                        className="bg-white border border-gray-200 p-2 hover:bg-gray-50 rounded-xl text-gray-500 shadow-sm transition-all" 
                        title="طباعة"
                        onClick={() => {
                          // In a real app, this would trigger the print logic
                          if (item.type === 'Supply') {
                            setSelectedSupply(item.original as SupplyInvoice);
                          } else {
                            setSelectedSale(item.original as Sale);
                          }
                        }}
                      >
                        <Printer size={18}/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`معاينة فاتورة: ${selectedSale.id}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
              <div className="origin-top scale-[0.6] print:scale-100">
                <InvoiceTemplateA4 sale={selectedSale} products={products} user={currentUser} />
              </div>
            </div>
            <div className="flex justify-center gap-4 no-print">
               <button onClick={() => downloadPdfFromPrintArea(`${selectedSale.id}.pdf`)} className="btn-secondary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <FileText size={18} /> تحميل PDF
               </button>
               <button onClick={() => triggerPrint(selectedSale.id)} className="btn-primary px-10 py-3 rounded-xl font-bold flex items-center gap-2">
                  <Printer size={18} /> طباعة الفاتورة
               </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedSupply && (
        <Modal
          isOpen={!!selectedSupply}
          onClose={() => setSelectedSupply(null)}
          title={`معاينة فاتورة توريد: ${selectedSupply.id}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
              <div className="origin-top scale-[0.6] print:scale-100">
                <SupplyInvoiceTemplateA4 invoice={selectedSupply} user={currentUser} />
              </div>
            </div>
            <div className="flex justify-center gap-4 no-print">
               <button onClick={() => downloadPdfFromPrintArea(`${selectedSupply.id}.pdf`)} className="btn-secondary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <FileText size={18} /> تحميل PDF
               </button>
               <button onClick={() => triggerPrint(selectedSupply.id)} className="btn-primary px-10 py-3 rounded-xl font-bold flex items-center gap-2">
                  <Printer size={18} /> طباعة الفاتورة
               </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const DashboardView: React.FC<{ 
  products: Product[], 
  sales: Sale[], 
  customers: Customer[], 
  maintenance: MaintenanceRecord[], 
  onNavigate: (view: any) => void,
  onOpenInvoice: () => void,
  onOpenDebtPayment: () => void 
}> = ({ products, sales, customers, maintenance, onNavigate, onOpenInvoice, onOpenDebtPayment }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.date);
    const isToday = s.date.startsWith(todayStr);
    const hour = saleDate.getHours();
    return isToday && hour >= 7 && hour < 24;
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalDebts = customers.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const activeJobs = maintenance.filter(m => m.status !== 'Finished' && m.status !== 'Delivered').length;
  const lowStock = products.filter(p => p.stock <= p.minStock).length;

  // --- Prepare Chart Data ---
  
  // 1. Sales Data (Last 7 Days)
  const salesData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.date.startsWith(date));
      const total = daySales.reduce((sum, s) => sum + s.total, 0);
      return {
        date: new Date(date).toLocaleDateString('ar-LY', { weekday: 'short', day: 'numeric' }),
        إيرادات: total
      };
    });
  }, [sales]);

  // 2. Inventory Distribution Data
  const inventoryData = useMemo(() => {
    const categories: ProductType[] = ['Engine', 'Boat', 'SparePart', 'Equipment', 'Maintenance', 'Fluid'];
    return categories.map(cat => {
      const catProducts = products.filter(p => p.category === cat);
      const totalValue = catProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
      return {
        name: PRODUCT_CATEGORIES_AR[cat],
        value: totalValue
      };
    }).filter(d => d.value > 0);
  }, [products]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-[var(--primary)] to-[#123E6B] rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-24 w-auto object-contain brightness-0 invert" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">الشركة الوطنية للمعدات البحرية</h2>
          <p className="text-blue-100 text-lg">نظرة عامة على العمليات والأنشطة</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3">
          <button onClick={onOpenInvoice} className="bg-white text-[var(--primary)] px-6 py-3 rounded-lg font-bold text-sm shadow-md hover:bg-gray-100 transition-all flex items-center gap-2 active:scale-95">
            <Plus size={20} /><span>إصدار فاتورة جديدة</span>
          </button>
          <button onClick={onOpenDebtPayment} className="bg-[#0F172A]/80 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md hover:bg-black/80 transition-all flex items-center gap-2 active:scale-95">
            <CreditCard size={18} /><span>تسديد دين سابق</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-[var(--success)]/10 rounded-lg text-[var(--success)]"><DollarSign size={24}/></div>
             <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-1 rounded">اليوم</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">مبيعات اليوم</p>
          <h3 className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(todayRevenue)}</h3>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-[var(--danger)]/10 rounded-lg text-[var(--danger)]"><TrendingDown size={24}/></div>
             <span className="text-xs font-bold text-[var(--danger)] bg-[var(--danger)]/10 px-2 py-1 rounded">مستحقات</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">ديون العملاء</p>
          <h3 className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(totalDebts)}</h3>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('maintenance')}>
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-[var(--info)]/10 rounded-lg text-[var(--info)]"><Wrench size={24}/></div>
             <span className="text-xs font-bold text-[var(--info)] bg-[var(--info)]/10 px-2 py-1 rounded">نشط</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">الصيانة الجارية</p>
          <h3 className="text-3xl font-bold text-[var(--primary)]">{activeJobs}</h3>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('inventory')}>
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-[var(--warning)]/10 rounded-lg text-[var(--warning)]"><AlertTriangle size={24}/></div>
             {lowStock > 0 && <span className="text-xs font-bold text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-1 rounded">تنبيه</span>}
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">نواقص المخزن</p>
          <h3 className="text-3xl font-bold text-[var(--primary)]">{lowStock} <span className="text-sm font-normal text-[var(--text-secondary)]">منتج</span></h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Curve */}
        <div className="lg:col-span-2 bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <div>
                 <h3 className="text-xl font-black text-[var(--primary)]">تطور الإيرادات</h3>
                 <p className="text-sm text-gray-400 font-bold">إحصائيات المبيعات خلال الـ 7 أيام الأخيرة</p>
              </div>
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-black">
                 <TrendingUp size={14} /> <span>+12% نمو</span>
              </div>
           </div>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={salesData}>
                    <defs>
                       <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0B2C4D" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0B2C4D" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748B', fontSize: 11, fontWeight: 'bold'}} 
                      dy={10}
                    />
                    <YAxis 
                      hide={true}
                    />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl'}}
                      formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="إيرادات" 
                      stroke="#0B2C4D" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Inventory Pie Chart */}
        <div className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
           <div className="mb-8">
              <h3 className="text-xl font-black text-[var(--primary)]">توزيع قيمة المخزون</h3>
              <p className="text-sm text-gray-400 font-bold">القيمة المالية حسب التصنيف</p>
           </div>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={inventoryData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                    >
                       {inventoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                       ))}
                    </Pie>
                    <RechartsTooltip 
                       formatter={(value: number) => [formatCurrency(value), 'القيمة']}
                       contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl'}}
                    />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 space-y-2">
              {inventoryData.map((item, index) => (
                 <div key={index} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></div>
                       <span className="font-bold text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-black text-[var(--primary)]">{formatCurrency(item.value)}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const SalesView: React.FC<{
  sales: Sale[],
  products: Product[],
  currentUser: User,
  onOpenNewSale: () => void,
  onDeleteSale: (id: string) => void
}> = ({ sales, products, currentUser, onOpenNewSale, onDeleteSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPreviewReportOpen, setIsPreviewReportOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.date);
    const isToday = s.date.startsWith(todayStr);
    const hour = saleDate.getHours();
    return isToday && hour >= 7 && hour < 24;
  });
  
  const dailyTotals = todaySales.reduce((acc, s) => {
    acc.total += s.total;
    if (s.paymentMethod === 'Cash') acc.cash += s.total;
    if (s.paymentMethod === 'Credit') acc.credit += s.total;
    return acc;
  }, { total: 0, cash: 0, credit: 0 });

  const filteredSales = todaySales.filter(s => {
    const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">تقرير المبيعات اليومية</h2>
          <p className="text-[var(--text-secondary)] text-sm">عرض وتحليل جميع مبيعات اليوم: {formatDate(todayStr)}</p>
        </div>
        <button 
          onClick={() => setIsPreviewReportOpen(true)}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-gray-800 transition-all"
        >
          <FileText size={18} /> <span>تصدير ومعاينة التقرير اليومي (A4)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border-2 border-green-100 shadow-sm">
          <p className="text-sm font-bold text-green-600 mb-1">إجمالي مبيعات اليوم</p>
          <h3 className="text-2xl font-black text-gray-900">{formatCurrency(dailyTotals.total)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-sm">
          <p className="text-sm font-bold text-blue-600 mb-1">المحصل نقداً</p>
          <h3 className="text-2xl font-black text-gray-900">{formatCurrency(dailyTotals.cash)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border-2 border-orange-100 shadow-sm">
          <p className="text-sm font-bold text-orange-600 mb-1">المبيعات الآجلة</p>
          <h3 className="text-2xl font-black text-gray-900">{formatCurrency(dailyTotals.credit)}</h3>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)] flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex-1 relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
              <Input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--surface)] pr-10" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right custom-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>المحرك/القارب</th>
                <th>الإجمالي</th>
                <th>طريقة الدفع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-10 text-gray-400">لا توجد عمليات مبيعات مسجلة</td></tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className={sale.date.startsWith(todayStr) ? 'bg-blue-50/30' : ''}>
                    <td className="font-mono font-bold text-[var(--text-secondary)]">{sale.id}</td>
                    <td className="text-sm text-[var(--text)]">
                      {sale.date.startsWith(todayStr) ? <span className="text-green-600 font-bold">اليوم</span> : formatDate(sale.date)}
                    </td>
                    <td className="font-bold text-[var(--primary)]">{sale.customerName}</td>
                    <td className="text-sm text-blue-600">{sale.maintenanceDevice || '-'}</td>
                    <td className="font-bold text-[var(--text)]">{formatCurrency(sale.total)}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        sale.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : 
                        sale.paymentMethod === 'Credit' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sale.paymentMethod === 'Cash' ? 'نقداً' : sale.paymentMethod === 'Credit' ? 'آجل' : sale.paymentMethod}
                      </span>
                    </td>
                    <td className="flex gap-2">
                      <button onClick={() => setSelectedSale(sale)} className="text-[var(--info)] p-2 hover:bg-[var(--bg)] rounded-lg" title="عرض"><Eye size={18}/></button>
                      <button onClick={() => onDeleteSale(sale.id)} className="text-[var(--danger)] p-2 hover:bg-[var(--bg)] rounded-lg" title="حذف"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title="تفاصيل الفاتورة"
          size="lg"
        >
          <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] print:scale-100">
              <InvoiceTemplateA4 sale={selectedSale} products={products} user={currentUser} />
            </div>
          </div>
        </Modal>
      )}
      
      {/* Daily Report Preview Modal */}
      <Modal 
        isOpen={isPreviewReportOpen} 
        onClose={() => setIsPreviewReportOpen(false)} 
        title="معاينة تقرير المبيعات اليومي" 
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] print:scale-100">
              <DailySalesReportTemplateA4 sales={todaySales} user={currentUser} date={todayStr} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between items-stretch md:items-center no-print bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">يرجى التأكد من البيانات قبل الطباعة</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setIsPreviewReportOpen(false)}
                className="px-6 py-2 text-gray-400 font-bold hover:text-gray-600 transition-all"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => downloadPdfFromPrintArea('daily-sales-report.pdf')}
                className="px-6 py-2 bg-white border border-gray-200 rounded-lg font-bold hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
              >
                <FileText size={18} /> تحميل كملف PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  sharePdfFromPrintArea(
                    'daily-sales-report.pdf',
                    'تقرير المبيعات اليومية من الشركة الوطنية للمعدات البحرية'
                  )
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Share2 size={18} /> مشاركة PDF
              </button>
              <button
                onClick={() => triggerPrint('تقرير المبيعات اليومي')}
                className="px-8 py-2 bg-gray-900 text-white rounded-lg font-black hover:bg-gray-800 transition-all flex items-center gap-2"
              >
                <Printer size={18} /> طباعة التقرير (A4)
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const InventoryView: React.FC<{ 
  products: Product[], 
  currentUser: User,
  onSave: (product: Product) => void, 
  onDelete: (id: string) => void,
  onBulkSupply: (invoice: SupplyInvoice) => void
}> = ({ products, currentUser, onSave, onDelete, onBulkSupply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewReportOpen, setIsPreviewReportOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Derived state for filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    let matchesStock = true;
    if (stockFilter === 'Low') matchesStock = product.stock <= product.minStock && product.stock > 0;
    if (stockFilter === 'Out') matchesStock = product.stock === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Categories for dropdown
  const categories: ProductType[] = ['Engine', 'Boat', 'SparePart', 'Equipment', 'Maintenance', 'Fluid'];

  // Handlers for Add/Edit
  const handleAddEdit = (product?: Product) => {
      if (product) {
          setEditingProduct(product);
      } else {
          setEditingProduct({
              id: `P${Date.now()}`,
              name: '',
              category: 'SparePart',
              stock: 0,
              price: 0,
              costUSD: 0,
              supplierId: '',
              minStock: 5,
              location: ''
          });
      }
      setIsModalOpen(true);
  }

  const handleSave = () => {
      if (editingProduct) {
          onSave(editingProduct);
          setIsModalOpen(false);
          setEditingProduct(null);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--primary)]">المخزون</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPreviewReportOpen(true)} 
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-gray-800 transition-all"
          >
            <ClipboardList size={18} /> <span>تصدير كشف المخزن (A4)</span>
          </button>
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-blue-700 transition-all">
            <Anchor size={18} /> <span>إدخال بضاعة (حاوية)</span>
          </button>
          <button onClick={() => handleAddEdit()} className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm">
            <Plus size={18} /> <span>إضافة منتج</span>
          </button>
        </div>
      </div>

      {/* Full Inventory Report Preview Modal */}
      <Modal 
        isOpen={isPreviewReportOpen} 
        onClose={() => setIsPreviewReportOpen(false)} 
        title="معاينة كشف المخزن العام" 
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
            <div className="origin-top scale-[0.6] print:scale-100">
              <InventoryReportTemplateA4 products={products} user={currentUser} />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between items-stretch md:items-center no-print bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 font-bold">
              كشف كامل للمخزن يوضح الكميات والمواقع والقيمة الإجمالية
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setIsPreviewReportOpen(false)}
                className="px-6 py-2 text-gray-400 font-bold hover:text-gray-600 transition-all"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => downloadPdfFromPrintArea('inventory-report.pdf')}
                className="px-6 py-2 bg-white border border-gray-200 rounded-lg font-bold hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
              >
                <FileText size={18} /> تحميل كملف PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  sharePdfFromPrintArea(
                    'inventory-report.pdf',
                    'كشف المخزون العام من الشركة الوطنية للمعدات البحرية'
                  )
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Share2 size={18} /> مشاركة PDF
              </button>
              <button
                onClick={() => triggerPrint('كشف المخزون العام')}
                className="px-8 py-2 bg-gray-900 text-white rounded-lg font-black hover:bg-gray-800 transition-all flex items-center gap-2"
              >
                <Printer size={18} /> طباعة الكشف (A4)
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="flex-1 relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
            <Input 
                placeholder="بحث باسم المنتج..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pr-10" 
            />
         </div>
         <div className="w-full md:w-48">
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">كل التصنيفات</option>
                {categories.map(c => <option key={c} value={c}>{PRODUCT_CATEGORIES_AR[c]}</option>)}
            </Select>
         </div>
         <div className="w-full md:w-48">
            <Select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)}>
                <option value="All">كل الحالات</option>
                <option value="Low">منخفض</option>
                <option value="Out">نافذ</option>
            </Select>
         </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-right custom-table">
                <thead>
                    <tr>
                        <th>رقم الصنف</th>
                        <th>المنتج</th>
                        <th>التصنيف</th>
                        <th>الموقع</th>
                        <th className="text-center">الكمية</th>
                        <th className="text-center">السعر</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.length === 0 ? (
                        <tr><td colSpan={7} className="text-center p-8 text-[var(--text-secondary)]">لا توجد نتائج</td></tr>
                    ) : (
                        filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td className="font-mono text-[var(--text-secondary)]">{product.id}</td>
                                <td className="font-bold text-[var(--primary)]">{product.name}</td>
                                <td><span className="bg-[var(--bg)] px-2 py-1 rounded text-xs text-[var(--text-secondary)]">{PRODUCT_CATEGORIES_AR[product.category] || product.category}</span></td>
                                <td className="text-[var(--text-secondary)]">{product.location}</td>
                                <td className="text-center">
                                    <span className={`font-bold ${product.stock === 0 ? 'text-[var(--danger)]' : product.stock <= product.minStock ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                                        {product.stock}
                                    </span>
                                </td>
                                <td className="text-center font-medium">{formatCurrency(product.price)}</td>
                                <td className="flex gap-2">
                                    <button onClick={() => handleAddEdit(product)} className="text-[var(--info)] p-2 hover:bg-[var(--bg)] rounded-lg"><Edit size={18}/></button>
                                    <button onClick={() => onDelete(product.id)} className="text-[var(--danger)] p-2 hover:bg-[var(--bg)] rounded-lg"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && editingProduct && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct.id.startsWith('P') && !products.find(p=>p.id === editingProduct.id) ? 'إضافة منتج جديد' : 'تعديل منتج'}>
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">اسم المنتج</label>
                          <Input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                      </div>
                       <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">التصنيف</label>
                          <Select value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as ProductType})}>
                                {categories.map(c => <option key={c} value={c}>{PRODUCT_CATEGORIES_AR[c]}</option>)}
                          </Select>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">سعر البيع (LYD)</label>
                          <Input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                      </div>
                       <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">التكلفة (USD)</label>
                          <Input type="number" value={editingProduct.costUSD} onChange={e => setEditingProduct({...editingProduct, costUSD: parseFloat(e.target.value)})} />
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">الرصيد الحالي</label>
                          <Input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} />
                      </div>
                       <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">الحد الأدنى</label>
                          <Input type="number" value={editingProduct.minStock} onChange={e => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})} />
                      </div>
                       <div>
                          <label className="block text-sm font-bold text-[var(--primary)] mb-1">الموقع</label>
                          <Input value={editingProduct.location} onChange={e => setEditingProduct({...editingProduct, location: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                      <button onClick={() => setIsModalOpen(false)} className="btn-secondary px-4 py-2 rounded-lg font-bold">إلغاء</button>
                      <button onClick={handleSave} className="btn-primary px-6 py-2 rounded-lg font-bold">حفظ</button>
                  </div>
              </div>
          </Modal>
      )}

      {/* Bulk Supply Modal */}
      {isBulkModalOpen && (
        <BulkSupplyModal 
          isOpen={isBulkModalOpen} 
          onClose={() => setIsBulkModalOpen(false)} 
          products={products} 
          currentUser={currentUser}
          onSave={(invoice) => {
            onBulkSupply(invoice);
            setIsBulkModalOpen(false);
          }}
        />
      )}

    </div>
  );
};

const CustomersView: React.FC<{ 
  customers: Customer[], 
  sales: Sale[],
  maintenance: MaintenanceRecord[],
  onSave: (c: Customer) => void, 
  onDelete: (id: string) => void 
}> = ({ customers, sales, maintenance, onSave, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | CustomerType>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});
  const [selectedCustomerForReport, setSelectedCustomerForReport] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.contact.includes(searchQuery);
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleShowReport = (customer: Customer) => {
    setSelectedCustomerForReport(customer);
    setIsReportOpen(true);
  };

  const handleAdd = () => {
    setEditingCustomer({
      id: `C${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      name: '',
      contact: '',
      type: 'Permanent',
      balance: 0
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingCustomer.name || !editingCustomer.contact) {
      alert('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    onSave(editingCustomer as Customer);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">إدارة العملاء</h2>
          <p className="text-[var(--text-secondary)]">إجمالي العملاء: {customers.length} عميل</p>
        </div>
        <button 
          onClick={handleAdd}
          className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm"
        >
          <Plus size={20} /> <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <Input 
            placeholder="البحث عن عميل بالاسم أو الهاتف..." 
            className="pr-10" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setTypeFilter('All')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'All' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setTypeFilter('Permanent')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'Permanent' ? 'bg-green-600 text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
          >
            دائم
          </button>
          <button 
            onClick={() => setTypeFilter('WalkIn')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'WalkIn' ? 'bg-gray-600 text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
          >
            عابر
          </button>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => {
            const customerSales = sales.filter(s => s.customerId === customer.id);
            const lastSales = customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2);
            
            return (
              <div key={customer.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[var(--primary)] font-bold text-lg border border-blue-100">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[var(--primary)]">{customer.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${customer.type === 'Permanent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {customer.type === 'Permanent' ? 'عميل دائم' : 'عميل عابر'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                      <button onClick={() => onDelete(customer.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Phone size={14} className="text-gray-400" />
                        <span className="font-medium">{customer.contact}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <CreditCard size={14} className="text-gray-400" />
                        <span className={`font-bold ${customer.balance < 0 ? 'text-red-600' : customer.balance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {formatCurrency(customer.balance)}
                        </span>
                      </div>
                    </div>

                    {/* Last Invoices Section */}
                    {lastSales.length > 0 && (
                      <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider flex items-center gap-1">
                          <FileText size={10} /> آخر الفواتير
                        </p>
                        <div className="space-y-2">
                          {lastSales.map(sale => (
                            <div key={sale.id} className="flex justify-between items-center text-xs">
                              <span className="text-[var(--text-secondary)]">{formatDate(sale.date)}</span>
                              <span className="font-bold text-[var(--primary)]">{formatCurrency(sale.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {customer.balance < 0 && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-red-500" />
                          <span className="text-xs font-bold text-red-700">إجمالي الدين المستحق</span>
                        </div>
                        <span className="text-sm font-black text-red-700">{formatCurrency(Math.abs(customer.balance))}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="px-5 py-3 bg-[var(--bg)] border-t border-[var(--border)] flex justify-between items-center">
                  <button 
                    onClick={() => handleShowReport(customer)}
                    className="text-xs font-bold text-[var(--primary)] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FileBarChart size={14} /> تقرير العميل الشامل
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium">ID: {customer.id}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border)]">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-[var(--text-secondary)] font-medium text-lg">لم يتم العثور على عملاء</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCustomer.id ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--primary)] mb-1">اسم العميل</label>
            <Input 
              value={editingCustomer.name} 
              onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} 
              placeholder="أدخل اسم العميل الكامل"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--primary)] mb-1">رقم الهاتف</label>
            <Input 
              value={editingCustomer.contact} 
              onChange={e => setEditingCustomer({...editingCustomer, contact: e.target.value})} 
              placeholder="09XXXXXXXX"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--primary)] mb-1">نوع العميل</label>
              <Select 
                value={editingCustomer.type} 
                onChange={e => setEditingCustomer({...editingCustomer, type: e.target.value as CustomerType})}
              >
                <option value="Permanent">عميل دائم</option>
                <option value="WalkIn">عميل عابر</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--primary)] mb-1">الرصيد الحالي (LYD)</label>
              <Input 
                type="number"
                value={editingCustomer.balance} 
                onChange={e => setEditingCustomer({...editingCustomer, balance: parseFloat(e.target.value)})} 
                placeholder="0.00"
              />
              <p className="text-[10px] text-gray-500 mt-1">القيمة السالبة تعني أن العميل مدين للشركة</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn-secondary px-6 py-2 rounded-lg font-bold"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave} 
              className="btn-primary px-8 py-2 rounded-lg font-bold shadow-sm"
            >
              حفظ البيانات
            </button>
          </div>
        </div>
      </Modal>

      {/* Customer Report Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title={`تقرير العميل الشامل: ${selectedCustomerForReport?.name}`}
        size="lg"
      >
        {selectedCustomerForReport && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            {/* Header Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">الرصيد الحالي</p>
                <p className={`text-xl font-black ${selectedCustomerForReport.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(selectedCustomerForReport.balance)}
                </p>
                <p className="text-[9px] text-blue-400 font-bold mt-1">
                  {selectedCustomerForReport.balance < 0 ? 'مطالب بدفع المبلغ' : 'رصيد دائن للعميل'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">إجمالي المشتريات</p>
                <p className="text-xl font-black text-gray-700">
                  {formatCurrency(sales.filter(s => s.customerId === selectedCustomerForReport.id).reduce((sum, s) => sum + s.total, 0))}
                </p>
                <p className="text-[9px] text-gray-400 font-bold mt-1">
                  من خلال {sales.filter(s => s.customerId === selectedCustomerForReport.id).length} فاتورة
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">عمليات الصيانة</p>
                <p className="text-xl font-black text-gray-700">
                  {maintenance.filter(m => m.customerId === selectedCustomerForReport.id).length} عملية
                </p>
                <p className="text-[9px] text-gray-400 font-bold mt-1">
                  بإجمالي تكلفة: {formatCurrency(maintenance.filter(m => m.customerId === selectedCustomerForReport.id).reduce((sum, m) => sum + m.totalCost, 0))}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">الفواتير الآجلة</p>
                <p className="text-xl font-black text-red-700">
                  {sales.filter(s => s.customerId === selectedCustomerForReport.id && s.paymentMethod === 'Credit').length} فاتورة
                </p>
                <p className="text-[9px] text-red-400 font-bold mt-1">
                  بإجمالي: {formatCurrency(sales.filter(s => s.customerId === selectedCustomerForReport.id && s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0))}
                </p>
              </div>
            </div>

            {/* Invoices History */}
            <div>
              <h4 className="font-bold text-[var(--primary)] mb-3 flex items-center gap-2">
                <ShoppingCart size={18} /> سجل المبيعات والفواتير
              </h4>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-right">
                  <thead className="bg-[var(--bg)] text-[var(--text-secondary)] font-bold">
                    <tr>
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sales.filter(s => s.customerId === selectedCustomerForReport.id).length > 0 ? (
                      sales.filter(s => s.customerId === selectedCustomerForReport.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(sale => (
                          <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-[var(--primary)]">#{sale.id}</span>
                              {sale.maintenanceDevice && (
                                <div className="text-[10px] text-blue-500 font-medium">{sale.maintenanceDevice}</div>
                              )}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              <div>{formatDate(sale.date)}</div>
                              <div className="text-[10px] text-gray-400">{formatTime(sale.date)}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : 
                                sale.paymentMethod === 'Credit' ? 'bg-red-100 text-red-700' : 
                                sale.paymentMethod === 'Check' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {sale.paymentMethod === 'Cash' ? 'نقداً' : 
                                 sale.paymentMethod === 'Credit' ? 'آجل' : 
                                 sale.paymentMethod === 'Check' ? 'صك' : 'تحويل'}
                              </span>
                            </td>
                            <td className="p-3 text-left">
                              <div className="font-bold text-[var(--primary)]">{formatCurrency(sale.total)}</div>
                              <div className="text-[10px] text-gray-400">بواسطة: {sale.createdBy}</div>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-gray-400 font-bold">لا توجد فواتير سابقة لهذا العميل</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Maintenance History */}
            <div>
              <h4 className="font-bold text-[var(--primary)] mb-3 flex items-center gap-2">
                <Wrench size={18} /> سجل الصيانة والإصلاح
              </h4>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-right">
                  <thead className="bg-[var(--bg)] text-[var(--text-secondary)] font-bold">
                    <tr>
                      <th className="p-3">رقم العملية</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المعدة/المحرك</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {maintenance.filter(m => m.customerId === selectedCustomerForReport.id).length > 0 ? (
                      maintenance.filter(m => m.customerId === selectedCustomerForReport.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(record => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-[var(--primary)]">#{record.id}</span>
                              <div className="text-[10px] text-gray-400 font-medium">{record.serviceType}</div>
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              <div>{formatDate(record.date)}</div>
                              <div className="text-[10px] text-gray-400">{formatTime(record.date)}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-700">{record.deviceInfo}</div>
                              <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                                <UserIcon size={10} /> {record.technician}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                record.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                record.status === 'Finished' ? 'bg-blue-100 text-blue-700' :
                                record.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {record.status === 'Entered' ? 'تم الاستلام' : 
                                 record.status === 'Inspected' ? 'تم الفحص' :
                                 record.status === 'In Progress' ? 'قيد العمل' :
                                 record.status === 'Finished' ? 'جاهز' : 'تم التسليم'}
                              </span>
                            </td>
                            <td className="p-3 text-left">
                              <div className="font-bold text-[var(--primary)]">{formatCurrency(record.totalCost)}</div>
                              {record.remainingAmount > 0 && (
                                <div className="text-[10px] font-bold text-red-500">متبقي: {formatCurrency(record.remainingAmount)}</div>
                              )}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">لا توجد عمليات صيانة سابقة لهذا العميل</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <button 
                onClick={() => triggerPrint('تقرير الزبون')} 
                className="btn-secondary px-6 py-2 rounded-lg font-bold flex items-center gap-2"
              >
                <Printer size={16} /> طباعة التقرير
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const AccountingView: React.FC<{
  sales: Sale[];
  customers: Customer[];
  maintenance: MaintenanceRecord[];
}> = ({ sales, customers, maintenance }) => {
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const cash = sales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.total, 0);
  const credit = sales.filter(s => s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.total, 0);
  const checks = sales.filter(s => s.paymentMethod === 'Check').reduce((sum, s) => sum + s.total, 0);
  const totalDebts = customers.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const unpaidMaintenance = maintenance.filter(m => m.remainingAmount > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">الحسابات المالية</h2>
          <p className="text-sm text-[var(--text-secondary)]">نظرة مالية عامة على المبيعات وديون العملاء والصيانة</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1">إجمالي المبيعات</p>
          <p className="text-2xl font-black text-[var(--primary)]">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1">نقداً</p>
          <p className="text-xl font-black text-green-600">{formatCurrency(cash)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1">آجل (ديون)</p>
          <p className="text-xl font-black text-orange-600">{formatCurrency(credit)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1">إجمالي ديون العملاء</p>
          <p className="text-xl font-black text-red-600">{formatCurrency(totalDebts)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--primary)] mb-3">أحدث 10 فواتير</h3>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-[var(--text-secondary)]">
                  <th className="py-2">رقم</th>
                  <th className="py-2">العميل</th>
                  <th className="py-2">القيمة</th>
                  <th className="py-2">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map(s => (
                  <tr key={s.id} className="border-t border-[var(--border)] text-[11px]">
                    <td className="py-1">{s.id}</td>
                    <td className="py-1">{s.customerName}</td>
                    <td className="py-1">{formatCurrency(s.total)}</td>
                    <td className="py-1">
                      {s.paymentMethod === 'Cash' ? 'نقداً' :
                       s.paymentMethod === 'Credit' ? 'آجل' :
                       s.paymentMethod === 'Check' ? 'صك' : 'تحويل'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--primary)] mb-3">عمليات صيانة غير مسددة بالكامل</h3>
          <div className="max-h-72 overflow-y-auto">
            {unpaidMaintenance.length === 0 ? (
              <div className="text-xs text-[var(--text-secondary)]">لا توجد عمليات صيانة غير مسددة.</div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th className="py-2">رقم العملية</th>
                    <th className="py-2">العميل</th>
                    <th className="py-2">إجمالي</th>
                    <th className="py-2">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidMaintenance.map(m => (
                    <tr key={m.id} className="border-t border-[var(--border)] text-[11px]">
                      <td className="py-1">{m.id}</td>
                      <td className="py-1">{m.customerName}</td>
                      <td className="py-1">{formatCurrency(m.totalCost)}</td>
                      <td className="py-1 text-red-600">{formatCurrency(m.remainingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

const BulkSupplyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUser: User;
  onSave: (invoice: SupplyInvoice) => void;
}> = ({ isOpen, onClose, products, currentUser, onSave }) => {
  const [supplierName, setSupplierName] = useState('Mercury Marine');
  const [notes, setNotes] = useState('شحنة حاوية جديدة');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; costUSD: number; priceLYD: number }[]>([]);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, costUSD: 0, priceLYD: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // Auto-fill product name if ID matches
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
      }
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalUSD = items.reduce((sum, item) => sum + (item.costUSD * item.quantity), 0);
  const totalLYD = items.reduce((sum, item) => sum + (item.priceLYD * item.quantity), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('يرجى إضافة منتجات');
    
    const invoice: SupplyInvoice = {
      id: `SUP-${Date.now()}`,
      date: new Date().toISOString(),
      supplierId: 'S-MERCURY',
      supplierName,
      items,
      totalUSD,
      totalLYD,
      notes,
      createdBy: currentUser.id
    };
    
    onSave(invoice);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدخال بضاعة (حاوية ميركوري)" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">اسم المورد</label>
            <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">ملاحظات الشحنة</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="رقم الحاوية أو تفاصيل الشحنة..." />
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">رقم الصنف</th>
                <th className="p-3">اسم المنتج</th>
                <th className="p-3 w-20">الكمية</th>
                <th className="p-3">التكلفة ($)</th>
                <th className="p-3">سعر البيع (دل)</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="p-2">
                    <Input list="inventory-products" value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)} required />
                    <datalist id="inventory-products">
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </datalist>
                  </td>
                  <td className="p-2">
                    <Input value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} required />
                  </td>
                  <td className="p-2">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} required />
                  </td>
                  <td className="p-2">
                    <Input type="number" value={item.costUSD} onChange={e => updateItem(index, 'costUSD', Number(e.target.value))} required />
                  </td>
                  <td className="p-2">
                    <Input type="number" value={item.priceLYD} onChange={e => updateItem(index, 'priceLYD', Number(e.target.value))} required />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addItem} className="w-full py-3 bg-gray-50 text-blue-600 font-bold text-xs hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
            <Plus size={14} /> إضافة صنف جديد للشحنة
          </button>
        </div>

        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] font-bold text-blue-600">إجمالي التكلفة</p>
              <p className="text-lg font-black text-blue-900">{formatUSD(totalUSD)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-600">إجمالي قيمة البيع</p>
              <p className="text-lg font-black text-blue-900">{formatCurrency(totalLYD)}</p>
            </div>
          </div>
          <button type="submit" className="btn-primary px-8 py-3 rounded-xl font-bold shadow-lg">
            حفظ الشحنة وتحديث المخزون
          </button>
        </div>
      </form>
    </Modal>
  );
};

const MaintenanceView: React.FC<{
  maintenance: MaintenanceRecord[];
  customers: Customer[];
  products: Product[];
  currentUser: User;
  onSave: (record: MaintenanceRecord) => void;
  onDelete: (id: string) => void;
}> = ({ maintenance, customers, products, currentUser, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [draggedRecord, setDraggedRecord] = useState<MaintenanceRecord | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<MaintenanceStatus | null>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [selectedForInvoice, setSelectedForInvoice] = useState<MaintenanceRecord | null>(null);

  const filteredMaintenance = maintenance.filter(record => {
    const term = searchTerm.toLowerCase();
    return (
      record.customerName.toLowerCase().includes(term) ||
      record.deviceInfo.toLowerCase().includes(term) ||
      record.id.toLowerCase().includes(term)
    );
  });

  const groupedByStatus: { status: MaintenanceStatus; items: MaintenanceRecord[] }[] = MAINTENANCE_STATUSES.map(status => ({
    status,
    items: filteredMaintenance.filter(record => record.status === status)
  }));

  const STATUS_COLUMN_STYLES: Record<MaintenanceStatus, string> = {
    Entered: 'bg-blue-50/60 border-blue-100',
    Inspected: 'bg-purple-50/60 border-purple-100',
    'In Progress': 'bg-amber-50/60 border-amber-100',
    Finished: 'bg-emerald-50/60 border-emerald-100',
    Delivered: 'bg-slate-50/60 border-slate-200'
  };

  const handleAdd = () => {
    const firstCustomer = customers[0];
    const nowIso = new Date().toISOString();
    setEditingRecord({
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      date: nowIso,
      completionDate: undefined,
      customerId: firstCustomer ? firstCustomer.id : '',
      customerName: firstCustomer ? firstCustomer.name : '',
      technician: '',
      deviceInfo: '',
      serviceType: '',
      inspectionNotes: '',
      status: 'Entered',
      laborCost: 0,
      partsUsed: [],
      totalCost: 0,
      paidAmount: 0,
      remainingAmount: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleStatusChange = (record: MaintenanceRecord, status: MaintenanceStatus) => {
    const shouldHaveCompletionDate = status === 'Finished' || status === 'Delivered';
    const updated: MaintenanceRecord = {
      ...record,
      status,
      completionDate: shouldHaveCompletionDate ? record.completionDate || new Date().toISOString() : undefined
    };
    onSave(updated);
  };

  const handleSave = () => {
    if (!editingRecord) return;
    if (!editingRecord.customerId || !editingRecord.customerName || !editingRecord.deviceInfo || !editingRecord.technician) {
      alert('يرجى إدخال بيانات العميل والجهاز والفني');
      return;
    }
    const partsTotal = editingRecord.partsUsed.reduce((sum, part) => sum + part.price * part.quantity, 0);
    const totalCost = editingRecord.laborCost + partsTotal;
    const remainingAmount = totalCost - editingRecord.paidAmount;
    const shouldHaveCompletionDate = editingRecord.status === 'Finished' || editingRecord.status === 'Delivered';
    const updated: MaintenanceRecord = {
      ...editingRecord,
      totalCost,
      remainingAmount,
      completionDate: shouldHaveCompletionDate ? editingRecord.completionDate || new Date().toISOString() : undefined
    };
    onSave(updated);
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('هل أنت متأكد من حذف عملية الصيانة؟')) {
      onDelete(id);
    }
  };

  const handleChangeCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setEditingRecord(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customerId,
        customerName: customer ? customer.name : ''
      };
    });
  };

  const handleAddPart = () => {
    setEditingRecord(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        partsUsed: [
          ...prev.partsUsed,
          { productId: '', productName: '', quantity: 1, price: 0 }
        ]
      };
    });
  };

  const handleUpdatePart = (index: number, update: Partial<MaintenancePart>) => {
    setEditingRecord(prev => {
      if (!prev) return prev;
      const parts = [...prev.partsUsed];
      parts[index] = { ...parts[index], ...update };
      return { ...prev, partsUsed: parts };
    });
  };

  const handleRemovePart = (index: number) => {
    setEditingRecord(prev => {
      if (!prev) return prev;
      const parts = prev.partsUsed.filter((_, i) => i !== index);
      return { ...prev, partsUsed: parts };
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, record: MaintenanceRecord) => {
    setDraggedRecord(record);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedRecord(null);
    setDragOverStatus(null);
  };

  const handleColumnDragOver = (event: React.DragEvent<HTMLDivElement>, status: MaintenanceStatus) => {
    event.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, status: MaintenanceStatus) => {
    event.preventDefault();
    if (draggedRecord && draggedRecord.status !== status) {
      handleStatusChange(draggedRecord, status);
    }
    setDraggedRecord(null);
    setDragOverStatus(null);
  };

  const maintenanceToSale = (record: MaintenanceRecord): Sale => {
    const items = record.partsUsed.map(part => ({
      productId: part.productId,
      productName: part.productName,
      quantity: part.quantity,
      price: part.price
    }));
    const partsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const labor = record.laborCost || 0;
    const total = record.totalCost || labor + partsTotal;
    const paymentMethod: Sale['paymentMethod'] = record.remainingAmount > 0 ? 'Credit' : 'Cash';
    return {
      id: record.id,
      date: record.completionDate || record.date,
      customerId: record.customerId,
      customerName: record.customerName,
      customerType: 'Permanent',
      items,
      laborCost: labor,
      total,
      paymentMethod,
      status: 'Completed',
      invoiceType: 'Maintenance',
      maintenanceDevice: record.deviceInfo,
      notes: record.inspectionNotes,
      createdBy: currentUser.id
    };
  };

  const currentPartsTotal =
    editingRecord?.partsUsed.reduce((sum, part) => sum + part.price * part.quantity, 0) || 0;
  const currentTotalCost =
    (editingRecord?.laborCost || 0) + currentPartsTotal;

  const activeCount = maintenance.filter(
    m => m.status === 'Entered' || m.status === 'Inspected' || m.status === 'In Progress'
  ).length;
  const finishedCount = maintenance.filter(m => m.status === 'Finished').length;
  const deliveredCount = maintenance.filter(m => m.status === 'Delivered').length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[var(--primary)] to-[#123E6B] rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">لوحة الصيانة والورشة</h2>
          <p className="text-sm md:text-base text-blue-100 font-medium">
            متابعة عمليات استلام القوارب، التشخيص، التنفيذ والتسليم للعميل
          </p>
          <div className="flex flex-wrap gap-2 mt-2 text-[11px] md:text-xs">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 font-bold">
              إجمالي العمليات: {maintenance.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-100 font-bold">
              قيد العمل: {activeCount}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-100 font-bold">
              جاهزة: {finishedCount}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-400/20 text-slate-100 font-bold">
              مسلّمة: {deliveredCount}
            </span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="bg-white text-[var(--primary)] px-6 md:px-8 py-3 rounded-2xl font-black text-sm md:text-base shadow-xl hover:bg-blue-50 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> <span>إضافة عملية صيانة جديدة</span>
        </button>
      </div>

      <div className="bg-[var(--surface)] p-4 md:p-5 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <Input
            placeholder="بحث برقم العملية، اسم العميل أو الجهاز..."
            className="pr-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {groupedByStatus.map(column => (
          <div
            key={column.status}
            className={`rounded-2xl border p-4 flex flex-col min-h-[220px] shadow-sm transition-all ${STATUS_COLUMN_STYLES[column.status]} ${
              dragOverStatus === column.status ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)] scale-[1.01]' : ''
            }`}
            onDragOver={e => handleColumnDragOver(e, column.status)}
            onDragEnter={e => handleColumnDragOver(e, column.status)}
            onDrop={e => handleDrop(e, column.status)}
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-black text-[var(--primary)]">
                  {MAINTENANCE_STATUS_LABELS[column.status]}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {column.status === 'Entered' && 'وصلت للمركز'}
                  {column.status === 'Inspected' && 'تم الفحص والتشخيص'}
                  {column.status === 'In Progress' && 'جارٍ تنفيذ أعمال الصيانة'}
                  {column.status === 'Finished' && 'جاهزة للتسليم'}
                  {column.status === 'Delivered' && 'تم التسليم للعميل'}
                </p>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/60 text-[var(--primary)] border border-white/80 shadow-sm">
                {column.items.length} عملية
              </span>
            </div>
            <div className="space-y-3 flex-1">
              {column.items.length === 0 ? (
                <div className="text-[11px] text-gray-400 text-center mt-4">
                  لا توجد عمليات في هذه المرحلة
                </div>
              ) : (
                column.items.map(record => (
                  <div
                    key={record.id}
                    className={`bg-[var(--surface)]/90 rounded-2xl border border-[var(--border)] p-4 space-y-3 shadow-md cursor-move transition-all ${
                      draggedRecord?.id === record.id ? 'opacity-60 ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : 'hover:shadow-lg hover:-translate-y-1'
                    }`}
                    draggable
                    onDragStart={e => handleDragStart(e, record)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-[var(--primary)]">#{record.id}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {formatDate(record.date)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-[var(--text-secondary)]">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--bg)] text-[10px] font-bold">
                          الفني: {record.technician || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-black text-[var(--primary)] truncate">
                        {record.customerName}
                      </p>
                      <p className="text-[11px] text-blue-600 font-medium truncate">
                        {record.deviceInfo}
                      </p>
                      {record.serviceType && (
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {record.serviceType}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between items-end gap-3">
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)]">إجمالي التكلفة</p>
                        <p className="text-base font-black text-[var(--primary)]">
                          {formatCurrency(record.totalCost)}
                        </p>
                      </div>
                      {record.remainingAmount > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-[var(--text-secondary)]">المتبقي</p>
                          <p className="text-[11px] font-black text-red-600">
                            {formatCurrency(record.remainingAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Select
                        value={record.status}
                        onChange={e =>
                          handleStatusChange(record, e.target.value as MaintenanceStatus)
                        }
                        className="text-[11px] h-9 px-2 rounded-lg"
                      >
                        {MAINTENANCE_STATUSES.map(status => (
                          <option key={status} value={status}>
                            {MAINTENANCE_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </Select>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedForInvoice(record);
                            setIsInvoicePreviewOpen(true);
                          }}
                          className="p-2 rounded-lg text-xs text-[var(--primary)] hover:bg-blue-50"
                          title="فاتورة الصيانة"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 rounded-lg text-xs text-blue-600 hover:bg-blue-50"
                          title="تعديل"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(record.id)}
                          className="p-2 rounded-lg text-xs text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? 'تفاصيل عملية الصيانة' : 'عملية صيانة'}
        size="lg"
      >
        {editingRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  العميل
                </label>
                <Select
                  value={editingRecord.customerId}
                  onChange={e => handleChangeCustomer(e.target.value)}
                >
                  <option value="">اختر العميل...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  الفني المسؤول
                </label>
                <Input
                  value={editingRecord.technician}
                  onChange={e =>
                    setEditingRecord(prev =>
                      prev ? { ...prev, technician: e.target.value } : prev
                    )
                  }
                  placeholder="اسم الفني"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                بيانات الجهاز / القارب
              </label>
              <Input
                value={editingRecord.deviceInfo}
                onChange={e =>
                  setEditingRecord(prev =>
                    prev ? { ...prev, deviceInfo: e.target.value } : prev
                  )
                }
                placeholder="مثال: قارب 25 قدم - محرك ياماها 200 حصان"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  نوع الخدمة
                </label>
                <Input
                  value={editingRecord.serviceType}
                  onChange={e =>
                    setEditingRecord(prev =>
                      prev ? { ...prev, serviceType: e.target.value } : prev
                    )
                  }
                  placeholder="فحص دوري، إصلاح عطل، تركيب..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  حالة العملية
                </label>
                <Select
                  value={editingRecord.status}
                  onChange={e =>
                    setEditingRecord(prev =>
                      prev
                        ? { ...prev, status: e.target.value as MaintenanceStatus }
                        : prev
                    )
                  }
                >
                  {MAINTENANCE_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {MAINTENANCE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                ملاحظات الفحص / التشخيص
              </label>
              <TextArea
                rows={3}
                value={editingRecord.inspectionNotes}
                onChange={e =>
                  setEditingRecord(prev =>
                    prev ? { ...prev, inspectionNotes: e.target.value } : prev
                  )
                }
                placeholder="وصف الحالة، الأعطال، الملاحظات الفنية..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  تكلفة اليد العاملة (LYD)
                </label>
                <Input
                  type="number"
                  value={editingRecord.laborCost}
                  onChange={e =>
                    setEditingRecord(prev =>
                      prev
                        ? { ...prev, laborCost: parseFloat(e.target.value) || 0 }
                        : prev
                    )
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--primary)] mb-1">
                  المدفوع حتى الآن (LYD)
                </label>
                <Input
                  type="number"
                  value={editingRecord.paidAmount}
                  onChange={e =>
                    setEditingRecord(prev =>
                      prev
                        ? { ...prev, paidAmount: parseFloat(e.target.value) || 0 }
                        : prev
                    )
                  }
                  placeholder="0"
                />
              </div>
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 text-sm">
                <p className="text-[10px] text-[var(--text-secondary)] mb-1">
                  إجمالي العملية
                </p>
                <p className="text-lg font-black text-[var(--primary)]">
                  {formatCurrency(currentTotalCost)}
                </p>
                <p className="text-[11px] mt-1">
                  المتبقي على العميل:{' '}
                  <span className={currentTotalCost - (editingRecord.paidAmount || 0) > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                    {formatCurrency(
                      currentTotalCost - (editingRecord.paidAmount || 0)
                    )}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--primary)]">
                  قطع الغيار المصروفة من المخزن
                </h3>
                <button
                  onClick={handleAddPart}
                  className="text-xs font-bold text-[var(--primary)] px-3 py-1.5 rounded-lg bg-[var(--bg)] hover:bg-blue-50 flex items-center gap-1"
                >
                  <Plus size={14} /> إضافة قطعة
                </button>
              </div>
              {editingRecord.partsUsed.length === 0 ? (
                <div className="text-[11px] text-gray-400 border border-dashed border-[var(--border)] rounded-lg p-3 text-center">
                  لم يتم صرف أي قطع غيار بعد
                </div>
              ) : (
                <div className="space-y-2">
                  {editingRecord.partsUsed.map((part, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2"
                    >
                      <div className="md:col-span-5">
                        <SearchableProductSelect
                          products={products}
                          selectedId={part.productId}
                          onSelect={productId => {
                            const product = products.find(p => p.id === productId);
                            handleUpdatePart(index, {
                              productId,
                              productName: product ? product.name : '',
                              price: product ? product.price : part.price
                            });
                          }}
                          placeholder="اختر قطعة الغيار..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          type="number"
                          value={part.quantity}
                          onChange={e =>
                            handleUpdatePart(index, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1)
                            })
                          }
                          placeholder="الكمية"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          type="number"
                          value={part.price}
                          onChange={e =>
                            handleUpdatePart(index, {
                              price: parseFloat(e.target.value) || 0
                            })
                          }
                          placeholder="سعر القطعة (LYD)"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                        <span className="text-xs font-bold text-[var(--primary)]">
                          {formatCurrency(part.price * part.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemovePart(index)}
                          className="p-1 rounded-lg text-xs text-red-600 hover:bg-red-50"
                          title="إزالة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRecord(null);
                }}
                className="btn-secondary px-6 py-2 rounded-lg font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="btn-primary px-8 py-2 rounded-lg font-bold shadow-sm"
              >
                حفظ العملية
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isInvoicePreviewOpen && !!selectedForInvoice}
        onClose={() => {
          setIsInvoicePreviewOpen(false);
          setSelectedForInvoice(null);
        }}
        title="معاينة فاتورة الصيانة"
        size="lg"
      >
        {selectedForInvoice && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 overflow-auto flex justify-center">
              <div className="origin-top scale-[0.6] print:scale-100">
                <InvoiceTemplateA4
                  sale={maintenanceToSale(selectedForInvoice)}
                  products={products}
                  user={currentUser}
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:justify-between items-stretch md:items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 no-print">
              <button
                onClick={() => {
                  setIsInvoicePreviewOpen(false);
                  setSelectedForInvoice(null);
                }}
                className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-600"
              >
                إغلاق
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => downloadPdfFromPrintArea('maintenance-invoice.pdf')}
                  className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
                >
                  <FileText size={18} /> تحميل كملف PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    sharePdfFromPrintArea(
                      'maintenance-invoice.pdf',
                      'فاتورة صيانة من الشركة الوطنية للمعدات البحرية'
                    )
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Share2 size={18} /> مشاركة PDF
                </button>
                <button
                  onClick={() => triggerPrint('فاتورة صيانة')}
                  className="px-8 py-2 bg-[var(--primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-900/20 transition-all flex items-center gap-2"
                >
                  <Printer size={18} /> طباعة الفاتورة
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const ReportsView: React.FC<{
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  maintenance: MaintenanceRecord[];
  currentUser: User;
}> = ({ products, sales, customers, maintenance, currentUser }) => {
  const [activeReport, setActiveReport] = useState<'dailySales' | 'inventory' | 'customers' | 'maintenance'>('dailySales');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const totalDebts = customers.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const overdueMaintenance = maintenance.filter(m => m.remainingAmount > 0).length;

  const renderPreview = () => {
    if (activeReport === 'dailySales') {
      return (
        <DailySalesReportTemplateA4
          sales={sales}
          user={currentUser}
          date={selectedDate}
        />
      );
    }
    if (activeReport === 'inventory') {
      return (
        <InventoryReportTemplateA4
          products={products}
          user={currentUser}
        />
      );
    }
    if (activeReport === 'customers') {
      const simulatedSales = sales;
      const reportDate = new Date().toLocaleDateString('ar-LY');
      return (
        <div
          className="print-area w-full bg-[#F8FAFC] text-black font-sans text-[11px] p-10 dir-rtl flex flex-col"
          style={{ width: '21cm', minHeight: '29.7cm', margin: '0 auto', padding: '1.5cm' }}
        >
          <div className="flex justify-between items-center border-b-2 border-blue-900/20 pb-6 mb-8 bg-[#0B2C4D] p-6 rounded-xl text-white">
            <div className="flex items-center gap-6">
              <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-20 w-auto object-contain brightness-0 invert" />
              <div className="text-right">
                <h1 className="text-xl font-black text-white">الشركة الوطنية للمعدات البحرية</h1>
                <p className="text-[10px] font-bold text-blue-200 tracking-wider">AL-WATANYA MARINE SYSTEMS</p>
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-black text-white mb-1">تقرير أرصدة العملاء</h2>
              <p className="text-blue-200 font-bold">Customer Balances Report</p>
              <p className="text-white font-black mt-2">بتاريخ: {reportDate}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border-2 border-gray-900 p-3 rounded-lg text-center">
              <p className="text-[9px] font-black text-gray-500 mb-1">إجمالي ديون العملاء</p>
              <p className="text-lg font-black text-red-700">{formatCurrency(totalDebts)}</p>
            </div>
            <div className="border border-gray-200 p-3 rounded-lg text-center">
              <p className="text-[9px] font-black text-gray-500 mb-1">عدد العملاء</p>
              <p className="text-lg font-black text-gray-700">{customers.length} عميل</p>
            </div>
            <div className="border border-gray-200 p-3 rounded-lg text-center">
              <p className="text-[9px] font-black text-gray-500 mb-1">عمليات الصيانة غير المسددة</p>
              <p className="text-lg font-black text-orange-700">{overdueMaintenance} عملية</p>
            </div>
          </div>
          <div className="flex-1">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="py-2 px-3 border border-gray-700 w-10 text-center">#</th>
                  <th className="py-2 px-3 border border-gray-700">العميل</th>
                  <th className="py-2 px-3 border border-gray-700 w-32 text-center">الهاتف</th>
                  <th className="py-2 px-3 border border-gray-700 w-32 text-center">الرصيد</th>
                  <th className="py-2 px-3 border border-gray-700 w-40 text-center">آخر حركة</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, index) => {
                  const lastSale = simulatedSales.find(s => s.customerId === c.id);
                  return (
                    <tr key={c.id} className="border-b border-gray-100 font-bold">
                      <td className="py-2 px-3 text-center border-x border-gray-50 text-gray-400">{index + 1}</td>
                      <td className="py-2 px-3 border-x border-gray-50">{c.name}</td>
                      <td className="py-2 px-3 border-x border-gray-50 text-center">{c.contact}</td>
                      <td className={`py-2 px-3 border-x border-gray-50 text-center ${c.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(c.balance)}
                      </td>
                      <td className="py-2 px-3 border-x border-gray-50 text-center text-gray-500">
                        {lastSale ? formatDate(lastSale.date) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    const summaryByStatus: Record<MaintenanceStatus, { count: number; total: number; remaining: number }> = MAINTENANCE_STATUSES.reduce((acc, status) => {
      const records = maintenance.filter(m => m.status === status);
      const total = records.reduce((sum, r) => sum + r.totalCost, 0);
      const remaining = records.reduce((sum, r) => sum + r.remainingAmount, 0);
      acc[status] = { count: records.length, total, remaining };
      return acc;
    }, {} as any);
    return (
      <div
        className="print-area w-full bg-[#F8FAFC] text-black font-sans text-[11px] p-10 dir-rtl flex flex-col"
        style={{ width: '21cm', minHeight: '29.7cm', margin: '0 auto', padding: '1.5cm' }}
      >
        <div className="flex justify-between items-center border-b-2 border-blue-900/20 pb-6 mb-8 bg-[#0B2C4D] p-6 rounded-xl text-white">
          <div className="flex items-center gap-6">
            <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-20 w-auto object-contain brightness-0 invert" />
            <div className="text-right">
              <h1 className="text-xl font-black text-white">الشركة الوطنية للمعدات البحرية</h1>
              <p className="text-[10px] font-bold text-blue-200 tracking-wider">AL-WATANYA MARINE SYSTEMS</p>
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black text-white mb-1">تقرير عمليات الصيانة</h2>
            <p className="text-blue-200 font-bold">Maintenance Summary Report</p>
            <p className="text-white font-black mt-2">بتاريخ: {new Date().toLocaleDateString('ar-LY')}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {MAINTENANCE_STATUSES.map(status => (
            <div key={status} className="border border-gray-200 p-3 rounded-lg text-center">
              <p className="text-[9px] font-black text-gray-500 mb-1">{MAINTENANCE_STATUS_LABELS[status]}</p>
              <p className="text-lg font-black text-gray-900">{summaryByStatus[status].count} عملية</p>
              <p className="text-[9px] font-bold text-gray-500 mt-1">إجمالي: {formatCurrency(summaryByStatus[status].total)}</p>
              {summaryByStatus[status].remaining > 0 && (
                <p className="text-[9px] font-bold text-red-600 mt-0.5">متبقي: {formatCurrency(summaryByStatus[status].remaining)}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="py-2 px-3 border border-gray-700 w-10 text-center">#</th>
                <th className="py-2 px-3 border border-gray-700">رقم العملية</th>
                <th className="py-2 px-3 border border-gray-700">العميل</th>
                <th className="py-2 px-3 border border-gray-700">الجهاز</th>
                <th className="py-2 px-3 border border-gray-700 w-24 text-center">الحالة</th>
                <th className="py-2 px-3 border border-gray-700 w-28 text-center">إجمالي</th>
                <th className="py-2 px-3 border border-gray-700 w-28 text-center">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map((m, index) => (
                <tr key={m.id} className="border-b border-gray-100 font-bold">
                  <td className="py-2 px-3 text-center border-x border-gray-50 text-gray-400">{index + 1}</td>
                  <td className="py-2 px-3 border-x border-gray-50">{m.id}</td>
                  <td className="py-2 px-3 border-x border-gray-50">{m.customerName}</td>
                  <td className="py-2 px-3 border-x border-gray-50 text-blue-700">{m.deviceInfo}</td>
                  <td className="py-2 px-3 border-x border-gray-50 text-center text-gray-700">{MAINTENANCE_STATUS_LABELS[m.status]}</td>
                  <td className="py-2 px-3 border-x border-gray-50 text-center">{formatCurrency(m.totalCost)}</td>
                  <td className={`py-2 px-3 border-x border-gray-50 text-center ${m.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(m.remainingAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const reportTitle =
    activeReport === 'dailySales'
      ? 'تقرير المبيعات اليومية'
      : activeReport === 'inventory'
      ? 'كشف المخزون العام'
      : activeReport === 'customers'
      ? 'تقرير أرصدة العملاء'
      : 'تقرير عمليات الصيانة';

  const reportFileName =
    activeReport === 'dailySales'
      ? 'daily-sales-report.pdf'
      : activeReport === 'inventory'
      ? 'inventory-report.pdf'
      : activeReport === 'customers'
      ? 'customer-balances-report.pdf'
      : 'maintenance-report.pdf';

  const reportShareMessage = `ملف PDF - ${reportTitle} من الشركة الوطنية للمعدات البحرية`;

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">تقارير النظام</h2>
          <p className="text-sm text-[var(--text-secondary)]">معاينة و طباعة التقارير من الواجهة مباشرة</p>
        </div>
        {activeReport === 'dailySales' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)]">تاريخ التقرير:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--surface)]"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-2">
          <button
            onClick={() => setActiveReport('dailySales')}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${activeReport === 'dailySales' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text)]'}`}
          >
            <span>تقرير المبيعات اليومي</span>
            <CalendarIcon size={16} />
          </button>
          <button
            onClick={() => setActiveReport('inventory')}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${activeReport === 'inventory' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text)]'}`}
          >
            <span>تقرير المخزون العام</span>
            <Package size={16} />
          </button>
          <button
            onClick={() => setActiveReport('customers')}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${activeReport === 'customers' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text)]'}`}
          >
            <span>تقرير أرصدة العملاء</span>
            <Users size={16} />
          </button>
          <button
            onClick={() => setActiveReport('maintenance')}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between ${activeReport === 'maintenance' ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text)]'}`}
          >
            <span>تقرير عمليات الصيانة</span>
            <Wrench size={16} />
          </button>
        </div>
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] no-print">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <FileBarChart size={16} />
              <span>معاينة التقرير قبل الطباعة</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => downloadPdfFromPrintArea(reportFileName)}
                className="px-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm font-bold flex items-center gap-2 text-[var(--text)]"
              >
                <FileText size={16} /> تحميل كملف PDF
              </button>
              <button
                type="button"
                onClick={() => sharePdfFromPrintArea(reportFileName, reportShareMessage)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Share2 size={16} /> مشاركة PDF
              </button>
              <button
                onClick={() => triggerPrint(reportTitle)}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Printer size={16} /> طباعة
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#E5E9F0] p-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{
  users: User[];
  currentUser: User;
  onUsersChange: (users: User[]) => void;
  onCurrentUserChange: (user: User) => void;
}> = ({ users, currentUser, onUsersChange, onCurrentUserChange }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const updateUser = (patch: Partial<User>) => {
    if (!selectedUser) return;
    const updatedUser: User = { ...selectedUser, ...patch };
    const newUsers = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    onUsersChange(newUsers);
    if (currentUser.id === updatedUser.id) {
      onCurrentUserChange(updatedUser);
    }
  };

  const togglePermission = (perm: Permission) => {
    if (!selectedUser) return;
    const has = selectedUser.permissions.includes(perm);
    const newPermissions = has
      ? selectedUser.permissions.filter(p => p !== perm)
      : [...selectedUser.permissions, perm];
    updateUser({ permissions: newPermissions });
  };

  const updatePassword = (password: string) => {
    updateUser({ password });
  };

  const handleAddUser = () => {
    const newUser: User = {
      id: `U${Math.floor(1000 + Math.random() * 9000)}`,
      username: '',
      name: '',
      password: '',
      role: 'User',
      permissions: []
    };
    const newUsers = [...users, newUser];
    onUsersChange(newUsers);
    setSelectedUserId(newUser.id);
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) {
      alert('لا يمكن مسح المستخدم الذي قمت بتسجيل الدخول به حالياً.');
      return;
    }
    if (!confirm('هل تريد مسح هذا المستخدم وجميع صلاحياته من النظام؟')) return;
    const newUsers = users.filter(u => u.id !== selectedUser.id);
    onUsersChange(newUsers);
    const fallback = newUsers[0];
    setSelectedUserId(fallback?.id || '');
    if (currentUser.id === selectedUser.id && fallback) {
      onCurrentUserChange(fallback);
    }
  };

  const PERMISSION_GROUPS: { title: string; perms: Permission[] }[] = [
    { title: 'القائمة الرئيسية والتقارير', perms: ['dashboard', 'sales', 'reports', 'accounting', 'messages'] },
    { title: 'العمليات والمخزون', perms: ['inventory', 'customers', 'maintenance'] },
    { title: 'إدارة النظام', perms: ['settings'] }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary)]">إعدادات المستخدمين والصلاحيات</h2>
          <p className="text-sm text-[var(--text-secondary)]">تعديل حسابات مستخدمي النظام ومنحهم صلاحيات على الأقسام</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--primary)] mb-3">قائمة المستخدمين</h3>
          <div className="space-y-2">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm flex flex-col border ${
                  selectedUser?.id === u.id ? 'border-[var(--primary)] bg-[#F0F9FF]' : 'border-transparent hover:bg-[var(--bg)]'
                }`}
              >
                <span className="font-bold text-[var(--text)]">{u.name}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">{u.username} • {u.role === 'Admin' ? 'مدير' : 'مستخدم'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:col-span-2">
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-[var(--primary)] mb-1">
                      الاسم الظاهر في النظام
                    </label>
                    <Input
                      type="text"
                      value={selectedUser.name}
                      onChange={e => updateUser({ name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--primary)] mb-1">
                        اسم الدخول (Username)
                      </label>
                      <Input
                        type="text"
                        value={selectedUser.username}
                        onChange={e => updateUser({ username: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--primary)] mb-1">
                        نوع المستخدم
                      </label>
                      <Select
                        value={selectedUser.role}
                        onChange={e => updateUser({ role: e.target.value as 'Admin' | 'User' })}
                      >
                        <option value="Admin">مدير نظام</option>
                        <option value="User">مستخدم عادي</option>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAddUser}
                    className="btn-primary px-4 py-2 rounded-lg font-bold text-xs"
                  >
                    إضافة مستخدم جديد
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="btn-secondary px-4 py-2 rounded-lg font-bold text-xs text-red-600 border-red-200"
                  >
                    مسح المستخدم
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-bold text-[var(--primary)]">كلمة المرور (تجريبية داخل النظام)</label>
                <Input
                  type="text"
                  value={selectedUser.password}
                  onChange={e => updatePassword(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--primary)]">الصلاحيات على الأقسام</h4>
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.title} className="border border-[var(--border)] rounded-lg p-3">
                    <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">{group.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.perms.map(perm => (
                        <button
                          key={perm}
                          onClick={() => togglePermission(perm)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            selectedUser.permissions.includes(perm)
                              ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                              : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}
                        >
                          {perm === 'dashboard' && 'لوحة التحكم'}
                          {perm === 'sales' && 'المبيعات'}
                          {perm === 'inventory' && 'المخزون'}
                          {perm === 'customers' && 'العملاء'}
                          {perm === 'maintenance' && 'الصيانة / الورشة'}
                          {perm === 'reports' && 'التقارير'}
                          {perm === 'accounting' && 'الحسابات'}
                          {perm === 'messages' && 'الرسائل'}
                          {perm === 'settings' && 'الإعدادات'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MESSAGES VIEW (Updated with new design) ---
const MessagesView: React.FC = () => {
  const [activeInbox, setActiveInbox] = useState<'info' | 'sales'>('info');
  const [messages] = useState<EmailMessage[]>(MOCK_MESSAGES);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredMessages = messages.filter(msg => 
    activeInbox === 'info' ? msg.inbox === 'info@alwatnya.com.ly' : msg.inbox === 'sales@alwatnya.com.ly'
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-[var(--primary)]">مراسلات الشركة (متابعة فقط)</h2>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className={`btn-secondary px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row gap-6 overflow-hidden">
        {/* Sidebar / Inbox List */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
           {/* Inbox Switcher */}
           <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
              <button 
                onClick={() => {setActiveInbox('info'); setSelectedMessage(null);}} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeInbox === 'info' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'}`}
              >
                <Inbox size={16} /> Info
              </button>
              <button 
                onClick={() => {setActiveInbox('sales'); setSelectedMessage(null);}} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeInbox === 'sales' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'}`}
              >
                <DollarSign size={16} /> Sales
              </button>
           </div>

           {/* Message List */}
           <div className="flex-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] p-6 text-center">
                   <Inbox size={48} className="mb-2 opacity-50"/>
                   <p>لا توجد رسائل في {activeInbox === 'info' ? 'Info' : 'Sales'}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                   {filteredMessages.map(msg => (
                     <div 
                       key={msg.id} 
                       onClick={() => setSelectedMessage(msg)}
                       className={`p-4 cursor-pointer hover:bg-[var(--bg)] transition-colors ${selectedMessage?.id === msg.id ? 'bg-[#F0F9FF] border-r-4 border-[var(--primary)]' : ''} ${!msg.isRead ? 'bg-[#F9FAFB]' : ''}`}
                     >
                        <div className="flex justify-between items-start mb-1">
                           <h4 className={`text-sm ${!msg.isRead ? 'font-bold text-[var(--primary)]' : 'font-medium text-[var(--text)]'}`}>{msg.sender}</h4>
                           <span className="text-[10px] text-[var(--text-secondary)]">{formatDate(msg.date)}</span>
                        </div>
                        <p className={`text-xs truncate mb-1 ${!msg.isRead ? 'font-bold' : 'text-[var(--text-secondary)]'}`}>{msg.subject}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{msg.body}</p>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>

        {/* Reading Pane */}
        <div className="flex-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm flex flex-col overflow-hidden mt-4 md:mt-0">
           {selectedMessage ? (
             <>
               <div className="p-6 border-b border-[var(--border)]">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-xl font-bold text-[var(--primary)] mb-1">{selectedMessage.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                           <span className="font-bold text-[var(--text)]">{selectedMessage.sender}</span>
                           <span>&lt;{selectedMessage.senderEmail}&gt;</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">إلى: {selectedMessage.inbox}</div>
                     </div>
                        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-1 rounded">
                          {formatDate(selectedMessage.date)} {formatTime(selectedMessage.date)}
                        </span>
                  </div>
               </div>
               <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg)]">
                  <div className="bg-[var(--surface)] p-8 rounded-lg shadow-sm border border-[var(--border)] min-h-[300px] whitespace-pre-wrap leading-relaxed text-[var(--text)]">
                     {selectedMessage.body}
                  </div>
                  {selectedMessage.hasAttachment && (
                     <div className="mt-4 flex gap-2">
                        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] px-3 py-2 rounded-lg text-sm text-[var(--primary)] cursor-pointer hover:bg-[var(--bg)]">
                           <Paperclip size={16} /> <span>مرفق_الفاتورة.pdf</span>
                        </div>
                     </div>
                  )}
               </div>
               <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-secondary)]">
                 هذه الشاشة مخصصة فقط لمتابعة الرسائل الواردة من خادم البريد.
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                <Mail size={64} className="mb-4 opacity-20" />
                <p className="text-lg">اختر رسالة لعرضها</p>
             </div>
           )}
        </div>
      </div>

    </div>
  );
};

const LoginView: React.FC<{
  users: User[];
  error: string;
  onSubmit: (username: string, password: string) => void;
}> = ({ users, error, onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0B2C4D] to-[#020617] flex items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-lg transition-all duration-300 hover:shadow-3xl">
        {/* Left Side - Branding & Information */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#0B2C4D] via-[#1d4ed8] to-[#0B2C4D] text-white p-12 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl"></div>
          </div>
          
          {/* Logo Section */}
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 shadow-lg">
                <img src="/assets/logos/mainlogo copy.png" alt="Logo" className="h-16 w-auto object-contain brightness-0 invert" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-wide">الشركة الوطنية للمعدات البحرية</h1>
                <p className="text-xs font-bold text-blue-200 tracking-[0.2em] mt-1">AL-WATANYA MARINE SYSTEMS</p>
              </div>
            </div>
          
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-black leading-tight">تسجيل الدخول إلى المنظومة</h2>
              <p className="text-sm text-blue-100 font-medium leading-relaxed">
                نظام إدارة شاملة للمعدات البحرية، يتيح لك إدارة المبيعات، الصيانة، والمخزون بكفاءة عالية.
              </p>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="relative z-10 grid grid-cols-1 gap-6 mt-12">
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-400/30 p-2 rounded-lg">
                  <ShoppingCart size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-white">المبيعات</h3>
              </div>
              <p className="text-xs text-blue-100/90">إصدار فواتير، تقارير يومية، وسندات سداد ديون.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-400/30 p-2 rounded-lg">
                  <Wrench size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-white">الصيانة والورشة</h3>
              </div>
              <p className="text-xs text-blue-100/90">متابعة الأعمال، حالات الصيانة، وفواتير الصيانة.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-400/30 p-2 rounded-lg">
                  <Package size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-white">المخزون والتقارير</h3>
              </div>
              <p className="text-xs text-blue-100/90">إدارة المخزن، كشوفات A4 جاهزة للطباعة، وحسابات العملاء.</p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="relative z-10 mt-12 pt-6 border-t border-white/10">
            <p className="text-xs text-blue-100/80">© 2024 الشركة الوطنية للمعدات البحرية</p>
            <p className="text-xs text-blue-400 font-bold">AL-WATANYA MARINE SYSTEMS</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-[var(--bg)]/95 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2">تسجيل الدخول</h2>
            <p className="text-sm text-white/70">أدخل بيانات الدخول للمتابعة إلى النظام</p>
          </div>
          
          {/* Demo Accounts Toggle */}
          <button 
            onClick={() => setShowDemoAccounts(!showDemoAccounts)} 
            className="w-full mb-6 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm"
          >
            {showDemoAccounts ? (
              <>
                <ChevronDown className="rotate-180 transition-transform" size={16} />
                إخفاء حسابات التطبيق
              </>
            ) : (
              <>
                <ChevronDown className="transition-transform" size={16} />
                عرض حسابات التطبيق
              </>
            )}
          </button>
          
          {/* Demo Accounts List */}
          {showDemoAccounts && (
            <div className="mb-6 bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
              {users.map((user, index) => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200">
                  <div>
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-white/60">{user.role === 'Admin' ? 'مدير عام' : user.role === 'User' ? 'موظف' : user.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-blue-400">{user.username}</p>
                    <p className="text-xs font-mono text-green-400">{user.password}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[var(--primary)]">اسم المستخدم</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-colors duration-200 group-focus-within:text-[var(--primary)]">
                  <UserIcon size={18} className="text-[var(--text-secondary)]" />
                </div>
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: admin أو sales"
                  className="pr-10 h-12 bg-white/5 border-white/10 hover:border-[var(--primary)]/50 transition-all duration-300"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[var(--primary)]">كلمة المرور</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-colors duration-200 group-focus-within:text-[var(--primary)]">
                  <Key size={18} className="text-[var(--text-secondary)]" />
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="pr-10 h-12 bg-white/5 border-white/10 hover:border-[var(--primary)]/50 transition-all duration-300"
                />
              </div>
            </div>
            
            {error && (
              <div className="text-sm font-bold text-red-500 bg-red-50/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 animate-shake">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-[var(--primary)] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[var(--primary)] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-all duration-300 transform hover:shadow-xl"
            >
              <LogIn size={18} />
              <span>دخول إلى المنظومة</span>
            </button>
          </form>
          
          {/* Quick Access Buttons */}
          <div className="mt-8 grid grid-cols-3 gap-2">
            {users.map((user, index) => (
              <button
                key={user.id}
                onClick={() => {
                  setUsername(user.username);
                  setPassword(user.password);
                }}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 text-xs text-white/80 rounded-lg transition-all duration-200 hover:text-white"
                title={`تسجيل الدخول كـ ${user.name}`}
              >
                {user.username.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="mt-8 text-center text-xs text-white/50">
            <p>© 2024 AL-WATANYA MARINE SYSTEMS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [activeView, setActiveView] = useState<Permission>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); 
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // State for data management (In a real app, this would be Context or Redux)
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(MOCK_MAINTENANCE);
  const [supplyInvoices, setSupplyInvoices] = useState<SupplyInvoice[]>(MOCK_SUPPLY_INVOICES);

  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);

  const handleLogin = (username: string, password: string) => {
    const trimmedUser = username.trim();
    const user = users.find(u => u.username === trimmedUser);
    if (!user || user.password !== password) {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setLoginError('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSidebarOpen(false);
    setActiveView('dashboard');
  };

  // Navigation Handler
  const handleNavigate = (view: Permission) => setActiveView(view);

  // Data Handlers
  const handleProductSave = (product: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      return exists ? prev.map(p => p.id === product.id ? product : p) : [...prev, product];
    });
  };

  const handleProductDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };
  
  const handleSaleSave = (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    // Optionally update stock here
    setProducts(prev => prev.map(p => {
      const item = sale.items.find(i => i.productId === p.id);
      if (item) {
        return { ...p, stock: p.stock - item.quantity };
      }
      return p;
    }));
  };

  const handleSaleDelete = (id: string) => {
      setSales(prev => prev.filter(s => s.id !== id));
  }

  const handleDebtPaymentSave = (sale: Sale, amount: number) => {
    setSales(prev => [sale, ...prev]);
    setCustomers(prev =>
      prev.map(c => (c.id === sale.customerId ? { ...c, balance: c.balance + amount } : c))
    );
  };

  const handleCustomerSave = (customer: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === customer.id);
      return exists ? prev.map(c => c.id === customer.id ? customer : c) : [customer, ...prev];
    });
  };

  const handleCustomerDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع بياناته من النظام.')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleMaintenanceSave = (record: MaintenanceRecord) => {
    setMaintenance(prev => {
      const exists = prev.find(m => m.id === record.id);
      return exists ? prev.map(m => (m.id === record.id ? record : m)) : [record, ...prev];
    });
  };

  const handleMaintenanceDelete = (id: string) => {
    setMaintenance(prev => prev.filter(m => m.id !== id));
  };

  const handleBulkSupply = (invoice: SupplyInvoice) => {
    // 1. Add the supply invoice to state
    setSupplyInvoices(prev => [invoice, ...prev]);

    // 2. Update product stock and prices
    setProducts(prev => {
      return prev.map(product => {
        const item = invoice.items.find(i => i.productId === product.id);
        if (item) {
          return {
            ...product,
            stock: product.stock + item.quantity,
            costUSD: item.costUSD,
            price: item.priceLYD
          };
        }
        return product;
      });
    });
    
    alert('تم حفظ شحنة التوريد وتحديث الكميات في المخزن بنجاح');
  };

  // View Router
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView 
          products={products} 
          sales={sales} 
          customers={customers} 
          maintenance={maintenance} 
          onNavigate={handleNavigate}
          onOpenInvoice={() => setIsNewSaleModalOpen(true)} 
          onOpenDebtPayment={() => setIsDebtPaymentModalOpen(true)}
        />;
      case 'sales':
        return <SalesView 
          sales={sales} 
          products={products}
          currentUser={currentUser} 
          onOpenNewSale={() => setIsNewSaleModalOpen(true)} 
          onDeleteSale={handleSaleDelete}
        />;
      case 'inventory':
        return <InventoryView 
          products={products} 
          currentUser={currentUser}
          onSave={handleProductSave} 
          onDelete={handleProductDelete} 
        />;
      case 'customers':
        return <CustomersView 
          customers={customers} 
          sales={sales}
          maintenance={maintenance}
          onSave={handleCustomerSave} 
          onDelete={handleCustomerDelete} 
        />;
      case 'messages':
        return <MessagesView />;
      case 'accounting': 
        return <AccountingView 
          sales={sales} 
          customers={customers} 
          maintenance={maintenance} 
        />;
      case 'maintenance':
        return (
          <MaintenanceView
            maintenance={maintenance}
            customers={customers}
            products={products}
            currentUser={currentUser}
            onSave={handleMaintenanceSave}
            onDelete={handleMaintenanceDelete}
          />
        );
      case 'reports': 
        return <ReportsView 
          products={products} 
          sales={sales} 
          customers={customers} 
          maintenance={maintenance} 
          currentUser={currentUser} 
        />;
      case 'settings': 
        return <SettingsView 
          users={users} 
          currentUser={currentUser} 
          onUsersChange={setUsers} 
          onCurrentUserChange={setCurrentUser} 
        />;
      case 'archive':
        return <ArchiveView 
          sales={sales} 
          supplyInvoices={supplyInvoices} 
          products={products} 
          currentUser={currentUser} 
        />;
      default: return <div className="p-10 text-center">View Not Found</div>;
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: Permission, icon: any, label: string }) => (
      currentUser.permissions.includes(id) ? (
        <button 
            onClick={() => setActiveView(id)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === id ? 'bg-[var(--primary)] text-white shadow-md font-bold' : 'text-blue-100 hover:bg-white/5'}`}
        >
            <Icon size={20} /> <span>{label}</span>
        </button>
      ) : null
  );

  if (!isAuthenticated) {
    return (
      <LoginView
        users={users}
        error={loginError}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans dir-rtl overflow-hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 right-0 w-64 bg-[#0B2C4D] text-white flex flex-col shadow-xl z-30 transform transition-transform duration-300 md:static md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}
        >
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg flex items-center justify-center">
                    <img src="/assets/logos/mainlogo copy.png" alt="Alwatnya Logo" className="h-10 w-auto object-contain brightness-0 invert" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-wide">الوطنية</h1>
                    <p className="text-xs text-blue-300">للمعدات البحرية</p>
                </div>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                <SidebarItem id="dashboard" icon={LayoutDashboard} label="لوحة التحكم" />
                <SidebarItem id="sales" icon={ShoppingCart} label="تقرير المبيعات" />
                <SidebarItem id="inventory" icon={Package} label="المخزون" />
                <SidebarItem id="customers" icon={Users} label="العملاء" />
                <SidebarItem id="maintenance" icon={Wrench} label="الصيانة" />
                <SidebarItem id="messages" icon={Mail} label="الرسائل" />
                <SidebarItem id="reports" icon={FileBarChart} label="التقارير" />
                <SidebarItem id="archive" icon={Archive} label="أرشيف الفواتير" />
                <SidebarItem id="accounting" icon={Banknote} label="الحسابات" />
                <SidebarItem id="settings" icon={Settings} label="الإعدادات" />
            </nav>

            <div className="p-4 border-t border-white/10 bg-[#08223D]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center font-bold text-white border-2 border-white/20">
                        {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm truncate">{currentUser.name}</p>
                        <p className="text-xs text-blue-300 truncate">{currentUser.role === 'Admin' ? 'مدير النظام' : 'موظف'}</p>
                    </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/80 text-white text-sm py-2 rounded-lg transition-colors"
                >
                    <LogOut size={16} /> <span>تسجيل خروج</span>
                </button>
            </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
            <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] flex justify-between items-center px-4 md:px-6 shadow-sm z-10">
                <div className="flex items-center gap-3 md:gap-4 text-[var(--text-secondary)] text-xs md:text-sm">
                    <span>{new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                     <button
                       className="md:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg)] rounded-full"
                       onClick={() => setIsSidebarOpen(true)}
                     >
                       <Menu size={20} />
                     </button>
                     <button className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg)] rounded-full relative" onClick={() => setActiveView('messages')}>
                        <MessageCircle size={20} />
                        {MOCK_MESSAGES.filter(m => !m.isRead).length > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-[var(--bg)]">
                {renderContent()}
            </div>
            
            <NewSaleModal 
              isOpen={isNewSaleModalOpen} 
              onClose={() => setIsNewSaleModalOpen(false)} 
              products={products} 
              customers={customers}
              onSave={handleSaleSave} 
              currentUser={currentUser} 
            />
            <DebtPaymentModal
              isOpen={isDebtPaymentModalOpen}
              onClose={() => setIsDebtPaymentModalOpen(false)}
              customers={customers}
              products={products}
              currentUser={currentUser}
              onConfirm={handleDebtPaymentSave}
            />
        </main>
    </div>
  );
};

export default App;
