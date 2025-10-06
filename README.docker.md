# Déploiement Docker

Ce projet est composé de deux services Docker :
- **API** : Backend Node.js/Express avec SQLite
- **Web** : Frontend React avec Nginx

## Lancement en local

### Avec Docker Compose (recommandé)

```bash
# Lancer les deux services
docker-compose up -d

# Accéder à l'application
# Frontend : http://localhost
# API : http://localhost:3001
```

### Arrêter les services

```bash
docker-compose down
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Uniquement l'API
docker-compose logs -f api

# Uniquement le frontend
docker-compose logs -f web
```

## Build manuel

### API

```bash
cd api
docker build -t contracts-api .
docker run -p 3001:3001 -v $(pwd)/data:/app/data contracts-api
```

### Frontend

```bash
docker build -t contracts-web .
docker run -p 80:80 contracts-web
```

## Structure des données

Les données SQLite sont stockées dans `api/data/app.db` et sont persistantes grâce au volume Docker.

## Variables d'environnement

- `VITE_API_URL` : URL de l'API (défaut : http://localhost:3001)
- `PORT` : Port de l'API (défaut : 3001)
