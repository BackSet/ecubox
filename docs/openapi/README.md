# OpenAPI spec exportado

Este directorio puede contener una copia versionada del spec OpenAPI de ECUBOX.

## Generar `openapi.json`

1. Arranca el backend en perfil `dev`:

```powershell
cd ecubox-backend
.\mvnw.cmd spring-boot:run
```

2. En otra terminal:

```powershell
cd ecubox-backend
.\scripts\export-openapi.ps1
```

El archivo se guardará en `docs/openapi/openapi.json`.

## URLs en desarrollo

| Recurso | URL |
|---------|-----|
| Scalar UI | http://localhost:8080/scalar |
| OpenAPI (todos) | http://localhost:8080/v3/api-docs |
| Grupo público | http://localhost:8080/v3/api-docs/public |
| Grupo auth | http://localhost:8080/v3/api-docs/auth |
