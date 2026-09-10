from datetime import timedelta
import json
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin_or_trainer
from app.models import AssignedRoutine, ClientIntakeSurvey, ClientPortalLink, DietPlan, LiteSession, PlanPublication, User, WellnessCheckin, BodyMetric
from app.security import generate_secure_token, hash_token
from app.core.config import get_settings
from app.core.time import utcnow
from app.services.plan_pdf import build_plan_pdf

router = APIRouter(prefix="/lite", tags=["lite"])
settings = get_settings()

class LinkCreate(BaseModel):
    user_id: int
    expires_days: int = Field(default=30, ge=1, le=365)
    label: str = Field(default="Seguimiento Imperial", max_length=120)
    set_lite_mode: bool = True

class ExchangeRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)

class ExperienceModeUpdate(BaseModel):
    mode: str = Field(pattern='^(lite|premium|hybrid)$')


class IntakeSurveyCreate(BaseModel):
    medical_clearance_needed: bool = False
    chest_pain_or_fainting: bool = False
    pregnancy_or_lactation: bool = False
    diabetes: bool = False
    kidney_disease: bool = False
    hypertension: bool = False
    eating_disorder_history: bool = False
    digestive_condition: bool = False
    food_allergies: str = Field(default="", max_length=500)
    medications: str = Field(default="", max_length=500)
    injuries_or_surgeries: str = Field(default="", max_length=800)
    dietary_preferences: str = Field(default="", max_length=500)
    foods_disliked: str = Field(default="", max_length=500)
    cooking_access: str = Field(default="normal", pattern="^(limited|normal|full)$")
    budget_level: str = Field(default="medium", pattern="^(low|medium|flexible)$")
    notes: str = Field(default="", max_length=1200)


class CheckinCreate(BaseModel):
    weight: float | None = Field(default=None, ge=20, le=300)
    training_sessions: int | None = Field(default=None, ge=0, le=14)
    nutrition_adherence: int | None = Field(default=None, ge=0, le=100)
    energy: int | None = Field(default=None, ge=1, le=5)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    hunger: int | None = Field(default=None, ge=1, le=5)
    stress: int | None = Field(default=None, ge=1, le=5)
    pain_present: bool = False
    pain_score: int | None = Field(default=None, ge=0, le=10)
    pain_area: str = Field(default="", max_length=80)
    pain_trigger: str = Field(default="", max_length=300)
    notes: str = Field(default="", max_length=1200)


def _public_user(user: User):
    return {"id": user.id, "name": user.name, "goal": user.goal, "service_tier": user.service_tier, "experience_mode": user.experience_mode}


def _session_user(db: Session, token: str | None) -> User:
    if not token:
        raise HTTPException(401, "Sesión Lite requerida")
    row = db.query(LiteSession).filter(LiteSession.session_hash == hash_token(token), LiteSession.revoked_at.is_(None)).first()
    if not row or row.expires_at <= utcnow():
        raise HTTPException(401, "El enlace de seguimiento venció. Solicita uno nuevo a tu coach.")
    user = db.get(User, row.user_id)
    if not user or user.status != "active":
        raise HTTPException(403, "La cuenta no está habilitada")
    return user


