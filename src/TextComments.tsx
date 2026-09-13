import { useEffect, useRef, useState } from "react";
import "./text-comments.css";

type Passage = { quote: string; selector: string; start: number };
type Comment = Passage & { id: string; body: string };
const excluded =
  "button, input, textarea, select, [contenteditable], [data-text-comments], nav, .site-header";

function pathFor(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();
  const siblings = [...parent.children].filter(
    (child) => child.tagName === element.tagName,
  );
  return `${pathFor(parent)} > ${element.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(element) + 1})`;
}

function readComments(key: string): Comment[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
  if (
    !Array.isArray(value) ||
    !value.every(
      (c) =>
        c &&
        [c.id, c.body, c.quote, c.selector].every(
          (v) => typeof v === "string",
        ) &&
        Number.isInteger(c.start) &&
        c.start >= 0,
    )
  )
    throw new Error("Invalid comments");
  return value;
}

export default function TextComments({ pageId }: { pageId: string }) {
  const key = `llm-explainers:comments:v1:${pageId}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<
    (Passage & { x: number; y: number }) | null
  >(null);
  const [draft, setDraft] = useState<(Passage & { id?: string }) | null>(null);
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const read = () => {
      try {
        setComments(readComments(key));
        setError("");
      } catch {
        setError(
          "Saved comments could not be loaded. Browser storage may be unavailable.",
        );
      }
    };
    read();
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  useEffect(() => {
    const capture = () => {
      const selected = window.getSelection();
      if (
        !selected ||
        selected.isCollapsed ||
        !selected.rangeCount ||
        !selected.toString().trim()
      ) {
        setSelection(null);
        return;
      }
      const range = selected.getRangeAt(0);
      const element =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const end =
        range.endContainer.nodeType === Node.ELEMENT_NODE
          ? (range.endContainer as Element)
          : range.endContainer.parentElement;
      const panel = element?.closest("section, article, main");
      if (
        !panel ||
        !end ||
        !panel.contains(end) ||
        element?.closest(excluded) ||
        end.closest(excluded)
      ) {
        setSelection(null);
        return;
      }
      const prefix = range.cloneRange();
      prefix.selectNodeContents(panel);
      prefix.setEnd(range.startContainer, range.startOffset);
      const rect = range.getBoundingClientRect();
      setSelection({
        quote: range.toString(),
        selector: pathFor(panel),
        start: prefix.toString().length,
        x: Math.max(12, Math.min(rect.left, window.innerWidth - 160)),
        y: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 52)),
      });
    };
    const dismiss = () => setSelection(null);
    document.addEventListener("selectionchange", capture);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("selectionchange", capture);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  useEffect(() => {
    if (draft) textarea.current?.focus();
  }, [draft]);

  function save(next: Comment[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setComments(next);
      setError("");
      return true;
    } catch {
      setError("Could not save changes. Check browser storage and try again.");
      return false;
    }
  }

  function revisit(comment: Comment) {
    let panel: Element | null = null;
    try {
      panel = document.querySelector(comment.selector);
    } catch {
      /* stale selector */
    }
    const text = panel?.textContent || "";
    const start =
      text.slice(comment.start, comment.start + comment.quote.length) ===
      comment.quote
        ? comment.start
        : text.indexOf(comment.quote);
    if (!panel || start < 0) {
      setNotice("This passage has changed or is not currently visible.");
      return;
    }
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let offset = 0,
      began = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.textContent?.length || 0;
      if (!began && offset + length > start) {
        range.setStart(node, start - offset);
        began = true;
      }
      if (began && offset + length >= start + comment.quote.length) {
        range.setEnd(node, start + comment.quote.length - offset);
        break;
      }
      offset += length;
    }
    setOpen(false);
    setNotice("");
    range.startContainer.parentElement?.scrollIntoView({ block: "center" });
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }

  return (
    <div data-text-comments className="text-comments">
      <button
        ref={launcher}
        className="tc-launcher"
        aria-expanded={open}
        aria-controls="tc-panel"
        onClick={() => {
          setOpen(!open);
          setSelection(null);
        }}
      >
        Comments · {comments.length}
      </button>
      {selection && !draft && (
        <button
          className="tc-add"
          style={{ left: selection.x, top: selection.y }}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setDraft(selection);
            setBody("");
            setOpen(true);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          + Add comment
        </button>
      )}
      {open && (
        <aside
          id="tc-panel"
          aria-label="Text comments"
          className="tc-panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              launcher.current?.focus();
            }
          }}
        >
          <header>
            <h2>Comments</h2>
            <button
              aria-label="Close comments"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              ×
            </button>
          </header>
          <p className="tc-hint">
            Select text in an explainer to leave a comment. Saved only in this
            browser.
          </p>
          {error && (
            <p role="alert" className="tc-error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {draft && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!body.trim()) return;
                const comment = {
                  quote: draft.quote,
                  selector: draft.selector,
                  start: draft.start,
                  id: draft.id || crypto.randomUUID(),
                  body: body.trim(),
                };
                // Read the latest list to preserve changes from other tabs.
                try {
                  const latest = readComments(key);
                  if (draft.id && !latest.some((c) => c.id === draft.id)) {
                    setError(
                      "This comment was deleted in another tab. Cancel to dismiss this draft.",
                    );
                    return;
                  }
                  if (
                    save(
                      draft.id
                        ? latest.map((c) => (c.id === draft.id ? comment : c))
                        : [...latest, comment],
                    )
                  )
                    setDraft(null);
                } catch {
                  setError(
                    "Could not read saved comments. Your draft is still here.",
                  );
                }
              }}
            >
              <blockquote>{draft.quote}</blockquote>
              <label htmlFor="tc-body">
                {draft.id ? "Edit comment" : "New comment"}
              </label>
              <textarea
                ref={textarea}
                id="tc-body"
                value={body}
                maxLength={5000}
                rows={4}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="tc-actions">
                <button type="submit" disabled={!body.trim()}>
                  Save comment
                </button>
                <button type="button" onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {!comments.length && !draft && (
            <p className="tc-empty">
              No comments yet. Select a passage to get started.
            </p>
          )}
          <div className="tc-list">
            {comments.map((comment) => (
              <article key={comment.id} className="tc-comment">
                <button
                  className="tc-quote"
                  title="Show quoted passage"
                  onClick={() => revisit(comment)}
                >
                  {comment.quote}
                </button>
                <p>{comment.body}</p>
                <div className="tc-actions">
                  <button
                    disabled={!!draft}
                    onClick={() => {
                      setDraft(comment);
                      setBody(comment.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    disabled={!!draft}
                    onClick={() => {
                      try {
                        save(
                          readComments(key).filter((c) => c.id !== comment.id),
                        );
                      } catch {
                        setError(
                          "Could not read saved comments. Please try again.",
                        );
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
