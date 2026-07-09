# Arquitectura del sistema de credenciales — Evaluación de camino

Documento de referencia para evaluar si la arquitectura actual es la correcta para ENAP, o si conviene cambiar de enfoque antes de producción.

**Dominio objetivo:** `credenciales.enap.edu.co`  
**Fecha de referencia:** julio 2026  
**Audiencia:** equipo de desarrollo, infraestructura ENAP, tomadores de decisión

---

## 1. Resumen ejecutivo

### Lo que tenemos hoy

| Aspecto | Decisión tomada |
|---------|-----------------|
| Frontend | Angular, build estático servido por Nginx |
| Backend | NestJS (API REST) |
| Proxy de aplicación | **Nginx dentro de Docker** (contenedor `frontend-credentials`) |
| Base de datos | PostgreSQL en servidor/VM separado, **sin salida a internet** |
| Nginx en servidor host | **No se usa** (no está instalado ni es necesario con el diseño actual) |
| API pública | Solo vía `/api/*` a través del mismo Nginx Docker |
| SSL / HTTPS | Pendiente de certificado; arquitectura preparada para dos escenarios |

### Conclusión preliminar

**Sí, van por un camino correcto** para un entorno institucional con:

- servidores virtualizados,
- base de datos aislada en VLAN,
- aplicación en un servidor distinto,
- y eventual publicación vía infraestructura ENAP.

No es obligatorio instalar Nginx en el host ni exponer el puerto 3000 del API. Lo que falta definir con infraestructura ENAP es **cómo llegará el tráfico HTTPS** al servidor de aplicación (proxy institucional vs. certificado en Docker).

---

## 2. Contexto de red ENAP (según lo conocido)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Red ENAP / VLAN                                                        │
│                                                                         │
│  ┌──────────────────────┐         ┌──────────────────────────────────┐ │
│  │ Servidor BD (VM)      │         │ Servidor aplicación (VM)          │ │
│  │ postgres_server       │◄─VLAN──►│ Docker: frontend + api            │ │
│  │                       │  5432   │ Puerto público de la app: :80     │ │
│  │ • Sin internet        │         │ • Sin WiFi pública (por ahora)    │ │
│  │ • Sin WiFi            │         │ • Consulta BD por red interna     │ │
│  │ • Solo accesible      │         │                                   │ │
│  │   desde servidor app  │         │                                   │ │
│  └──────────────────────┘         └──────────────────────────────────┘ │
│                                              ▲                          │
│                                              │ (futuro)                 │
│  ┌──────────────────────────────────────────┴────────────────────────┐ │
│  │ Infraestructura ENAP (futuro): balanceador, firewall, proxy, DNS   │ │
│  │ Acceso usuarios: red interna ENAP y/o internet (por definir)        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Puntos clave del aislamiento de la BD

- La BD **no necesita** internet ni WiFi para que la aplicación funcione.
- El único consumidor de la BD es el contenedor `api-credentials`.
- Acceso administrativo a la BD (pgAdmin) hoy es por VLAN, vía proxy Nginx en Docker del proyecto `db_credencial` (puerto 8080), no expuesto como la app principal.
- **Dar salida de red al servidor de aplicación no implica exponer la BD.**

---

## 3. Arquitectura de aplicación (implementada)

### 3.1 Diagrama lógico

```
                    ┌─────────────────────────────────────────┐
  Entrada :80       │  contenedor: frontend-credentials        │
  (HTTP hoy)        │  ┌─────────────────────────────────────┐ │
  ───────────────►  │  │ Nginx (frontend_credentials_21)      │ │
                    │  │  /        → Angular (SPA)            │ │
                    │  │  /api/*   → proxy_pass → api:3000    │ │
                    │  └─────────────────────────────────────┘ │
                    └──────────────────┬──────────────────────┘
                                       │ red Docker: credentials_internal
                    ┌──────────────────▼──────────────────────┐
                    │  contenedor: api-credentials             │
                    │  NestJS :3000 (solo expose, no ports)    │
                    └──────────────────┬──────────────────────┘
                                       │ red Docker: db_credencial_back-network
                    ┌──────────────────▼──────────────────────┐
                    │  contenedor: postgres_server             │
                    │  PostgreSQL :5432                        │
                    └─────────────────────────────────────────┘
```

### 3.2 Proyectos y responsabilidades

| Repositorio / compose | Contenedores | Rol |
|----------------------|--------------|-----|
| `db_credencial` | `postgres_server`, `postgres_admin`, `db-proxy` | Base de datos aislada + admin BD |
| `back` (`docker-compose.yml`) | `api-credentials`, `frontend-credentials` | API + frontend público |

### 3.3 Flujo de una petición típica

