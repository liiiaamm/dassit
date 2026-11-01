# DassIt backend

Django 6 + Django REST Framework, SimpleJWT with refresh rotation and blacklisting, drf-spectacular for the OpenAPI schema, and the `ollama` client.

```
restApi/
├── restApi/      settings, root URLs (schema, docs, auth, token, chat)
├── users/        custom User, register, email login, profile, change password, logout
├── chat/         Chat, ChatMessage and Usage models, owner-only views, quota check
├── ai/           llm_service.py: system prompt + history → Ollama
└── healthcheck/  GET /api/healthcheck/
```

## Run without Docker

```bash
cd backend
cp .env.example restApi/.env      # USE_POSTGRES=false gives you SQLite
uv sync                           # or: pip install -e .
cd restApi
python manage.py migrate
python manage.py runserver        # http://localhost:8000/api/docs
```

You need an Ollama server for `/api/chat/<id>/send/`. Point `OLLAMA_HOST` at it, then `ollama pull llama3.2:3b`.

Settings read everything sensitive from the environment. Outside `DEBUG`, the app refuses to start without `DJANGO_SECRET_KEY`.
