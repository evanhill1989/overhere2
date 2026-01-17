# OverHere

## January

### 01/10/2026

**Plan**
Message Window not closing and opening as expected.
Pull the data out of context in PlaceFinderProvider and let components that need derivedDisplayedPlaces derive it themselves from the cache.

### 01/11/2026

**Plan**

1. Check back in and another record of the person shows up.✅
2. Add unread messages logic.
3. Bug - sometimes request to chat doesn't work, like it doesn't go through at all from one user to the other, but I have always been able to send it the other way(so far) after the initial direction continues to fail. Probably some way to setup a fallback poll that guarantees request is shipped.
4. Setup custom domain.

**Solving for double checkins**
Leaving a place and then checking back in created 2 checkins for the same userID. Had to decide whether to delete old checkinId and and add new one, or just to find and update existing id. Went with updating existing ID because ephemeral messaging data was attached to it, and cleaner just to update, and overall think the idea of users creating multiple checkinIDs in short timespan( <12hours for now, but would tweak in production ) violates the spirit of mirrored realism with real world - if you leave a place and then walk back in 15 minutes later, you're the same person. I think pursuing this mirrored realism preempts a lot of privacy ,anonymity , and system gaming concerns.

**Communicating unread messages**
We already have a read_at timestamp field. We want to mark all existing messages as read when a user opens/views messaging window. create markMessagesAsRead server action

Now we need to create a map of all the unreadCounts attached to a checkinId after querying the db for msgs where read_at IS NULL.

UI integration points -

1. Pass unread counts to checkin card. Add indicator when unreadCount > 0.
2. Messaging window - when window opens call markMessagesAsRead.
3.

### 01/16/26

**unread messages notification bugs**
Brief fixes attempted.

### 01/17/26

**Plan**

1. finish fixes on notifications
2.

So this weird little situation where the state says "Resume Chat" for a currently open messaging window. We could just blindly build up more state on top and fashion a more appropriate state to signify a currently open messaging window.I can already sense the complexity addition not being straightforward as we're moving from managing 2 states to managing 3. But really if we take a step back we see that "Resume chat" is sort of awkward in the first place. Like the user needs the word resume to tell them that clicking on the chat button would resume a chat. All we need is to remove the word resume. And if we really want we could add some subtle styling to distinguish an ongoing "chat(they started)" from a "request to chat"
