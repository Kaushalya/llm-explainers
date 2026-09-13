import { explainers } from "./explainers";
import "./site-shell.css";

const shellScript = document.querySelector<HTMLScriptElement>(
  "script[data-explainer-shell]",
);
const current = shellScript?.dataset.current;
const links = explainers
  .map(
    (item) => `
      <a
        href="${item.href}"
        title="${item.shortTitle}"
        ${item.id === current ? 'aria-current="page"' : ""}
      >${item.index}</a>`,
  )
  .join("");

document.body.insertAdjacentHTML(
  "afterbegin",
  `<header class="site-header">
    <a class="site-brand" href="/" aria-label="LLM Explainers home">
      <span class="site-brand-mark" aria-hidden="true">◫</span>
      <span>LLM <b>EXPLAINERS</b></span>
    </a>
    <nav aria-label="All explainers">
      <a href="/">INDEX</a>
      ${links}
    </nav>
    <span class="site-header-note">OPEN NOTEBOOKS FOR MACHINE INTELLIGENCE</span>
  </header>`,
);
