"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Command as CommandIcon, Search, X } from "lucide-react";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({ actions }: { actions: CommandAction[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredActions = useMemo(() => {
    const value = query.toLowerCase().trim();
    if (!value) return actions;
    return actions.filter((action) => `${action.label} ${action.hint ?? ""} ${action.keywords ?? ""}`.toLowerCase().includes(value));
  }, [actions, query]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function runAction(action: CommandAction) {
    setOpen(false);
    action.run();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredActions.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && filteredActions[activeIndex]) runAction(filteredActions[activeIndex]);
  }

  return (
    <>
      <button className="command-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <CommandIcon size={15} />
        <span>Command menu</span>
        <kbd>⌘K</kbd>
      </button>

      {open && (
        <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className="command-dialog" role="dialog" aria-modal="true" aria-label="Command menu">
            <div className="command-search">
              <Search size={16} />
              <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleInputKeyDown} placeholder="Search an action..." aria-label="Search actions" />
              <button onClick={() => setOpen(false)} aria-label="Close command menu"><X size={16} /></button>
            </div>
            <div className="command-list" role="listbox">
              {filteredActions.length ? filteredActions.map((action, index) => (
                <button key={action.id} className={index === activeIndex ? "command-item active" : "command-item"} role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => runAction(action)}>
                  <span>{action.label}</span>
                  {action.hint && <small>{action.hint}</small>}
                </button>
              )) : <p className="command-empty">No matching actions.</p>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
