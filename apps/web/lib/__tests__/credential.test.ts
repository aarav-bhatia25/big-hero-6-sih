import assert from 'node:assert';
import { describe, test } from 'node:test';
import { issueCredential, verifyCredential } from '../identity/credential';
import { base58, decodeBase58 } from '../identity/did';

describe('Digital credential proof encoding', () => {
  test('preserves leading zero bytes through Base58 proof encoding', () => {
    const original = Buffer.from([0, 0, 1, 2, 3, 255]);
    assert.deepEqual(decodeBase58(base58(original)), original);
  });

  test('verifies a newly issued signed credential', () => {
    const issued = issueCredential({
      fullName: 'Credential Audit Traveller',
      nationality: 'India',
      nationalityCode: 'IND',
      documentType: 'sandbox_aadhaar',
      maskedDocument: 'XXXX-XXXX-1234',
      subjectHash: 'a'.repeat(64),
    }, 'AUDIT-CREDENTIAL', 'sandbox', true);

    assert.deepEqual(verifyCredential(issued.credential), { valid: true });
  });
});