1. Usuario abre `http://servidor/` → Nginx Docker sirve `index.html` (Angular).
2. Angular llama `GET /api/auth/me` (ruta relativa, mismo origen).
3. Nginx Docker recibe `/api/auth/me` → reenvía a `http://api:3000/auth/me`.
4. NestJS consulta PostgreSQL en `postgres_server:5432`.
5. Respuesta vuelve por el mismo camino; cookies HttpOnly viajan en el mismo dominio.

### 3.4 Por qué `enap_api: '/api'` en Angular

- Mismo origen en el navegador → no hay problemas de CORS en el flujo normal.
- Funciona igual en HTTP (hoy) y HTTPS (cuando llegue el certificado).
- No depende de IPs ni puertos internos visibles al usuario.

---

## 4. Qué es el “proxy institucional” y cómo encaja

En ENAP, “proxy institucional” suele referirse a un **reverse proxy** (proxy inverso) administrado por infraestructura, **delante** del servidor de aplicación. No reemplaza el Nginx Docker; es una capa adicional en la red.

### 4.1 Escenario más probable en entidades públicas

```
Usuario
   │  HTTPS
   ▼
┌─────────────────────────────┐
│ Proxy / balanceador ENAP     │  ← Certificado SSL institucional
│ credenciales.enap.edu.co     │
└──────────────┬──────────────┘
               │  HTTP interno (VLAN)
               ▼
┌─────────────────────────────┐
│ Servidor VM aplicación       │
│ Docker :80                   │
│  frontend-credentials        │
│    ├─ /      → Angular       │
│    └─ /api/* → api:3000      │
└──────────────┬──────────────┘
               │  red privada
               ▼
┌─────────────────────────────┐
│ Servidor VM BD               │
│ PostgreSQL (sin internet)    │
└─────────────────────────────┘
```

### 4.2 Qué hace cada capa

| Capa | Quién la administra | Función |
|------|---------------------|---------|
| Proxy institucional ENAP | Infraestructura ENAP | DNS, SSL público, firewall, posible WAF, reenvío a VM app |
| Nginx Docker (frontend) | Equipo de aplicación | Servir Angular, proxy `/api`, headers `X-Forwarded-*` |
| NestJS API | Equipo de aplicación | Lógica de negocio, auth, cookies |
| PostgreSQL | Equipo de aplicación + DBA | Persistencia, aislada |

### 4.3 Error común a evitar

**Incorrecto:** que ENAP enrute `/` al frontend y `/api` directamente al puerto 3000.

**Correcto:** todo el tráfico (`/` y `/api/*`) va al **puerto 80** del contenedor `frontend-credentials`. El proxy interno de Docker ya separa SPA y API.

---

## 5. Qué significa “dar salida WiFi / internet al servidor”

Esto puede significar cosas distintas. La arquitectura de aplicación cambia según el caso:

| Significado | Efecto en la app | ¿Cambia algo en Docker? |
|-------------|------------------|-------------------------|
| **Solo salida (outbound)** | El servidor puede enviar correo (Azure), actualizaciones, etc. | No cambia la entrada de usuarios |
| **Entrada (inbound) públicada** | Usuarios externos pueden abrir la URL | Activar HTTPS y `AUTH_COOKIE_SECURE=true` |
| **Solo acceso red interna ENAP** | Usuarios en VLAN/VPN de ENAP | Puede seguir en HTTP o HTTPS interno |
| **IP pública directa a la VM** | Sin proxy ENAP delante | Evaluar SSL en Docker (`:443`) |

**La BD no participa en ninguno de estos escenarios de exposición.**

---

## 6. SSL / HTTPS — Caminos posibles

| Camino | Cuándo aplica | Cambios en su lado | Cambios en ENAP |
|--------|---------------|-------------------|-----------------|
| **A — Proxy institucional** | ENAP tiene balanceador/proxy con certificado | `.env`: `AUTH_COOKIE_SECURE=true`; validar headers | DNS, SSL, reenvío a `VM:80`, `X-Forwarded-Proto: https` |
| **B — SSL en Docker** | No hay proxy ENAP; la VM recibe tráfico directo en 443 | Nginx `:443`, volumen de certs, `443:443` en compose | Firewall abre 443 a la VM |
| **C — Solo red interna** | App no pública en internet | HTTP o certificado interno; cookies según protocolo | DNS interno, reglas VLAN |

Guía operativa detallada: [SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md)

### Estado actual (sin certificado)

```env
AUTH_COOKIE_SECURE=false
PUBLIC_APP_URL=https://credenciales.enap.edu.co
```

- App en HTTP `:80` — correcto para hoy.
- `PUBLIC_APP_URL` en HTTPS anticipa el dominio final para QR en PDF.

---

## 7. Evaluación: ¿estamos en el camino correcto?

### 7.1 Decisiones acertadas (mantener)

