"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

type TourStep = { target: string; title: string; description: string };

export function GuidedTour({ steps }: { steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const currentStep = steps[index];

  useEffect(() => {
    if (!window.localStorage.getItem("reviewpilot-tour-complete")) setOpen(true);
  }, []);

  useEffect(() => {
    if (open && currentStep) document.querySelector(currentStep.target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, currentStep]);

  function closeTour() {
    setOpen(false);
    window.localStorage.setItem("reviewpilot-tour-complete", "true");
  }

  if (!steps.length) return null;

  return (
    <>
      <button className="tour-launcher" onClick={() => { setIndex(0); setOpen(true); }}>Take a quick tour</button>
      {open && currentStep && (
        <div className="tour-backdrop" role="presentation">
          <section className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title">
            <button className="tour-close" onClick={closeTour} aria-label="Close tour"><X size={16} /></button>
            <span className="tour-step">Step {index + 1} of {steps.length}</span>
            <h2 id="tour-title">{currentStep.title}</h2>
            <p>{currentStep.description}</p>
            <div className="tour-actions">
              <button onClick={() => setIndex((value) => Math.max(value - 1, 0))} disabled={index === 0}><ArrowLeft size={14} /> Back</button>
              <button className="primary-button" onClick={() => index === steps.length - 1 ? closeTour() : setIndex((value) => value + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}<ArrowRight size={14} /></button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
