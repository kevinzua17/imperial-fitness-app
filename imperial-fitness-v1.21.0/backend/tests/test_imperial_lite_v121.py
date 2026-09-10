import json
from urllib.parse import urlparse, parse_qs

from app.database import SessionLocal
from app.models import AssignedRoutine, DietPlan, User


def _login(client, email: str):
    response = client.post('/auth/login', json={'email': email, 'password': 'imperial123'})
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


def _prepare_client_sources():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == 'julian@client.com').first()
        assert user is not None
        user.age = 32
        user.status = 'active'
        db.query(AssignedRoutine).filter(AssignedRoutine.client_id == user.id).update({'active': 0})
        db.query(DietPlan).filter(DietPlan.client_id == user.id).update({'active': 0})
        routine = AssignedRoutine(
            client_id=user.id,
            title='Rutina Lite de prueba',
            objective='Fuerza e hipertrofia controlada',
            active=1,
            payload_json=json.dumps({
                'objective': 'Fuerza e hipertrofia controlada',
                'days': [{'day': 'Lunes', 'focus': 'Torso', 'exercises': [
                    {'name': 'Press en máquina', 'sets': 3, 'reps': '8-12', 'rest': '90s', 'rir': 2}
                ]}],
            }),
        )
        diet = DietPlan(
            client_id=user.id,
            title='Alimentación Lite de prueba',
            calories=2100,
            protein=150,
            carbs=220,
            fat=68,
            active=1,
            status='published',
            meals_json=json.dumps([
                {'name': 'Desayuno', 'items': [{'name': 'Avena', 'grams': 70}]},
                {'name': 'Almuerzo', 'items': [{'name': 'Arroz y pollo', 'grams': 300}]},
            ]),
        )
        db.add_all([routine, diet])
        db.commit()
        return user.id
    finally:
        db.close()


def test_lite_magic_link_exchange_checkin_publication_and_pdf(client):
    user_id = _prepare_client_sources()
    admin_headers = _login(client, 'admin@imperialfitness.co')

    create = client.post('/lite/links', headers=admin_headers, json={
        'user_id': user_id,
        'expires_days': 30,
        'set_lite_mode': True,
    })
    assert create.status_code == 200, create.text
    magic_url = create.json()['url']
    parsed = urlparse(magic_url)
    assert parsed.path == '/lite'
    token = parse_qs(parsed.fragment)['token'][0]
    assert token
    assert token not in parsed.path

    exchange = client.post('/lite/exchange', json={'token': token})
    assert exchange.status_code == 200, exchange.text
    session = exchange.json()['session_token']
    lite_headers = {'X-Lite-Session': session}

    me = client.get('/lite/me', headers=lite_headers)
    assert me.status_code == 200
    assert me.json()['id'] == user_id
    assert me.json()['experience_mode'] == 'lite'

    intake = client.put('/lite/intake', headers=lite_headers, json={
        'medical_clearance_needed': False,
        'chest_pain_or_fainting': False,
        'pregnancy_or_lactation': False,
        'diabetes': False,
        'kidney_disease': False,
        'hypertension': False,
        'eating_disorder_history': False,
        'digestive_condition': False,
        'food_allergies': '',
        'medications': '',
        'injuries_or_surgeries': '',
        'dietary_preferences': '',
        'foods_disliked': '',
        'cooking_access': 'normal',
        'budget_level': 'medium',
        'notes': '',
    })
    assert intake.status_code == 200, intake.text

    checkin = client.post('/lite/checkins', headers=lite_headers, json={
        'training_sessions': 3,
        'nutrition_adherence': 85,
        'energy': 4,
        'sleep_hours': 7.5,
        'hunger': 3,
        'stress': 2,
        'pain_present': False,
        'notes': 'Semana estable',
    })
    assert checkin.status_code == 200, checkin.text

    for kind in ('routine', 'diet'):
        validation = client.post('/professional/validate', headers=admin_headers, json={
            'user_id': user_id,
            'plan_type': kind,
        })
        assert validation.status_code == 200, validation.text
        assert validation.json()['can_publish'] is True

        publish = client.post('/professional/publish', headers=admin_headers, json={
            'user_id': user_id,
            'plan_type': kind,
            'acknowledge_warnings': bool(validation.json()['warnings']),
        })
        assert publish.status_code == 200, publish.text
        publication_id = publish.json()['id']

        pdf = client.get(f'/professional/publications/{publication_id}/pdf', headers=admin_headers)
        assert pdf.status_code == 200
        assert pdf.headers['content-type'].startswith('application/pdf')
        assert pdf.content.startswith(b'%PDF')

    plans = client.get('/lite/plans', headers=lite_headers)
    assert plans.status_code == 200
    payload = plans.json()
    assert payload['routine']['publication_id']
    assert payload['diet']['publication_id']

    attention = client.get('/professional/attention', headers=admin_headers)
    assert attention.status_code == 200
    row = next(item for item in attention.json() if item['user_id'] == user_id)
    assert 'Dolor alto' not in ' '.join(row['reasons'])


def test_revoke_link_revokes_derived_lite_session(client):
    user_id = _prepare_client_sources()
    admin_headers = _login(client, 'admin@imperialfitness.co')
    create = client.post('/lite/links', headers=admin_headers, json={'user_id': user_id, 'expires_days': 7})
    token = parse_qs(urlparse(create.json()['url']).fragment)['token'][0]
    exchange = client.post('/lite/exchange', json={'token': token})
    session = exchange.json()['session_token']
    assert client.get('/lite/me', headers={'X-Lite-Session': session}).status_code == 200

    revoke = client.delete(f"/lite/links/{create.json()['id']}", headers=admin_headers)
    assert revoke.status_code == 200
    assert client.get('/lite/me', headers={'X-Lite-Session': session}).status_code == 401
