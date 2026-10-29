"""Physical aircraft pivots, every takedown pose, and actual stairwell combat."""

import json, os, shutil, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
server = subprocess.Popen(
    ["node", "tools/serve.mjs", "--port", "0", "--base", "/Math-Tower/"],
    cwd=ROOT,
    stdout=subprocess.PIPE,
    text=True,
)
try:
    port = int(server.stdout.readline().split("port ")[1].split(";")[0])
    with sync_playwright() as pw:
        b = pw.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"),
            args=["--no-sandbox", "--enable-unsafe-swiftshader"],
        )
        p = b.new_page(viewport={"width": 1100, "height": 760})
        p.set_default_timeout(120000)
        errors = []
        p.on("pageerror", lambda e: errors.append(str(e)))

        def instrument(r):
            response = r.fetch()
            source = response.text()
            source = source.replace(
                "  function frame(now) {",
                "  window.__rebuild=()=>({world,room,save,mode,time,film,stairContext,placeStair(x,z){stairContext={id:'B',direction:-1};world.player.position.set(x,-1.95,z);world.player.rotation.y=Math.PI;}});\n  function frame(now) {",
            )
            r.fulfill(response=response, body=source)

        p.route("**/engines/midnight/game.js*", instrument)
        p.add_init_script(
            "const fixture=sessionStorage.getItem('rebuild-checkpoint');if(fixture){localStorage.setItem('mathTower.midnight.tower1.v2',fixture);sessionStorage.removeItem('rebuild-checkpoint');}"
        )
        p.goto(f"http://127.0.0.1:{port}/Math-Tower/midnight/")
        p.locator("#begin").click()
        p.evaluate("const f=__rebuild().film;f.index=2;f.elapsed=3;f.announced=-1")
        p.wait_for_function("__rebuild().film?.landingHit===true")
        assert p.evaluate("__rebuild().world.heli.position.y<.35")
        p.screenshot(path="/tmp/math-tower-rough-landing.png")
        p.locator("#skip").click()
        p.locator("#pause").click()
        p.evaluate("document.querySelector('#pause-menu').close()")
        aircraft = p.evaluate(
            """async()=>{const T=await import('../vendor/three.module.js');const {world}=__rebuild();const h=world.heli,tail=h.userData.tailRotor;tail.rotation.x=0;h.updateMatrixWorld(true);const a=new T.Box3().setFromObject(tail).getCenter(new T.Vector3());tail.rotation.x=1.7;h.updateMatrixWorld(true);const box=new T.Box3().setFromObject(tail),b=box.getCenter(new T.Vector3()),rotor=new T.Box3().setFromObject(h.userData.rotor);return {drift:a.distanceTo(b),tailSize:box.getSize(new T.Vector3()).length(),rotorHeight:rotor.getCenter(new T.Vector3()).y-h.position.y,pilot:!!h.userData.pilot.userData.human};}"""
        )
        assert aircraft["drift"] < 0.08, aircraft
        assert 2.8 < aircraft["rotorHeight"] < 3.7, aircraft
        assert aircraft["pilot"], aircraft
        p.evaluate(
            "let {world}=__rebuild();world.camera.position.set(1,3.2,7);world.camera.lookAt(-6,1.6,-1);world.render()"
        )
        p.screenshot(path="/tmp/math-tower-aircraft-rebuild.png")
        p.evaluate(
            """async()=>{const {world,room,time}=__rebuild(),e=room.enemies[0],a=await import('../engines/midnight/actors.js');e.position.set(0,0,2);e.rotation.y=.3;e.userData.state='aiming';e.userData.stun=0;a.animatePresence(e,time,0);world.player.visible=false;world.camera.position.set(2.4,1.9,5.6);world.camera.lookAt(0,1.2,2);world.render();}"""
        )
        p.screenshot(path="/tmp/math-tower-android-rebuild.png")
        poses = p.evaluate(
            """async()=>{const {world,time}=__rebuild(),a=await import('../engines/midnight/actors.js'),m=await import('../engines/midnight/martial.js'),T=await import('../vendor/three.module.js');const p=world.player;p.visible=true;p.position.set(-2,0,4);p.rotation.y=0;const results=[];for(const technique of m.TECHNIQUES){a.animateExplorer(p,time,0);m.poseTechnique(p,{start:time-.57,technique},time);p.updateMatrixWorld(true);let finite=true;p.traverse(o=>{if(o.isBone)finite&&=o.matrixWorld.elements.every(Number.isFinite)});results.push([technique.style,finite]);world.render();}return results;}"""
        )
        assert len(poses) == 12 and all(v[1] for v in poses), poses
        p.screenshot(path="/tmp/math-tower-martial-rebuild.png")
        print(
            "PASS: attached rotors stay on their pivots, visible pilot, android asset and all 12 finite takedown poses",
            flush=True,
        )
        state = {
            "version": 2,
            "seed": 47,
            "floor": 1,
            "bankId": "readiness",
            "position": {"x": 9, "z": -7.3},
            "visited": [0, 1],
            "seen": ["arrival", "welcome"],
            "flags": {"receptionSecured": True},
            "health": 3,
        }
        p.evaluate(
            "s=>sessionStorage.setItem('rebuild-checkpoint',JSON.stringify(s))", state
        )
        p.reload()
        p.locator("#continue").click()
        p.evaluate("__rebuild().placeStair(8.3,-11.4)")
        p.wait_for_function(
            "__rebuild().room.enemies.find(e=>e.userData.stairGuard==='B').userData.attackCooldown>0"
        )
        p.wait_for_function("__rebuild().save.health<3")
        p.evaluate(
            "const v=__rebuild();v.placeStair(9.5,-12.0);const e=v.room.enemies.find(e=>e.userData.stairGuard==='B');e.userData.attackCooldown=999"
        )
        p.keyboard.press("f")
        p.wait_for_function(
            "__rebuild().room.enemies.find(e=>e.userData.stairGuard==='B').userData.disabled"
        )
        assert p.evaluate("__rebuild().save.defeated.includes('normal:1:4')")
        p.locator("#pause").click()
        p.evaluate("document.querySelector('#pause-menu').close()")
        p.screenshot(path="/tmp/math-tower-stairwell-combat.png")
        assert not errors, errors
        print(
            "PASS: a half-landing sentry fires damaging darts; an actual F takedown defeats it and saves the result",
            flush=True,
        )
        b.close()
finally:
    server.terminate()
    server.wait(timeout=5)
