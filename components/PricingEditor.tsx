'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PricingEditorProps = {
  isPaid: boolean;
  priceMonthlyCents: number | null;
  hasStripeAccount: boolean;
};

export default function PricingEditor({
  isPaid,
  priceMonthlyCents,
  hasStripeAccount,
}: PricingEditorProps) {
  const [paid, setPaid] = useState(isPaid);
  const [priceDollars, setPriceDollars] = useState(
    priceMonthlyCents != null ? (priceMonthlyCents / 100).toFixed(2) : ''
  );

  const priceCents = priceDollars
    ? Math.round(parseFloat(priceDollars) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          checked={paid}
          onCheckedChange={(checked) => setPaid(checked)}
          disabled={!hasStripeAccount}
        />
        <Label>{paid ? 'Paid' : 'Free'}</Label>
      </div>

      {!hasStripeAccount && (
        <p className="text-sm text-amber-600">
          Connect Stripe to enable paid programs
        </p>
      )}

      {paid && hasStripeAccount && (
        <div className="space-y-2">
          <Label htmlFor="price-dollars">Monthly Price (USD)</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <Input
              id="price-dollars"
              type="number"
              min="0"
              step="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="0.00"
              className="max-w-[160px]"
            />
          </div>
        </div>
      )}

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="is_paid" value={paid ? 'true' : 'false'} />
      <input
        type="hidden"
        name="price_monthly_cents"
        value={paid ? String(priceCents) : '0'}
      />
    </div>
  );
}
