import json
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models import AppSetting, BodyMetric, Challenge, ChallengeParticipant, CommunityPost, Food, RoutineTemplate, SyncEvent, User, WorkoutSetLog
from app.security import hash_password


def seed_users(db: Session) -> None:
    def upsert_user(email: str, **data) -> User:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
        for key, value in data.items():
            setattr(user, key, value)
        user.password_hash = hash_password("imperial123")
        user.status = "active"
        db.commit()
        db.refresh(user)
        return user

    admin = upsert_user(
        "admin@imperialfitness.co",
        name="Kebin Bernardo Zua",
        role="admin",
        avatar_url="/logo-imperial-fitness.png",
        tokens=15000,
        weight=82,
        height=180,
        body_fat=12,
        muscle_mass=42,
        goal="Control operativo y crecimiento del gimnasio",
    )
    trainer = upsert_user(
        "francy@imperialfitness.co",
        name="Francy Viviana Ruiz",
        role="trainer",
        avatar_url="https://images.unsplash.com/photo-1594381898411-846e7d193883?w=150&auto=format&fit=crop&q=80",
        tokens=4200,
        weight=65,
        height=165,
        body_fat=18,
        muscle_mass=29,
        goal="Entrenamiento de fuerza y nutrición personalizada",
    )
    upsert_user(
        "julian@client.com",
        name="Julian Puerto",
        role="client",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        assigned_trainer_id=trainer.id,
        tokens=850,
        weight=78,
        height=176,
        body_fat=22.5,
        muscle_mass=35,
        goal="Pérdida de grasa y ganancia muscular magra",
    )
    print("Usuarios demo creados correctamente:")
    print("- admin@imperialfitness.co / imperial123")
    print("- francy@imperialfitness.co / imperial123")
    print("- julian@client.com / imperial123")


def seed_foods(db: Session) -> None:
    from app_seed_data import FOOD_DATABASE

    for item in FOOD_DATABASE:
        food = db.query(Food).filter(Food.name == item["name"]).first()
        if not food:
            food = Food(name=item["name"])
            db.add(food)
        food.category = item["category"]
        food.protein_per_100g = item["protein_per_100g"]
        food.carbs_per_100g = item["carbs_per_100g"]
        food.fat_per_100g = item["fat_per_100g"]
        food.cals_per_100g = item["cals_per_100g"]
        food.fiber_per_100g = item["fiber_per_100g"]
        food.client_note = item["client_note"]
        food.trainer_note = item["trainer_note"]
    db.commit()
    print(f"Alimentos cargados correctamente: {db.query(Food).count()}")


def seed_routines(db: Session) -> None:
    from app_seed_data import ROUTINE_TEMPLATES

    for routine in ROUTINE_TEMPLATES:
        row = db.query(RoutineTemplate).filter(RoutineTemplate.title == routine["title"]).first()
        if not row:
            row = RoutineTemplate(title=routine["title"])
            db.add(row)
        row.target_goal = routine["target_goal"]
        row.level = routine["level"]
        row.days_per_week = routine["days_per_week"]
        row.description = routine["description"]
        row.trainer_rationale = routine["trainer_rationale"]
        row.payload_json = json.dumps(routine, ensure_ascii=False)
    db.commit()
    print(f"Rutinas cargadas correctamente: {db.query(RoutineTemplate).count()}")


def seed_events(db: Session) -> None:
    if db.query(SyncEvent).count() > 0:
        print("Eventos existentes detectados. No se duplicaron eventos.")
        return
    db.add(SyncEvent(
        title="Servidor local iniciado",
        detail="API lista para conectar web, app cliente y app entrenador.",
        source="Backend API",
        target="Todos los clientes conectados",
        event_type="system",
    ))
    db.commit()
    print("Evento inicial de sincronización creado correctamente.")


def seed_minimal_demo_data(db: Session) -> None:
    julian = db.query(User).filter(User.email == "julian@client.com").first()
    if not julian:
        return

    if not db.query(AppSetting).filter(AppSetting.key == "gym_logo_url").first():
        db.add(AppSetting(key="gym_logo_url", value="/logo-imperial-fitness.png"))

    if db.query(BodyMetric).filter(BodyMetric.user_id == julian.id).count() == 0:
        db.add(BodyMetric(user_id=julian.id, weight=78, muscle_mass=35, body_fat=22.5, visceral_fat=10, bmr=1800, bmi=25.2))

    if db.query(WorkoutSetLog).filter(WorkoutSetLog.user_id == julian.id).count() == 0:
        db.add(WorkoutSetLog(
            user_id=julian.id,
            exercise_name="Press banca",
            weight_kg=20,
            reps=12,
            set_number=1,
            rir=2,
            notes="Primera prueba controlada",
            suggestion="Buen punto de partida: busca llegar a 15 reps antes de subir carga.",
        ))

    if db.query(Challenge).count() == 0:
        challenge = Challenge(
            title="Reto de asistencia semanal",
            description="Completar 3 asistencias registradas durante la semana.",
            status="active",
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        db.add(ChallengeParticipant(challenge_id=challenge.id, user_id=julian.id, progress_value=1))

    if db.query(CommunityPost).count() == 0:
        db.add(CommunityPost(
            author_id=julian.id,
            content="Primer registro real de progreso en Imperial Fitness.",
            tags="progreso,entrenamiento",
        ))

    db.commit()
    print("Datos demo mínimos y realistas verificados.")


def run() -> None:
    print("Inicializando base de datos Imperial Fitness...")
    init_db()
    db = SessionLocal()
    try:
        seed_users(db)
        seed_foods(db)
        seed_routines(db)
        seed_events(db)
        seed_minimal_demo_data(db)
        print("Seed completed. Base de datos lista para pruebas locales.")
    finally:
        db.close()


if __name__ == "__main__":
    run()