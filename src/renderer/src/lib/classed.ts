import { createClassed } from "@tw-classed/react";
import { twMerge } from "tailwind-merge";

// Use tailwind-merge as the merger to remove style
// conflicts between variants and custom classes

export const { classed } = createClassed({ merger: twMerge });
