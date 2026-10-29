"""Real 3D UI checks with saved checkpoints; no production debug/answer API.

Node tests traverse all progression states and pathfind every rendered room.
This suite renders all 21 floors and exercises the learning and story UI.
"""
import copy
import json
import os
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
KEY='mathTower.midnight.tower1.v2'
# Generate legitimate learning records through the actual bank and checked-step APIs.
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',r'''
import {midnightTower as tower} from './towers/tower-0001.js';
import {freshState,activate,secureFloor} from './engines/midnight/state.js';
import {getProblem} from './math/bank.js';
import {progressFor,submit} from './math/guided-solutions.js';
const s=freshState(91542),states=[];
for(let floor=0;floor<21;floor++){
 s.floor=floor;s.position={x:-8,z:7};s.visited=Array.from({length:floor+1},(_,i)=>i);
 states.push(JSON.parse(JSON.stringify(s)));
 const entry=tower.rooms[floor].entry;if(entry)s.seen.push(entry);
 if(floor===1)secureFloor(s,'receptionSecured');if(floor===2)secureFloor(s,'routeReleased');
 if(floor===4)s.collected=['4:0','4:1','4:2'];
 for(const g of tower.gates.filter(g=>g.floor===floor)){const p=getProblem(s,tower.id,g),v=progressFor(s,g.id,p);v.guided=true;for(const step of p.steps)submit(p,v,step.answer);activate(s,g.id);}
}
console.log(JSON.stringify({states,escaped:s,fresh:freshState(91542),rooms:tower.rooms,gates:tower.gates}));
'''],cwd=ROOT,text=True))

server=subprocess.Popen(['node','tools/serve.mjs','--port','0','--base','/Math-Tower/'],cwd=ROOT,stdout=subprocess.PIPE,text=True)
try:
    port=int(server.stdout.readline().split('port ')[1].split(';')[0]);url=f'http://127.0.0.1:{port}/Math-Tower/midnight/'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
        context=browser.new_context(viewport={'width':960,'height':640})
        page=context.new_page();page.set_default_timeout(60000)
        page.add_init_script("const fixture=sessionStorage.getItem('midnight-test-checkpoint');if(fixture){localStorage.setItem('mathTower.midnight.tower1.v2',fixture);sessionStorage.removeItem('midnight-test-checkpoint');}")
        errors,requests=[],[]
        page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR:',str(e),flush=True)))
        page.on('request',lambda r:requests.append(r.url))
        page.goto(url);page.locator('#begin').click();expect(page.locator('#cinema')).to_be_visible()
        page.reload();page.locator('#continue').click();expect(page.locator('#cinema')).to_be_visible()
        page.locator('#skip').click();expect(page.locator('#hud')).to_be_visible()
        page.keyboard.down('ArrowRight');page.wait_for_timeout(900);page.keyboard.up('ArrowRight');page.locator('#pause').click()
        moved=page.evaluate('key=>JSON.parse(localStorage.getItem(key)).position',KEY);assert moved['x']>-6,moved
        page.locator('#resume').click()

        def checkpoint(state):
            page.evaluate('state=>sessionStorage.setItem("midnight-test-checkpoint",JSON.stringify(state))',state)
            page.reload();page.locator('#continue').click()

        def saved():return page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
        def settle_scene():
            if page.locator('#skip').is_visible():page.locator('#skip').click()
            expect(page.locator('#hud')).to_be_visible()

        state=copy.deepcopy(fixtures['fresh']);state['seen']=['arrival'];state['position']={'x':5,'z':-6.4};state['math']={'roof':{'draft':'e'}};checkpoint(state)
        page.keyboard.down('e');expect(page.locator('#math')).to_be_visible();expect(page.locator('#answer')).to_have_value('');page.keyboard.down('e');expect(page.locator('#answer')).to_have_value('');page.keyboard.up('e');expect(page.locator('#math')).to_contain_text('WORLD PAUSED')
        page.locator('#answer').fill('12');page.locator('#leave-math').click();page.keyboard.press('e');expect(page.locator('#answer')).to_have_value('12');page.locator('#answer').fill('')
        q=page.evaluate('''async key=>{const {getProblem}=await import('../math/bank.js');const {midnightTower}=await import('../towers/tower-0001.js');return getProblem(JSON.parse(localStorage.getItem(key)),midnightTower.id,midnightTower.gates[0]);}''',KEY)
        before=page.locator('#hearts').inner_text();page.locator('#answer').fill('999999');page.locator('#check').click();expect(page.locator('#feedback')).to_contain_text('no penalty');assert page.locator('#hearts').inner_text()==before
        page.locator('#help').click();expect(page.locator('#step-count')).to_have_text('STEP 1 OF 2')
        page.locator('#answer').fill(q['steps'][0]['answer']);page.locator('#check').click();expect(page.locator('#step-count')).to_have_text('STEP 2 OF 2');assert not page.locator('#activate').is_visible()
        page.reload();page.locator('#continue').click();page.keyboard.press('e');expect(page.locator('#step-count')).to_have_text('STEP 2 OF 2')
        page.locator('#answer').fill(q['steps'][1]['answer']);page.locator('#check').click();page.locator('#activate').click()
        state=saved();assert 'roof' in state['solved'];state['position']={'x':8,'z':-6.5};checkpoint(state)
        page.keyboard.press('e');page.wait_for_function("document.querySelector('#location').textContent.includes('Floor 17')")
        expect(page.locator('#cinema')).to_be_visible();page.locator('#skip').click();assert saved()['floor']==1
        print('PASS: opening, interrupted movie, movement, harmless math, guided reload and actual stair transition',flush=True)

        # Every floor builds and renders through the real application entry point.
        for i in range(1,21):
            state=copy.deepcopy(fixtures['states'][i]);checkpoint(state);settle_scene()
            expect(page.locator('#location')).to_contain_text(fixtures['rooms'][i]['name'])
            page.wait_for_timeout(100)
            if i in [7,9,11,12,19,20]:page.screenshot(path=f'/tmp/math-tower-3d-floor-{i}.png')
            assert not errors,errors
            print(f'RENDER: {i+1}/21 {fixtures["rooms"][i]["name"]}',flush=True)

        # Three actual pickup triggers, not just edited inventory flags.
        state=copy.deepcopy(fixtures['states'][4]);state['seen'].append('skitters')
        for i,(x,z) in enumerate([(8,6),(-10,-6),(4,-7)]):
            state['position']={'x':x,'z':z};checkpoint(state)
            expect(page.locator('#inventory')).to_contain_text(f'{i+1}/3 fragments');state=saved()
        state=copy.deepcopy(fixtures['states'][15]);state['seen'].append('researcher');state['position']={'x':-1.5,'z':3};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#choice')).to_be_visible();page.get_by_role('button',name='Invite the researcher to come').click();page.locator('#skip').click();assert saved()['flags']['researcher']
        state=copy.deepcopy(fixtures['states'][14]);state['position']={'x':-4,'z':3.5};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#choice')).to_be_visible();page.get_by_role('button',name='Lighting + freight · 10 units').click();assert saved()['flags']['freight']
        print('PASS: fragments, researcher rescue and freight choice',flush=True)

        # Solve the final override in the UI; the run is not complete until the lobby.
        state=copy.deepcopy(fixtures['states'][20]);state['seen'].append('breach');state['position']={'x':6.5,'z':-7};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#math')).to_be_visible()
        q=page.evaluate('''async key=>{const {getProblem}=await import('../math/bank.js');const {midnightTower}=await import('../towers/tower-0001.js');const s=JSON.parse(localStorage.getItem(key));return getProblem(s,midnightTower.id,midnightTower.gates.find(g=>g.id==='override'));}''',KEY)
        page.locator('#answer').fill(q['answer']);page.locator('#check').click();page.locator('#activate').click();page.locator('#skip').click();assert saved()['escape'];assert not saved()['complete']
        state=saved();state['position']={'x':-9,'z':8};checkpoint(state);page.keyboard.press('e');page.wait_for_function("document.querySelector('#location').textContent.includes('B2')");assert saved()['floor']==19
        state=saved();state['flags']['freight']=True;state['position']={'x':10,'z':5.2};checkpoint(state);page.keyboard.press('e');expect(page.locator('#choice')).to_be_visible();page.get_by_role('button',name='Floor 1 · The sealed lobby',exact=True).click();page.wait_for_function("document.querySelector('#location').textContent.includes('Floor 1')");settle_scene();assert saved()['floor']==17
        state=saved();state['position']={'x':4,'z':-6.5};checkpoint(state);page.keyboard.press('e');expect(page.locator('#cinema')).to_be_visible();page.locator('#skip').click();expect(page.locator('#complete')).to_be_visible();assert saved()['complete']
        page.locator('#ending-replay').click();page.locator('#skip').click();expect(page.locator('#complete')).to_be_visible()
        assert not errors,errors;assert all(r.startswith(f'http://127.0.0.1:{port}/') or r.startswith(f'blob:http://127.0.0.1:{port}/') or r.startswith('data:') for r in requests),requests

        print('PASS: final override, escape stairs, freight ride, campus ending and replay',flush=True)
        context.close()
        mobile=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=1)
        mp=mobile.new_page();mp.set_default_timeout(60000);mp.on('pageerror',lambda e:errors.append(str(e)))
        state=copy.deepcopy(fixtures['fresh']);state['seen']=['arrival'];state['position']={'x':5,'z':-6.4}
        mp.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(state))+');')
        mp.goto(url);mp.locator('#continue').click();expect(mp.locator('#touch')).to_be_visible();mp.locator('[data-key=KeyE]').tap();expect(mp.locator('#math')).to_be_visible();assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mp.screenshot(path='/tmp/math-tower-3d-mobile-math.png');mp.locator('#leave-math').click();mp.locator('#pause').click();expect(mp.locator('#pause-menu')).to_be_visible();assert not errors,errors
        browser.close();print('PASS: all 21 rooms, final override, escape stairs, freight travel, campus ending, replay, mobile touch and local-only runtime')
finally:
    server.terminate();server.wait(timeout=5)
