"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, ChevronUp, CircleDot, Clock3, Code2, GitPullRequest, Menu, Moon, Search, ShieldCheck, SlidersHorizontal, Sparkles, Sun, X } from "lucide-react";
import { CommandPalette } from "../components/CommandPalette";
import { GuidedTour } from "../components/GuidedTour";

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { id: string; severity: Severity; category: string; title: string; explanation: string; suggestion: string };
type ReviewHistoryItem = { id: number; repository: string; pull_request_number: number; title: string; status: string; summary: string; created_at: string };
type ModalKind = "guide" | "rules" | "invite" | null;

const demoFindings: Finding[] = [
  { id: "1", severity: "high", category: "Reliability", title: "Broad exception handling may hide failures", explanation: "Catching every exception makes production failures look like successful requests and removes useful debugging context.", suggestion: "Catch the expected exception types, log structured context, and preserve the original traceback." },
  { id: "2", severity: "medium", category: "Performance", title: "Checkout total recalculates inside the request path", explanation: "The current loop performs repeated work for every line item and will become expensive for large carts.", suggestion: "Pre-compute normalized line items and add a benchmark for the high-volume checkout path." },
  { id: "3", severity: "low", category: "Maintainability", title: "Follow-up work is marked in production code", explanation: "TODO markers are easy to lose after merge and can turn temporary debt into permanent behavior.", suggestion: "Create a tracked issue with acceptance criteria or remove the marker before merging." },
];

