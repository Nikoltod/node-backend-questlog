# Lab 18 - Environment Configuration

## Goal

Understand how to centralize environment configuration instead of scattering `process.env` throughout the app.

## Requirement

This lab requires Docker and Docker Compose because PostgreSQL runs inside a Docker container.

On Linux, Docker may require sudo.

## Setup

Copy the example environment file:

```bash
cp labs/18-environment-configuration/.env.example labs/18-environment-configuration/.env