"""Professional PDF export for a client's published Imperial Fitness plan.

The report intentionally uses only data already published to the client. It does
not calculate a new prescription, alter plans, or expose private server paths.
Exercise images are loaded from the bundled public/exercises library when the
routine payload references them. A very small allow-list is used for remote
Cloudinary images so the PDF renderer cannot become an SSRF proxy.
"""
from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urlparse

import httpx
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.utils import ImageReader

from app.core.config import get_settings
from app.models import AssignedRoutine, DietPlan, User

settings = get_settings()
PROJECT_ROOT = Path(__file__).resolve().parents[3]
PUBLIC_ROOT = (PROJECT_ROOT / "public").resolve()

RED = colors.HexColor("#DC2626")
DARK = colors.HexColor("#111111")
MID = colors.HexColor("#525252")
LIGHT = colors.HexColor("#F5F5F5")
BORDER = colors.HexColor("#D4D4D4")
GREEN = colors.HexColor("#047857")


def _safe_json(raw: str | None, fallback: Any) -> Any:
    try:
        parsed = json.loads(raw or "")
        return parsed
    except (TypeError, ValueError, json.JSONDecodeError):
        return fallback


def _clean_text(value: Any, limit: int = 800) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    # ReportLab Paragraph interprets a small HTML subset. Escape user content.
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )[:limit]


def _resolve_local_image(url: str) -> Path | None:
    if not url:
        return None
    parsed = urlparse(url)
    path = parsed.path or url
    # Exercise assets are bundled in the frontend public folder.
    if not path.startswith("/exercises/") and not path.startswith("exercises/"):
        return None
    candidate = (PUBLIC_ROOT / path.lstrip("/")).resolve()
    try:
        candidate.relative_to(PUBLIC_ROOT)
    except ValueError:
        return None
    if candidate.is_file() and candidate.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
        return candidate
    return None


def _remote_host_allowed(hostname: str) -> bool:
    host = (hostname or "").lower().strip(".")
    if not host:
        return False
    allowed = {"res.cloudinary.com"}
    for configured in (settings.frontend_url, settings.backend_url):
        parsed = urlparse(configured or "")
        if parsed.hostname:
            allowed.add(parsed.hostname.lower())
    return host in allowed


def _image_bytes(url: str) -> BytesIO | Path | None:
    local = _resolve_local_image(url)
    if local:
        return local

    parsed = urlparse(url or "")
    if parsed.scheme != "https" or not _remote_host_allowed(parsed.hostname or ""):
        return None
    try:
        with httpx.Client(timeout=3.5, follow_redirects=False) as client:
            response = client.get(url, headers={"User-Agent": "ImperialFitnessReport/1.21"})
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
            if content_type not in {"image/jpeg", "image/png", "image/webp"}:
                return None
            if len(response.content) > 5 * 1024 * 1024:
                return None
            return BytesIO(response.content)
    except (httpx.HTTPError, ValueError):
        return None


def _exercise_image(url: str | None, width: float = 3.1 * cm, height: float = 2.35 * cm) -> Image | None:
    if not url:
        return None
    source = _image_bytes(url)
    if not source:
        return None
    try:
        # Validate before passing it to ReportLab and keep aspect ratio.
        reader = ImageReader(source)
        iw, ih = reader.getSize()
        if not iw or not ih:
            return None
        if isinstance(source, BytesIO):
            source.seek(0)
        scale = min(width / iw, height / ih)
        return Image(source, width=iw * scale, height=ih * scale)
    except Exception:
        return None


class _NumberedDocTemplate(BaseDocTemplate):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="imperial", frames=frame, onPage=self._decorate_page))

    @staticmethod
    def _decorate_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.4)
        canvas.line(doc.leftMargin, 1.25 * cm, A4[0] - doc.rightMargin, 1.25 * cm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MID)
        canvas.drawString(doc.leftMargin, 0.82 * cm, "IMPERIAL FITNESS · PLAN PERSONALIZADO")
        canvas.drawRightString(A4[0] - doc.rightMargin, 0.82 * cm, f"Página {doc.page}")
        canvas.restoreState()


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ImperialTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=27,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "ImperialSubtitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=RED,
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "h1": ParagraphStyle(
            "ImperialH1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=DARK,
            spaceBefore=8,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "ImperialH2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=RED,
            spaceBefore=7,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "ImperialBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=DARK,
        ),
        "small": ParagraphStyle(
            "ImperialSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10.5,
            textColor=MID,
        ),
        "strong": ParagraphStyle(
            "ImperialStrong",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=DARK,
        ),
        "center": ParagraphStyle(
            "ImperialCenter",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=DARK,
        ),
    }


