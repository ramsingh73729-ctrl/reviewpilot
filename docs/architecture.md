# Architecture decisions

## Request flow

1. The web dashboard submits a pull-request diff to `POST /api/v1/reviews/preview`.
2. The API validates the payload and calls the `ReviewProvider` boundary.
3. The mock provider applies fast deterministic checks; the OpenAI provider can enrich the result when configured.
4. The normalized response is returned to the dashboard and can be persisted through the repository layer.

## Why a provider boundary?

The product should remain useful during local development and CI runs where an LLM key is unavailable. Keeping AI selection behind a small interface makes the review engine testable, avoids coupling HTTP routes to vendor SDKs, and allows future providers or self-hosted models.

## Next production step

Move review execution to a Redis-backed worker. Webhook requests should acknowledge quickly, then expose review status through polling or server-sent events. The current API contract is intentionally compatible with that evolution.
