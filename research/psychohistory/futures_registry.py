"""Prepare new private canonical rows; never writes remotely or overwrites old runs."""
import argparse
import datetime as dt
import json
from pathlib import Path
from benchmark import canonical, digest


def registry(report_path, evidence_url, run_date=None):
    raw = report_path.read_bytes(); report = json.loads(raw)
    if report.get('vintageVerified') is not False or report.get('prospectiveEligible') is not False or not report['quality']['passed']:
        raise ValueError('Only quality-audited revised-release backtests supported')
    run_id = digest(raw); date = run_date or dt.date.today().isoformat(); rows = []
    common = {'version': report['protocol']['version'], 'runId': run_id,
              'protocolSha256': report['protocolSha256'], 'codeSha256': report['codeSha256'],
              'datasetVersion': 'UCDP OrganizedViolenceCY 26.1', 'runType': report['runType'],
              'vintageVerified': False, 'prospectiveEligible': False}
    for catalog in report['catalogs']:
        note = {**common, **catalog, 'schema': 'psychohistory.futures.catalog.v1',
                'priorStrength': report['protocol']['country_prior_strength'], 'seed': report['protocol']['seed']}
        rows.append([run_id[:12] + '-catalog-' + str(catalog['origin']), 'V4',
                     'Catálogo de parámetros e información retrospectiva; no es una evaluación independiente',
                     common['datasetVersion'], common['version'], 'paises_catalogados', len(catalog['countries']), '',
                     date, 'CATALOGO_RETROSPECTIVO', evidence_url, canonical(note).decode()])
    for horizon, data in report['results']['test'].items():
        for model, result in data['models'].items():
            if result is None: continue
            note = {**common, 'schema': 'psychohistory.futures.metrics.v1', 'partition': 'test',
                    'horizon': int(horizon), 'model': model, 'sampleSha256': data['sampleSha256'],
                    'n': result['n'], 'origins': result['origins'], 'stateCounts': result['stateCounts'],
                    'brier': result['brier'], 'logLoss': result['log_loss'], 'ece': result['ece'],
                    'sequenceLogLoss': result['sequence_log_loss'], 'riskBrier': result['risk_brier'],
                    'comparisons': result['comparisons'], 'calibration': result['calibration'],
                    'yearly': [{k: y[k] for k in ['origin', 'n', 'brier', 'log_loss']} for y in result['yearly']],
                    'windows': [{**{k: w[k] for k in ['from', 'to']},
                                 'n': w['metrics']['n'] if w['metrics'] else 0,
                                 'brier': w['metrics']['brier'] if w['metrics'] else None} for w in result['windows']],
                    'excludedMissingLabels': data['excludedMissingLabels'],
                    'caveat': 'Brier nominal sin dividir por 2. Matriz fija por origen, release revisada. IC por bloques max(2,H), solo con dos bloques completos. No cobertura prospectiva.'}
            rows.append([run_id[:12] + '-h' + str(horizon) + '-' + model, 'V1' if model == 'memory2' else 'V2',
                         'Distribución de cuatro transiciones observables · H=' + str(horizon), common['datasetVersion'],
                         model + ' / ' + common['version'], 'brier_multicategoria', result['brier'],
                         data['models']['markov']['brier'], date, 'RETROSPECTIVO_EXPLORATORIO', evidence_url, canonical(note).decode()])
    if any(len(row[-1]) > 45000 for row in rows): raise ValueError('Canonical cell exceeds safe size')
    return rows


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--report', type=Path, required=True); p.add_argument('--evidence-url', required=True)
    p.add_argument('--output', type=Path, required=True); p.add_argument('--date')
    a = p.parse_args(); a.output.write_bytes(canonical(registry(a.report, a.evidence_url, a.date)) + b'\n')
