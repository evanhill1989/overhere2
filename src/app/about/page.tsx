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
        <div className="bg-accent h-2"></div>

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
          <p>
            Overhere is a lightweight, mobile-first web app that lets users
            discover nearby public places and check in anonymously. Once checked
            in, they can see others at the same location and send a brief
            request to start a real-time, ephemeral conversation. If the request
            is accepted, a short-lived, private messaging window opens — no
            profiles, no history, just real-world connection.
          </p>
          <ul className="text-foreground list-outside space-y-3 pl-6 text-base md:text-lg">
            <li>
              Check in at a shared location, set a quick topic, and see who else
              is around.
            </li>
            <li>
              Send a request to talk if someone’s interest aligns — they can
              accept or ignore.
            </li>
            <li>
              If accepted, chat briefly and decide whether to meet — no
              profiles, no pressure, and it all disappears soon after.
            </li>
          </ul>
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
              <span className="strong bg-accent-foreground font-bold">
                This isn't a dating app.
              </span>
            </li>
            <li>
              Topics Can Help: Adding a clear topic is a great way to find
              someone with whom you'll find common ground.
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
              <span className="strong bg-accent-foreground font-bold">
                {" "}
                you are in real life.
              </span>
              These are other real people who happen to be in the same place as
              you.
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
