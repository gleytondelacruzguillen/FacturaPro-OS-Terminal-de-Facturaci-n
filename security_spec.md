# Security Specification for FacturaPro

## 1. Data Invariants
- An invoice must belong to a registered user (`userId`).
- An invoice total must be the sum of its items' subtotals (minus discount, plus tax).
- Stock cannot be negative (business rule, though for flexibility some might allow it, I'll enforce non-negative for this "professional" app).
- Users can only read and write their own data (`/users/{userId}/...`).
- Invoice numbers should ideally increment, but we'll enforce they are positive integers.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Theft**: User A tries to create a client in User B's subcollection.
2. **PII Breach**: User A tries to read User B's settings.
3. **Invalid Total**: An invoice where `items[0].subtotal` is 100 but `total` is 50.
4. **Negative Price**: A product with price -50.
5. **Unauthorized Status Change**: A non-owner trying to change an invoice status.
6. **Shadow Fields**: Creating a client with a hidden `isAdmin: true` field.
7. **Malformed ID**: Using a 2KB string as a `clientId`.
8. **Invalid Enum**: `paymentType` set to "Bitcoin" (not in allowed list).
9. **Missing Required Field**: Product created without a `price`.
10. **Timestamp Spoof**: Creating an invoice with a `createdAt` in 2030.
11. **Orphaned Invoice**: Creating an invoice for a userId that doesn't exist (if we had a users collection, we'd check exists).
12. **Infinite Array**: An invoice with 10,000 items (resource exhaustion).

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify that all the above 12 scenarios result in `PERMISSION_DENIED` and that valid user operations are allowed.
