"""Browser integration checks; Node tests separately traverse the complete engine.

Uses a /Math-Tower/ URL prefix to catch GitHub Pages path mistakes. Only selected
checkpoint fixtures are injected; the app exposes no teleport/debug/answer API.
"""
import json
import os
import subprocess
import shutil
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEY = 'mathTower.campaign.v1'
def checkpoint_x(page):
    page.locator('#pause').click()
    expect(page.locator('#pause-dialog')).to_be_visible()
    x = page.evaluate("JSON.parse(localStorage.getItem('mathTower.campaign.v1')).stageState.x")
    page.locator('#unpause').click()
    return x

def walk_to(page, target):
    # Observe actual persisted position instead of assuming a headless frame rate.
    # All movement still goes through the real keyboard and game physics.
    for _ in range(40):
        x = checkpoint_x(page)
        if abs(x - target) < 12:
            return
        key = 'ArrowRight' if x < target else 'ArrowLeft'
        page.keyboard.down(key)
        page.wait_for_timeout(min(500, max(60, abs(target - x) / 235 * 1000)))
        page.keyboard.up(key)
    raise AssertionError(f'Could not walk to {target}, actual {x}')

server = subprocess.Popen(['node', 'tools/serve.mjs', '--port', '0', '--base', '/Math-Tower/'], cwd=ROOT, stdout=subprocess.PIPE, text=True)
try:
    line = server.stdout.readline()
    port = int(line.split('port ')[1].split(';')[0])
    url = f'http://127.0.0.1:{port}/Math-Tower/'
    assert urllib.request.urlopen(url).status == 200
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda req: requests.append(req.url))
        page.goto(url)
        expect(page.locator('#new-run')).to_be_visible()
        page.screenshot(path='/tmp/math-tower-home.png', full_page=True)
        page.locator('#new-run').click()
        expect(page.locator('#brief-dialog')).to_be_visible()
        page.locator('#begin').click()
        walk_to(page, 220)
        page.keyboard.press('e')
        expect(page.locator('#math-dialog')).to_be_visible()
        expect(page.locator('#math-dialog')).to_contain_text('WORLD PAUSED')
        assert page.locator('#math-dialog input').count() == 1
        assert page.locator('#math-dialog input[type=radio]').count() == 0
        question = page.evaluate('''async () => {
          const { getProblem } = await import('./math/bank.js');
          const { default: stage } = await import('./towers/tower-0001.js');
          return getProblem(JSON.parse(localStorage.getItem('mathTower.campaign.v1')), stage.id, stage.gates[0]);
        }''')
        before = page.locator('#health').inner_text()
        page.locator('#answer').fill('999999'); page.locator('#check-answer').click()
        expect(page.locator('#math-feedback')).to_contain_text('no penalty')
        page.wait_for_timeout(400)
        assert page.locator('#health').inner_text() == before
        page.locator('#work-through').click()
        expect(page.locator('#guide-position')).to_have_text('STEP 1 OF 2')
        page.locator('#answer').fill(question['steps'][0]['answer']); page.keyboard.press('Enter')
        expect(page.locator('#guide-position')).to_have_text('STEP 2 OF 2')
        assert not page.locator('#unlock').is_visible()
        page.reload(); page.locator('#resume').click(); page.wait_for_function("document.activeElement.id === 'scene'"); page.keyboard.press('e')
        expect(page.locator('#math-dialog')).to_be_visible()
        expect(page.locator('#guide-position')).to_have_text('STEP 2 OF 2')
        page.locator('#answer').fill(question['steps'][1]['answer']); page.keyboard.press('Enter')
        expect(page.locator('#unlock')).to_be_visible()
        page.screenshot(path='/tmp/math-tower-help.png', full_page=True)
        page.locator('#unlock').click()
        expect(page.locator('#progress')).to_have_text('1/9 PANELS')
        page.screenshot(path='/tmp/math-tower-game.png', full_page=True)
        # Actual keyboard pause and resume.
        page.keyboard.press('p'); expect(page.locator('#pause-dialog')).to_be_visible()
        page.locator('#unpause').click()
        # Resume at the real final gate, then walk the three-floor basement escape.
        page.evaluate('''async () => {
          const { default: s } = await import('./towers/tower-0001.js');
          const save = JSON.parse(localStorage.getItem('mathTower.campaign.v1'));
          save.stageState = { floor: 20, x: 250, hearts: 3, seen: [], done: s.gates.filter(g=>!g.optional && g.id!=='override').map(g=>g.id) };
          localStorage.setItem('mathTower.campaign.v1', JSON.stringify(save));
        }''')
        # Navigate without unload persistence overwriting the fixture.
        fixture = page.evaluate(f'localStorage.getItem({json.dumps(KEY)})')
        context.close()
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        context.add_init_script(f'localStorage.setItem({json.dumps(KEY)}, {json.dumps(fixture)});')
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url); page.locator('#resume').click(); page.wait_for_function("document.activeElement.id === 'scene'"); page.keyboard.press('e')
        expect(page.locator('#math-label')).to_have_text('Campus exit override')
        answer = page.evaluate('''async () => {
          const { getProblem } = await import('./math/bank.js'); const {default:s} = await import('./towers/tower-0001.js');
          return getProblem(JSON.parse(localStorage.getItem('mathTower.campaign.v1')), s.id, s.gates.find(g=>g.id==='override')).answer;
        }''')
        page.locator('#answer').fill(answer); page.keyboard.press('Enter'); page.locator('#unlock').click()
        expect(page.locator('#progress')).to_have_text('9/9 PANELS')
        walk_to(page, 1010)
        for floor in ['B2', 'B1', '1']:
            page.keyboard.press('ArrowUp'); page.wait_for_timeout(430)
            expect(page.locator('#place')).to_have_text(f'FLOOR {floor}')
        walk_to(page, 1090); page.keyboard.press('e')
        expect(page.locator('#result-dialog')).to_be_visible()
        expect(page.locator('#next-stage')).to_be_hidden()
        expect(page.locator('#result-copy')).to_contain_text('eighteen floors')
        context.close()
        # Narrow touch viewport, teacher-bank import and equivalent fraction entry.
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url)
        bank = {'version': 1, 'title': 'Fractions <safe text>', 'items': [{'id': 'half', 'prompt': 'One of two equal parts is what fraction?', 'answer': '1/2', 'hint': 'Use equal parts.', 'steps': [{'prompt': 'Type one half as a fraction.', 'answer': '1/2'}]}]}
        page.locator('#bank-file').set_input_files({'name': 'practice.json', 'mimeType': 'application/json', 'buffer': json.dumps(bank).encode()})
        expect(page.locator('#import-status')).to_contain_text('1 questions loaded')
        page.locator('#new-run').click(); page.locator('#begin').click()
        right = page.locator('[data-control=right]')
        box = right.bounding_box()
        cdp = context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}]})
        page.wait_for_timeout(450)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        assert checkpoint_x(page) > 120
        walk_to(page, 220)
        page.locator('[data-control=interact]').tap()
        expect(page.locator('#math-dialog')).to_be_visible()
        expect(page.locator('#math-question')).to_contain_text('One of two')
        page.locator('#answer').fill('2/4'); page.locator('#check-answer').tap()
        expect(page.locator('#unlock')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path='/tmp/math-tower-mobile.png', full_page=True)
        context.close()
        # Unavailable storage still allows playing.
        context = browser.new_context()
        context.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new Error('blocked')}})")
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url); page.locator('#new-run').click(); page.locator('#begin').click()
        expect(page.locator('#global-status')).to_contain_text('unavailable')
        expect(page.locator('#scene')).to_be_visible()
        assert not errors, errors
        assert all(u.startswith(url) or u.startswith('data:') for u in requests), requests
        browser.close()
        print('PASS: prefixed deployment, keyboard/touch play, math pause, harmless retries, gated guide reload, final escape, deferred Interludes, custom fractions, mobile layout, blocked storage, no external assets.')
finally:
    server.terminate()
    server.wait(timeout=10)
