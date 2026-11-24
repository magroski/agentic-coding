import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceTotal } from '../src/invoice.js';

test('sums quantity times unit price', () => {
  assert.equal(invoiceTotal([{ qty: 2, unitPrice: 10 }, { qty: 1, unitPrice: 5 }]), 25);
});
