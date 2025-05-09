import React, {
  useRef,
  ElementType,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

// Define the props for your component, making it generic over the tag type T
interface EphemeralTextProps<T extends ElementType = "span"> {
  // Default to 'span' if not specified
  as?: T; // The 'as' prop allows specifying the tag
  children: ReactNode;
  className?: string;
  // Add any other specific props your EphemeralText component needs
  // For example:
  // duration?: number;
  // stagger?: number;
}

// Use Omit to allow passing through other valid HTML/SVG attributes
// while preventing clashes with your explicitly defined props.
export function EphemeralText<T extends ElementType = "span">({
  as,
  children,
  className,
  // ...destructure other specific props here
  ...rest // Spread the rest of the props to the Tag
}: EphemeralTextProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof EphemeralTextProps<T>>) {
  // Determine the tag to use, defaulting to 'span' (or T's default)
  const Tag = as || ("span" as ElementType); // Explicitly type 'span' if T can be undefined from default

  // Use React.ElementRef to get the correct ref type based on the Tag
  const containerRef =
    useRef<React.ComponentPropsWithRef<typeof Tag>["ref"]>(null);

  // Your existing character animation logic, useEffects, etc. would go here
  // For example, a simplified representation of characters:
  const characters = React.Children.toArray(children).map((child, i) =>
    typeof child === "string"
      ? child.split("").map((char, j) => (
          <span
            key={`${i}-${j}`}
            style={{ display: "inline-block" /* for animation */ }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))
      : child
  );

  return (
    // Pass the ref and spread the rest of the compatible props
    <Tag ref={containerRef} className={className} {...rest}>
      {characters}
    </Tag>
  );
}
