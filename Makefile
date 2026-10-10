.PHONY: help setup up down logs test seed clean

help: ## Show this help
    @grep -E '^[a-zA-Z_-]+:.*?## .*UTF8' \ | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", \$\, \$\}'

setup: ## Setup project (install dependencies)
    cd backend && pip install -r requirements.txt
    cd frontend && npm install

up: ## Start all Docker services
    docker-compose up -d

down: ## Stop all Docker services
    docker-compose down

logs: ## View logs
    docker-compose logs -f

logs-backend: ## View backend logs
    docker-compose logs -f backend celery_worker

test-backend: ## Run backend tests
    cd backend && pytest -v

test-frontend: ## Run frontend tests
    cd frontend && npm test

seed: ## Seed database with sample data
    cd backend && python -m scripts.seed_data

clean: ## Clean up Docker volumes
    docker-compose down -v
    docker system prune -f

build: ## Build Docker images
    docker-compose build

restart: ## Restart all services
    docker-compose restart

db-migrate: ## Run database migrations
    cd backend && alembic upgrade head

db-revision: ## Create new migration
    cd backend && alembic revision --autogenerate -m "\Send a message to a user.  MSG {username | sessionname | sessionid | @filename | *}     [/SERVER:servername] [/TIME:seconds] [/V] [/W] [message]    username            Identifies the specified username.   sessionname         The name of the session.   sessionid           The ID of the session.   @filename           Identifies a file containing a list of usernames,                       sessionnames, and sessionids to send the message to.   *                   Send message to all sessions on specified server.   /SERVER:servername  server to contact (default is current).   /TIME:seconds       Time delay to wait for receiver to acknowledge msg.   /V                  Display information about actions being performed.   /W                  Wait for response from user, useful with /V.   message             Message to send.  If none specified, prompts for it                       or reads from stdin. "
