/**
 * The dashboard page.
 *
 * Registration only — mount the app and get out of the way. Everything it does
 * lives in `components/dashboard` and `services/dashboard`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../components/dashboard";

const container = document.getElementById("root");
if (!container) throw new Error("dashboard root missing");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