| Decisión | Por qué es correcta |
|----------|---------------------|
| Nginx en Docker, no en host | Coherente con su operación actual; un solo artefacto desplegable; mismo patrón que `db_credencial` |
| API no expuesto en `:3000` | Reduce superficie de ataque; un solo punto de entrada |
| Rutas relativas `/api` en Angular | Compatible con proxy institucional, SSL y mismo origen |
| BD en VM/red separada sin internet | Alineado con buenas prácticas institucionales |
| Cookies HttpOnly + CSRF | Adecuado para aplicación con sesión en navegador |
| `trust proxy` en NestJS | Necesario detrás de proxy ENAP o Nginx Docker |
| Headers `X-Forwarded-Proto` en Nginx Docker | Preparado para SSL terminado fuera del contenedor |

### 7.2 Riesgos / puntos por confirmar (no son errores de diseño)

| Punto | Riesgo si no se aclara | Acción |
|-------|------------------------|--------|
| ¿Quién termina HTTPS? | Configuración SSL incorrecta o cookies que no funcionan | Preguntar a infraestructura ENAP (ver sección 9) |
| ¿App pública o solo red ENAP? | Expectativas distintas sobre acceso | Definir con negocio + infra |
| `AUTH_COOKIE_SECURE` al activar HTTPS | Login roto si queda en `false` con HTTPS, o al revés | Seguir checklist en SSL_CERTIFICATE.md |
| PostgreSQL en `:5432` publicado en `db_credencial` | Exposición de BD si el firewall no filtra bien | En producción: quitar `ports: 5432` o restringir por firewall |
| Correo Azure desde servidor sin salida | Envío de PDF por correo falla | Confirmar reglas de salida SMTP / proxy outbound |
| Caché del frontend (`immutable` 30 días) | Usuarios ven JS viejo tras deploy | Hard refresh tras cada despliegue del front |

### 7.3 Cuándo SÍ habría que cambiar de camino

| Situación | Camino alternativo |
|-----------|-------------------|
| ENAP exige Nginx/Apache instalado en el host por política | Instalar reverse proxy en host que reenvíe a `127.0.0.1:80` (el Docker interno sigue igual) |
| ENAP no puede hacer proxy y exige TLS en la VM sin balanceador | Escenario B: SSL en Docker (`:443`) |
| Front y API deben estar en dominios distintos | Cambiar `enap_api` a URL absoluta + CORS + `AUTH_COOKIE_SAMESITE=none` — **no recomendado** con el diseño actual |
| Separar front y API en servidores distintos | Dos despliegues, CORS estricto, cookies más complejas — **no necesario hoy** |
| Alta disponibilidad multi-nodo | Balanceador ENAP con varias réplicas de `frontend-credentials` — evolución futura |

**Ninguna de estas alternativas invalida el trabajo hecho hasta ahora.** La mayoría son ajustes perimetrales, no reescritura de la aplicación.

---

## 8. Matriz de decisión rápida

Use esta tabla con la respuesta de infraestructura ENAP:

| Pregunta | Respuesta A | Respuesta B | Qué camino seguir |
|----------|-------------|-------------|-------------------|
| ¿Hay balanceador/proxy ENAP delante? | Sí | No | A → solo `.env` + validación / B → SSL en Docker |
| ¿Usuarios desde internet público? | Sí | Solo red ENAP | A o B con HTTPS / puede ser HTTP interno temporalmente |
| ¿Certificado lo entrega ENAP en su proxy? | Sí | No, en nuestra VM | Escenario A / Escenario B |
| ¿BD debe seguir sin internet? | Sí (esperado) | — | **Mantener arquitectura actual** |
| ¿Puerto de entrada a la VM? | 80 (HTTP interno) | 443 directo | Docker `:80` / Docker `:443` |

---

## 9. Preguntas para infraestructura ENAP

Documento listo para enviar o usar en reunión:

1. ¿La aplicación `credenciales.enap.edu.co` será accesible desde **internet público** o solo desde **red interna / VPN** de ENAP?
2. ¿Existirá un **balanceador o reverse proxy institucional** delante de nuestra VM de aplicación?
3. Si hay proxy institucional:
   - ¿A qué **IP y puerto interno** deben apuntar? (propuesta: `IP_VM_APP:80`)
   - ¿Se reenvía **todo** el tráfico (`/` y `/api/*`) al mismo destino?
   - ¿El proxy envía el header `X-Forwarded-Proto: https`?
   - ¿Quién administra el **certificado SSL**?
4. ¿La VM de base de datos debe mantener **cero acceso** a internet? (recomendado: sí)
5. ¿La VM de aplicación necesita **salida a internet** para correo (Office 365 / Azure)? ¿Hay proxy de salida HTTP/HTTPS?
6. ¿Qué reglas de **firewall** aplicarán entre internet/red ENAP y nuestra VM?
7. ¿ENAP requiere Nginx o Apache instalado en el **sistema operativo** del servidor, o aceptan que el reverse proxy de aplicación viva en **Docker**?

