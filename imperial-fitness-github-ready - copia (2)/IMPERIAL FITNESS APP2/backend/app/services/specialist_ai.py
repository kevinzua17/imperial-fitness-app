import json
from app.core.config import get_settings
from app.schemas import SpecialistSuggestionRequest, SpecialistSuggestionResponse


SYSTEM_PROMPT = """
Eres un asistente interno para entrenadores y administradores de Imperial Fitness.
No hablas directamente con clientes. Tu trabajo es ayudar al especialista humano a revisar
progreso, dieta, rutina, adherencia y riesgos. No diagnostiques enfermedades. No prometas
resultados médicos. Da recomendaciones prácticas, prudentes y revisables por el entrenador.
Responde siempre en JSON válido con estas claves:
summary: string
recommendations: string[]
cautions: string[]
coach_message_draft: string
""".strip()


def _local_rules_response(payload: SpecialistSuggestionRequest) -> SpecialistSuggestionResponse:
    text = " ".join([
        payload.goal or "",
        payload.question or "",
        payload.recent_metrics or "",
        payload.current_diet or "",
        payload.current_routine or "",
    ]).lower()
    recommendations: list[str] = []
    cautions: list[str] = []

    if "asistencia" in text and any(marker in text for marker in ["42", "baja", "6 días", "sin asistir"]):
        recommendations.append("Priorizar adherencia antes de subir cargas: agendar contacto directo y una sesión corta de retorno.")
        cautions.append("No aumentar volumen de entrenamiento si el cliente viene con baja asistencia.")
    if any(word in text for word in ["grasa", "definición", "perdida"]):
        recommendations.append("Mantener déficit moderado y usar alimentos de alto volumen como papa cocida, vegetales y proteínas magras.")
        cautions.append("Evitar recortar demasiado carbohidrato si el rendimiento en sala está cayendo.")
    if any(word in text for word in ["15 reps", "15 rep", "rir 2", "rir: 2", "rir 3"]):
        recommendations.append("Si completó 12-15 repeticiones con RIR 2 o más, sugerir aumento pequeño de carga en la próxima serie o sesión.")
    if any(word in text for word in ["rir 0", "fallo", "dolor"]):
        recommendations.append("Mantener o reducir carga y revisar técnica antes de progresar.")
        cautions.append("Si hay dolor articular, detener progresión y remitir a valoración profesional.")
    if any(word in text for word in ["masa muscular", "musculo", "músculo"]):
        recommendations.append("Verificar que la proteína diaria esté cerca de 1.8-2.2g/kg y que el descanso sea suficiente.")

    if not recommendations:
        recommendations = [
            "Revisar tendencia de peso, grasa, masa muscular y rendimiento antes de cambiar el plan.",
            "Hacer ajustes pequeños y medir respuesta durante 7 a 14 días.",
            "Mantener comunicación semanal para mejorar adherencia.",
        ]
    if not cautions:
        cautions = ["No hacer cambios drásticos sin datos suficientes de progreso, asistencia y recuperación."]

    return SpecialistSuggestionResponse(
        summary="Recomendación generada mediante análisis local del progreso. No se usó API externa.",
        recommendations=recommendations[:8],
        cautions=cautions[:8],
        coach_message_draft="Hola, revisé tu progreso y haré un ajuste prudente según tus registros recientes. Mantendremos el foco en técnica, adherencia y progresión gradual.",
        source="local_rules",
    )


def _fallback_response(reason: str, payload: SpecialistSuggestionRequest | None = None) -> SpecialistSuggestionResponse:
    if payload is not None:
        return _local_rules_response(payload)
    return SpecialistSuggestionResponse(
        summary=f"Recomendación generada mediante análisis local del progreso. Motivo: {reason}",
        recommendations=[
            "Configura OPENAI_API_KEY en el archivo .env del backend.",
            "Reinicia uvicorn después de modificar variables de entorno.",
            "Mientras tanto, revisa manualmente calorías, adherencia, asistencia y evolución corporal.",
        ],
        cautions=[
            "No enviar recomendaciones automatizadas al cliente sin revisión del entrenador.",
            "Si hay dolor, lesión o síntomas clínicos, remitir a profesional de salud.",
        ],
        coach_message_draft="Hola, revisaré tus métricas y ajustaré tu plan manualmente para mantenerlo alineado con tu objetivo.",
        source="local_rules",
    )


def generate_specialist_suggestion(payload: SpecialistSuggestionRequest) -> SpecialistSuggestionResponse:
    settings = get_settings()
    if settings.ai_mode == "local_rules" or not settings.openai_api_key:
        return _local_rules_response(payload)

    try:
        from openai import OpenAI
    except Exception:
        return _fallback_response("paquete openai no instalado en el entorno Python", payload)

    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds)

    user_payload = {
        "client_name": payload.client_name,
        "goal": payload.goal,
        "question": payload.question,
        "recent_metrics": payload.recent_metrics,
        "current_diet": payload.current_diet,
        "current_routine": payload.current_routine,
    }

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content or "{}"
    parsed = json.loads(raw_text)
    return SpecialistSuggestionResponse(
        summary=str(parsed.get("summary", ""))[:2000],
        recommendations=[str(item)[:800] for item in parsed.get("recommendations", [])][:8],
        cautions=[str(item)[:800] for item in parsed.get("cautions", [])][:8],
        coach_message_draft=str(parsed.get("coach_message_draft", ""))[:2000],
        source="openai",
    )