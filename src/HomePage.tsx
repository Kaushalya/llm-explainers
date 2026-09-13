import { useEffect } from "react";
import SiteHeader from "./SiteHeader";
import { explainers } from "./explainers";
import "./home.css";

const methodSteps = [
  ["01", "Pick a question"],
  ["02", "Change the system"],
  ["03", "Watch the mechanism"],
];

export default function HomePage() {
  useEffect(() => {
    document.body.classList.add("home-page");
    document.title = "LLM Explainers · Interactive guides to model systems";
    return () => document.body.classList.remove("home-page");
  }, []);

  const featured = explainers.find((item) => item.featured)!;
  return (
    <main className="home-shell">
      <SiteHeader current="home" />
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">
            A FIELD MANUAL FOR MODERN LANGUAGE MODELS
          </span>
          <h1>
            Learn LLM concepts <em>interactively</em>
          </h1>
          <p>
            Interactive, source-backed explanations of the systems underneath
            modern language models—from low-bit weights to parallel generation.
          </p>
          <a className="home-primary" href={featured.href}>
            EXPLORE THE LATEST <span>↗</span>
          </a>
        </div>
        <div className="home-hero-graphic" aria-hidden="true">
          <div className="home-orbit orbit-one" />
          <div className="home-orbit orbit-two" />
          <div className="home-core">
            <span>MODEL</span>
            <b>?</b>
            <small>OPEN THE BLACK BOX</small>
          </div>
          <span className="graphic-note note-a">INPUT</span>
          <span className="graphic-note note-b">STATE</span>
          <span className="graphic-note note-c">OUTPUT</span>
        </div>
      </section>

      <section className="home-index" id="explainers">
        <header>
          <div>
            <span className="home-kicker">THE COLLECTION</span>
            <h2>Choose a system to open.</h2>
          </div>
          <p>
            {String(explainers.length).padStart(2, "0")} EXPLAINERS · NO LOGIN ·
            RUNS LOCALLY
          </p>
        </header>
        <div className="explainer-grid">
          {explainers.map((item) => (
            <a
              className={`explainer-card accent-${item.accent}`}
              href={item.href}
              key={item.id}
            >
              <div className="card-topline">
                <span>{item.index}</span>
                <span>{item.eyebrow}</span>
                <span>↗</span>
              </div>
              <div className="card-diagram" aria-hidden="true">
                <i />
                <i />
                <i />
                <b>{item.index}</b>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <ul aria-label="Topics">
                {item.concepts.map((concept) => (
                  <li key={concept}>{concept}</li>
                ))}
              </ul>
              <div className="card-meta">
                <span>{item.format}</span>
                <span>{item.chapters}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="home-method">
        <div>
          <span className="home-kicker">HOW TO USE THESE</span>
          <h2>Start with a mental model. Then try to break it.</h2>
        </div>
        <ol>
          {methodSteps.map(([number, title]) => (
            <li key={number}>
              <span>{number}</span>
              <b>{title}</b>
            </li>
          ))}
        </ol>
      </section>

      <footer className="home-footer">
        <span>LLM EXPLAINERS</span>
        <p>Small, inspectable experiments for large, complicated systems.</p>
        <a href="#explainers">BACK TO INDEX ↑</a>
      </footer>
    </main>
  );
}
