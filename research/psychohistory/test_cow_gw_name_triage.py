"""Synthetic geographic nomenclature cases, no real country mappings."""
import csv
import io
import unittest
from cow_gw_name_triage import analyze, _name

COW = ['stateabb','ccode','statenme','styear','stmonth','stday','endyear','endmonth','endday','version']
GW = ['statenumber','stateid','countryname','start','end']


def encode(header, rows, sep=','):
    x=io.StringIO(newline='')
    w=csv.writer(x, delimiter=sep)
    w.writerow(header)
    w.writerows(rows)
    return x.getvalue().encode()


def cow(token,code,label):
    return [token,code,label,2010,1,1,2024,12,31,2024]


def gw(token,code,label):
    return [code,token,label,'2010-01-01','2020-12-31']


def samples():
    c=encode(COW,[cow('AAA',100,'Fictional Alpha'),cow('BBB',200,'Fictional Beta'),cow('CCC',300,'Coastal Fictionia'),cow('DDD',400,'Northern Fictionia'),cow('EEE',500,'Reused Name'),cow('FFF',600,'Orphan Country')])
    g=encode(GW,[gw('AAA',100,'Fictional Alpha'),gw('BBB',201,'Fictional Beta'),gw('WWW',300,'Coastal Fictionia'),gw('TTT',701,'Northern Fictionia'),gw('YYY',702,'Reused Name')], '\t')
    m=encode(GW,[gw('QQQ',999,'Reused Name'),gw('RRR',998,'Not COW State')], '\t')
    return c,g,m
