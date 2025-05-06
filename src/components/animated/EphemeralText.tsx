// src/components/animated/EphemeralText.tsx
"use client";

import React, { useRef, useMemo, useEffect, useCallback, JSX } from "react"; // <--- Add this line
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// ... (rest of the component code remains the same)

type EphemeralTextProps = {
  text: string;
  tag?: keyof JSX.IntrinsicElements; // This line should be recognized now
  className?: string;
  animateOnMount?: boolean;
  stagger?: number;
  duration?: number;
  yOffset?: number;
  triggerAnimation?: boolean;
};

export function EphemeralText({
  text,
  tag: Tag = "p",
  className,
  animateOnMount = true,
  stagger = 0.03,
  duration = 0.5,
  yOffset = -10,
  triggerAnimation,
}: EphemeralTextProps) {
  // ... (rest of the component code remains the same)

  // Use useRef with a broader type or specific common types
  const containerRef = useRef<HTMLElement>(null);

  const characters = useMemo(
    () =>
      text.split("").map((char, index) => (
        <span
          key={index}
          style={{ display: "inline-block", whiteSpace: "pre" }}
          className="char"
        >
          {char}
        </span>
      )),
    [text]
  );

  const { contextSafe } = useGSAP({ scope: containerRef });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runAnimation = useCallback(
    contextSafe(() => {
      // Changed useMemo to useCallback
      if (containerRef.current?.querySelectorAll) {
        gsap.to(containerRef.current.querySelectorAll(".char"), {
          opacity: 0,
          y: yOffset,
          stagger: stagger,
          duration: duration,
          ease: "power1.inOut",
        });
      } else {
        console.warn(
          "EphemeralText: containerRef not ready or invalid for animation."
        );
      }
    }),

    [contextSafe, stagger, duration, yOffset]
  );

  useEffect(() => {
    if (animateOnMount) {
      runAnimation();
    }
  }, [animateOnMount, runAnimation]);

  useEffect(() => {
    if (triggerAnimation === true) {
      runAnimation();
    }
  }, [triggerAnimation, runAnimation]);

  return (
    // Using HTMLElement for ref type simplifies dynamic tag usage
    <Tag ref={containerRef} className={className}>
      {characters}
    </Tag>
  );
}
