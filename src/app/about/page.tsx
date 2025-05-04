import React from "react";

// Define an interface or type for your props (empty for now)
// interface AboutPageProps {} // Use if props are needed later

// Type the function directly
export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
      <article className="prose prose-sm md:prose-lg lg:prose-xl mx-auto text-muted-foreground">
        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center text-foreground">
          Talk to people
        </h1>

        {/* Paragraph 1: Short Introductory Section - Unchanged */}
        <p className="text-lg md:text-xl text-center mb-10 text-muted-foreground">
          We're inspired by spontaneous, real-world connection, offering a
          simple alternative to purely digital interactions. Overhere provides a
          private way to discover who nearby might be open to chatting{" "}
          <i>right now</i>. It's about making it a little easier to break the
          ice and spark a genuine conversation.
        </p>

        {/* Longer Detailed Section - NEW STRUCTURE */}
        <section className="space-y-6 text-base md:text-lg text-foreground">
          {/* Paragraph 2: NEW User Story */}
          <p>
            Picture this: you're grabbing coffee alone, enjoying the buzz of the
            cafe. You glance around – maybe others feel like a brief chat too, a
            simple break from their screens or thoughts. But how do you know?
            Approaching strangers randomly feels inefficient, maybe even
            intrusive. And initiating conversation can feel loaded, potentially
            sending signals beyond just wanting a friendly, platonic chat. It’s
            a common hurdle – wanting connection but lacking a smooth,
            low-stakes way to find it.
          </p>

          {/* Paragraph 3: NEW Features/Philosophy Summary */}
          <p>
            That's the gap Overhere fills. It’s a different approach focused on
            enabling low-pressure, platonic moments. We prioritize your privacy
            and comfort: there are no public profiles to browse, and connections
            are made anonymously with a person verified to be at your location.
            You connect based on a shared, simple topic interest you both select
            for that moment. Think of it as a temporary digital nod that
            disappears without leaving a trace in chat history or saved
            connections.
          </p>
        </section>
        {/* Section 2: How does it work? - NEW */}
        <section className="mb-12">
          {" "}
          {/* Added mb-12 for spacing */}
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-foreground">
            How does it work?
          </h2>
          <ol className="list-decimal list-outside pl-6 space-y-3 text-base md:text-lg text-foreground">
            <li>
              Check In: When you're at a location (like a cafe, bar, park, or
              co-working space) and open to a potential chat, check into that
              specific place via the app. This verifies your presence.
            </li>
            <li>
              Set Your Status (Optional): You can indicate if you're generally
              'available' or 'busy' and optionally add a simple topic (e.g.,
              "local events," "reading," "tech") to hint at what you might like
              to chat about.
            </li>
            <li>
              Discover Anonymously: The app shows if other checked-in users are
              nearby and available, but without revealing profiles or
              identities. You might see counts or topic interests.
            </li>
            <li>
              Signal Interest: If you want to potentially chat, you send out a
              signal. The app may connect you randomly with another available
              user or someone interested in the same topic.
            </li>
            <li>
              Connect (If Accepted): The other user receives your anonymous
              request and can accept or ignore it. If they accept, a temporary,
              minimal chat opens.
            </li>
            <li>
              Break the Ice Briefly: Use the chat for a quick "Hello!" and to
              arrange the real-world meeting (e.g., "Hey, I'm by the window with
              the green laptop, want to chat for a bit?").
            </li>
            <li>
              Meet IRL: The goal! Move your conversation offline into the real
              world.
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-foreground">
            Useful tips
          </h2>
          <ul className="list-disc list-outside pl-6 space-y-3 text-base md:text-lg text-foreground">
            <li>
              Be Present & Ready: Check in when you genuinely have some time and
              are open to a conversation relatively soon.
            </li>
            <li>
              Keep it Light & Platonic: Remember, the aim is a casual, friendly,
              low-pressure interaction. This isn't a dating app.
            </li>
            <li>
              Topics Can Help: Adding a simple topic can be a great, low-stakes
              way to find common ground for an initial chat.
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
              Respect Boundaries: If someone doesn't accept a chat request or
              respond, simply respect their choice.
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
