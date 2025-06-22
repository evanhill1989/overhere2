// components/LogoWithWave.tsx
"use client";

import Link from "next/link";
import { HandWaving } from "@phosphor-icons/react";

export default function LogoWithWave() {
  return (
    <Link href="/">
      <div className="group flex items-center gap-2">
        <h1 className="font-heading active:underline active:underline-offset-2">
          overhere
        </h1>
        <div className="icon-wrapper group-hover:animate-wave-hover origin-[appropriate-for-wrapper]">
          <HandWaving className="animate-wave-load h-5 w-5 origin-[appropriate-for-icon]" />
        </div>
      </div>
    </Link>
  );
}
