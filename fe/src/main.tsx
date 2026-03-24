import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AlertProvider } from "./components/shared/AlertProvider";

const noop = () => {};
console.log = noop;
console.debug = noop;
console.info = noop;
console.warn = noop;
console.error = noop;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <App />
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>,
);
