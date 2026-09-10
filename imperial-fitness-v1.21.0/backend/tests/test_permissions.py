def login(client, email: str, password: str = "imperial123") -> dict:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_access_users_after_seed(client):
    admin = login(client, "admin@imperialfitness.co")
    response = client.get("/users", headers=auth_headers(admin["access_token"]))
    assert response.status_code == 200


def test_client_cannot_access_users_list(client):
    client_login = login(client, "julian@client.com")
    response = client.get("/users", headers=auth_headers(client_login["access_token"]))
    assert response.status_code == 403


def test_client_can_get_own_plan_endpoints(client):
    client_login = login(client, "julian@client.com")
    headers = auth_headers(client_login["access_token"])
    assert client.get("/nutrition/diet-plans/my-plan", headers=headers).status_code in {200, 204}
    assert client.get("/routines/assigned/my-routine", headers=headers).status_code in {200, 204}


def test_client_can_persist_same_group_food_substitution_in_own_plan(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    client_id = client_login["user"]["id"]
    trainer_headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])

    original_meals = '[{"name":"Almuerzo","items":[{"id":"p1","originalName":"Pechuga de pollo a la plancha","currentName":"Pechuga de pollo a la plancha","amountGrams":150,"baseCarbsPer100g":0,"baseCalsPer100g":165,"baseProteinPer100g":31,"baseFatPer100g":3.6,"category":"protein"}]}]'
    created = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Plan con sustituciones",
            "calories": 2100,
            "protein": 160,
            "carbs": 220,
            "fat": 65,
            "meals_json": original_meals,
            "notes": "Plan de prueba",
        },
    )
    assert created.status_code == 200, created.text

    substituted_meals = '[{"name":"Almuerzo","items":[{"id":"p1","originalName":"Pechuga de pollo a la plancha","currentName":"Tilapia al vapor","amountGrams":178.8,"baseCarbsPer100g":0,"baseCalsPer100g":128,"baseProteinPer100g":26,"baseFatPer100g":2.3,"category":"protein"}]}]'
    updated = client.put(
        "/nutrition/diet-plans/my-plan/meals",
        headers=client_headers,
        json={"meals_json": substituted_meals},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["meals_json"] == substituted_meals

    visible = client.get("/nutrition/diet-plans/my-plan", headers=client_headers)
    assert visible.status_code == 200
    assert visible.json()["meals_json"] == substituted_meals


def test_trainer_cannot_create_admin(client):
    trainer = login(client, "francy@imperialfitness.co")
    response = client.post(
        "/users",
        headers=auth_headers(trainer["access_token"]),
        json={
            "name": "No Admin",
            "email": "no-admin@example.com",
            "role": "admin",
            "status": "active",
            "password": "imperial123",
        },
    )
    assert response.status_code == 403

def test_trainer_assignment_is_visible_to_client_and_keeps_json_payload(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    client_id = client_login["user"]["id"]

    trainer_headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])

    diet_payload = {
        "client_id": client_id,
        "title": "Plan prueba visible",
        "calories": 2100,
        "protein": 160,
        "carbs": 220,
        "fat": 65,
        "meals_json": '[{"name":"Desayuno","items":[]}]',
        "notes": "Plan visible para cliente",
    }
    diet_response = client.post("/nutrition/diet-plans", headers=trainer_headers, json=diet_payload)
    assert diet_response.status_code == 200, diet_response.text

    routine_payload = {
        "client_id": client_id,
        "title": "Rutina prueba visible",
        "objective": "Validar asignación",
        "payload_json": '{"days":[{"day":"Lunes","focus":"Fuerza","exercises":[]}]}',
        "active": 1,
    }
    routine_response = client.post("/routines/assigned", headers=trainer_headers, json=routine_payload)
    assert routine_response.status_code == 200, routine_response.text

    client_diet = client.get("/nutrition/diet-plans/my-plan", headers=client_headers)
    assert client_diet.status_code == 200
    assert client_diet.json()["meals_json"] == diet_payload["meals_json"]

    client_routine = client.get("/routines/assigned/my-routine", headers=client_headers)
    assert client_routine.status_code == 200
    assert client_routine.json()["payload_json"] == routine_payload["payload_json"]


