import { explainers } from "./explainers";
import "./site-shell.css";

export default function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="site-header">
      <a className="site-brand" href="/" aria-label="LLM Explainers home">
        <span className="site-brand-mark" aria-hidden="true">
          ◫
        </span>
        <span>
          LLM <b>EXPLAINERS</b>
        </span>
      </a>
      <nav aria-label="All explainers">
        <a href="/" aria-current={current === "home" ? "page" : undefined}>
          INDEX
        </a>
        {explainers.map((item) => (
          <a
            key={item.id}
            href={item.href}
            aria-current={current === item.id ? "page" : undefined}
            title={item.shortTitle}
          >
            {item.index}
          </a>
        ))}
      </nav>
      <span className="site-header-note">
        OPEN NOTEBOOKS FOR MACHINE INTELLIGENCE
      </span>
    </header>
  );
}
