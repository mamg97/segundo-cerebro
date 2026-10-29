import copy,hashlib,math,unittest
from datetime import date,timedelta
from decimal import Decimal
from vix_market_contrast import read_vix,candidate,labels_for,contrast,TARGET

class VixContrastTests(unittest.TestCase):
 def data(self):
  prices=[];vix={};day=date(2008,1,1);wealth=Decimal(100)
  for i in range(800):
   while day.weekday()>=5:day+=timedelta(days=1)
   wealth*=Decimal('1.001') if i%77<50 else Decimal('.994')
   prices.append((day,wealth));vix[day]=15+5*math.sin(i/13);day+=timedelta(days=1)
  return prices,vix
 def test_strict_csv_hash_dates_and_missing_values(self):
  raw=b'DATE,OPEN,HIGH,LOW,CLOSE\n01/02/2020,0,0,0,15\n01/03/2020,0,0,0,16\n'
  self.assertEqual(len(read_vix(raw,hashlib.sha256(raw).hexdigest(),'2020-01-03')),2)
  for bad in [raw.replace(b',16',b',NaN'),raw.replace(b'01/03/2020',b'01/02/2020'),raw.replace(b',16',b',0')]:
   with self.assertRaises(ValueError):read_vix(bad,hashlib.sha256(bad).hexdigest(),'2020-01-03')
  with self.assertRaises(ValueError):read_vix(raw,'0'*64,'2020-01-03')
  with self.assertRaises(ValueError):read_vix(raw,hashlib.sha256(raw).hexdigest(),'2020-01-02')
 def test_only_previous_vix_and_matured_labels_can_change_probability(self):
  prices,vix=self.data();labels=labels_for(prices);origin=500
  before=candidate(prices,vix,labels,origin)
  changed=vix.copy()
  for day in changed:
   if day>=prices[origin][0]:changed[day]=100
  future_labels={i:(1-y if i>origin-20 else y) for i,y in labels.items()}
  self.assertEqual(candidate(prices,changed,future_labels,origin),before)
  changed.pop(prices[origin-1][0])
  with self.assertRaisesRegex(ValueError,'previous-session'):candidate(prices,changed,labels,origin)
 def reference(self,prices):
  labels=labels_for(prices);start=next(i for i,(d,_) in enumerate(prices) if d>=date(2010,1,1));rows=[]
  for i in range(start,len(prices)-20,20):
   rows.append(dict(origin_date=prices[i][0].isoformat(),label_end_date=prices[i+20][0].isoformat(),last_training_label_date=prices[i][0].isoformat(),training_rows=i-20-60+1,outcome=labels[i],expanding_frequency=.2,recent_frequency=.25,volatility_only=.21))
  return dict(schema='psychohistory.equities_real_market_study.v1',target=TARGET,forecast_issued=False,source={'source_sha256':'0'*64},rows=rows)
 def test_preserves_paired_rows_and_rejects_tampered_or_missing_cases(self):
  prices,vix=self.data();ref=self.reference(prices);r=contrast(prices,vix,ref,'0'*64)
  self.assertEqual(len(r['rows']),len(ref['rows']));self.assertFalse(r['forecast_issued']);self.assertFalse(r['model_admitted'])
  self.assertEqual([x['volatility_only'] for x in r['rows']],[x['volatility_only'] for x in ref['rows']])
  for change in ['drop','label','training','probability']:
   bad=copy.deepcopy(ref)
   if change=='drop':bad['rows'].pop()
   elif change=='label':bad['rows'][0]['outcome']=1-bad['rows'][0]['outcome']
   elif change=='training':bad['rows'][0]['training_rows']+=1
   else:bad['rows'][0]['recent_frequency']=1.1
   with self.assertRaises(ValueError):contrast(prices,vix,bad,'0'*64)