def test_diet_plan_requires_existing_client(client):
    admin = login(client, "admin@imperialfitness.co")
    response = client.post(
        "/nutrition/diet-plans",
        headers=auth_headers(admin["access_token"]),
        json={
            "client_id": 999999,
            "title": "Plan inválido",
            "calories": 2000,
            "protein": 150,
            "carbs": 200,
            "fat": 70,
            "meals_json": "[]",
            "notes": "No debe crearse sin cliente real",
        },
    )
    assert response.status_code == 404


def test_assigned_routine_is_forced_active_even_if_payload_tries_inactive(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    response = client.post(
        "/routines/assigned",
        headers=auth_headers(trainer["access_token"]),
        json={
            "client_id": client_login["user"]["id"],
            "title": "Rutina activa forzada",
            "objective": "Evitar asignaciones invisibles por active=0",
            "payload_json": '{"days":[]}',
            "active": 0,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["active"] == 1

    visible = client.get(
        "/routines/assigned/my-routine",
        headers=auth_headers(client_login["access_token"]),
    )
    assert visible.status_code == 200
    assert visible.json()["title"] == "Rutina activa forzada"


def test_assigned_routine_update_cannot_hide_active_assignment(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    trainer_headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])

    created = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": client_login["user"]["id"],
            "title": "Rutina persistente",
            "objective": "No debe desaparecer por una edición genérica",
            "payload_json": '{"days":[]}',
            "active": 1,
        },
    )
    assert created.status_code == 200, created.text

    updated = client.put(
        f"/routines/assigned/{created.json()['id']}",
        headers=trainer_headers,
        json={"title": "Rutina persistente editada", "active": 0},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["active"] == 1

    visible = client.get("/routines/assigned/my-routine", headers=client_headers)
    assert visible.status_code == 200
    assert visible.json()["id"] == created.json()["id"]
    assert "no-store" in visible.headers.get("cache-control", "")


def test_plan_assignment_creates_sync_events(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    trainer_headers = auth_headers(trainer["access_token"])
    client_id = client_login["user"]["id"]

    diet_response = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Plan trazable",
            "calories": 2200,
            "protein": 170,
            "carbs": 230,
            "fat": 70,
            "meals_json": "[]",
            "notes": "Debe generar evento de sincronización",
        },
    )
    assert diet_response.status_code == 200, diet_response.text

    routine_response = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Rutina trazable",
            "objective": "Debe generar evento de sincronización",
            "payload_json": '{"days":[]}',
            "active": 1,
        },
    )
    assert routine_response.status_code == 200, routine_response.text

    events_response = client.get("/sync/events", headers=trainer_headers)
    assert events_response.status_code == 200
    titles = [event["title"] for event in events_response.json()]
    assert "Plan nutricional asignado" in titles
    assert "Rutina asignada" in titles


