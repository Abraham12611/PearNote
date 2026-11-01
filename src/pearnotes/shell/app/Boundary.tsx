/* ------------------------------------------------------------------
 * Boundary — catches live-query failures (UNAUTHORIZED foreign ids,
 * dropped connections) before they take the whole app down. Scoped to
 * the data bridges so navigation and chrome stay alive; the fallback is
 * always an honest state, never a guessed view. `key` it by route id so
 * navigating resets the error instead of latching it.
 * ------------------------------------------------------------------ */
import { Component, type ReactNode } from "react";

export class Boundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { caught: boolean }
> {
  state = { caught: false };

  static getDerivedStateFromError() {
    return { caught: true };
  }

  render() {
    return this.state.caught ? this.props.fallback : this.props.children;
  }
}
