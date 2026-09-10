from io import BytesIO
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors


def _safe(value):
    return str(value or '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')


def build_plan_pdf(client_name:str, publication) -> bytes:
    buf=BytesIO(); doc=SimpleDocTemplate(buf,pagesize=A4,rightMargin=16*mm,leftMargin=16*mm,topMargin=16*mm,bottomMargin=16*mm)
    st=getSampleStyleSheet(); title=ParagraphStyle('ImperialTitle',parent=st['Title'],fontSize=20,leading=24,textColor=colors.HexColor('#111111'))
    h=ParagraphStyle('H',parent=st['Heading2'],fontSize=13,leading=16,spaceBefore=8,spaceAfter=5)
    body=ParagraphStyle('B',parent=st['BodyText'],fontSize=9.5,leading=13)
    kind_label='Entrenamiento' if publication.plan_type=='routine' else 'Alimentación'
    published_at=getattr(publication,'published_at',None)
    published_label=published_at.strftime('%d/%m/%Y') if published_at else '—'
    story=[Paragraph('IMPERIAL FITNESS',title),Paragraph(_safe(publication.title),st['Heading1']),Paragraph(f'Cliente: <b>{_safe(client_name)}</b> &nbsp;&nbsp; | &nbsp;&nbsp; Tipo: {_safe(kind_label)} &nbsp;&nbsp; | &nbsp;&nbsp; Versión: {publication.version} &nbsp;&nbsp; | &nbsp;&nbsp; Publicado: {published_label}',body),Spacer(1,8)]
    try: data=json.loads(publication.content_json or '{}')
    except: data={}
    if publication.plan_type=='routine':
        story.append(Paragraph('Entrenamiento',h))
        for day in data.get('days',[]) if isinstance(data,dict) else []:
            story.append(Paragraph(_safe(day.get('name') or day.get('title') or 'Sesión'),st['Heading3']))
            rows=[['Ejercicio','Series','Reps','RIR/Notas']]
            for ex in day.get('exercises',[]):
                rows.append([_safe(ex.get('name')),_safe(ex.get('sets')),_safe(ex.get('reps')),_safe(ex.get('rir') or ex.get('notes'))])
            if len(rows)>1:
                t=Table(rows,colWidths=[72*mm,20*mm,25*mm,55*mm],repeatRows=1)
                t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eeeeee')),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cccccc')),('FONTSIZE',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4)])); story += [t,Spacer(1,8)]
    else:
        story.append(Paragraph('Alimentación',h))
        macros=data.get('_summary',{}) if isinstance(data,dict) else {}
        if macros: story.append(Paragraph(' · '.join(f'{_safe(k)}: {_safe(v)}' for k,v in macros.items()),body))
        meals=data.get('meals',data) if isinstance(data,dict) else data
        if isinstance(meals,list):
            for meal in meals:
                if not isinstance(meal,dict): continue
                story.append(Paragraph(_safe(meal.get('name') or meal.get('title') or 'Comida'),st['Heading3']))
                items=meal.get('items') or meal.get('foods') or []
                for item in items:
                    if isinstance(item,dict): story.append(Paragraph(f"• {_safe(item.get('name') or item.get('food'))} {_safe(item.get('grams') or item.get('portion'))}",body))
    warnings=json.loads(publication.warnings_json or '[]')
    if warnings:
        story += [Spacer(1,10),Paragraph('Observaciones profesionales',h)]
        for w in warnings: story.append(Paragraph('• '+_safe(w),body))
    story += [Spacer(1,14),Paragraph('Documento generado desde Imperial Fitness. El plan debe ajustarse ante dolor, cambios clínicos o indicación de un profesional sanitario.',ParagraphStyle('foot',parent=body,fontSize=7.5,textColor=colors.HexColor('#666666')))]
    doc.build(story); return buf.getvalue()