def test_trainer_can_update_and_deactivate_assigned_routine(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    created = client.post(
        "/routines/assigned",
        headers=headers,
        json={
            "client_id": client_login["user"]["id"],
            "title": "Rutina editable fase 4",
            "objective": "Inicial",
            "payload_json": '{"days":[]}',
            "active": 1,
        },
    )
    assert created.status_code == 200, created.text
    routine_id = created.json()["id"]

    updated = client.put(
        f"/routines/assigned/{routine_id}",
        headers=headers,
        json={"title": "Rutina editada fase 4", "objective": "Ajustada"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Rutina editada fase 4"

    deleted = client.delete(f"/routines/assigned/{routine_id}", headers=headers)
    assert deleted.status_code == 200, deleted.text

    visible = client.get(
        "/routines/assigned/my-routine",
        headers=auth_headers(client_login["access_token"]),
    )
    assert visible.status_code == 200
    assert visible.json() is None or visible.json().get("id") != routine_id


def test_trainer_can_update_and_delete_diet_plan(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    created = client.post(
        "/nutrition/diet-plans",
        headers=headers,
        json={
            "client_id": client_login["user"]["id"],
            "title": "Plan editable fase 4",
            "calories": 2000,
            "protein": 150,
            "carbs": 220,
            "fat": 60,
            "meals_json": "[]",
            "notes": "Inicial",
        },
    )
    assert created.status_code == 200, created.text
    plan_id = created.json()["id"]

    updated = client.put(
        f"/nutrition/diet-plans/{plan_id}",
        headers=headers,
        json={"title": "Plan editado fase 4", "calories": 2050, "meals_json": '[{"name":"Cena","items":[]}]'},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Plan editado fase 4"
    assert updated.json()["calories"] == 2050

    deleted = client.delete(f"/nutrition/diet-plans/{plan_id}", headers=headers)
    assert deleted.status_code == 200, deleted.text
    listed = client.get("/nutrition/diet-plans", headers=headers)
    assert all(row["id"] != plan_id for row in listed.json())


def test_client_sync_events_are_scoped_to_their_own_plan_events(client):
    admin = login(client, "admin@imperialfitness.co")
    trainer = login(client, "francy@imperialfitness.co")
    julian = login(client, "julian@client.com")
    admin_headers = auth_headers(admin["access_token"])
    trainer_headers = auth_headers(trainer["access_token"])

    other_user = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Cliente Privado",
            "email": "cliente.privado@example.com",
            "role": "client",
            "status": "active",
            "assigned_trainer_id": trainer["user"]["id"],
            "password": "imperial123",
        },
    )
    assert other_user.status_code == 200, other_user.text

    other_plan = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": other_user.json()["id"],
            "title": "Plan privado no visible para Julian",
            "calories": 1900,
            "protein": 140,
            "carbs": 180,
            "fat": 55,
            "meals_json": "[]",
            "notes": "No debe aparecerle a otro cliente",
        },
    )
    assert other_plan.status_code == 200, other_plan.text

    julian_events = client.get("/sync/events", headers=auth_headers(julian["access_token"]))
    assert julian_events.status_code == 200
    assert "Plan privado no visible para Julian" not in " ".join(event["detail"] for event in julian_events.json())


def test_replacing_diet_plan_deactivates_previous_visible_plan(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])
    client_id = client_login["user"]["id"]

    first = client.post(
        "/nutrition/diet-plans",
        headers=headers,
        json={
            "client_id": client_id,
            "title": "Plan reemplazado fase 6",
            "calories": 2000,
            "protein": 150,
            "carbs": 220,
            "fat": 60,
            "meals_json": "[]",
            "notes": "Debe quedar inactivo cuando se cree uno nuevo",
        },
    )
    assert first.status_code == 200, first.text

    second = client.post(
        "/nutrition/diet-plans",
        headers=headers,
        json={
            "client_id": client_id,
            "title": "Plan vigente fase 6",
            "calories": 2150,
            "protein": 160,
            "carbs": 230,
            "fat": 65,
            "meals_json": "[]",
            "notes": "Debe ser el único visible para cliente",
        },
    )
    assert second.status_code == 200, second.text

    visible = client.get("/nutrition/diet-plans/my-plan", headers=client_headers)
    assert visible.status_code == 200
    assert visible.json()["title"] == "Plan vigente fase 6"
    assert visible.json()["active"] == 1

    listed = client.get(f"/nutrition/diet-plans?client_id={client_id}", headers=headers)
    assert listed.status_code == 200
    titles = [row["title"] for row in listed.json()]
    assert "Plan vigente fase 6" in titles
    assert "Plan reemplazado fase 6" not in titles


def test_deleting_diet_plan_soft_deactivates_and_hides_from_client(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])

    created = client.post(
        "/nutrition/diet-plans",
        headers=headers,
        json={
            "client_id": client_login["user"]["id"],
            "title": "Plan soft delete fase 6",
            "calories": 2100,
            "protein": 155,
            "carbs": 225,
            "fat": 62,
            "meals_json": "[]",
            "notes": "No debe borrarse físicamente",
        },
    )
    assert created.status_code == 200, created.text
    plan_id = created.json()["id"]

    deleted = client.delete(f"/nutrition/diet-plans/{plan_id}", headers=headers)
    assert deleted.status_code == 200, deleted.text

    visible = client.get("/nutrition/diet-plans/my-plan", headers=client_headers)
    assert visible.status_code == 200
    assert visible.json() is None or visible.json().get("id") != plan_id

    listed = client.get("/nutrition/diet-plans", headers=headers)
    assert listed.status_code == 200
    assert all(row["id"] != plan_id for row in listed.json())


