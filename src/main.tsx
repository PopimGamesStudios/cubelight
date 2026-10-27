import { createRoot } from "react-dom/client";
import { DEFAULT_SETTINGS } from "@shared/defaults";
import { applyAppearance } from "@/lib/theme";
import App from "./App";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./index.css";

applyAppearance(structuredClone(DEFAULT_SETTINGS));

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(<App />);
