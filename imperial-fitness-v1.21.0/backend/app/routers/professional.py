import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import require_admin_or_trainer
from app.models import AssignedRoutine, ClientIntakeSurvey, DietPlan, PlanPublication, User, UserLimitation, WellnessCheckin
from app.core.time import utcnow
from app.services.plan_pdf import build_plan_pdf

router=APIRouter(prefix='/professional',tags=['professional-plans'])

class PublishRequest(BaseModel):
    user_id:int
    plan_type:str=Field(pattern='^(routine|diet)$')
    source_id:int|None=None
    acknowledge_warnings:bool=False


def _manage(db,user_id,current):
    u=db.get(User,user_id)
    if not u or u.role!='client': raise HTTPException(404,'Cliente no encontrado')
    if current.role=='trainer' and u.assigned_trainer_id!=current.id: raise HTTPException(403,'Solo puedes gestionar clientes asignados')
    return u

def _latest_source(db,u,kind,source_id=None):
    if kind=='routine':
        q=db.query(AssignedRoutine).filter(AssignedRoutine.client_id==u.id)
        if source_id:q=q.filter(AssignedRoutine.id==source_id)
        else:q=q.filter(AssignedRoutine.active==1)
        return q.order_by(AssignedRoutine.created_at.desc()).first()
    q=db.query(DietPlan).filter(DietPlan.client_id==u.id)
    if source_id:q=q.filter(DietPlan.id==source_id)
    else:q=q.filter(DietPlan.active==1)
    return q.order_by(DietPlan.created_at.desc()).first()

def _content(source,kind):
    try:
        raw=json.loads(source.payload_json if kind=='routine' else source.meals_json or ('{}' if kind=='routine' else '[]'))
    except Exception: raise HTTPException(422,'El contenido del plan no es JSON válido')
    if kind=='diet':
        return {'meals':raw,'_summary':{'calorías':source.calories,'proteína_g':source.protein,'carbohidratos_g':source.carbs,'grasa_g':source.fat},'notes':source.notes}
    return raw

def _warnings(db,u,kind,source,content):
    warnings=[]; blockers=[]
    survey_row=db.query(ClientIntakeSurvey).filter(ClientIntakeSurvey.user_id==u.id).first()
    survey={}
    if survey_row:
        try: survey=json.loads(survey_row.survey_json or '{}')
        except Exception: survey={}
    else:
        warnings.append('Cuestionario inicial de salud y nutrición pendiente.')
    if survey.get('chest_pain_or_fainting') or survey.get('medical_clearance_needed'):
        blockers.append('El cuestionario indica necesidad de valoración médica antes de publicar un entrenamiento.') if kind=='routine' else warnings.append('El cuestionario indica una situación médica que debe revisarse antes de ajustar alimentación.')
    if kind=='diet':
        if survey.get('pregnancy_or_lactation'): blockers.append('Embarazo/lactancia: el plan requiere valoración nutricional individual.')
        if survey.get('kidney_disease'): blockers.append('Antecedente de enfermedad renal: no publicar una prescripción automática de macros.')
        if survey.get('eating_disorder_history'): blockers.append('Antecedente de TCA: requiere manejo por profesional cualificado antes de prescripción automatizada.')
        if survey.get('diabetes'): warnings.append('Diabetes reportada: revisar distribución de carbohidratos y coordinación con el equipo de salud.')
        if survey.get('hypertension'): warnings.append('Hipertensión reportada: revisar sodio, hidratación y recomendaciones clínicas.')
        if survey.get('food_allergies'): warnings.append('Alergias/intolerancias reportadas: verificar cada alimento y sustitución.')
    if u.age is None: warnings.append('Edad no registrada.')
    elif u.age<18: blockers.append('Cliente menor de 18 años: requiere revisión profesional individual antes de publicar.')
    if not u.weight: warnings.append('Peso actual no registrado; verifica que el plan siga siendo apropiado.')
    limitations=db.query(UserLimitation).filter(UserLimitation.user_id==u.id,UserLimitation.status=='active').all()
    high=[x for x in limitations if x.severity=='alta']
    if high and kind=='routine': blockers.append('Hay limitaciones de severidad alta: '+', '.join(sorted({x.body_area for x in high}))+'.')
    if kind=='routine':
        days=content.get('days',[]) if isinstance(content,dict) else []
        exercises=sum(len(d.get('exercises',[])) for d in days if isinstance(d,dict))
        if not days or not exercises: blockers.append('La rutina no contiene días y ejercicios completos.')
    else:
        if not source.calories or source.calories<1000: blockers.append('Objetivo calórico ausente o inferior a 1000 kcal: publicación automática bloqueada.')
        if not content.get('meals'): blockers.append('El plan alimentario no contiene comidas.')
    recent=db.query(WellnessCheckin).filter(WellnessCheckin.user_id==u.id).order_by(WellnessCheckin.submitted_at.desc()).first()
    if recent and recent.pain_present and (recent.pain_score or 0)>=7 and kind=='routine': blockers.append(f'Check-in reciente reporta dolor {recent.pain_score}/10 en {recent.pain_area}.')
    return blockers,warnings

