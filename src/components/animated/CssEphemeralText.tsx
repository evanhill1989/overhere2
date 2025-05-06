// src/components/animated/CssEphemeralText.tsx
"use client";

import React, { JSX } from "react";
import "./CssEphemeralText.css"; // We'll create this CSS file next

interface CssEphemeralTextProps {
  text: string;
  animateOut: boolean; // Prop to trigger the animation
  staggerDelay?: number; // Base delay between each character in seconds
  charAnimationDuration?: number; // Duration of each character's animation
  className?: string;
  tag?: keyof JSX.IntrinsicElements; // e.g., 'p', 'div', 'span'
}

export function CssEphemeralText({
  text,
  animateOut,
  staggerDelay = 0.05,
  charAnimationDuration = 0.5,
  className = "",
  tag: Tag = "p", // Default to a paragraph tag
}: CssEphemeralTextProps) {
  return (
    <Tag
      className={`ephemeral-text-container ${
        animateOut ? "animate-out-active" : ""
      } ${className}`}
      // Add a key that changes when text changes to ensure spans re-render if text content is dynamic
      // and you want animations to reset cleanly for new text. For a fixed text that just animates out,
      // this might not be strictly necessary just for the animation itself.
      key={text}
    >
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="ephemeral-char"
          style={
            animateOut
              ? {
                  animationDelay: `${index * staggerDelay}s`,
                  animationDuration: `${charAnimationDuration}s`,
                }
              : {
                  opacity: 1, // Explicitly set opacity to 1 if not animating out
                  transform: "translateY(0)",
                }
          }
        >
          {char === " " ? "\u00A0" : char}{" "}
          {/* Render non-breaking space for spaces */}
        </span>
      ))}
    </Tag>
  );
}
