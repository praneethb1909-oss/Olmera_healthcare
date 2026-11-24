/**
 * Olmera Healthcare - Pharmacy Order Fulfillment Service
 * Handles prescription medicine ordering, home delivery tracking, and network pharmacy counter pickup.
 */

export type FulfillmentType = 'home_delivery' | 'pharmacy_pickup';

export type OrderStatus = 
  | 'order_placed'
  | 'verified_by_pharmacist'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'ready_for_pickup'
  | 'collected'
  | 'cancelled';

export interface OrderItem {
  medicationName: string;
  name?: string;
  medicineId?: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  price?: number;
  totalPrice: number;
}

export interface PharmacyOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  prescriptionId?: string;
  fulfillmentType: FulfillmentType | string;
  status: OrderStatus | string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  pickupOtp?: string;
  createdAt: string;
  updatedAt: string;
  
  // Home Delivery specifics
  deliveryAddress?: any;
  courierTracking?: {
    carrierName: string;
    trackingId: string;
    estimatedDeliveryTime?: string;
  };

  // Pickup specifics
  pickupPharmacy?: {
    pharmacyId: string;
    pharmacyName: string;
    address: string;
    pickupOtp: string;
  };
}

export const NETWORK_PHARMACIES = [
  {
    id: 'pharma-1',
    name: 'Olmera Rajam Care Dispensary',
    address: 'Ground Floor, Olmera Rajam Hospital, Main Road',
    phone: '+91 94401 23456',
    hours: '24 Hours Open'
  },
  {
    id: 'pharma-2',
    name: 'Olmera Vizag Health City Pharmacy',
    address: 'Health City, Arilova, Visakhapatnam',
    phone: '+91 94402 34567',
    hours: '24 Hours Open'
  },
  {
    id: 'pharma-3',
    name: 'Apollo Pharmacy Srikakulam Central',
    address: 'Near Old Bus Stand, Srikakulam',
    phone: '+91 89422 12345',
    hours: '08:00 AM - 11:00 PM'
  }
];

const STORAGE_KEY = 'olmera_pharmacy_orders';

export class PharmacyOrderService {
  private getStore(): PharmacyOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse orders store', e);
    }

    // Default sample orders
    return [
      {
        id: 'ord-89421',
        patientId: 'demo-patient-uid',
        patientName: 'Demo Patient',
        patientPhone: '+91 98765 43210',
        fulfillmentType: 'home_delivery',
        status: 'out_for_delivery',
        items: [
          { medicationName: 'Telmisartan 40mg', dosage: '1 tablet daily', quantity: 30, unitPrice: 8, totalPrice: 240 },
          { medicationName: 'Metformin 500mg SR', dosage: '1 tablet twice daily', quantity: 60, unitPrice: 3.5, totalPrice: 210 }
        ],
        subtotal: 450,
        deliveryFee: 40,
        tax: 22.5,
        totalAmount: 512.5,
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        deliveryAddress: {
          street: 'Plot 42, Sunrise Colony',
          city: 'Rajam',
          postalCode: '532127',
          landmark: 'Opposite GMR Care Gate'
        },
        courierTracking: {
          carrierName: 'Olmera Health Fleet Delivery',
          trackingId: 'OLM-DEL-89421',
          estimatedDeliveryTime: 'Today by 5:30 PM'
        }
      }
    ];
  }

  private saveStore(orders: PharmacyOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save pharmacy orders', e);
    }
  }

  getOrdersForPatient(patientId: string): PharmacyOrder[] {
    return this.getStore().filter(o => o.patientId === patientId);
  }

  getAllOrders(): PharmacyOrder[] {
    return this.getStore();
  }

  getOrders(): PharmacyOrder[] {
    return this.getStore();
  }

  getOrderById(orderId: string): PharmacyOrder | null {
    return this.getStore().find(o => o.id === orderId) || null;
  }

  createOrder(params: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    prescriptionId?: string;
    fulfillmentType: FulfillmentType | string;
    items: any[];
    deliveryAddress?: any;
    pickupPharmacyId?: string;
  }): PharmacyOrder {
    const isPickup = params.fulfillmentType === 'pickup' || params.fulfillmentType === 'pharmacy_pickup';
    const isDelivery = params.fulfillmentType === 'delivery' || params.fulfillmentType === 'home_delivery';

    const normalizedItems: OrderItem[] = params.items.map(it => ({
      medicationName: it.medicationName || it.name || 'Prescribed Medicine',
      dosage: it.dosage || '1 tablet daily',
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || it.price || 50,
      totalPrice: it.totalPrice || (it.price ? it.price * (it.quantity || 1) : (it.unitPrice || 50) * (it.quantity || 1))
    }));

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = isDelivery ? 50 : 0;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + deliveryFee + tax;

    const orders = this.getStore();
    const orderId = `ord-${Math.floor(10000 + Math.random() * 90000)}`;
    const sixDigitOtp = Math.floor(100000 + Math.random() * 900000).toString();

    let pickupPharmacy: PharmacyOrder['pickupPharmacy'];
    if (isPickup) {
      const match = NETWORK_PHARMACIES.find(p => p.id === params.pickupPharmacyId) || NETWORK_PHARMACIES[0];
      pickupPharmacy = {
        pharmacyId: match.id,
        pharmacyName: match.name,
        address: match.address,
        pickupOtp: sixDigitOtp
      };
    }

    const newOrder: PharmacyOrder = {
      id: orderId,
      patientId: params.patientId,
      patientName: params.patientName,
      patientPhone: params.patientPhone,
      prescriptionId: params.prescriptionId,
      fulfillmentType: isPickup ? 'pickup' : 'delivery',
      status: isPickup ? 'ready_for_pickup' : 'order_placed',
      items: normalizedItems,
      subtotal,
      deliveryFee,
      tax,
      totalAmount,
      pickupOtp: isPickup ? sixDigitOtp : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryAddress: params.deliveryAddress,
      courierTracking: isDelivery ? {
        carrierName: 'Olmera Express Health Courier',
        trackingId: `OLM-TRK-${orderId}`,
        estimatedDeliveryTime: 'Estimated tomorrow by 11:00 AM'
      } : undefined,
      pickupPharmacy
    };

    orders.unshift(newOrder);
    this.saveStore(orders);
    return newOrder;
  }

  verifyPickupOtp(orderId: string, enteredOtp: string): boolean {
    const orders = this.getStore();
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const actualOtp = order.pickupOtp || order.pickupPharmacy?.pickupOtp;
    if (actualOtp && actualOtp.trim() === enteredOtp.trim()) {
      order.status = 'fulfilled';
      order.updatedAt = new Date().toISOString();
      this.saveStore(orders);
      return true;
    }
    return false;
  }

  updateOrderStatus(orderId: string, status: OrderStatus | string, extraMeta?: { courierPartner?: string; trackingId?: string }): PharmacyOrder | null {
    const orders = this.getStore();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (extraMeta) {
      order.courierTracking = {
        carrierName: extraMeta.courierPartner || order.courierTracking?.carrierName || 'Express Courier',
        trackingId: extraMeta.trackingId || order.courierTracking?.trackingId || `TRK-${Date.now()}`
      };
    }

    this.saveStore(orders);
    return order;
  }
}

export const pharmacyOrderService = new PharmacyOrderService();