const severityStyles: Record<Severity, string> = { critical: "critical", high: "high", medium: "medium", low: "low" };

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<"all" | Severity>("all");
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [reviewFindings, setReviewFindings] = useState(demoFindings);
  const [recentReviews, setRecentReviews] = useState<ReviewHistoryItem[]>([]);
  const [liveMode, setLiveMode] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState("just now");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "title">("severity");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [rulePack, setRulePack] = useState({ security: true, reliability: true, performance: true, testing: false });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [reviewedFindingIds, setReviewedFindingIds] = useState<string[]>([]);

  const findings = useMemo(() => {
    const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return reviewFindings
      .filter((finding) => activeFilter === "all" || finding.severity === activeFilter)
      .filter((finding) => `${finding.title} ${finding.category} ${finding.explanation}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => sortBy === "title" ? a.title.localeCompare(b.title) : severityRank[a.severity] - severityRank[b.severity]);
  }, [activeFilter, reviewFindings, searchTerm, sortBy]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  async function refreshHistory() {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/reviews/history`, { cache: "no-store" });
      if (!response.ok) return;
      setRecentReviews(await response.json());
      setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("reviewpilot-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    const savedRules = window.localStorage.getItem("reviewpilot-rule-pack");
    if (savedRules) setRulePack(JSON.parse(savedRules));
    const savedReviewed = window.localStorage.getItem("reviewpilot-reviewed-findings");
    if (savedReviewed) setReviewedFindingIds(JSON.parse(savedReviewed));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("reviewpilot-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!liveMode) return;
    const timer = window.setInterval(refreshHistory, 15000);
    return () => window.clearInterval(timer);
  }, [liveMode]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const openRules = () => setActiveModal("rules");
    const openInvite = () => setActiveModal("invite");
    window.addEventListener("reviewpilot:open-rules", openRules);
    window.addEventListener("reviewpilot:open-invite", openInvite);
    return () => {
      window.removeEventListener("reviewpilot:open-rules", openRules);
      window.removeEventListener("reviewpilot:open-invite", openInvite);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveRulePack() {
    window.localStorage.setItem("reviewpilot-rule-pack", JSON.stringify(rulePack));
    setActiveModal(null);
    setNotice("Rule pack saved — future reviews will use your selected checks.");
  }

  function markFindingReviewed(id: string) {
    setReviewedFindingIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      window.localStorage.setItem("reviewpilot-reviewed-findings", JSON.stringify(next));
      return next;
    });
    setNotice("Finding marked as reviewed.");
  }

  function inviteTeammate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    setInviteError("");
    setInviteEmail("");
    setActiveModal(null);
    setNotice(`Invite prepared for ${inviteEmail}.`);
  }

  function runReview() {
    setIsRunning(true);
    setNotice("");
    window.setTimeout(() => { setIsRunning(false); setNotice(`Review complete — ${reviewFindings.length} actionable findings refreshed.`); }, 900);
  }

  async function reviewGithubPr(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setNotice("");
    try {
      const response = await fetch(`${apiBase}/api/v1/reviews/from-github`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pr_url: prUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "GitHub review failed.");
      setReviewFindings(payload.findings ?? []);
      setActiveFilter("all");
      setNotice(`GitHub PR #${payload.pull_request_number} reviewed — ${payload.findings.length} findings detected.`);
      await refreshHistory();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "GitHub review failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className={theme === "dark" ? "shell dark-mode" : "shell"}>
      <button className={mobileOpen ? "sidebar-overlay visible" : "sidebar-overlay"} aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      <aside className={mobileOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>reviewpilot</span></div>
        <div className="workspace-switcher"><div className="avatar purple">R</div><div><strong>Ram&apos;s workspace</strong><span>Personal team</span></div><ChevronRight size={15} /></div>
        <nav className="nav"><p className="eyebrow">Workspace</p><a href="#overview" className="active" onClick={() => setMobileOpen(false)}><CircleDot size={16} /> Overview</a><a href="#reviews" onClick={() => setMobileOpen(false)}><GitPullRequest size={16} /> Pull requests <span className="nav-count">12</span></a><a href="#findings" onClick={() => setMobileOpen(false)}><AlertTriangle size={16} /> Findings <span className="nav-count">{reviewFindings.length}</span></a><a href="#automation" onClick={() => setMobileOpen(false)}><ShieldCheck size={16} /> Automation</a><a href="#repositories" onClick={() => setMobileOpen(false)}><Code2 size={16} /> Repositories</a></nav>
        <div className="sidebar-bottom"><div className="plan-card"><div className="plan-top"><span>Free plan</span><span>62%</span></div><div className="progress"><span /></div><p>62 of 100 reviews used</p><button>Upgrade workspace <ArrowUpRight size={13} /></button></div><div className="user-row"><div className="avatar orange">RS</div><div><strong>Ram Singh</strong><span>ram@example.com</span></div><span className="online-dot" /></div></div>
      </aside>
      <section className="content" id="overview">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div><span className="breadcrumb"><i className="live-dot" />Workspace / Overview</span><h1>Good morning, Ram <span>✦</span></h1><p>Here&apos;s what your codebase needs attention on today.</p></div><div className="top-actions"><CommandPalette actions={[{ id: "run-review", label: "Run a review", hint: "Analyze current repository", keywords: "scan analyze", run: runReview }, { id: "open-rules", label: "Open rule pack", hint: "Configure review checks", keywords: "policy security", run: () => setActiveModal("rules") }, { id: "open-invite", label: "Invite a teammate", hint: "Add workspace member", keywords: "team member", run: () => setActiveModal("invite") }, { id: "toggle-live", label: "Toggle live mode", hint: "Enable or disable polling", run: () => setLiveMode((value) => !value) }]} /><button className="theme-toggle" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label="Toggle dark mode">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}<span>{theme === "dark" ? "Light" : "Dark"}</span></button><button className={liveMode ? "live-toggle active" : "live-toggle"} onClick={() => setLiveMode((value) => !value)}><span className="sync-dot" />Live {liveMode ? "on" : "off"}</button><span className="sync-label"><span className="sync-dot" />{isRefreshing ? "Syncing…" : `Synced ${lastSynced}`}</span><button className="icon-button" onClick={refreshHistory} aria-label="Refresh activity"><Clock3 size={17} /></button><button className="primary-button" onClick={runReview}>{isRunning ? "Analyzing…" : "Run a review"}<ArrowUpRight size={15} /></button></div></header>
        {notice && <div className="notice"><CheckCircle2 size={16} />{notice}</div>}
        <div className="engagement-row"><GuidedTour steps={[{ target: ".import-card", title: "Start with a real PR", description: "Paste a public GitHub pull request URL and ReviewPilot will analyze it." }, { target: ".findings-list", title: "Triage findings", description: "Use severity filters and mark findings as reviewed after applying the suggested fix." }, { target: ".live-feed", title: "Watch review activity", description: "Webhook and imported PR activity appears here automatically." }, { target: ".quick-panel", title: "Configure your workspace", description: "Create a rule pack and invite teammates from Quick Start." }]} /></div>
        <div className="global-tools"><div className="global-search"><Search size={15} /><input aria-label="Search findings" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search findings, categories, or explanations…" />{searchTerm && <button onClick={() => setSearchTerm("")} aria-label="Clear search"><X size={14} /></button>}</div><label className="sort-control"><SlidersHorizontal size={14} /><span>Sort</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "severity" | "title")}><option value="severity">Severity</option><option value="title">Title</option></select></label></div>
        <section className="import-card"><div className="import-copy"><div className="import-icon"><GitPullRequest size={17} /></div><div><div className="import-title"><strong>Review a real GitHub pull request</strong><span className="new-badge">LIVE</span></div><p>Paste a public PR URL and let ReviewPilot surface what matters before merge.</p></div></div><form className="import-form" onSubmit={reviewGithubPr}><input aria-label="GitHub pull request URL" value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" required /><button className="primary-button" type="submit" disabled={isRunning}>{isRunning ? "Analyzing…" : "Analyze PR"}<ArrowUpRight size={15} /></button></form></section>
        <section className="automation-strip"><div className="automation-icon"><Sparkles size={16} /></div><div className="automation-copy"><strong>Automation layer is ready</strong><span>GitHub webhooks can trigger reviews when a PR opens or changes.</span></div><span className="automation-status"><i />Webhook ready</span><button className="ghost-button" onClick={() => setActiveModal("guide")}>Setup guide <ArrowUpRight size={14} /></button></section>
        <div className="stats-grid"><Stat icon={<GitPullRequest size={18} />} label="Reviews this month" value="62" delta="+18.4%" positive /><Stat icon={<AlertTriangle size={18} />} label="Actionable findings" value="14" delta="-8.2%" positive /><Stat icon={<ShieldCheck size={18} />} label="Avg. health score" value="86" suffix="/100" delta="+4.6%" positive /><Stat icon={<Clock3 size={18} />} label="Avg. review time" value="2m 14s" delta="-31 sec" positive /></div>
        <div className="main-grid"><section className="panel review-panel"><div className="panel-heading"><div><div className="heading-line"><h2>Latest review</h2><span className="status-pill"><span className="status-dot" /> Completed</span></div><p>PR #184 · Harden checkout validation</p></div><button className="ghost-button" onClick={() => setSelectedFinding(reviewFindings[0] ?? null)}>View full review <ArrowUpRight size={14} /></button></div><div className="repo-line"><div className="repo-icon"><Code2 size={18} /></div><div><strong>acme / checkout</strong><span>opened by maya-chen · 18 minutes ago</span></div><div className="score"><span>Health score</span><strong>82 <small>/ 100</small></strong></div></div><div className="review-summary"><div className="summary-icon"><Sparkles size={17} /></div><div><strong>Review summary</strong><p>Solid validation improvements with a few reliability and performance concerns worth addressing before merge.</p></div><span className="summary-arrow"><ArrowUpRight size={15} /></span></div><div className="findings-toolbar"><div><strong>Findings</strong><span className="finding-count">{reviewFindings.length}</span></div><div className="filters">{(["all", "high", "medium", "low"] as const).map((filter) => <button key={filter} className={activeFilter === filter ? "filter active" : "filter"} onClick={() => setActiveFilter(filter)}>{filter === "all" ? "All findings" : filter[0].toUpperCase() + filter.slice(1)}</button>)}</div></div><div className="findings-list">{findings.length ? findings.map((finding) => <FindingCard key={finding.id} finding={finding} reviewed={reviewedFindingIds.includes(finding.id)} onOpen={setSelectedFinding} onMarkReviewed={markFindingReviewed} />) : <div className="empty-findings"><CheckCircle2 size={20} /><strong>All clear</strong><span>No findings match this filter.</span></div>}</div></section><aside className="right-column"><section className="panel confidence-panel"><div className="panel-heading compact"><div><h2>Review health</h2><span className="panel-subtitle">Last 30 days</span></div><span className="trend-chip">↗ 4.6%</span></div><div className="health-visual"><div className="score-ring"><div><strong>86</strong><small>/100</small></div></div><div className="health-copy"><strong>Healthy momentum</strong><p>Your codebase is trending safer this month.</p><span><i className="health-dot" />Above team average</span></div></div><div className="health-breakdown"><div><span>Reliability</span><strong>92%</strong><i><b style={{ width: "92%" }} /></i></div><div><span>Security</span><strong>88%</strong><i><b style={{ width: "88%" }} /></i></div></div></section><section className="panel"><div className="panel-heading compact"><h2>Review activity</h2><button className="more">•••</button></div><div className="activity-chart"><div className="chart-labels"><span>12</span><span>8</span><span>4</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 420 160" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8671ff" stopOpacity=".3" /><stop offset="100%" stopColor="#8671ff" stopOpacity="0" /></linearGradient></defs><path d="M0 130 C28 119 40 111 63 118 S93 80 118 96 S154 50 182 76 S209 88 236 58 S269 82 294 48 S330 44 350 55 S390 22 420 34 L420 160 L0 160 Z" fill="url(#fill)" /><path d="M0 130 C28 119 40 111 63 118 S93 80 118 96 S154 50 182 76 S209 88 236 58 S269 82 294 48 S330 44 350 55 S390 22 420 34" fill="none" stroke="#8b7cff" strokeWidth="3" /></svg></div></div><div className="chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div className="chart-legend"><span><i className="legend-dot purple-dot" />Reviews</span><span><i className="legend-dot amber-dot" />Findings</span></div><div className="live-feed" aria-live="polite" aria-busy={isRefreshing}>{recentReviews.length ? recentReviews.slice(0, 3).map((review) => <div className="feed-item" key={review.id}><span className="feed-dot" /><div><strong>{review.repository} · PR #{review.pull_request_number}</strong><span>{review.status} · {new Date(review.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><ArrowUpRight size={13} /></div>) : <div className="feed-empty"><span className="pulse-dot" />Waiting for review activity…</div>}</div></section><section className="panel quick-panel"><div className="panel-heading compact"><h2>Quick start</h2><span className="muted">2 of 4 complete</span></div><div className="setup-progress"><span /></div><SetupItem done title="Connect GitHub" /><SetupItem done title="Review your first PR" /><SetupItem title="Create a rule pack" /><SetupItem title="Invite a teammate" /></section></aside></div>
        {showScrollTop && <button className="scroll-top" onClick={scrollToTop} aria-label="Scroll to top"><ChevronUp size={17} /></button>}
        {selectedFinding && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedFinding(null); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="finding-title"><button className="modal-close" onClick={() => setSelectedFinding(null)} aria-label="Close finding details"><X size={17} /></button><span className={`severity-tag ${severityStyles[selectedFinding.severity]}`}>{selectedFinding.severity}</span><span className="modal-category">{selectedFinding.category}</span><h2 id="finding-title">{selectedFinding.title}</h2><p>{selectedFinding.explanation}</p><div className="modal-suggestion"><CheckCircle2 size={16} /><div><strong>Suggested fix</strong><span>{selectedFinding.suggestion}</span></div></div><button className="primary-button modal-action" onClick={() => setSelectedFinding(null)}>Mark as reviewed <CheckCircle2 size={15} /></button></section></div>}
        {activeModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setActiveModal(null); }}><section className="detail-modal workflow-modal" role="dialog" aria-modal="true" aria-labelledby="workflow-title"><button className="modal-close" onClick={() => setActiveModal(null)} aria-label="Close dialog"><X size={17} /></button>{activeModal === "guide" && <><span className="modal-eyebrow">AUTOMATION SETUP</span><h2 id="workflow-title">Connect GitHub automation</h2><p>Set <code>GITHUB_WEBHOOK_SECRET</code>, expose your API publicly, then configure a GitHub repository webhook for <code>/api/v1/webhooks/github</code>.</p><div className="guide-steps"><span><b>1</b>Deploy the API publicly</span><span><b>2</b>Add the webhook secret</span><span><b>3</b>Select pull_request events</span></div><button className="primary-button modal-action" onClick={() => setActiveModal(null)}>Got it <CheckCircle2 size={15} /></button></>}{activeModal === "rules" && <><span className="modal-eyebrow">CUSTOM POLICY</span><h2 id="workflow-title">Create a rule pack</h2><p>Choose which review dimensions your workspace should prioritize.</p><div className="rule-options">{(Object.keys(rulePack) as Array<keyof typeof rulePack>).map((rule) => <label key={rule}><input type="checkbox" checked={rulePack[rule]} onChange={() => setRulePack((current) => ({ ...current, [rule]: !current[rule] }))} /><span>{rule[0].toUpperCase() + rule.slice(1)}</span></label>)}</div><button className="primary-button modal-action" onClick={saveRulePack}>Save rule pack <CheckCircle2 size={15} /></button></>}{activeModal === "invite" && <><span className="modal-eyebrow">WORKSPACE ACCESS</span><h2 id="workflow-title">Invite a teammate</h2><p>Invite a reviewer to collaborate on findings and rule packs.</p><form onSubmit={inviteTeammate}><label className="field-label" htmlFor="invite-email">Teammate email</label><input className="modal-input" id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@company.com" autoFocus />{inviteError && <span className="field-error">{inviteError}</span>}<button className="primary-button modal-action" type="submit">Prepare invite <ArrowUpRight size={15} /></button></form></>}</section></div>}
      </section>
    </main>
  );
}

function Stat({ icon, label, value, suffix, delta, positive }: { icon: React.ReactNode; label: string; value: string; suffix?: string; delta: string; positive?: boolean }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span className="stat-label">{label}</span><div className="stat-value">{value}{suffix && <small>{suffix}</small>}<span className={positive ? "delta positive" : "delta"}>{delta}</span></div></div>; }
function FindingCard({ finding, reviewed, onOpen, onMarkReviewed }: { finding: Finding; reviewed: boolean; onOpen: (finding: Finding) => void; onMarkReviewed: (id: string) => void }) { return <article className={reviewed ? "finding reviewed" : "finding"}><div className={`severity-bar ${severityStyles[finding.severity]}`} /><div className="finding-body"><div className="finding-top"><span className={`severity-tag ${severityStyles[finding.severity]}`}>{finding.severity}</span><span className="category">{finding.category}</span></div><h3>{finding.title}</h3><p>{finding.explanation}</p><div className="suggestion"><CheckCircle2 size={15} /><span><strong>Suggested fix</strong>{finding.suggestion}</span></div><div className="finding-actions"><button className="finding-details" onClick={() => onOpen(finding)}>View details</button><button className="finding-review" aria-pressed={reviewed} onClick={() => onMarkReviewed(finding.id)}>{reviewed ? "Reviewed" : "Mark as reviewed"}</button></div></div><button className="finding-arrow" onClick={() => onOpen(finding)} aria-label={`Open details for ${finding.title}`}><ArrowUpRight size={15} /></button></article>; }
function SetupItem({ done, title }: { done?: boolean; title: string }) { const onClick = () => { if (title === "Create a rule pack") window.dispatchEvent(new Event("reviewpilot:open-rules")); if (title === "Invite a teammate") window.dispatchEvent(new Event("reviewpilot:open-invite")); }; return <button className="setup-item" onClick={onClick} disabled={done}><span className={done ? "check done" : "check"}>{done && "✓"}</span><span>{title}</span>{done ? <span className="setup-done">Done</span> : <ArrowUpRight size={14} />}</button>; }
