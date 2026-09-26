"use client";

import { useState } from "react";

import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";

export function SegmentedControlDemo({
  options,
}: {
  options: readonly SegmentedControlOption[];
}) {
  const [value, setValue] = useState(options[1]?.value ?? "");
  return (
    <SegmentedControl
      aria-label="Vista"
      value={value}
      onValueChange={setValue}
      options={options}
    />
  );
}
