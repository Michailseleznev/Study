import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/site.css";

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