def _summary_table(client: User, coach: User | None, routine: AssignedRoutine | None, diet: DietPlan | None, styles: dict) -> Table:
    rows = [
        [Paragraph("Cliente", styles["small"]), Paragraph(_clean_text(client.name), styles["strong"])],
        [Paragraph("Objetivo", styles["small"]), Paragraph(_clean_text(client.goal or (routine.objective if routine else "Plan personalizado")), styles["body"])],
        [Paragraph("Coach", styles["small"]), Paragraph(_clean_text(coach.name if coach else "Equipo Imperial Fitness"), styles["body"])],
        [Paragraph("Rutina", styles["small"]), Paragraph(_clean_text(routine.title if routine else "Sin rutina publicada"), styles["body"])],
        [Paragraph("Plan nutricional", styles["small"]), Paragraph(_clean_text(f"{diet.title} · v{diet.version}" if diet else "Sin plan publicado"), styles["body"])],
    ]
    table = Table(rows, colWidths=[4.1 * cm, 12.2 * cm], hAlign="CENTER")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E5E5E5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _macro_table(diet: DietPlan, styles: dict) -> Table:
    values = [
        ("Calorías", f"{diet.calories} kcal"),
        ("Proteína", f"{diet.protein} g"),
        ("Carbohidratos", f"{diet.carbs} g"),
        ("Grasas", f"{diet.fat} g"),
    ]
    data = [[Paragraph(label, styles["small"]), Paragraph(value, styles["strong"])] for label, value in values]
    table = Table(data, colWidths=[4.0 * cm, 4.0 * cm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D1FAE5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _exercise_block(exercise: dict, index: int, styles: dict):
    name = _clean_text(exercise.get("name") or f"Ejercicio {index}")
    sets = exercise.get("sets", "—")
    reps = _clean_text(exercise.get("reps") or "—", 80)
    rest = _clean_text(exercise.get("rest") or "60–90 s", 80)
    rir = _clean_text(exercise.get("targetRir") or exercise.get("target_rir") or "—", 80)
    notes = _clean_text(exercise.get("notes") or "", 500)
    equipment = _clean_text(exercise.get("equipment") or "", 120)
    technique = exercise.get("intensityTechnique") or {}
    technique_label = _clean_text(technique.get("label") if isinstance(technique, dict) else "", 120)

    img = _exercise_image(exercise.get("imageUrl") or exercise.get("image_url"))
    if img is None:
        visual = Table([[Paragraph("IMAGEN\nNO DISPONIBLE", styles["center"])]], colWidths=[3.1 * cm], rowHeights=[2.35 * cm])
        visual.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.4, BORDER),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
    else:
        visual = img

    detail_parts = [
        f"<b>{index}. {name}</b>",
        f"<b>{sets}</b> series × <b>{reps}</b> repeticiones",
        f"Descanso: {rest} · RIR objetivo: {rir}",
    ]
    if equipment:
        detail_parts.append(f"Equipo: {equipment}")
    if technique_label:
        detail_parts.append(f"Técnica avanzada: {technique_label}")
    if notes:
        detail_parts.append(f"Indicaciones: {notes}")
    detail = Paragraph("<br/>".join(detail_parts), styles["body"])

    table = Table([[visual, detail]], colWidths=[3.5 * cm, 12.8 * cm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return KeepTogether([table, Spacer(1, 0.14 * cm)])


def build_plan_pdf(
    *,
    client: User,
    coach: User | None,
    routine: AssignedRoutine | None,
    diet: DietPlan | None,
) -> bytes:
    buffer = BytesIO()
    doc = _NumberedDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.6 * cm,
        leftMargin=1.6 * cm,
        topMargin=1.55 * cm,
        bottomMargin=1.7 * cm,
        title=f"Imperial Fitness - Plan de {client.name}",
        author="Imperial Fitness",
        subject="Rutina de entrenamiento y plan de alimentación publicados",
    )
    styles = _styles()
    story = []

    logo_path = PUBLIC_ROOT / "logo-imperial-fitness.png"
    if logo_path.exists():
        try:
            logo = Image(str(logo_path), width=3.5 * cm, height=3.5 * cm, kind="proportional")
            logo.hAlign = "CENTER"
            story.extend([logo, Spacer(1, 0.15 * cm)])
        except Exception:
            pass

    story.append(Paragraph("IMPERIAL FITNESS", styles["title"]))
    story.append(Paragraph("PLAN PERSONALIZADO · ENTRENAMIENTO + ALIMENTACIÓN", styles["subtitle"]))
    story.append(_summary_table(client, coach, routine, diet, styles))
    story.append(Spacer(1, 0.45 * cm))
    story.append(Paragraph(
        "Este documento refleja únicamente la versión actualmente publicada en Imperial Fitness. "
        "Los cambios deben ser revisados por tu coach o profesional responsable.",
        styles["small"],
    ))
    story.append(Spacer(1, 0.35 * cm))

    if routine:
        payload = _safe_json(routine.payload_json, {})
        days = payload.get("days", []) if isinstance(payload, dict) else []
        story.append(Paragraph("1. Rutina de entrenamiento", styles["h1"]))
        story.append(Paragraph(_clean_text(routine.objective or payload.get("objective") or "Programa de entrenamiento individualizado"), styles["body"]))
        story.append(Spacer(1, 0.25 * cm))

        for day_index, day in enumerate(days, start=1):
            if not isinstance(day, dict):
                continue
            day_name = _clean_text(day.get("day") or f"Día {day_index}", 100)
            focus = _clean_text(day.get("focus") or "Entrenamiento", 150)
            story.append(Paragraph(f"{day_name} · {focus}", styles["h2"]))
            exercises = day.get("exercises", [])
            if not isinstance(exercises, list) or not exercises:
                story.append(Paragraph("No hay ejercicios registrados para esta sesión.", styles["small"]))
                continue
            for exercise_index, exercise in enumerate(exercises, start=1):
                if isinstance(exercise, dict):
                    story.append(_exercise_block(exercise, exercise_index, styles))

        advice = payload.get("specialistAdvice") if isinstance(payload, dict) else None
        if advice:
            story.extend([
                Spacer(1, 0.15 * cm),
                Paragraph("Indicaciones del coach", styles["h2"]),
                Paragraph(_clean_text(advice, 1800), styles["body"]),
            ])
    else:
        story.append(Paragraph("1. Rutina de entrenamiento", styles["h1"]))
        story.append(Paragraph("No existe una rutina activa publicada al momento de generar este documento.", styles["body"]))

    story.append(Spacer(1, 0.35 * cm))

    if diet:
        meals = _safe_json(diet.meals_json, [])
        story.append(Paragraph("2. Plan de alimentación", styles["h1"]))
        story.append(_macro_table(diet, styles))
        story.append(Spacer(1, 0.25 * cm))

        if isinstance(meals, list):
            for meal_index, meal in enumerate(meals, start=1):
                if not isinstance(meal, dict):
                    continue
                meal_name = _clean_text(meal.get("name") or f"Comida {meal_index}", 100)
                story.append(Paragraph(meal_name, styles["h2"]))
                meal_rows = []
                for item in meal.get("items", []) if isinstance(meal.get("items"), list) else []:
                    if not isinstance(item, dict):
                        continue
                    food = _clean_text(item.get("currentName") or item.get("originalName") or item.get("name") or "Alimento", 180)
                    grams = item.get("amountGrams", item.get("grams", "—"))
                    try:
                        grams_label = f"{round(float(grams))} g"
                    except (TypeError, ValueError):
                        grams_label = _clean_text(grams, 40)
                    meal_rows.append([Paragraph(food, styles["body"]), Paragraph(grams_label, styles["strong"])])
                if meal_rows:
                    table = Table(meal_rows, colWidths=[12.7 * cm, 3.5 * cm])
                    table.setStyle(TableStyle([
                        ("BOX", (0, 0), (-1, -1), 0.4, BORDER),
                        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E5E5")),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]))
                    story.append(table)
                else:
                    story.append(Paragraph("Sin alimentos registrados en esta comida.", styles["small"]))

        if diet.notes:
            story.extend([
                Spacer(1, 0.15 * cm),
                Paragraph("Indicaciones nutricionales", styles["h2"]),
                Paragraph(_clean_text(diet.notes, 2400), styles["body"]),
            ])
    else:
        story.append(Paragraph("2. Plan de alimentación", styles["h1"]))
        story.append(Paragraph("No existe un plan nutricional activo publicado al momento de generar este documento.", styles["body"]))

    story.extend([
        Spacer(1, 0.55 * cm),
        Paragraph("Seguimiento", styles["h1"]),
        Paragraph(
            "Registra tus series, repeticiones, carga, RIR, medidas y adherencia dentro de Imperial Fitness. "
            "El progreso real se utiliza para orientar los próximos ajustes del coach.",
            styles["body"],
        ),
        Spacer(1, 0.35 * cm),
        Paragraph(
            "Aviso: este documento es una herramienta de acompañamiento deportivo. No sustituye valoración médica, "
            "nutricional o fisioterapéutica individual cuando sea necesaria.",
            styles["small"],
        ),
    ])

    doc.build(story)
    return buffer.getvalue()
