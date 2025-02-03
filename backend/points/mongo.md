### MONGODB SETUP

From dogin container run:

```bash
docker compose up
```

### INSERT USER

```bash
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{"name":<NAME>}'
```
