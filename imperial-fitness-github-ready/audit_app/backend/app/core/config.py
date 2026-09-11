from functools import lru_cache
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Imperial Fitness API"
    app_env: str = "local"
    database_url: str = "sqlite:///./imperial_fitness.db"
    secret_key: str = "change-this-secret-key-before-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    max_login_attempts: int = 5
    login_lock_minutes: int = 15
    password_reset_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
    rate_limit_per_minute: int = 90
    rate_limit_enabled: bool = True
    redis_url: str | None = None
    slowapi_enabled: bool = True
    cache_ttl_seconds: int = 300
    async_jobs_enabled: bool = False
    rq_queue_name: str = "imperial-default"
    trusted_hosts: str = "localhost,127.0.0.1"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    storage_mode: str = "local"
    cloudinary_url: str | None = None
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 8
    allowed_image_types: str = "image/jpeg,image/png,image/webp"
    default_logo_url: str = "/logo-imperial-fitness.png"
    default_avatar_url: str = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    ai_mode: str = "local_rules"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    openai_timeout_seconds: int = 30
    refresh_cookie_name: str = "imperial_refresh_token"
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1
    log_level: str = "INFO"
    betterstack_source_token: str | None = None
    uptime_check_token: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "Imperial Fitness"
    smtp_use_tls: bool = True
    enable_hsts: bool = False
    hsts_max_age: int = 31536000
    csp_policy: str = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    metrics_enabled: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    @property
    def allowed_image_type_list(self) -> list[str]:
        return [item.strip() for item in self.allowed_image_types.split(",") if item.strip()]

    @field_validator("cors_origins")
    @classmethod
    def reject_wildcard_cors_in_production(cls, value: str):
        if "*" in value:
            raise ValueError("No uses '*' en CORS_ORIGINS. Define el dominio exacto de tu app.")
        return value

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.app_env == "production":
            if self.secret_key in {"change-this-secret-key-before-production", "change-this-secret-key-before-production-use-a-long-random-value"}:
                raise ValueError("SECRET_KEY debe ser una clave larga y segura en producción.")
            if "localhost" in self.cors_origins or "127.0.0.1" in self.cors_origins:
                raise ValueError("CORS_ORIGINS de producción no debe incluir localhost.")
            if self.storage_mode == "local":
                raise ValueError("STORAGE_MODE=local no es válido para producción. Usa cloudinary o storage externo.")
            if not self.redis_url:
                raise ValueError("REDIS_URL es obligatorio en producción para rate limiting distribuido.")
            if not self.enable_hsts:
                raise ValueError("ENABLE_HSTS=true es obligatorio en producción detrás de HTTPS.")
            if not (self.smtp_host and self.smtp_username and self.smtp_password and self.smtp_from_email):
                raise ValueError("SMTP real es obligatorio en producción para recuperación de cuentas.")
            if self.storage_mode == "cloudinary" and not (
                self.cloudinary_url or (self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)
            ):
                raise ValueError("Cloudinary requiere CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET en producción.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()