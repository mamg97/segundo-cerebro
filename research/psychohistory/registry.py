"""Build canonical private Sheet rows from a verified report; never writes remotely."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path


def rows_for(report_path,predictions_path,evidence_url,run_date=None):
    run_date=run_date or dt.date.today().isoformat()
    raw=report_path.read_bytes(); report=json.loads(raw); predictions=json.loads(predictions_path.read_text())
    run_id=hashlib.sha256(raw).hexdigest()
    labels={'presence':'Presencia anual (25+ muertes)','onset':'Nuevo episodio tras un año bajo 25'}
    names={'frequency':'Frecuencia histórica','persistence':'Persistencia','markov':'Markov suavizado',
           'v1_memory_index':'V1 índice de memoria','v2_logistic':'V2 logística L2','interaction_table':'Tabla de interacciones'}
    rows=[]
    for task,data in report['tasks'].items():
        cohort=predictions[task+'_test']
        sample=json.dumps([[r['country'],r['year'],r['target']] for r in cohort],sort_keys=True,separators=(',',':')).encode()
        for model,m in data['test']['metrics'].items():
            note={'schema':'psychohistory.backtest.v1','runType':report['run_type'],
                  'runId':run_id,'taskId':task,'taskLabel':labels[task],
                  'horizon':'año objetivo completo; información hasta t-2','partition':'test',
                  'vintageVerified':False,'prospectiveEligible':False,
                  'datasetVersion':'UCDP OrganizedViolenceCY 26.1','protocolSha256':report['protocol_sha256'],
                  'codeSha256':report['code_sha256'],'sampleSha256':hashlib.sha256(sample).hexdigest(),
                  'n':m['n'],'events':m['events'],'brier':m['brier'],'logLoss':m['log_loss'],
                  'averagePrecision':m['average_precision'],'ece':m['ece'],
                  'skillFrequency':m['comparisons']['frequency']['brier_skill'],
                  'skillPersistence':m['comparisons']['persistence']['brier_skill'],
                  'skillMarkov':m['comparisons']['markov']['brier_skill'],
                  'skillMarkov95':m['comparisons']['markov']['brier_skill_95'],
                  'calibration':[{'count':b['count'],'meanProbability':b['mean_probability'],'eventRate':b['event_rate']} for b in m['calibration']],
                  'yearly':[{'year':y['year'],'n':y['n'],'events':y['events'],'brier':y['brier'],'meanProbability':y['mean_probability']} for y in m['by_year']],
                  'caveat':'Exploratorio; índice V1 sin covariables socioeconómicas. v2 corrige convergencia numérica tras inspeccionar salida v1. AP no interpolada; log loss recorta en 1e-12. IC no cubre revisiones.'}
            rows.append([run_id[:12]+'-'+task+'-'+model,'V1' if model=='v1_memory_index' else 'V2',
                         labels[task]+' · '+names[model]+' frente a referencias estadísticas',
                         note['datasetVersion'],names[model]+' / ucdp-cy-v2','brier',m['brier'],
                         data['test']['metrics']['frequency']['brier'],run_date,'RETROSPECTIVO_EXPLORATORIO',
                         evidence_url,json.dumps(note,ensure_ascii=False,separators=(',',':'))])
    abm=report['abm']
    note={'schema':'psychohistory.abm.v1','evidenceType':abm['evidence_type'],'empiricalFit':None,
          'nRuns':abm['n_runs'],'seeds':20,'groups':abm['groups'],'runId':run_id}
    rows.append([run_id[:12]+'-abm','V3','Sensibilidad de contagio irreversible en red, sin ajuste empírico',
                 'SINTÉTICO','Umbrales en red / v1','escenarios',abm['n_runs'],'',run_date,'SIMULACION_SINTETICA',
                 evidence_url,json.dumps(note,separators=(',',':'))])
    return rows


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--report',type=Path,required=True);p.add_argument('--predictions',type=Path,required=True)
    p.add_argument('--evidence-url',required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--run-date')
    a=p.parse_args()
    a.output.write_text(json.dumps(rows_for(a.report,a.predictions,a.evidence_url,a.run_date),ensure_ascii=False,indent=2)+'\n')
