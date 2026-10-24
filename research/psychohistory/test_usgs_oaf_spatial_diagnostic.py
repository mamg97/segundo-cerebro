"""Synthetic analytic geometry checks; no earthquake observations."""
import copy
import math
import unittest
import usgs_oaf_spatial_diagnostic as geo


def point(lat, lon):
    return {'lat': lat, 'lon': lon}


def region(lat=0, lon=0, radius=1):
    return {'type': 'circle', 'center': point(lat, lon), 'radius_km': radius}


class SpatialTests(unittest.TestCase):
    def test_analytic_equator_and_dateline(self):
        self.assertAlmostEqual(geo.distance_km(point(0,0), point(0,1)),111.12)
        self.assertAlmostEqual(geo.distance_km(point(0,179), point(0,-179)),222.24)

    def test_poles_and_antipodes(self):
        self.assertAlmostEqual(geo.distance_km(point(90,0),point(90,120)),0)
        self.assertAlmostEqual(geo.distance_km(point(0,0),point(0,180)),111.12*180)
        self.assertTrue(math.isfinite(geo.distance_km(point(37,12),point(-37,-168))))

    def test_explicit_boundary_policy(self):
        r=region(radius=111.12)
        self.assertEqual(geo.locate(r,point(0,1),1e-6)['position'],'BORDER')
        self.assertEqual(geo.locate(r,point(0,.999),1e-6)['position'],'INSIDE')
        self.assertEqual(geo.locate(r,point(0,1.001),1e-6)['position'],'OUTSIDE')
        self.assertEqual(geo.locate(r,point(0,1.001),1)['position'],'BORDER')

    def test_shifted_center_changes_membership(self):
        data={'schema':'oaf-spatial-diagnostic-input-v1','technical':region(),'display':region(lon=.01),'boundary_tolerance_km':1e-6,'points':[{'id':'synthetic',**point(0,0)}]}
        r=geo.diagnose(data)
        self.assertEqual(r['nominal_disagreement_count'],1)
        self.assertAlmostEqual(r['center_displacement_km'],1.1112)
        self.assertFalse(r['outcome_adjudicated']);self.assertFalse(r['source_pair_validated'])
        data['display']['radius_km']=2
        self.assertAlmostEqual(geo.diagnose(data)['margin_difference_bound_km'],2.1112)

    def test_reject_invalid_numbers_and_geometry(self):
        for p in [point(91,0),point(0,181),point(float('nan'),0),point(0,float('inf')),point(True,0)]:
            with self.assertRaises(ValueError):geo.distance_km(p,point(0,0))
        for radius in [0,-1,True,float('inf'),20002]:
            with self.assertRaises(ValueError):geo.circle(region(radius=radius))
        with self.assertRaises(ValueError):geo.locate(region(),point(0,0),-1)
        with self.assertRaises(ValueError):geo.circle({'type':'rectangle'})

    def test_schema_tolerance_and_duplicate_ids(self):
        data={'schema':'oaf-spatial-diagnostic-input-v1','technical':region(),'display':region(),'boundary_tolerance_km':0,'points':[]}
        self.assertEqual(geo.diagnose(data)['point_count'],0)
        bad=copy.deepcopy(data);del bad['boundary_tolerance_km']
        with self.assertRaises(KeyError):geo.diagnose(bad)
        bad=copy.deepcopy(data);bad['points']=[{'id':'a',**point(0,0)}]*2
        with self.assertRaises(ValueError):geo.diagnose(bad)
        bad=copy.deepcopy(data);bad['schema']='other'
        with self.assertRaises(ValueError):geo.diagnose(bad)


if __name__=='__main__':unittest.main()
