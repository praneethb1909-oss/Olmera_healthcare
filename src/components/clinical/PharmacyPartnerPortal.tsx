import { useState, useEffect } from 'react';
import { 
  Pill, Truck, CheckCircle2, Clock, ShieldCheck, 
  MapPin, RefreshCw, KeyRound, AlertCircle, ShoppingBag 
} from 'lucide-react';
import { 
  pharmacyOrderService, 
  PharmacyOrder 
} from '../../services/clinical/pharmacyOrderService';

export function PharmacyPartnerPortal() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [otpInput, setOtpInput] = useState('');
  const [courierName, setCourierName] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const reloadOrders = () => {
    const list = pharmacyOrderService.getOrders();
    setOrders(list);
    if (!selectedOrder && list.length > 0) {
      setSelectedOrder(list[0]);
    } else if (selectedOrder) {
      const refreshed = list.find(o => o.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
  };

  useEffect(() => {
    reloadOrders();
  }, []);

  const handleVerifyPickupOtp = () => {
    if (!selectedOrder) return;
    setOtpError(null);
    const success = pharmacyOrderService.verifyPickupOtp(selectedOrder.id, otpInput.trim());
    if (success) {
      setToastMessage(`OTP Verified! Medicines dispensed to ${selectedOrder.patientName}.`);
      setOtpInput('');
      reloadOrders();
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setOtpError('Invalid pickup OTP. Please cross-check patient code.');
    }
  };

  const handleUpdateDeliveryStatus = (status: PharmacyOrder['status']) => {
    if (!selectedOrder) return;
    pharmacyOrderService.updateOrderStatus(selectedOrder.id, status, {
      courierPartner: courierName,
      trackingId: trackingNumber || `BD-${Math.floor(100000 + Math.random() * 900000)}`
    });
    setToastMessage(`Order status updated to: ${status.replace(/_/g, ' ').toUpperCase()}`);
    reloadOrders();
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = orders.filter(o => {
    if (filterType === 'all') return true;
    return o.fulfillmentType === filterType;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              Network Pharmacy Partner Console
            </span>
            <span className="text-xs text-[var(--color-muted)]">• MedPlus & Apollo Network</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]">
            Prescription Dispensing & Fulfillment Center
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Verify counter pickup security codes, manage home delivery courier dispatch, and record medication fulfillment.
          </p>
        </div>

        <button
          onClick={reloadOrders}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-surface-subtle)] min-h-[44px] transition-colors self-start md:self-auto"
        >
          <RefreshCw size={14} /> Refresh Order Stream
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Orders Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)]">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Fulfillment Type:</span>
            <div className="flex gap-1">
              {(['all', 'delivery', 'pickup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize min-h-[34px] transition-colors ${
                    filterType === t
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-line)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[var(--color-ink)]">{order.patientName}</h4>
                        <span className="text-[10px] font-mono text-[var(--color-muted)]">{order.patientPhone}</span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">
                        {order.items.length} prescribed items • ₹{order.totalAmount}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[var(--color-ink)] flex items-center gap-1">
                      {order.fulfillmentType === 'delivery' ? <Truck size={10} /> : <ShoppingBag size={10} />}
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-line)]">
                    <span>Order #{order.id}</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Verification & Dispatch Console (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-5 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Order #{selectedOrder.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] capitalize">
                      {selectedOrder.fulfillmentType}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                    {selectedOrder.patientName}
                  </h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Phone: {selectedOrder.patientPhone}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[var(--color-muted)]">Total Billable:</span>
                  <p className="text-xl font-bold font-display text-[var(--color-primary)]">₹{selectedOrder.totalAmount}</p>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Paid Online</span>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
                  <Pill size={14} className="text-[var(--color-primary)]" /> Prescribed Medications
                </span>
                <div className="rounded-xl border border-[var(--color-line)] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-line)]">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-semibold text-[var(--color-muted)]">Medicine</th>
                        <th className="py-2.5 px-3 text-left font-semibold text-[var(--color-muted)]">Dosage</th>
                        <th className="py-2.5 px-3 text-center font-semibold text-[var(--color-muted)]">Qty</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-[var(--color-muted)]">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={item.medicineId || idx} className="hover:bg-[var(--color-surface-subtle)]/50">
                          <td className="py-2 px-3 font-semibold text-[var(--color-ink)]">{item.name || item.medicationName}</td>
                          <td className="py-2 px-3 text-[var(--color-muted)]">{item.dosage}</td>
                          <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">₹{item.totalPrice || ((item.price || item.unitPrice || 0) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery or Pickup Specific Action Panels */}
              {selectedOrder.fulfillmentType === 'pickup' ? (
                <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                    <KeyRound size={15} /> Counter Pickup Security Check (OTP)
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Ask patient for their 6-digit confirmation code shown on their Olmera health dashboard to dispense.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="p-3 text-center tracking-widest font-mono text-sm font-bold rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] w-48 focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPickupOtp}
                      disabled={otpInput.length < 6}
                      className="px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider min-h-[44px] hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck size={15} /> Verify & Dispense
                    </button>
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle size={13} /> {otpError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                    <Truck size={15} /> Home Delivery Courier Dispatch
                  </div>
                  <div className="text-xs text-[var(--color-muted)] flex items-start gap-1.5">
                    <MapPin size={14} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                    <span>{selectedOrder.deliveryAddress || 'Patient Address on file'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <input
                      type="text"
                      value={courierName}
                      onChange={e => setCourierName(e.target.value)}
                      placeholder="Courier Partner"
                      className="p-2.5 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
                    />
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="Tracking Number"
                      className="p-2.5 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateDeliveryStatus('out_for_delivery')}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-primary-subtle)] min-h-[40px] transition-all"
                    >
                      Mark Out for Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateDeliveryStatus('delivered')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-95 min-h-[40px] transition-all"
                    >
                      Confirm Delivered
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-muted)] text-xs">
              Select an order from the list to inspect prescription lines and fulfill medication delivery.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
