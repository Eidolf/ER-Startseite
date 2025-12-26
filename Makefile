.PHONY: install start test lint

install:
	cd backend && poetry install
	cd frontend && npm install

start:
	docker-compose up -d

stop:
	docker-compose down

test:
	cd backend && poetry run pytest
	cd frontend && npm run test

lint:
	cd backend && poetry run ruff check .
	cd frontend && npm run lint

format:
	cd backend && poetry run black .
	cd frontend && npm run format

build:
	docker-compose build
