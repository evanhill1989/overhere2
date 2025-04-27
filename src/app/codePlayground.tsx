// // Inside submitCheckIn action...
// try {
//     // ... find existingCheckin ...

//     if (existingCheckin) {
//         // --- UPDATE Existing Check-in ---
//         console.log(`ACTION: Attempting to UPDATE checkin ID ${existingCheckin.id} for user ${userKindeId}`); // Log before
//         const updateResult = await db.update(checkinsTable).set({ /* ... data ... */ }).where(eq(checkinsTable.id, existingCheckin.id)).returning({ id: checkinsTable.id });
//         console.log(`ACTION: Update Result:`, updateResult); // Log after

//         if (!updateResult?.[0]?.id) throw new Error("Database update failed.");
//         checkinId = updateResult[0].id;
//         operationType = 'update';

//     } else {
//         // --- INSERT New Check-in ---
//         console.log(`ACTION: Attempting to INSERT new checkin for user ${userKindeId} at place ${placeDetails.id}`); // Log before
//         const newCheckinData: InsertCheckin = { /* ... data ... */ };
//         const insertResult = await db.insert(checkinsTable).values(newCheckinData).returning({ id: checkinsTable.id });
//         console.log(`ACTION: Insert Result:`, insertResult); // Log after

//          if (!insertResult?.[0]?.id) throw new Error("Database insertion failed.");
//         checkinId = insertResult[0].id;
//         operationType = 'insert';
//     }
// } catch (error: unknown) {
//     console.error(`ACTION: Check-in DB operation failed:`, error); // Ensure catch logs error
//     // ... return error ...
// }
// // ... logging success & redirect ...
