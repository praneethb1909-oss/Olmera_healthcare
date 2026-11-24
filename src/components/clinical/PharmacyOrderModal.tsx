import React, { useState } from 'react';
import { 
  Pill, Truck, Store, X, CheckCircle2, ShieldCheck, 
  MapPin, Clock, ArrowRight, Receipt, AlertCircle 
} from 'lucide-react';
import { 
  pharmacyOrderService, 
  NETWORK_PHARMACIES, 
  FulfillmentType, 
  PharmacyOrder, 
  OrderItem 
} from '../../services/clinical/pharmacyOrderService';
import { useAuth } from '../../contexts/AuthContext';

interface PharmacyOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionItems?: Array<{ name: string; dosage: string }>;
  onOrderSuccess?: (order: PharmacyOrder) => void;
}

export function PharmacyOrderModal({ 
  isOpen, 
  onClose, 
  prescriptionItems = [],
  onOrderSuccess 
}: PharmacyOrderModalProps) {
  const { user } = useAuth();
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('home_delivery');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(NETWORK_PHARMACIES[0].id);
  const [address, setAddress] = useState({
    street: 'Plot 42, Sunrise Colony',
    city: 'Rajam',
    postalCode: '532127',
    landmark: 'Opposite GMR Care Gate'
  });
  const [phone, setPhone] = useState('+91 94401 23456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PharmacyOrder | null>(null);

  if (!isOpen) return null;

  // Prepare ordered items from prescription
  const items: OrderItem[] = (prescriptionItems.length > 0 ? prescriptionItems : [
    { name: 'Telmisartan 40mg', dosage: '1 tab daily' },
    { name: 'Metformin 500mg SR', dosage: '1 tab twice daily' }
  ]).map((p, idx) => ({
    medicationName: p.name,
    dosage: p.dosage,
    quantity: 30,
    unitPrice: 8 + (idx * 4),
    totalPrice: (8 + (idx * 4)) * 30
  }));

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = fulfillmentType === 'home_delivery' ? 40 : 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + deliveryFee + tax;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const order = pharmacyOrderService.createOrder({
        patientId: user.uid,
        patientName: user.displayName || 'Demo Patient',
        patientPhone: phone,
        fulfillmentType,
        items,
        deliveryAddress: fulfillmentType === 'home_delivery' ? address : undefined,
        pickupPharmacyId: fulfillmentType === 'pharmacy_pickup' ? selectedPharmacyId : undefined
      });

      setIsSubmitting(false);
      setPlacedOrder(order);
      if (onOrderSuccess) onOrderSuccess(order);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 font-ui">
      <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-xl rounded-3xl shadow-2xl border border-[var(--color-line)] max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Pill size={20} className="text-[var(--color-mist)]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">
                Prescription Fulfillment & Dispensing
              </h3>
              <p className="text-xs text-[var(--color-mist)] mt-0.5">
                Verified dispensing via accredited Olmera Care network pharmacies
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {placedOrder ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                  Order Successfully Placed!
                </h4>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Order Reference: <strong className="font-mono text-[var(--color-ink)]">{placedOrder.id}</strong>
                </p>
              </div>

              <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Fulfillment:</span>
                  <span className="font-semibold capitalize">{placedOrder.fulfillmentType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Status:</span>
                  <span className="font-semibold text-[var(--color-primary)]">Verified by Pharmacist</span>
                </div>
                {placedOrder.fulfillmentType === 'home_delivery' ? (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted)]">Courier Partner:</span>
                    <span className="font-semibold">{placedOrder.courierTracking?.carrierName}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted)]">Pickup OTP:</span>
                    <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
                      {placedOrder.pickupPharmacy?.pickupOtp}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--color-line)] font-bold text-sm">
                  <span>Total Amount:</span>
                  <span>₹{placedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn-primary w-full py-2.5 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              
              {/* Fulfillment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Choose Fulfillment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      fulfillmentType === 'home_delivery'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <Truck size={20} className={fulfillmentType === 'home_delivery' ? 'text-[var(--color-primary)]' : 'text-slate-400'} />
                    <div>
                      <span className="font-semibold text-xs text-[var(--color-ink)] block">Doorstep Delivery</span>
                      <span className="text-[10px] text-[var(--color-muted)]">Direct express home drop (+₹40)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pharmacy_pickup')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      fulfillmentType === 'pharmacy_pickup'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <Store size={20} className={fulfillmentType === 'pharmacy_pickup' ? 'text-[var(--color-primary)]' : 'text-slate-400'} />
                    <div>
                      <span className="font-semibold text-xs text-[var(--color-ink)] block">Pharmacy Pickup</span>
                      <span className="text-[10px] text-[var(--color-muted)]">Collect with secret OTP (Free)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Prescription Items ({items.length})
                </label>
                <div className="p-3 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl space-y-2 max-h-40 overflow-y-auto">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-[var(--color-ink)]">{item.medicationName}</span>
                        <span className="text-[10px] text-[var(--color-muted)] block">Qty: {item.quantity} • {item.dosage}</span>
                      </div>
                      <span className="font-semibold text-[var(--color-ink)]">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conditional Location / Pharmacy Details */}
              {fulfillmentType === 'home_delivery' ? (
                <div className="space-y-3 p-4 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                    <MapPin size={14} className="text-[var(--color-primary)]" /> Delivery Destination Address
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      placeholder="Street / Flat"
                      className="input-field col-span-2 text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City"
                      className="input-field text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      placeholder="Postal PIN"
                      className="input-field text-xs"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                    <Store size={14} className="text-[var(--color-primary)]" /> Select Network Dispensary
                  </label>
                  <select
                    value={selectedPharmacyId}
                    onChange={(e) => setSelectedPharmacyId(e.target.value)}
                    className="input-field w-full text-xs font-semibold"
                  >
                    {NETWORK_PHARMACIES.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.hours})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bill Summary */}
              <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl text-xs space-y-1.5">
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Medicines Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Fulfillment & Delivery:</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Applicable GST (5%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[var(--color-ink)] pt-1.5 border-t border-[var(--color-line)]">
                  <span>Total Payable:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[var(--color-line)] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-6 py-2.5 text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmitting ? 'Processing...' : 'Confirm Prescription Order'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-surface-subtle)] border-t border-[var(--color-line)] flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Accredited Pharmacy Dispensing Network</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)] rounded-xl font-semibold hover:bg-[var(--color-surface-subtle)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
