"""Horizontal OAF circle diagnostics, never forecast admission or outcome scoring.

Matches the spherical distance convention in pinned OpenSHA SphLatLon.
The explicit boundary tolerance is numerical policy, not location uncertainty.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

KM_PER_DEGREE = 111.12
EARTH_RADIUS_KM = KM_PER_DEGREE * 180 / math.pi


def number(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return float(value)


def coordinate(point):
    lat, lon = number(point['lat'], 'lat'), number(point['lon'], 'lon')
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise ValueError('coordinate outside canonical bounds')
    return lat, lon


def distance_km(first, second):
    lat1, lon1 = map(math.radians, coordinate(first))
    lat2, lon2 = map(math.radians, coordinate(second))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    # Roundoff can escape [0,1] at antipodes; this is not a geographic buffer.
    h = min(1.0, max(0.0, h))
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(h), math.sqrt(1-h))


def circle(value):
    if value['type'] != 'circle':
        raise ValueError('only spherical circles supported')
    coordinate(value['center'])
    radius = number(value['radius_km'], 'radius_km')
    if not 0 < radius <= KM_PER_DEGREE * 180:
        raise ValueError('radius outside (0, half circumference]')
    return value


def locate(region, point, tolerance):
    circle(region)
    tolerance = number(tolerance, 'boundary_tolerance_km')
    if tolerance < 0:
        raise ValueError('boundary tolerance must not be negative')
    distance = distance_km(region['center'], point)
    margin = region['radius_km'] - distance
    return {'distance_km': distance, 'margin_km': margin,
            'nominal_inside': distance <= region['radius_km'],
            'position': 'BORDER' if abs(margin) <= tolerance else ('INSIDE' if margin > 0 else 'OUTSIDE')}


def diagnose(data):
    if data['schema'] != 'oaf-spatial-diagnostic-input-v1':
        raise ValueError('unsupported input schema')
    technical, display = circle(data['technical']), circle(data['display'])
    tolerance = number(data['boundary_tolerance_km'], 'boundary_tolerance_km')
    if tolerance < 0:
        raise ValueError('negative boundary tolerance')
    if not isinstance(data['points'], list):
        raise ValueError('points must be a list')
    seen, rows = set(), []
    for point in data['points']:
        identity = point['id']
        if not isinstance(identity, str) or not identity.strip() or identity in seen:
            raise ValueError('point IDs must be unique nonempty strings')
        seen.add(identity)
        t, d = locate(technical, point, tolerance), locate(display, point, tolerance)
        rows.append({'id': identity, 'technical': t, 'display': d,
                     'nominal_membership_differs': t['nominal_inside'] != d['nominal_inside'],
                     'boundary_review_required': t['position'] == 'BORDER' or d['position'] == 'BORDER'})
    offset = distance_km(technical['center'], display['center'])
    return {'schema': 'oaf-spatial-diagnostic-v1', 'km_per_degree': KM_PER_DEGREE,
            'boundary_tolerance_km': tolerance, 'center_displacement_km': offset,
            'margin_difference_bound_km': offset + abs(technical['radius_km']-display['radius_km']),
            'point_count': len(rows), 'nominal_disagreement_count': sum(r['nominal_membership_differs'] for r in rows),
            'boundary_review_count': sum(r['boundary_review_required'] for r in rows),
            'points': rows, 'depth_evaluated': False, 'outcome_adjudicated': False,
            'forecast_issued': False, 'source_pair_validated': False,
            'limitations': 'Geometry only. Supplied circles are not authenticated by this module. No catalog completeness, physical uncertainty, depth, time, magnitude or independence assessment.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    report = diagnose(json.loads(raw))
    report['input_sha256'] = hashlib.sha256(raw).hexdigest()
    report['code_sha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    with args.output.open('x') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
        stream.write('\n')
    print(json.dumps({k: report[k] for k in ['point_count', 'nominal_disagreement_count', 'boundary_review_count', 'outcome_adjudicated']}))


if __name__ == '__main__':
    main()
