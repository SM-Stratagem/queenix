'use client';

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { formatAed } from './OverviewCards';
import { btn, field } from './ui';
import { errMsg } from '@/lib/errors';
import { financeRefs } from '../../app/finance/api';

export type PayoutRow = {
  _id: string;
  recipientName: string;
  method: string;
  status: string;
  amountCents?: number;
  createdAt: number;
};

/** Payout list with approve/cancel for pending ones, plus a record form. */
export function PayoutsSection({
  payouts,
  notify,
}: {
  payouts: PayoutRow[] | undefined;
  notify: (msg: string) => void;
}) {
  const [payoutName, setPayoutName] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const recordPayout = useMutation(financeRefs.recordPayout);
  const decidePayout = useMutation(financeRefs.decidePayout);
  const payoutList = payouts ?? [];

  async function handleDecidePayout(payoutId: string, decision: 'paid' | 'cancelled') {
    try {
      await decidePayout({ payoutId, decision });
      notify(decision === 'paid' ? 'Payout marked as paid.' : 'Payout cancelled.');
    } catch (e) {
      notify(errMsg(e, 'Payout decision failed.'));
    }
  }

  async function handlePayout() {
    const cents = Math.round(Number(payoutAmount) * 100);
    if (!payoutName.trim() || !Number.isFinite(cents) || cents <= 0) {
      notify('Enter a recipient and a positive AED amount.');
      return;
    }
    try {
      await recordPayout({
        recipientName: payoutName.trim(),
        amountCents: cents,
        currency: 'AED',
        method: payoutMethod,
      });
      notify('Payout recorded as pending.');
      setPayoutName('');
      setPayoutAmount('');
    } catch (e) {
      notify(errMsg(e, 'Payout failed.'));
    }
  }

  return (
    <YStack gap={8}>
      <Text fontSize={18} fontWeight="700">
        Payouts
      </Text>
      {payoutList.length === 0 ? (
        <Text fontSize={13} opacity={0.6}>
          {payouts === undefined ? 'Loading payouts…' : 'No payouts recorded yet.'}
        </Text>
      ) : (
        <YStack gap={8}>
          {payoutList.map((p) => (
            <XStack
              key={String(p._id)}
              gap={12}
              padding={12}
              borderRadius={10}
              borderWidth={1}
              borderColor="$borderColor"
              alignItems="center"
            >
              <YStack flex={2} gap={2}>
                <Text fontSize={14} fontWeight="600">
                  {p.recipientName}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {p.method} · {p.status} · {new Date(p.createdAt).toLocaleDateString('en-AE')}
                </Text>
              </YStack>
              <Text fontSize={14} fontWeight="700">
                {formatAed(p.amountCents ?? 0)}
              </Text>
              {p.status === 'pending' && (
                <XStack gap={6}>
                  <button onClick={() => handleDecidePayout(String(p._id), 'paid')} style={btn.success}>
                    Mark paid
                  </button>
                  <button onClick={() => handleDecidePayout(String(p._id), 'cancelled')} style={{ ...btn.danger, fontSize: 12 }}>
                    Cancel
                  </button>
                </XStack>
              )}
            </XStack>
          ))}
        </YStack>
      )}
      <XStack gap={8} flexWrap="wrap" alignItems="center">
        <input
          placeholder="Recipient name"
          aria-label="Recipient name"
          value={payoutName}
          onChange={(e) => setPayoutName(e.target.value)}
          style={field}
        />
        <input
          placeholder="Amount (AED)"
          aria-label="Payout amount (AED)"
          value={payoutAmount}
          onChange={(e) => setPayoutAmount(e.target.value)}
          inputMode="decimal"
          style={{ ...field, width: 140 }}
        />
        <select aria-label="Payout method" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
        </select>
        <button onClick={handlePayout} style={btn.primary}>
          Record payout
        </button>
      </XStack>
    </YStack>
  );
}