def test_trainer_cannot_manage_other_trainers_client_plans_or_routines(client):
    admin = login(client, "admin@imperialfitness.co")
    trainer = login(client, "francy@imperialfitness.co")
    admin_headers = auth_headers(admin["access_token"])
    trainer_headers = auth_headers(trainer["access_token"])

    other_trainer = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Coach Externo Fase 6",
            "email": "coach.externo.fase6@example.com",
            "role": "trainer",
            "status": "active",
            "password": "imperial123",
        },
    )
    assert other_trainer.status_code == 200, other_trainer.text

    protected_client = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Cliente Otro Coach Fase 6",
            "email": "cliente.otro.coach.fase6@example.com",
            "role": "client",
            "status": "active",
            "assigned_trainer_id": other_trainer.json()["id"],
            "password": "imperial123",
        },
    )
    assert protected_client.status_code == 200, protected_client.text
    protected_id = protected_client.json()["id"]

    diet_attempt = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": protected_id,
            "title": "Plan no autorizado",
            "calories": 2000,
            "protein": 150,
            "carbs": 220,
            "fat": 60,
            "meals_json": "[]",
            "notes": "No debe permitirse",
        },
    )
    assert diet_attempt.status_code == 403

    routine_attempt = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": protected_id,
            "title": "Rutina no autorizada",
            "objective": "No debe permitirse",
            "payload_json": '{"days":[]}',
            "active": 1,
        },
    )
    assert routine_attempt.status_code == 403


def test_admin_trainer_client_role_visibility_and_profile_controls(client):
    admin = login(client, "admin@imperialfitness.co")
    trainer = login(client, "francy@imperialfitness.co")
    julian = login(client, "julian@client.com")

    admin_headers = auth_headers(admin["access_token"])
    trainer_headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(julian["access_token"])

    assert client.get("/users", headers=admin_headers).status_code == 200
    trainer_users = client.get("/users", headers=trainer_headers)
    assert trainer_users.status_code == 200
    assert all(row["id"] == trainer["user"]["id"] or row.get("assigned_trainer_id") == trainer["user"]["id"] for row in trainer_users.json())
    assert client.get("/users", headers=client_headers).status_code == 403

    updated = client.patch(
        f"/users/{julian['user']['id']}",
        headers=client_headers,
        json={"goal": "Definición muscular validada", "name": "Julian Validado"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["goal"] == "Definición muscular validada"

    forbidden_assignment = client.patch(
        f"/users/{julian['user']['id']}",
        headers=client_headers,
        json={"assigned_trainer_id": trainer["user"]["id"]},
    )
    assert forbidden_assignment.status_code == 403


def test_chat_permissions_and_friendship_flow_are_role_scoped(client):
    admin = login(client, "admin@imperialfitness.co")
    trainer = login(client, "francy@imperialfitness.co")
    julian = login(client, "julian@client.com")
    admin_headers = auth_headers(admin["access_token"])
    trainer_headers = auth_headers(trainer["access_token"])
    julian_headers = auth_headers(julian["access_token"])

    other_client = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Cliente Social Fase 8",
            "email": "cliente.social.fase8@example.com",
            "role": "client",
            "status": "active",
            "password": "imperial123",
        },
    )
    assert other_client.status_code == 200, other_client.text
    other_id = other_client.json()["id"]
    other_login = login(client, "cliente.social.fase8@example.com")
    other_headers = auth_headers(other_login["access_token"])

    denied = client.post("/chat/messages", headers=julian_headers, json={"receiver_id": other_id, "text": "Hola sin amistad"})
    assert denied.status_code == 403

    request = client.post("/community/friends/request", headers=julian_headers, json={"addressee_id": other_id})
    assert request.status_code == 200, request.text
    accepted = client.post(f"/community/friends/{request.json()['id']}/accept", headers=other_headers)
    assert accepted.status_code == 200, accepted.text

    allowed = client.post("/chat/messages", headers=julian_headers, json={"receiver_id": other_id, "text": "Hola con amistad"})
    assert allowed.status_code == 200, allowed.text

    trainer_to_client = client.post("/chat/messages", headers=trainer_headers, json={"receiver_id": julian["user"]["id"], "text": "Seguimiento coach"})
    assert trainer_to_client.status_code == 200, trainer_to_client.text

    admin_to_trainer = client.post("/chat/messages", headers=admin_headers, json={"receiver_id": trainer["user"]["id"], "text": "Mensaje admin"})
    assert admin_to_trainer.status_code == 200, admin_to_trainer.text


