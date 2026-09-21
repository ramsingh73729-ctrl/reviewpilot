import json

from openai import AsyncOpenAI

from .config import get_settings
from .review_engine import review_diff
from .schemas import Finding, ReviewRequest, ReviewResponse

SYSTEM_PROMPT = """You are a senior software engineer reviewing a pull request.
Return only valid JSON with this shape:
{"findings":[{"id":"ai-1","severity":"critical|high|medium|low|info","category":"Security|Reliability|Performance|Maintainability|Testing","title":"short title","explanation":"why it matters","suggestion":"specific fix"}]}
Find only concrete, actionable issues. Do not repeat obvious style preferences. Never invent line numbers. Keep at most five findings and use severity conservatively."""


async def analyze_review(request: ReviewRequest) -> ReviewResponse:
    """Run deterministic checks first, then optionally enrich with an AI provider."""
    base = review_diff(request)
    settings = get_settings()
    if settings.ai_provider.lower() != "openai" or not settings.openai_api_key:
        return base

    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.ai_model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Repository: {request.repository}\nTitle: {request.title}\nDiff:\n{request.diff[:60_000]}"},
            ],
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        ai_findings = [Finding.model_validate(item) for item in data.get("findings", [])[:5]]
        known_ids = {finding.id for finding in base.findings}
        merged = base.findings + [finding for finding in ai_findings if finding.id not in known_ids]
        penalty = {"critical": 42, "high": 24, "medium": 12, "low": 4, "info": 0}
        score = max(0, 100 - sum(penalty[finding.severity.value] for finding in merged))
        summary = base.summary if not ai_findings else f"AI-assisted review found {len(merged)} actionable item(s). Prioritize the highest-severity finding before merge."
        return base.model_copy(update={"findings": merged, "score": score, "summary": summary})
    except Exception:
        return base
