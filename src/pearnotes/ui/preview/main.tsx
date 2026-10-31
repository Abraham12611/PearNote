import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
/* the harness deliberately mounts the real upstream stylesheet — the
 * prototypes are meant to live inside that material system, so previewing
 * against it is the honest check */
import "../../../index.css";
import "../../styles/pearnotes.css";
import "../../styles/journey-assets.css";
import "../../styles/learning-widgets.css";
import "../../styles/learning-board.css";
import "./preview.css";
import { PearNotesPrototypeApp } from "./PrototypeApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PearNotesPrototypeApp />
  </StrictMode>,
);