def test_password_recovery_and_change_password_flow(client):
    admin = login(client, "admin@imperialfitness.co")
    admin_headers = auth_headers(admin["access_token"])
    user = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Cliente Password Fase 8",
            "email": "cliente.password.fase8@example.com",
            "role": "client",
            "status": "active",
            "password": "imperial123",
        },
    )
    assert user.status_code == 200, user.text

    forgot = client.post("/auth/forgot-password", json={"email": "cliente.password.fase8@example.com"})
    assert forgot.status_code == 200, forgot.text
    token = forgot.json().get("reset_token_dev")
    assert token

    reset = client.post("/auth/reset-password", json={"token": token, "new_password": "nuevaClave123"})
    assert reset.status_code == 200, reset.text

    login_new = login(client, "cliente.password.fase8@example.com", "nuevaClave123")
    headers = auth_headers(login_new["access_token"])
    changed = client.post(
        f"/users/{login_new['user']['id']}/change-password",
        headers=headers,
        json={"current_password": "nuevaClave123", "new_password": "claveFinal123"},
    )
    assert changed.status_code == 200, changed.text
    login(client, "cliente.password.fase8@example.com", "claveFinal123")


def test_client_cannot_create_food_or_routine_template(client):
    client_login = login(client, "julian@client.com")
    headers = auth_headers(client_login["access_token"])

    food_response = client.post(
        "/nutrition/foods",
        headers=headers,
        json={
            "name": "Alimento no permitido",
            "category": "protein",
            "protein_per_100g": 20,
            "carbs_per_100g": 0,
            "fat_per_100g": 2,
            "cals_per_100g": 98,
        },
    )
    assert food_response.status_code == 403

    routine_response = client.post(
        "/routines/templates",
        headers=headers,
        json={
            "title": "Rutina cliente no permitida",
            "target_goal": "hipertrofia",
            "level": "Intermedio",
            "days_per_week": 3,
            "payload_json": "{}",
        },
    )
    assert routine_response.status_code == 403


def test_trainer_can_create_food_and_manual_routine_template(client):
    trainer = login(client, "francy@imperialfitness.co")
    headers = auth_headers(trainer["access_token"])

    food_response = client.post(
        "/nutrition/foods",
        headers=headers,
        json={
            "name": "Pescado blanco prueba fase 9",
            "category": "protein",
            "protein_per_100g": 24,
            "carbs_per_100g": 0,
            "fat_per_100g": 2,
            "cals_per_100g": 114,
            "fiber_per_100g": 0,
            "client_note": "Proteína magra para cena.",
            "trainer_note": "Útil en déficit por baja densidad calórica.",
        },
    )
    assert food_response.status_code == 200, food_response.text
    assert food_response.json()["name"] == "Pescado blanco prueba fase 9"

    routine_response = client.post(
        "/routines/templates",
        headers=headers,
        json={
            "title": "Plantilla manual fase 9",
            "target_goal": "hipertrofia",
            "level": "Intermedio",
            "days_per_week": 4,
            "description": "Creada manualmente por entrenador.",
            "trainer_rationale": "Progresión por técnica, RIR y adherencia.",
            "payload_json": '{"days":[]}',
        },
    )
    assert routine_response.status_code == 200, routine_response.text
    assert routine_response.json()["title"] == "Plantilla manual fase 9"


def test_science_guidelines_are_available_to_authenticated_roles(client):
    trainer = login(client, "francy@imperialfitness.co")
    response = client.get("/nutrition/science-guidelines", headers=auth_headers(trainer["access_token"]))
    assert response.status_code == 200
    data = response.json()
    assert "protein_g_per_kg" in data["nutrition"]
    assert "frequency_by_level" in data["training"]
    assert "No sustituyen" in data["safety_notice"]


def test_client_cannot_use_professional_food_or_routine_tools(client):
    julian = login(client, "julian@client.com")
    headers = auth_headers(julian["access_token"])

    food_attempt = client.post(
        "/nutrition/foods",
        headers=headers,
        json={
            "name": "Alimento interno no permitido",
            "category": "protein",
            "protein_per_100g": 25,
            "carbs_per_100g": 0,
            "fat_per_100g": 2,
            "cals_per_100g": 118,
        },
    )
    assert food_attempt.status_code == 403

    routine_attempt = client.post(
        "/routines/templates",
        headers=headers,
        json={
            "title": "Plantilla no permitida",
            "target_goal": "hipertrofia",
            "level": "Intermedio",
            "days_per_week": 3,
            "payload_json": '{"days": []}',
        },
    )
    assert routine_attempt.status_code == 403


