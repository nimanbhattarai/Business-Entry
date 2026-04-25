# SoleTrack Database Schema (MongoDB)

## Collections

### users

- `name: string`
- `email: string (unique)`
- `passwordHash: string`
- `role: "admin" | "employee"`
- `createdAt, updatedAt`

### productionentries

- `date: Date`
- `soleType: string`
- `quantity: number`
- `notes: string`
- `createdBy: ObjectId(users)`
- `createdAt, updatedAt`

### saleentries

- `date: Date`
- `customerName: string`
- `quantity: number`
- `pricePerSole: number`
- `paymentMethod: "cash" | "online" | "credit"`
- `isPaid: boolean`
- `createdBy: ObjectId(users)`
- `createdAt, updatedAt`

### materialentries

- `date: Date`
- `rawMaterialName: string`
- `quantityPurchased: number`
- `cost: number`
- `supplierName: string`
- `createdBy: ObjectId(users)`
- `createdAt, updatedAt`

## Suggested Indexes

- `users.email`
- `productionentries.date`
- `saleentries.date`
- `materialentries.date`
- `saleentries.paymentMethod`
