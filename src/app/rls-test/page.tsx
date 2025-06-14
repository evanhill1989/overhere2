// // app/rls-test/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@/utils/supabase/client";
// import { Button } from "@/components/ui/button";

// export default function RLSTestPage() {
//   const [user, setUser] = useState<any>(null);
//   const [checkins, setCheckins] = useState<any[]>([]);
//   const [log, setLog] = useState<string[]>([]);

//   const supabase = createClient();

//   useEffect(() => {
//     const fetchUserAndCheckins = async () => {
//       setLog((prev) => [...prev, "Fetching user session..."]);
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();
//       if (userError || !user) {
//         setLog((prev) => [...prev, "Not logged in or error fetching user."]);
//         return;
//       }
//       setUser(user);
//       setLog((prev) => [...prev, `Logged in as ${user.email}`]);

//       const { data: rows, error } = await supabase.from("checkins").select("*");
//       if (error) {
//         setLog((prev) => [...prev, `Error: ${error.message}`]);
//       } else {
//         setCheckins(rows);
//         setLog((prev) => [...prev, `Fetched ${rows.length} checkins.`]);
//       }
//     };

//     fetchUserAndCheckins();
//   }, []);

//   console.log("Full checkin objects:", checkins);

//   return (
//     <div className="mx-auto max-w-xl space-y-4 p-4">
//       <h1 className="text-2xl font-bold">RLS Test Page</h1>
//       <p className="text-muted-foreground text-sm">
//         This page attempts to query the <code>checkins</code> table and log the
//         results.
//       </p>
//       <div className="bg-muted rounded p-3 font-mono text-sm">
//         {log.map((line, idx) => (
//           <div key={idx}>{line}</div>
//         ))}
//       </div>
//       {checkins.length > 0 && (
//         <div>
//           <h2 className="mt-4 text-lg font-semibold">Visible Checkins</h2>
//           <ul className="list-inside list-disc">
//             {checkins.map((c) => (
//               <li key={c.id}>
//                 {c.place_name} ({c.place_id}) – {c.status}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//       {!user && (
//         <Button onClick={() => (window.location.href = "/login")}>
//           Login to Test RLS
//         </Button>
//       )}
//     </div>
//   );
// }