def test_trainer_can_create_professional_food_and_manual_routine_template(client):
    trainer = login(client, "francy@imperialfitness.co")
    headers = auth_headers(trainer["access_token"])

    food = client.post(
        "/nutrition/foods",
        headers=headers,
        json={
            "name": "Yogur griego fase piloto",
            "category": "dairy",
            "protein_per_100g": 10,
            "carbs_per_100g": 4,
            "fat_per_100g": 0,
            "cals_per_100g": 56,
            "client_note": "Opción alta en proteína.",
            "trainer_note": "Verificar tolerancia a lácteos.",
        },
    )
    assert food.status_code == 200, food.text
    assert food.json()["name"] == "Yogur griego fase piloto"

    template = client.post(
        "/routines/templates",
        headers=headers,
        json={
            "title": "Rutina manual piloto",
            "target_goal": "hipertrofia",
            "level": "Intermedio",
            "days_per_week": 4,
            "description": "Plantilla creada por entrenador para piloto.",
            "trainer_rationale": "Volumen progresivo y técnica prioritaria.",
            "payload_json": '{"days":[{"day":"Lunes","focus":"Tren superior","exercises":[]}]}',
        },
    )
    assert template.status_code == 200, template.text
    assert template.json()["title"] == "Rutina manual piloto"


def test_science_guard_rejects_inconsistent_diet_macros(client):
    trainer = login(client, "francy@imperialfitness.co")
    julian = login(client, "julian@client.com")
    response = client.post(
        "/nutrition/diet-plans",
        headers=auth_headers(trainer["access_token"]),
        json={
            "client_id": julian["user"]["id"],
            "title": "Plan científicamente inconsistente",
            "calories": 2000,
            "protein": 600,
            "carbs": 500,
            "fat": 300,
            "meals_json": "[]",
            "notes": "Debe ser rechazado por guardarraíl científico.",
        },
    )
    assert response.status_code == 422


def test_community_audiences_are_enforced_strictly(client):
    admin = login(client, "admin@imperialfitness.co")
    trainer = login(client, "francy@imperialfitness.co")
    owner = login(client, "julian@client.com")
    admin_headers = auth_headers(admin["access_token"])
    trainer_headers = auth_headers(trainer["access_token"])
    owner_headers = auth_headers(owner["access_token"])

    friend_user = client.post(
        "/users",
        headers=admin_headers,
        json={
            "name": "Amiga Audiencia",
            "email": "amiga.audiencia@example.com",
            "role": "client",
            "status": "active",
            "assigned_trainer_id": trainer["user"]["id"],
            "password": "imperial123",
        },
    )
    assert friend_user.status_code == 200, friend_user.text
    friend = login(client, "amiga.audiencia@example.com")
    friend_headers = auth_headers(friend["access_token"])

    request = client.post(
        "/community/friends/request",
        headers=owner_headers,
        json={"addressee_id": friend["user"]["id"]},
    )
    assert request.status_code == 200, request.text
    accepted = client.post(
        f"/community/friends/{request.json()['id']}/accept",
        headers=friend_headers,
    )
    assert accepted.status_code == 200, accepted.text

    for visibility in ["public", "friends", "trainer", "private"]:
        created = client.post(
            "/community/posts",
            headers=owner_headers,
            data={"content": f"audiencia-{visibility}", "tags": "audiencia", "visibility": visibility},
        )
        assert created.status_code == 200, created.text
        assert created.json()["visibility"] == visibility

    def contents(headers):
        response = client.get("/community/posts?tag=audiencia", headers=headers)
        assert response.status_code == 200, response.text
        return {row["content"] for row in response.json()}

    owner_content = contents(owner_headers)
    assert {"audiencia-public", "audiencia-friends", "audiencia-trainer", "audiencia-private"}.issubset(owner_content)

    friend_content = contents(friend_headers)
    assert "audiencia-public" in friend_content
    assert "audiencia-friends" in friend_content
    assert "audiencia-trainer" not in friend_content
    assert "audiencia-private" not in friend_content

    trainer_content = contents(trainer_headers)
    assert "audiencia-public" in trainer_content
    assert "audiencia-trainer" in trainer_content
    assert "audiencia-friends" not in trainer_content
    assert "audiencia-private" not in trainer_content

    admin_content = contents(admin_headers)
    assert "audiencia-public" in admin_content
    assert "audiencia-friends" not in admin_content
    assert "audiencia-trainer" not in admin_content
    assert "audiencia-private" not in admin_content

    invalid = client.post(
        "/community/posts",
        headers=owner_headers,
        data={"content": "no debe hacerse pública", "visibility": "invalid"},
    )
    assert invalid.status_code == 422


