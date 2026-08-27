"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger index. Each step adds 60ms, capped so long lists never crawl. */
  index?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "figure";
};

/**
 * The single scroll-reveal primitive for the page.
 *
 * Why this motion exists (Section 5, motion must be motivated): sections enter
 * in the reading order they should be read in, which gives the page a
 * hierarchy that a static render cannot. It fires once and then stops. There
 * is no perpetual loop anywhere on this site.
 *
 * MOTION_INTENSITY 6 -> a 24px rise plus fade, expressive easing, no springs
 * bouncing under the content.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      // Hook for the no-JS override in layout.tsx. Motion serializes its
      // `initial` state into the prerendered HTML, so without that override a
      // visitor with JavaScript off would get a permanently invisible page.
      data-reveal=""
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.6,
        delay: Math.min(index * 0.06, 0.36),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Tag>
  );
}
