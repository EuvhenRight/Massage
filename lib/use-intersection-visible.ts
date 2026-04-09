"use client";

import {
  useLayoutEffect,
  useState,
  type RefCallback,
} from "react";

/**
 * Ref callback + whether the element intersects the viewport.
 * Uses a stateful ref callback so IntersectionObserver attaches only after the
 * DOM node exists — avoids missed subscriptions with `useRef` + `useEffect`
 * on some mobile WebKit / hydration timings.
 */
export function useIntersectionVisible(
  init?: Pick<IntersectionObserverInit, "rootMargin" | "threshold">,
): [RefCallback<Element | null>, boolean] {
  const [node, setNode] = useState<Element | null>(null);
  const [visible, setVisible] = useState(false);
  const rootMargin = init?.rootMargin;
  const threshold = init?.threshold;

  useLayoutEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry) setVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: rootMargin ?? "0px",
        threshold: threshold ?? [0, 0.01, 0.05, 0.1],
      },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, rootMargin, threshold]);

  const setRef: RefCallback<Element | null> = (el) => {
    setNode(el);
  };

  return [setRef, visible];
}
