.PHONY: help db-up db-down db-logs backend-install backend-dev backend-test frontend-install frontend-dev frontend-check frontend-lint frontend-build

help:
	@echo "MedSync development commands"
	@echo "  make db-up            Start PostgreSQL 16"
	@echo "  make db-down          Stop PostgreSQL"
	@echo "  make backend-install  Install Python dependencies"
	@echo "  make backend-dev      Start FastAPI in reload mode"
	@echo "  make backend-test     Run backend tests"
	@echo "  make frontend-install Install frontend dependencies"
	@echo "  make frontend-dev     Start Vite"
	@echo "  make frontend-check   Run frontend lint and build"
	@echo "  make frontend-lint    Run frontend lint"
	@echo "  make frontend-build   Build the frontend"

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

backend-install:
	python -m pip install -r backend/requirements.txt

backend-dev:
	python -m uvicorn app.main:app --reload --app-dir backend --env-file .env

backend-test:
	python -m pytest backend

frontend-install:
	pnpm --dir frontend install

frontend-dev:
	pnpm --dir frontend dev

frontend-check: frontend-lint frontend-build

frontend-lint:
	pnpm --dir frontend lint

frontend-build:
	pnpm --dir frontend build
