export interface Client {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: any;
}

export interface Product {
  id?: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  createdAt?: any;
}

export interface InvoiceItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: number;
  date: any;
  paymentType: 'Efectivo' | 'Transferencia' | 'Crédito';
  client: {
    name: string;
    phone?: string;
    address?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'Pagada' | 'Pendiente';
  createdAt?: any;
  updatedAt?: any;
}

export interface BusinessSettings {
  businessName: string;
  logo?: string;
  address?: string;
  phone?: string;
  taxPercentage: number;
  currency: string;
}
