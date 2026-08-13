# ELog — Tech Stack Details
> Load via `@docs/tech-stack.md` when doing setup / infra / config tasks.
> CLAUDE.md §2 has the summary table — this file adds depth.

---

## Backend — Spring Boot 3.x

### Project Structure Pattern
```
com.elog/
├── config/           # SecurityConfig, JwtConfig, SwaggerConfig
├── controller/       # REST controllers (thin — delegate to service)
├── service/          # Business logic layer
│   └── impl/         # Service implementations
├── repository/       # JPA repositories (extend JpaRepository)
├── entity/           # JPA @Entity classes
├── dto/              # Request / Response DTOs (no entity exposure)
│   ├── request/
│   └── response/
├── exception/        # GlobalExceptionHandler + custom exceptions
├── security/         # JwtFilter, UserDetailsServiceImpl
└── util/             # Helpers (e.g., ExcelParser, LIFOUtil)
```

### Key Dependencies (pom.xml)
```xml
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation
mysql-connector-j
flyway-core
flyway-mysql
io.jsonwebtoken:jjwt-api:0.11.x
springdoc-openapi-starter-webmvc-ui   <!-- Swagger UI -->
apache-poi (ooxml)                     <!-- Excel parsing -->
lombok
```

### application.yml Key Sections
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/elog_db?useSSL=false&serverTimezone=UTC
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: validate          # Flyway manages schema — NEVER use create/update
    show-sql: false               # Set true only in dev profile
  flyway:
    enabled: true
    locations: classpath:db/migration

elog:
  jwt:
    secret: ${JWT_SECRET}         # from env var — never hardcode
    expiration-ms: 86400000       # 24 hours
```

### Flyway Migration Naming Convention
```
V{version}__{description}.sql
Example: V1__init_schema.sql
         V2__add_trip_table.sql
```

---

## Frontend — ReactJS 19.x

### Project Bootstrap (Standalone Workspace)
The frontend project is initialized at the root level using Vite with TypeScript:
```bash
npm create vite@latest ./ -- --template react-ts
npm install
```

### Key Dependencies (package.json)
```json
"axios"           : "^1.17.0"    // HTTP client
"react-router-dom": "^7.17.0"    // routing (React Router v7)
"@reduxjs/toolkit": "^2.12.0"    // state management
"react-redux"     : "^9.3.0"     // react bindings for redux
"antd"            : "^6.4.3"     // UI component library
"dayjs"           : "^1.11.21"   // date formatting
```

### Folder Conventions
```
src/
├── api/            # Axios instance + API call modules
├── components/     # Reusable UI components (no page logic)
├── pages/          # Route-level page components (Login, Dashboard, etc.)
├── hooks/          # Custom React hooks (skeleton)
├── store/          # Redux slices (skeleton)
├── types/          # TypeScript interfaces / enums (skeleton)
└── utils/          # Pure helper functions (skeleton)
```

### Axios Base Config
```ts
// src/api/axiosInstance.ts
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
```

## Database — MySQL 8.x

- Character set: `utf8mb4`, Collation: `utf8mb4_unicode_ci`
- All tables use `id BIGINT PRIMARY KEY AUTO_INCREMENT`
- Timestamps: `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP`
- Soft delete via `deleted_at DATETIME NULL` (where applicable)

> Entity relationships → `@docs/data-model.md`

---

## Authentication — JWT

```
POST /api/v1/auth/login  → { token, expiresIn, user: { id, role } }

Header on subsequent requests:
Authorization: Bearer <token>

Role values: DISPATCHER · WAREHOUSE_STAFF · DRIVER · LOGISTICS_MANAGER · ADMIN
```

---

## Firebase (Deferred — INC-2+)
- Used for real-time GPS feed ingestion
- Driver app pushes location; dashboard subscribes
- Not in Sprint 1 scope — do not scaffold yet

---

## AWS (Deferred)
- S3 for e-POD image storage
- Not in Sprint 1 scope — do not scaffold yet

---

## Git Strategy

### Branches
```
main        ← production releases only
develop     ← integration branch (PR target)
feature/US-{n}-{short-desc}   ← individual feature work
hotfix/...  ← critical production fixes
```

### PR Template (minimum)
```markdown
## What
Brief description of the change.

## Why
Business reason / US reference.

## Checklist
- [ ] Tests pass
- [ ] DoD met (see CLAUDE.md §9)
- [ ] No secrets committed
```

---

## CI Pipeline (GitHub Actions)
```yaml
# CI Pipeline for ELog-FE (GitHub Actions)
on: [push, pull_request]
jobs:
  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```