@router.post('/validate')
def validate_plan(payload:PublishRequest,db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    u=_manage(db,payload.user_id,current); source=_latest_source(db,u,payload.plan_type,payload.source_id)
    if not source: raise HTTPException(404,'No existe un plan fuente para publicar')
    content=_content(source,payload.plan_type); blockers,warnings=_warnings(db,u,payload.plan_type,source,content)
    return {'can_publish':not blockers,'blockers':blockers,'warnings':warnings,'source_id':source.id,'title':source.title}

@router.post('/publish')
def publish(payload:PublishRequest,db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    u=_manage(db,payload.user_id,current); source=_latest_source(db,u,payload.plan_type,payload.source_id)
    if not source: raise HTTPException(404,'No existe un plan fuente para publicar')
    content=_content(source,payload.plan_type); blockers,warnings=_warnings(db,u,payload.plan_type,source,content)
    if blockers: raise HTTPException(422,'Publicación bloqueada: '+' '.join(blockers))
    if warnings and not payload.acknowledge_warnings: raise HTTPException(409,'Revisa y confirma las advertencias antes de publicar: '+' '.join(warnings))
    # Serializa la publicación por cliente para evitar dos versiones iguales si hay doble clic/concurrencia.
    db.query(User).filter(User.id==u.id).with_for_update().one()
    latest=db.query(func.max(PlanPublication.version)).filter(PlanPublication.user_id==u.id,PlanPublication.plan_type==payload.plan_type).scalar() or 0
    db.query(PlanPublication).filter(PlanPublication.user_id==u.id,PlanPublication.plan_type==payload.plan_type,PlanPublication.status=='published').update({'status':'superseded'})
    row=PlanPublication(user_id=u.id,plan_type=payload.plan_type,source_id=source.id,title=source.title,version=latest+1,status='published',content_json=json.dumps(content,ensure_ascii=False),warnings_json=json.dumps(warnings,ensure_ascii=False),approved_by=current.id,published_at=utcnow())
    db.add(row); db.commit(); db.refresh(row)
    return {'id':row.id,'user_id':u.id,'plan_type':row.plan_type,'title':row.title,'version':row.version,'warnings':warnings,'published_at':row.published_at,'pdf_url':f'/professional/publications/{row.id}/pdf'}

@router.get('/publications')
def publications(user_id:int|None=None,db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    q=db.query(PlanPublication)
    if user_id:q=q.filter(PlanPublication.user_id==user_id)
    rows=q.order_by(PlanPublication.created_at.desc()).limit(300).all(); out=[]
    user_ids={row.user_id for row in rows}
    users={user.id:user for user in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    for r in rows:
        u=users.get(r.user_id)
        if current.role=='trainer' and u and u.assigned_trainer_id!=current.id: continue
        out.append({'id':r.id,'user_id':r.user_id,'client_name':u.name if u else '', 'plan_type':r.plan_type,'title':r.title,'version':r.version,'status':r.status,'warnings':json.loads(r.warnings_json or '[]'),'published_at':r.published_at})
    return out

@router.get('/publications/{publication_id}/pdf')
def publication_pdf(publication_id:int,db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    r=db.get(PlanPublication,publication_id)
    if not r: raise HTTPException(404,'Publicación no encontrada')
    u=_manage(db,r.user_id,current)
    data=build_plan_pdf(u.name,r); filename=f"imperial-{r.plan_type}-{u.id}-v{r.version}.pdf"
    return Response(data,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="{filename}"'})

@router.get('/intake/{user_id}')
def get_client_intake(user_id:int,db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    u=_manage(db,user_id,current)
    row=db.query(ClientIntakeSurvey).filter(ClientIntakeSurvey.user_id==u.id).first()
    if not row: return {'completed':False,'data':{}}
    try:data=json.loads(row.survey_json or '{}')
    except Exception:data={}
    return {'completed':True,'data':data,'updated_at':row.updated_at}


@router.get('/attention')
def attention(db:Session=Depends(get_db),current:User=Depends(require_admin_or_trainer)):
    q=db.query(User).filter(User.role=='client',User.status=='active')
    if current.role=='trainer': q=q.filter(User.assigned_trainer_id==current.id)
    clients=q.order_by(User.name.asc()).all()
    if not clients: return []
    ids=[u.id for u in clients]
    now=utcnow()

    # Cargas por lote: evita varias consultas por cada cliente y mantiene ligero el panel.
    all_checkins=(db.query(WellnessCheckin)
        .filter(WellnessCheckin.user_id.in_(ids))
        .order_by(WellnessCheckin.user_id.asc(),WellnessCheckin.submitted_at.desc()).all())
    checkins_by_user={}
    for checkin in all_checkins:
        bucket=checkins_by_user.setdefault(checkin.user_id,[])
        if len(bucket)<3: bucket.append(checkin)

    routine_users={row[0] for row in db.query(AssignedRoutine.client_id).filter(AssignedRoutine.client_id.in_(ids),AssignedRoutine.active==1).distinct().all()}
    diet_users={row[0] for row in db.query(DietPlan.client_id).filter(DietPlan.client_id.in_(ids),DietPlan.active==1).distinct().all()}
    published=(db.query(PlanPublication)
        .filter(PlanPublication.user_id.in_(ids),PlanPublication.status=='published')
        .order_by(PlanPublication.user_id.asc(),PlanPublication.plan_type.asc(),PlanPublication.published_at.desc()).all())
    latest_publication_by_type={}
    for row in published:
        latest_publication_by_type.setdefault((row.user_id,row.plan_type),row)
    surveyed_users={row[0] for row in db.query(ClientIntakeSurvey.user_id).filter(ClientIntakeSurvey.user_id.in_(ids)).distinct().all()}

    result=[]
    for u in clients:
        reasons=[]; score=0
        recent_checkins=checkins_by_user.get(u.id,[])
        c=recent_checkins[0] if recent_checkins else None
        if not c:
            reasons.append('Sin check-in de seguimiento'); score+=25
        else:
            age=(now-c.submitted_at).days
            if age>=10: reasons.append(f'Check-in vencido ({age} días)'); score+=25
            if c.pain_present and (c.pain_score or 0)>=7: reasons.append(f'Dolor alto {c.pain_score}/10 · {c.pain_area}'); score+=60
            elif c.pain_present: reasons.append(f'Reporta dolor {c.pain_score or 0}/10 · {c.pain_area}'); score+=25
            if c.nutrition_adherence is not None and c.nutrition_adherence<60: reasons.append(f'Adherencia nutricional baja ({c.nutrition_adherence}%)'); score+=25
            if c.energy is not None and c.energy<=2: reasons.append('Energía baja'); score+=15
            if c.sleep_hours is not None and c.sleep_hours<6: reasons.append(f'Sueño bajo ({c.sleep_hours} h)'); score+=15
            if c.stress is not None and c.stress>=4: reasons.append('Estrés alto'); score+=15
            weights=[x.weight for x in recent_checkins if x.weight]
            if len(weights)>=2 and weights[1] and abs(weights[0]-weights[1])/weights[1]>=0.05:
                reasons.append(f'Cambio de peso >=5% entre seguimientos ({weights[1]:.1f} → {weights[0]:.1f} kg)'); score+=25
        if u.id not in surveyed_users: reasons.append('Cuestionario inicial pendiente'); score+=15
        if u.id not in routine_users:
            reasons.append('Sin entrenamiento activo'); score+=20
        else:
            publication=latest_publication_by_type.get((u.id,'routine'))
            if not publication:
                reasons.append('Entrenamiento sin versión profesional publicada'); score+=10
            elif publication.published_at and (now-publication.published_at).days>=42:
                reasons.append(f'Entrenamiento sin renovar hace {(now-publication.published_at).days} días'); score+=15
        if u.id not in diet_users:
            reasons.append('Sin alimentación activa'); score+=20
        else:
            publication=latest_publication_by_type.get((u.id,'diet'))
            if not publication:
                reasons.append('Alimentación sin versión profesional publicada'); score+=10
            elif publication.published_at and (now-publication.published_at).days>=42:
                reasons.append(f'Alimentación sin renovar hace {(now-publication.published_at).days} días'); score+=15
        if not u.weight or not u.age or not u.height: reasons.append('Perfil físico incompleto'); score+=10
        priority='critical' if score>=60 else 'high' if score>=40 else 'medium' if score>=20 else 'ok'
        result.append({'user_id':u.id,'client_name':u.name,'priority':priority,'score':score,'reasons':reasons,'last_checkin_at':c.submitted_at if c else None})
    order={'critical':0,'high':1,'medium':2,'ok':3}; result.sort(key=lambda x:(order[x['priority']],-x['score'],x['client_name']))
    return result

