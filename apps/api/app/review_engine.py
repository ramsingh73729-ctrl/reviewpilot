import re
from datetime import datetime, timezone
from uuid import uuid4

from .schemas import Finding, ReviewRequest, ReviewResponse, Severity


def _diff_stats(diff: str) -> tuple[int, int, int]:
    files = len(re.findall(r"^\+\+\+ b/", diff, flags=re.MULTILINE))
    additions = sum(1 for line in diff.splitlines() if line.startswith("+") and not line.startswith("+++") )
    deletions = sum(1 for line in diff.splitlines() if line.startswith("-") and not line.startswith("---"))
    return max(files, 1), additions, deletions


def review_diff(request: ReviewRequest) -> ReviewResponse:
    findings: list[Finding] = []
    diff_lower = request.diff.lower()

    if "password" in diff_lower or "api_key" in diff_lower or "secret" in diff_lower:
        findings.append(Finding(
            id="security-secret",
            severity=Severity.critical,
            category="Security",
            title="Potential secret committed in the diff",
            explanation="Credential-like names appear in changed lines. Secrets in source can be copied into forks, logs, and build artifacts.",
            suggestion="Move the value to a secret manager or environment variable and rotate any credential that may already be exposed.",
        ))

    if "except:" in diff_lower or "except exception" in diff_lower:
        findings.append(Finding(
            id="quality-broad-exception",
            severity=Severity.high,
            category="Reliability",
            title="Broad exception handling may hide failures",
            explanation="Catching every exception makes production failures look like successful requests and removes useful debugging context.",
            suggestion="Catch the expected exception types, log structured context, and preserve the original traceback.",
        ))

    if "select *" in diff_lower or "n+1" in diff_lower:
        findings.append(Finding(
            id="performance-query",
            severity=Severity.medium,
            category="Performance",
            title="Query pattern may create unnecessary database work",
            explanation="The changed code hints at a broad query or repeated database access pattern that can degrade as data grows.",
            suggestion="Select only required columns and batch related reads; add a regression test for query count if this path is hot.",
        ))

    if "todo" in diff_lower or "fixme" in diff_lower:
        findings.append(Finding(
            id="maintainability-todo",
            severity=Severity.low,
            category="Maintainability",
            title="Follow-up work is marked in production code",
            explanation="TODO/FIXME markers are easy to lose after merge and can turn temporary debt into permanent behavior.",
            suggestion="Create a tracked issue with acceptance criteria or remove the marker before merging.",
        ))

    files, additions, deletions = _diff_stats(request.diff)
    score = max(48, 100 - sum({Severity.critical: 42, Severity.high: 24, Severity.medium: 12, Severity.low: 4, Severity.info: 0}[f.severity] for f in findings))
    summary = (
        "No blocking issues detected. The change looks ready for human approval."
        if not findings else
        f"Found {len(findings)} item(s) to review before merge. Prioritize the {findings[0].severity} finding first."
    )
    return ReviewResponse(
        id=f"rev_{uuid4().hex[:10]}",
        repository=request.repository,
        pull_request_number=request.pull_request_number,
        title=request.title,
        status="completed",
        score=score,
        summary=summary,
        findings=findings,
        changed_files=files,
        additions=additions,
        deletions=deletions,
        created_at=datetime.now(timezone.utc),
    )