def test_automatic_routine_is_blocked_for_high_severity_limitation(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    client_id = client_login["user"]["id"]

    limitation = client.post(
        "/limitations",
        headers=headers,
        json={
            "user_id": client_id,
            "body_area": "rodilla",
            "severity": "alta",
            "comment": "Dolor agudo",
            "trainer_note": "Requiere valoración",
            "status": "active",
        },
    )
    assert limitation.status_code == 200, limitation.text

    routine = client.post(
        "/routines/assigned",
        headers=headers,
        json={
            "client_id": client_id,
            "title": "Automática insegura",
            "objective": "Prueba de seguridad",
            "payload_json": '{"autoGenerated":true,"days":[{"day":"Lunes","focus":"Pierna","exercises":[{"name":"Sentadilla libre"}]}]}',
            "active": 1,
        },
    )
    assert routine.status_code == 422
    assert "severidad alta" in routine.json()["detail"]

    resolved = client.put(
        f"/limitations/{limitation.json()['id']}/resolve",
        headers=headers,
    )
    assert resolved.status_code == 200, resolved.text


def test_automatic_routine_rejects_exercise_conflicting_with_active_limitation(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    headers = auth_headers(trainer["access_token"])
    client_id = client_login["user"]["id"]

    limitation = client.post(
        "/limitations",
        headers=headers,
        json={
            "user_id": client_id,
            "body_area": "rodilla",
            "severity": "moderada",
            "comment": "Molestia en flexión",
            "trainer_note": "Evitar carga de rodilla",
            "status": "active",
        },
    )
    assert limitation.status_code == 200, limitation.text

    unsafe = client.post(
        "/routines/assigned",
        headers=headers,
        json={
            "client_id": client_id,
            "title": "Automática con conflicto",
            "objective": "Debe bloquearse",
            "payload_json": '{"autoGenerated":true,"days":[{"day":"Lunes","focus":"Pierna","exercises":[{"name":"Prensa 45 grados"}]}]}',
            "active": 1,
        },
    )
    assert unsafe.status_code == 422
    assert "incompatibles" in unsafe.json()["detail"]

    safe = client.post(
        "/routines/assigned",
        headers=headers,
        json={
            "client_id": client_id,
            "title": "Automática compatible",
            "objective": "Sin carga de rodilla",
            "payload_json": '{"autoGenerated":true,"days":[{"day":"Lunes","focus":"Superior","exercises":[{"name":"Jalón al pecho"}]}]}',
            "active": 1,
        },
    )
    assert safe.status_code == 200, safe.text

    resolved = client.put(f"/limitations/{limitation.json()['id']}/resolve", headers=headers)
    assert resolved.status_code == 200, resolved.text


def test_nutrition_equivalence_reports_all_macro_deltas(client):
    client_login = login(client, "julian@client.com")
    headers = auth_headers(client_login["access_token"])
    foods = client.get("/nutrition/foods", headers=headers)
    assert foods.status_code == 200, foods.text
    rows = foods.json()
    original = next(row for row in rows if row["category"] in {"carb", "fruit"} and row["carbs_per_100g"] > 10)
    substitute = next(row for row in rows if row["id"] != original["id"] and row["category"] in {"carb", "fruit"} and row["carbs_per_100g"] > 5)

    response = client.post(
        "/nutrition/equivalence",
        headers=headers,
        json={"original_food_id": original["id"], "substitute_food_id": substitute["id"], "original_grams": 100},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert set(payload["deltas"]) == {"calories", "protein", "carbs", "fat"}
    assert 0 <= payload["accuracy_percent"] <= 100
    assert payload["compatibility"] in {"alta", "media", "baja"}
    assert payload["substitute_grams"] >= 5
    assert abs(payload["deltas"]["carbs"]) <= 0.1

    capped = client.post(
        "/nutrition/equivalence",
        headers=headers,
        json={
            "original_food_id": original["id"],
            "substitute_food_id": substitute["id"],
            "original_grams": 100,
            "max_substitute_calories": 40,
        },
    )
    assert capped.status_code == 200, capped.text
    capped_payload = capped.json()
    assert capped_payload["substitute_macros"]["calories"] <= 40.1
    assert capped_payload["calorie_cap_applied"] is True

    incompatible = next(row for row in rows if row["category"] == "protein")
    rejected = client.post(
        "/nutrition/equivalence",
        headers=headers,
        json={"original_food_id": original["id"], "substitute_food_id": incompatible["id"], "original_grams": 100},
    )
    assert rejected.status_code == 422


def test_admin_finance_analytics_returns_engagement_and_series(client):
    admin = login(client, "admin@imperialfitness.co")
    response = client.get("/finance/analytics", headers=auth_headers(admin["access_token"]))
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "engagement" in payload
    assert "financial" in payload
    assert len(payload["monthly_series"]) == 6
    assert payload["engagement"]["total_clients"] >= 1


def test_latest_diet_and_routine_assignment_remain_visible_to_client(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    trainer_headers = auth_headers(trainer["access_token"])
    client_headers = auth_headers(client_login["access_token"])
    client_id = client_login["user"]["id"]

    first_diet = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Dieta anterior",
            "calories": 2000,
            "protein": 150,
            "carbs": 220,
            "fat": 60,
            "meals_json": "[]",
            "notes": "Primera versión",
        },
    )
    assert first_diet.status_code == 200, first_diet.text

    latest_diet = client.post(
        "/nutrition/diet-plans",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Dieta vigente",
            "calories": 2100,
            "protein": 160,
            "carbs": 225,
            "fat": 65,
            "meals_json": "[]",
            "notes": "Versión activa",
        },
    )
    assert latest_diet.status_code == 200, latest_diet.text

    first_routine = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Rutina anterior",
            "objective": "Primera versión",
            "payload_json": '{"days":[]}',
        },
    )
    assert first_routine.status_code == 200, first_routine.text

    latest_routine = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Rutina vigente",
            "objective": "Versión activa",
            "payload_json": '{"days":[{"day":"Lunes","focus":"Fuerza","exercises":[]}]}',
        },
    )
    assert latest_routine.status_code == 200, latest_routine.text

    visible_diet = client.get("/nutrition/diet-plans/my-plan", headers=client_headers)
    visible_routine = client.get("/routines/assigned/my-routine", headers=client_headers)
    assert visible_diet.status_code == 200
    assert visible_diet.json()["id"] == latest_diet.json()["id"]
    assert visible_diet.json()["title"] == "Dieta vigente"
    assert visible_routine.status_code == 200
    assert visible_routine.json()["id"] == latest_routine.json()["id"]
    assert visible_routine.json()["title"] == "Rutina vigente"

    stale_diet_update = client.put(
        f"/nutrition/diet-plans/{first_diet.json()['id']}",
        headers=trainer_headers,
        json={"notes": "No debe sobrescribir la asignación nueva"},
    )
    stale_routine_update = client.put(
        f"/routines/assigned/{first_routine.json()['id']}",
        headers=trainer_headers,
        json={"objective": "No debe sobrescribir la asignación nueva"},
    )
    assert stale_diet_update.status_code == 409
    assert stale_routine_update.status_code == 409


