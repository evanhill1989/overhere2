import React from "react";

// Define an interface or type for your props (empty for now)
// interface AboutPageProps {} // Use if props are needed later

// Type the function directly
export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
      <article className="prose prose-sm md:prose-lg lg:prose-xl text-muted-foreground mx-auto">
        {/* Main Heading */}
        <h1 className="text-foreground mb-6 text-center text-4xl font-bold md:text-5xl">
          Talk to people
        </h1>

        {/* Longer Detailed Section - NEW STRUCTURE */}
        <section className="text-foreground space-y-6 text-base md:text-lg">
          {/* Paragraph 2: NEW User Story */}
          <p>
            Picture this: you're grabbing coffee alone, enjoying the buzz of the
            cafe, and suddenly you're in the mood to talk. Approaching strangers
            randomly feels inefficient and intrusive. It’s a common hurdle –
            wanting connection but lacking a smooth, low-stakes way to find it.
          </p>

          {/* Paragraph 3: NEW Features/Philosophy Summary */}
          <p>
            That's the gap Overhere fills. Overhere enables low-pressure,
            platonic introduction. We prioritize your privacy and comfort: there
            are no public profiles to browse, and connections are made
            anonymously with a person verified to be at your location. You can
            connect based on a specific topic , or with someone looking for a
            general chat. Think of it as a temporary digital nod that disappears
            without leaving a trace in chat history or saved connections.
          </p>
        </section>
        {/* Section 2: How does it work? - NEW */}
        <section className="mb-12">
          {" "}
          {/* Added mb-12 for spacing */}
          <h2 className="text-foreground mb-4 text-2xl font-semibold md:text-3xl">
            How does it work?
          </h2>
          <ol className="text-foreground list-outside list-decimal space-y-3 pl-6 text-base md:text-lg">
            <li>
              Check In: When you're at a location (like a cafe, bar, park, or
              co-working space) and looking to talk, check into that specific
              place via the app. This verifies your presence.
            </li>
            <li>
              Set Your Status: You can indicate if you're generally 'available'
              or 'busy' and add a topic (e.g., "local events," "reading,"
              "tech") about which you are interested in talking.
            </li>
            <li>
              Discover Anonymously: The app shows when other people are
              checked-in where you are and what their topical interests are.
            </li>
            <li>
              Signal Interest: If you want to potentially talk with a user, you
              send a request to message.
            </li>
            <li>
              Connect (If Accepted): The other user receives your request and
              can accept or ignore it. If they accept, a messaging window opens.
            </li>
            <li>
              Break the Ice : Use messages to introduce yourself and decide if
              you're interested in talking face to face.
            </li>
            <li>
              <strong>Don't meet them</strong>: No hard feelings! If you don't
              want to meet them, you can just end the chat. There are no user
              names, no profiles, no pictures, no way of knowing who it is in
              the room you are messaging, and they won't know who you are
              either. The only identifier is the topic interest you gave when
              you checked in.
            </li>
            <li>
              <strong>Meet them!</strong>: The goal! Move your conversation
              offline into the real world.
            </li>
            <li>
              It Disappears: The chat session and the connection record are
              temporary and vanish shortly after, leaving no digital trail
              within the app.
            </li>
          </ol>
        </section>

        {/* Section 3: Useful tips - NEW */}
        <section>
          <h2 className="text-foreground mb-4 text-2xl font-semibold md:text-3xl">
            Useful tips
          </h2>
          <ul className="text-foreground list-outside list-disc space-y-3 pl-6 text-base md:text-lg">
            <li>
              Be Present & Ready: Check in when you genuinely have some time and
              are open to a conversation relatively soon.
            </li>
            <li>
              Keep it Light & Platonic: Remember, the aim is a casual, friendly,
              low-pressure interaction.{" "}
              <strong>This isn't a dating app.</strong>
            </li>
            <li>
              Topics Can Help: Adding a simple topic is a great way to find
              common ground.
            </li>
            <li>
              Define clear parameters via messaging: If you are looking for a
              specific topic of conversation, clarify details to make sure
              you're both on the same page. Other things to consider going over
              in messages:
              <ul className="list-disc space-y-2 pl-6">
                <li>How long you want to talk?</li>
                <li>
                  Whether you want to talk to members of the opposite sex?
                </li>
                <li>What topics don't you want to talk about?</li>
              </ul>
            </li>
            <li>
              Be Patient: Connection depends on others being checked in,
              available, and accepting. Don't be discouraged if it doesn't
              happen instantly.
            </li>
            <li>
              Move Offline Quickly: Use the in-app chat just for the initial
              greeting and coordination. The real connection happens
              face-to-face.
            </li>
            <li>
              Safety First: As with any real-world interaction, be mindful of
              your surroundings, meet in comfortable public settings, and trust
              your intuition.
            </li>
            <li>
              Behave like you would in real life because{" "}
              <strong> you are in real life</strong>. These are other real
              people who happen to be in the same place as you.
            </li>
            <li>
              It's Just an Opener: Think of Overhere as just the very first step
              – breaking the initial barrier. The rest of the conversation is up
              to you!
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
