//  setDisplayedCheckins(prevCheckins => {
//     console.log(`--- setDisplayedCheckins (UPDATE for ID ${transformedCheckin.id}) ---`);
//     // Log the IDs currently in state BEFORE the update
//     console.log(`   Prev state IDs (${prevCheckins.length} items):`, prevCheckins.map(c => c.id));
//     // Check if the ID we want to update actually exists in the previous state
//     const foundIndex = prevCheckins.findIndex(c => c.id === transformedCheckin.id);
//     console.log(`   Checkin ID ${transformedCheckin.id} found in prev state at index: ${foundIndex}`); // <<< CRITICAL LOG

//     // Only proceed if found, otherwise log a warning
//     if (foundIndex === -1) {
//         console.warn(`   CANNOT UPDATE: Checkin ID ${transformedCheckin.id} not found in previous state array.`);
//         return prevCheckins; // Return unchanged state
//     }

//     // If found, map to update
//     const newState = prevCheckins.map(c =>
//       c.id === transformedCheckin.id ? transformedCheckin : c
//     );
//     console.log(`   UPDATING: New state IDs (${newState.length} items):`, newState.map(c => c.id));
//     console.log(`--- End setDisplayedCheckins (UPDATE) ---`);
//     return newState;
//   });
//   // --- End Logs ---
