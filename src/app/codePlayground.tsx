// // Inside the return statement of CheckinAndChatController:

//   // ... (Error message display logic remains the same) ...

//   {/* List of Other Users / Check-ins */}
//   <div>
//     <h2 className="text-xl font-semibold mb-3 dark:text-white">
//       Checked In Nearby
//     </h2>

//     {/* ... ("No one else checked in" message remains the same) ... */}

//     {otherCheckins.length > 0 && (
//       <ul className="space-y-3">
//         {otherCheckins.map((checkin) => {
//           // --- Determine the state relative to this specific checkin ---

//           // 1. Is an outgoing request pending TO this person?
//           const pendingOutgoing = pendingOutgoingRequests.find( // Use find to get the specific request if needed later
//             (req) => req.receiverCheckinId === checkin.id
//           );
//           const isPendingOutgoing = !!pendingOutgoing;

//           // 2. Is there an incoming request FROM this person?
//           // Use the renamed state 'incomingRequests' if you renamed it
//           const incomingRequest = incomingRequests.find(
//             (req) => req.initiator_checkin_id === checkin.id
//           );

//           // --- End State Determination ---

//           return (
//             <li
//               key={checkin.id}
//               className={`p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center transition-opacity ${
//                 // Dim others slightly only when initiating a *new* connection
//                 isLoadingConnection && !isPendingOutgoing && !incomingRequest
//                   ? "opacity-60 pointer-events-none"
//                   : ""
//               }`}
//             >
//               {/* Display User Info (Status/Topic) - unchanged */}
//               <div>
//                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${ checkin.status === "available" ? /* green */ : /* red */ }`}>
//                    {checkin.status === "available" ? "Available" : "Busy"}
//                  </span>
//                  {checkin.topic ? ( <span className="text-gray-800 dark:text-gray-200 italic">{checkin.topic}</span>) : ( <span className="text-gray-500 dark:text-gray-400">Open to connect</span>)}
//               </div>

//               {/* --- Conditional Action Buttons --- */}
//               <div className="flex gap-x-2"> {/* Use gap for spacing */}
//                 {/* Case 1: Incoming Request from this user */}
//                 {incomingRequest && (
//                   <>
//                     <Button
//                        variant="outline" // Example style (adjust)
//                        size="sm" // Example size
//                        onClick={() => handleAcceptConnection(incomingRequest)}
//                        disabled={isLoadingConnection}
//                     >
//                       Accept
//                     </Button>
//                     <Button
//                        variant="ghost" // Example style (adjust)
//                        size="sm"
//                        onClick={() => handleDismissRequest(incomingRequest)}
//                        disabled={isLoadingConnection}
//                     >
//                       Dismiss
//                     </Button>
//                   </>
//                 )}

//                 {/* Case 2: Outgoing Request is Pending to this user */}
//                 {!incomingRequest && isPendingOutgoing && (
//                   <Button
//                     disabled={true}
//                     variant="secondary" // Example style
//                     size="sm"
//                     className="cursor-default"
//                   >
//                     Request Pending
//                   </Button>
//                 )}

//                 {/* Case 3: User is Available, no pending/incoming requests */}
//                 {!incomingRequest && !isPendingOutgoing && checkin.status === "available" && (
//                   <Button
//                      variant="default" // Example style (adjust to match your primary button)
//                      size="sm"
//                     onClick={() => handleInitiateConnection(checkin)}
//                     disabled={isLoadingConnection || !currentUserCheckinId}
//                     title={!currentUserCheckinId ? "Check in to connect" : "Send connection request"}
//                   >
//                     {isLoadingConnection ? "Sending..." : "Connect"}
//                   </Button> ""
//                 )}

//                  {/* Case 4: User is Busy, no pending/incoming requests */}
//                  {!incomingRequest && !isPendingOutgoing && checkin.status === 'busy' && (
//                     <span className="px-3 py-1 text-gray-500 text-sm italic">Busy</span>
//                  )}
//               </div>
//               {/* --- End Conditional Action Buttons --- */}
//             </li>
//           );
//         })}
//       </ul>
//     )}
//   </div>