def test_assigned_routine_accepts_large_professional_payload(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    payload_json = __import__("json").dumps(
        {
            "days": [
                {
                    "day": "Lunes",
                    "focus": "Hipertrofia",
                    "exercises": [{"name": "Jalón al pecho", "sets": 4, "reps": "10-12"}],
                }
            ],
            "specialistAdvice": "A" * 100_000,
        }
    )

    response = client.post(
        "/routines/assigned",
        headers=auth_headers(trainer["access_token"]),
        json={
            "client_id": client_login["user"]["id"],
            "title": "Rutina detallada grande",
            "objective": "Validar planes profesionales superiores a 50 mil caracteres",
            "payload_json": payload_json,
        },
    )

    assert response.status_code == 200, response.text
    assert len(response.json()["payload_json"]) > 50_000


def test_trainer_can_verify_complete_client_routine_delivery_path(client):
    trainer = login(client, "francy@imperialfitness.co")
    client_login = login(client, "julian@client.com")
    trainer_headers = auth_headers(trainer["access_token"])
    client_id = client_login["user"]["id"]

    created = client.post(
        "/routines/assigned",
        headers=trainer_headers,
        json={
            "client_id": client_id,
            "title": "Rutina verificable",
            "objective": "Comprobar la ruta completa de entrega",
            "payload_json": '{"days":[{"day":"Lunes","focus":"Superior","exercises":[{"name":"Jalón al pecho"}]}]}',
        },
    )
    assert created.status_code == 200, created.text

    health = client.get(
        f"/routines/assigned/client-health/{client_id}",
        headers=trainer_headers,
    )
    assert health.status_code == 200, health.text
    body = health.json()
    assert body["delivery_ready"] is True
    assert body["routine"]["active_count"] == 1
    assert body["routine"]["exercise_count"] == 1
    assert body["client"]["id"] == client_id
