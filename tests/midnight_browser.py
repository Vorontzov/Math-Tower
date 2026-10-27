"""Checks the new 3D opening separately from the original complete Tower.

Uses saved-checkpoint fixtures for room coverage; no game debug API is exposed.
Keyboard movement, math forms, fragment collection and cinematics use actual UI.
"""
import json
import os
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEY = 'mathTower.midnight.opening.v1'
server = subprocess.Popen(['node', 'tools/serve.mjs', '--port', '0', '--base', '/Math-Tower/'], cwd=ROOT, stdout=subprocess.PIPE, text=True)

def fixture(room='roof', x=5, z=-6.4, shards=None, solved=None):
    return dict(version=1, seed=91542, bankId='readiness', math={}, room=room, solved=solved or [False, False], shards=shards or [], health=3, position=dict(x=x,z=z), intro=True)

try:
    port=int(server.stdout.readline().split('port ')[1].split(';')[0])
    url=f'http://127.0.0.1:{port}/Math-Tower/midnight/'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
        context=browser.new_context(viewport={'width':1024,'height':700})
        page=context.new_page()
        page.add_init_script("const fixture=sessionStorage.getItem('midnight-test-checkpoint');if(fixture){localStorage.setItem('mathTower.midnight.opening.v1',fixture);sessionStorage.removeItem('midnight-test-checkpoint');}")
        errors, requests=[],[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        page.goto(url)
        expect(page.locator('#begin')).to_be_visible()
        page.locator('#begin').click()
        expect(page.locator('#cinema')).to_be_visible()
        page.locator('#skip').click()
        expect(page.locator('#hud')).to_be_visible()
        page.keyboard.down('ArrowRight');page.wait_for_timeout(1500);page.keyboard.up('ArrowRight')
        page.locator('#pause').click()
        moved=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).position',KEY)
        assert moved['x']>-6, moved
        page.locator('#resume').click()

        def checkpoint(state):
            page.evaluate('state=>sessionStorage.setItem("midnight-test-checkpoint",JSON.stringify(state))',state)
            page.reload();page.locator('#continue').click()
            expect(page.locator('#hud')).to_be_visible()

        checkpoint(fixture())
        page.keyboard.press('e')
        expect(page.locator('#math')).to_be_visible()
        expect(page.locator('#math')).to_contain_text('WORLD PAUSED')
        question=page.evaluate('''async key=>{
          const {getProblem}=await import('../math/bank.js');
          const {midnightOpening}=await import('../towers/tower-0001.js');
          return getProblem(JSON.parse(localStorage.getItem(key)),'tower-0001',midnightOpening.gates[0]);
        }''',KEY)
        before=page.evaluate('key=>localStorage.getItem(key)',KEY)
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(300)
        assert page.evaluate('key=>localStorage.getItem(key)',KEY)==before
        page.locator('#answer').fill('999999');page.locator('#check').click()
        expect(page.locator('#feedback')).to_contain_text('no penalty')
        assert page.locator('#hearts').inner_text()=='◆ ◆ ◆'
        page.locator('#help').click()
        expect(page.locator('#step-count')).to_have_text('STEP 1 OF 2')
        page.locator('#answer').fill(question['steps'][0]['answer']);page.locator('#check').click()
        expect(page.locator('#step-count')).to_have_text('STEP 2 OF 2')
        assert not page.locator('#activate').is_visible()
        page.reload();page.locator('#continue').click();page.keyboard.press('e')
        expect(page.locator('#step-count')).to_have_text('STEP 2 OF 2')
        page.locator('#answer').fill(question['steps'][1]['answer']);page.locator('#check').click()
        page.locator('#activate').click()
        expect(page.locator('#objective')).to_contain_text('door is open')
        # Enter through the real gate after the solved relay, at a persisted door checkpoint.
        state=page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
        state['position']={'x':8,'z':-6.5};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#cinema')).to_be_visible()
        page.locator('#skip').click()
        expect(page.locator('#location')).to_have_text('The museum')

        # All three actual pickup triggers preserve existing fragments across reloads.
        for i,(x,z) in enumerate([(8,6),(-10,-6),(4,-7)]):
            state=page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
            state['position']={'x':x,'z':z};checkpoint(state)
            expect(page.locator('#inventory')).to_have_text(f'{i+1} / 3 memory fragments')
        state=page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
        state['position']={'x':6.5,'z':-8};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#math')).to_be_visible()
        q=page.evaluate('''async key=>{const {getProblem}=await import('../math/bank.js');const {midnightOpening}=await import('../towers/tower-0001.js');return getProblem(JSON.parse(localStorage.getItem(key)),'tower-0001',midnightOpening.gates[1]);}''',KEY)
        page.locator('#answer').fill(q['answer']);page.locator('#check').click();page.locator('#activate').click()
        expect(page.locator('#cinema')).to_be_visible();page.locator('#skip').click()
        state=page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
        state['position']={'x':9,'z':-9};checkpoint(state)
        page.keyboard.press('e');expect(page.locator('#cinema')).to_be_visible();page.locator('#skip').click()
        expect(page.locator('#complete')).to_be_visible()
        assert not errors, errors
        assert all(r.startswith(f'http://127.0.0.1:{port}/') for r in requests), requests

        mobile=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=1)
        mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)))
        mp.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(fixture()))+');')
        mp.goto(url);mp.locator('#continue').click()
        expect(mp.locator('#touch')).to_be_visible()
        mp.locator('[data-key=KeyE]').tap();expect(mp.locator('#math')).to_be_visible()
        assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mp.locator('#leave-math').click();mp.locator('#pause').click()
        expect(mp.locator('#pause-menu')).to_be_visible()
        assert not errors, errors
        browser.close()
        print('Midnight opening: film handoffs, keyboard movement, both math gates, harmless retries, checked-step reload, 3 fragments, ending, mobile touch and local-only assets passed.')
finally:
    server.terminate();server.wait(timeout=5)
