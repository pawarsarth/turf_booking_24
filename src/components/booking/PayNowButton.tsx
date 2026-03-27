'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  bookingId: string;
  amount: number;
  onSuccess?: () => void;
  redirectToConfirmation?: boolean;
}

declare global {
  interface Window {
    Razorpay: new (o: any) => { open(): void };
  }
}

export function PayNowButton({ bookingId, amount, onSuccess, redirectToConfirmation = true }: Props) {
  const { data: session } = useSession();
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!session) { toast.error('Please login first'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/payment/create-order', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error||'Failed to create order'); setLoading(false); return; }

      const options = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount:      data.data.amount * 100,
        currency:    'INR',
        name:        'TurfBook',
        description: `Booking: ${data.data.turfName}`,
        order_id:    data.data.orderId,
        handler: async (response: any) => {
          try {
            const vRes  = await fetch('/api/payment/verify', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ bookingId, ...response })
            });
            const vData = await vRes.json();
            if (vData.success) {
              toast.success('🎉 Payment successful! Booking confirmed.');
              if (redirectToConfirmation) {
                router.push(`/booking/confirmation?bookingId=${bookingId}`);
              } else {
                onSuccess?.();
              }
            } else {
              toast.error('Payment verification failed. Contact support.');
            }
          } catch {
            toast.error('Verification error. Contact support.');
          }
        },
        prefill:  { name:session.user.name||'', email:session.user.email||'' },
        theme:    { color:'#00ff87' },
        modal:    { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Payment failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="btn-primary"
      style={{ padding:'10px 24px', fontSize:14, display:'inline-flex', alignItems:'center', gap:8 }}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'#050510', display:'inline-block' }} />
          Processing...
        </>
      ) : (
        `💳 Pay ₹${amount.toLocaleString('en-IN')}`
      )}
    </button>
  );
}
