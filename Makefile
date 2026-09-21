.PHONY: dev test lint

dev:
	docker compose up --build

test:
	cd apps/api && pytest

lint:
	cd apps/api && ruff check .
	cd apps/web && npm run lint