### Respuesta técnica que ustedes deben proponer a ENAP

> “Nuestra aplicación expone un único punto de entrada en el puerto **80** del servidor de aplicación. Todo el tráfico web — incluyendo `/api` — debe llegar a ese puerto. Nosotros no exponemos el puerto 3000. La base de datos está en otro servidor, sin internet, y solo es accedida por la aplicación por red privada.”

---

## 10. Comparación con alternativas no elegidas

| Enfoque | Ventajas | Desventajas | ¿Por qué no lo usamos? |
|---------|----------|-------------|-------------------------|
| **Nginx en host + Docker sin proxy** | Control OS-level | Dos capas nginx, más ops, no lo tienen instalado | Innecesario con nginx en contenedor frontend |
| **API en :3000 público, front en :80** | Separación simple | Dos orígenes, CORS, cookies complejas, más superficie de ataque | Peor seguridad y más fricción auth |
| **Kubernetes / orquestador** | Escala, HA | Complejidad alta para el tamaño actual | Over-engineering para etapa actual |
| **Serverless / PaaS** | Menos servidor | No encaja con BD on-premise aislada | Infra ENAP es VM + VLAN |
| **Un solo contenedor (front+api)** | Un solo proceso | Mezcla responsabilidades, peor escalado | Ya separados correctamente |

---

## 11. Checklist de validación antes de producción

### Infraestructura

- [ ] Red `db_credencial_back-network` operativa
- [ ] BD accesible solo desde servidor de aplicación
- [ ] Definido: proxy ENAP vs. SSL en Docker
- [ ] DNS `credenciales.enap.edu.co` configurado
- [ ] Firewall: solo puertos necesarios (80 y/o 443 hacia VM app)
- [ ] Salida SMTP/Azure permitida si se usa envío de correo

### Aplicación

- [ ] `docker compose` desplegado (`frontend` + `api`)
- [ ] `curl http://servidor/` → 200
- [ ] `curl http://servidor/api/docs` → 200
- [ ] Login funcional con cookies
- [ ] `JWT_SECRET` y secretos en `.env` (no en git)
- [ ] Migraciones Prisma aplicadas

### HTTPS (cuando aplique)

- [ ] `AUTH_COOKIE_SECURE=true`
- [ ] `PUBLIC_APP_URL=https://credenciales.enap.edu.co`
- [ ] Login por HTTPS con cookies `Secure`
- [ ] QR del PDF apunta al dominio HTTPS

---

## 12. Recomendación final

| Pregunta | Respuesta |
|----------|-----------|
| ¿Vamos por buen camino? | **Sí.** La separación BD aislada + app en Docker con nginx integrado es adecuada para ENAP. |
| ¿Hay que rehacer la aplicación? | **No.** |
| ¿Hay que instalar Nginx en el host? | **No necesariamente.** Solo si ENAP lo exige por política. |
| ¿Qué falta? | Definir con infraestructura el **perímetro de red** (proxy ENAP vs. SSL en VM) y activar HTTPS en `.env` cuando corresponda. |
| ¿La BD debe cambiar cuando den internet al servidor app? | **No.** Sigue aislada. |

### Próximo paso sugerido

1. Reunión o correo a infraestructura ENAP con las preguntas de la sección 9.
2. Según respuesta, seguir [SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md) escenario A o B.
3. Mantener el stack Docker actual; ajustar solo `.env` y, si aplica, puerto 443 o reglas de firewall.

---

## 13. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) | Cómo desplegar, migraciones, build limpio |
| [AUTH_DEPLOYMENT.md](./AUTH_DEPLOYMENT.md) | Cookies, CSRF, proxy `/api`, ambientes |
| [SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md) | Pasos cuando llegue el certificado |
| [SECURITY.md](./SECURITY.md) | Controles de seguridad de la API |
| `frontend_credentials_21/nginx/nginx.conf` | Configuración Nginx activa en producción |

---

## 14. Historial de decisiones de arquitectura

| Fecha | Decisión | Motivo |
|-------|----------|--------|
| 2026 | Nginx dentro del contenedor frontend | Sin nginx en host; despliegue reproducible con Docker |
| 2026 | API no publicado en puerto 3000 | Un solo punto de entrada; menor superficie de ataque |
| 2026 | `enap_api: '/api'` relativo | Mismo origen; compatible con SSL y proxy institucional |
| 2026 | Eliminados `back/nginx/*.conf` de host | No aplicaban a la arquitectura real |
| Pendiente | Modelo SSL definitivo (A o B) | Esperar definición de infraestructura ENAP |

---

*Documento vivo: actualizar cuando infraestructura ENAP confirme el modelo de publicación y certificado.*