@router.post("/links")
def create_link(payload: LinkCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    user = db.get(User, payload.user_id)
    if not user or user.role != "client":
        raise HTTPException(404, "Cliente no encontrado")
    if current_user.role == "trainer" and user.assigned_trainer_id != current_user.id:
        raise HTTPException(403, "Solo puedes gestionar clientes asignados")
    raw = generate_secure_token()
    row = ClientPortalLink(user_id=user.id, token_hash=hash_token(raw), label=payload.label, expires_at=utcnow()+timedelta(days=payload.expires_days), created_by=current_user.id)
    if payload.set_lite_mode:
        user.experience_mode = "lite"
        user.service_tier = "lite"
    db.add(row); db.commit(); db.refresh(row)
    base = settings.frontend_url.rstrip('/')
    return {"id": row.id, "url": f"{base}/lite#token={raw}", "expires_at": row.expires_at, "client": _public_user(user)}


@router.patch("/clients/{user_id}/experience")
def set_client_experience(user_id:int, payload:ExperienceModeUpdate, db:Session=Depends(get_db), current_user:User=Depends(require_admin_or_trainer)):
    user=db.get(User,user_id)
    if not user or user.role!="client": raise HTTPException(404,"Cliente no encontrado")
    if current_user.role=="trainer" and user.assigned_trainer_id!=current_user.id: raise HTTPException(403,"Solo puedes gestionar clientes asignados")
    user.experience_mode=payload.mode
    user.service_tier='lite' if payload.mode=='lite' else 'premium' if payload.mode=='premium' else 'hybrid'
    db.commit(); db.refresh(user)
    return {"ok":True,"client":_public_user(user)}


@router.get("/links")
def list_links(user_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    q = db.query(ClientPortalLink)
    if user_id: q=q.filter(ClientPortalLink.user_id==user_id)
    rows=q.order_by(ClientPortalLink.created_at.desc()).limit(200).all()
    user_ids={row.user_id for row in rows}
    users={user.id:user for user in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    out=[]
    for r in rows:
        u=users.get(r.user_id)
        if current_user.role=="trainer" and u and u.assigned_trainer_id!=current_user.id: continue
        out.append({"id":r.id,"user_id":r.user_id,"client_name":u.name if u else "","label":r.label,"expires_at":r.expires_at,"revoked_at":r.revoked_at,"last_used_at":r.last_used_at,"created_at":r.created_at})
    return out


@router.delete("/links/{link_id}")
def revoke_link(link_id:int, db:Session=Depends(get_db), current_user:User=Depends(require_admin_or_trainer)):
    row=db.get(ClientPortalLink,link_id)
    if not row: raise HTTPException(404,"Enlace no encontrado")
    u=db.get(User,row.user_id)
    if current_user.role=="trainer" and u and u.assigned_trainer_id!=current_user.id: raise HTTPException(403,"Permiso insuficiente")
    row.revoked_at=utcnow(); db.query(LiteSession).filter(LiteSession.source_link_id==row.id, LiteSession.revoked_at.is_(None)).update({"revoked_at":utcnow()}); db.commit()
    return {"ok":True}


@router.post("/exchange")
def exchange(payload:ExchangeRequest, db:Session=Depends(get_db)):
    row=db.query(ClientPortalLink).filter(ClientPortalLink.token_hash==hash_token(payload.token), ClientPortalLink.revoked_at.is_(None)).first()
    if not row or row.expires_at<=utcnow(): raise HTTPException(401,"Enlace inválido o vencido")
    user=db.get(User,row.user_id)
    if not user or user.status!="active": raise HTTPException(403,"La cuenta no está habilitada")
    raw=generate_secure_token()
    session=LiteSession(user_id=user.id, source_link_id=row.id, session_hash=hash_token(raw), expires_at=min(row.expires_at, utcnow()+timedelta(hours=12)))
    row.last_used_at=utcnow(); db.add(session); db.commit()
    return {"session_token":raw,"expires_at":session.expires_at,"client":_public_user(user)}


@router.get("/me")
def lite_me(x_lite_session:str|None=Header(default=None), db:Session=Depends(get_db)):
    user=_session_user(db,x_lite_session); return _public_user(user)


def _current_plans(db,user_id):
    def decode(v,default):
        try:return json.loads(v or '')
        except:return default
    published = db.query(PlanPublication).filter(PlanPublication.user_id==user_id, PlanPublication.status=='published').order_by(PlanPublication.published_at.desc()).all()
    by_type = {}
    for row in published:
        by_type.setdefault(row.plan_type, row)
    result = {"routine": None, "diet": None}
    if by_type.get('routine'):
        row=by_type['routine']; data=decode(row.content_json,{})
        result['routine']={"id":row.source_id,"publication_id":row.id,"version":row.version,"title":row.title,"objective":data.get('objective','') if isinstance(data,dict) else '',"content":data}
    else:
        routine=db.query(AssignedRoutine).filter(AssignedRoutine.client_id==user_id,AssignedRoutine.active==1).order_by(AssignedRoutine.created_at.desc()).first()
        if routine: result['routine']={"id":routine.id,"title":routine.title,"objective":routine.objective,"content":decode(routine.payload_json,{})}
    if by_type.get('diet'):
        row=by_type['diet']; data=decode(row.content_json,{})
        summary=data.get('_summary',{}) if isinstance(data,dict) else {}
        result['diet']={"id":row.source_id,"publication_id":row.id,"version":row.version,"title":row.title,"calories":summary.get('calorías'),"protein":summary.get('proteína_g'),"carbs":summary.get('carbohidratos_g'),"fat":summary.get('grasa_g'),"notes":data.get('notes','') if isinstance(data,dict) else '',"content":data.get('meals',[]) if isinstance(data,dict) else data}
    else:
        diet=db.query(DietPlan).filter(DietPlan.client_id==user_id,DietPlan.active==1).order_by(DietPlan.created_at.desc()).first()
        if diet: result['diet']={"id":diet.id,"title":diet.title,"calories":diet.calories,"protein":diet.protein,"carbs":diet.carbs,"fat":diet.fat,"notes":diet.notes,"content":decode(diet.meals_json,[])}
    return result

@router.get("/plans")
def lite_plans(x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session); return _current_plans(db,u.id)

@router.post("/checkins")
def submit_checkin(payload:CheckinCreate,x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session)
    if payload.pain_present and (payload.pain_score is None or not payload.pain_area.strip()):
        raise HTTPException(422,"Indica intensidad y zona del dolor")
    row=WellnessCheckin(user_id=u.id,weight=payload.weight,training_sessions=payload.training_sessions,nutrition_adherence=payload.nutrition_adherence,energy=payload.energy,sleep_hours=payload.sleep_hours,hunger=payload.hunger,stress=payload.stress,pain_present=1 if payload.pain_present else 0,pain_score=payload.pain_score,pain_area=payload.pain_area.strip(),pain_trigger=payload.pain_trigger.strip(),notes=payload.notes.strip())
    db.add(row)
    if payload.weight:
        db.add(BodyMetric(user_id=u.id, weight=payload.weight, body_fat=u.body_fat or 0, muscle_mass=u.muscle_mass or 0, measured_at=utcnow(), recorded_at=utcnow()))
        u.weight=payload.weight
    db.commit(); db.refresh(row)
    return {"ok":True,"id":row.id,"alert": bool(payload.pain_present and (payload.pain_score or 0)>=7)}

@router.get("/checkins")
def my_checkins(x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session)
    rows=db.query(WellnessCheckin).filter(WellnessCheckin.user_id==u.id).order_by(WellnessCheckin.submitted_at.desc()).limit(12).all()
    return [{"id":r.id,"weight":r.weight,"training_sessions":r.training_sessions,"nutrition_adherence":r.nutrition_adherence,"energy":r.energy,"sleep_hours":r.sleep_hours,"hunger":r.hunger,"stress":r.stress,"pain_present":bool(r.pain_present),"pain_score":r.pain_score,"pain_area":r.pain_area,"notes":r.notes,"submitted_at":r.submitted_at} for r in rows]


@router.get("/publications/{publication_id}/pdf")
def lite_publication_pdf(publication_id:int,x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session)
    row=db.get(PlanPublication,publication_id)
    if not row or row.user_id!=u.id or row.status!='published': raise HTTPException(404,"Documento no encontrado")
    data=build_plan_pdf(u.name,row)
    filename=f"imperial-{row.plan_type}-v{row.version}.pdf"
    return Response(data,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="{filename}"'})


@router.get("/intake")
def get_intake(x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session)
    row=db.query(ClientIntakeSurvey).filter(ClientIntakeSurvey.user_id==u.id).first()
    if not row: return {"completed":False,"data":{}}
    try:data=json.loads(row.survey_json or '{}')
    except:data={}
    return {"completed":True,"data":data,"updated_at":row.updated_at}


@router.put("/intake")
def save_intake(payload:IntakeSurveyCreate,x_lite_session:str|None=Header(default=None),db:Session=Depends(get_db)):
    u=_session_user(db,x_lite_session)
    row=db.query(ClientIntakeSurvey).filter(ClientIntakeSurvey.user_id==u.id).first()
    encoded=json.dumps(payload.model_dump(),ensure_ascii=False)
    if not row:
        row=ClientIntakeSurvey(user_id=u.id,survey_json=encoded,submitted_at=utcnow())
        db.add(row)
    else:
        row.survey_json=encoded; row.updated_at=utcnow()
    db.commit(); db.refresh(row)
    flags=[]
    if payload.chest_pain_or_fainting or payload.medical_clearance_needed: flags.append('medical_review')
    if payload.pregnancy_or_lactation or payload.diabetes or payload.kidney_disease or payload.eating_disorder_history: flags.append('nutrition_professional_review')
    return {"ok":True,"flags":flags,"updated_at":row.updated_at}
