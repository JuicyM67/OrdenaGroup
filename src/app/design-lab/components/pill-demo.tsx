"use client";

// Liten interaktiv wrapper runt Pill för katalogen: e2e (pekskärm/tangentbord) behöver ett
// riktigt tillstånd att växla, inte bara ett statiskt `selected`-exempel.
import { useState } from "react";

import { Pill } from "@/components/ui/pill";

export function PillDemo({ labels }: { labels: readonly string[] }) {
  const [selected, setSelected] = useState(labels[1]);
  return (
    <>
      {labels.map((label) => (
        <Pill
          key={label}
          selected={selected === label}
          onClick={() => setSelected(label)}
        >
          {label}
        </Pill>
      ))}
    </>
  );
}
