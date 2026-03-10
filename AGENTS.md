# AGENTS.local.md

AI Agent Guidelines for WoojuDraw Project

NOTE: This file is intended for local AI coding agents (Copilot, Codex,
Cursor, etc.) It is recommended to keep this file OUT of git tracking.

------------------------------------------------------------------------

# 1. Project Overview

WoojuDraw is a web-based emotional journaling service where users create
stars in a personal universe through drawing and reflection.

Core concept: User emotion → Drawing / reflection → Stored entry →
Visualized as stars in a universe.

Main features: - Daily emotion drawing - Deep reflection content - Star
generation based on entries - Personal star map visualization -
Emotional history tracking

Tech stack:

Frontend - React - Three.js

Backend - Spring Boot - JPA / Hibernate - PostgreSQL - Redis

Infrastructure - Docker Compose - Nginx - AWS S3 - AWS RDS

AI - Python service - Image / emotion analysis

------------------------------------------------------------------------

# 2. Repository Structure

root ├ fe/ ├ be/ ├ ai/ ├ infra/ ├ docs/

------------------------------------------------------------------------

# 3. Git Branch Strategy

Main branches - master - dev

Feature branches feat/{domain}/{feature}

Examples - feat/be/auth-login - feat/be/s3-presigned-url -
feat/be/ai-callback - feat/fe/star-map - feat/ai/image-analysis

Agents must not commit directly to master or dev.

------------------------------------------------------------------------

# 4. Commit Convention

Format

\[AREA\] type: description

Areas

FE BE AI INFRA DOCS

Types

feat fix refactor docs test chore

------------------------------------------------------------------------

# 5. Backend Architecture

Base package

com.woojudraw

Structure

domain └ {domain} ├ api ├ application ├ domain └ infrastructure

Controllers must remain thin. Business logic must exist inside services.

------------------------------------------------------------------------

# 6. API Response Standard

Success

{ "success": true, "data": {} }

Failure

{ "success": false, "error": { "code": "ERROR_CODE", "message": "error
message", "details": {} } }

------------------------------------------------------------------------

# 7. Star System

Star properties

id kind size color shapeType weekStartDate

Star types

DAILY DEEP

------------------------------------------------------------------------

# 8. AI Integration

Flow

Client → Backend → AI → Callback → Backend

Callback must include

entryId analysisResult status

------------------------------------------------------------------------

# 9. S3 Upload Strategy

Client → Backend → Presigned URL\
Client → Upload to S3\
Client → Notify backend

Backend must not proxy file uploads.

------------------------------------------------------------------------

# 10. Security

JWT authentication

Access Token Refresh Token

Refresh tokens stored in Redis.

------------------------------------------------------------------------

# 11. Coding Style

Java

-   constructor injection
-   avoid field injection
-   DTO naming: SomethingRequest / SomethingResponse
