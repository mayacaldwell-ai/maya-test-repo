#!/usr/bin/env python3
import json, time
PATH = '/root/.openclaw/workspace/reports/tracking.json'
try:
    data = json.load(open(PATH))
except:
    data = {'visits':0,'checkout_starts':0,'purchases':0,'events':[]}

def record(evt):
    data['events'].append({'t':int(time.time()),'evt':evt})
    if evt=='visit': data['visits']+=1
    if evt=='checkout_start': data['checkout_starts']+=1
    if evt=='purchase': data['purchases']+=1
    json.dump(data, open(PATH,'w'))
    print('recorded', evt)

if __name__=='__main__':
    import sys
    if len(sys.argv)>1: record(sys.argv[1])
    else: print('usage: tracking.py <event>')
