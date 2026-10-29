"""Regression: inspect the shipped animated mesh while real controls move it.

The reference to the renderer is injected into the HTTP response only in this
isolated browser test; production code exposes no testing or answer API.
"""

import os
import shutil
import subprocess
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
    url = f"http://127.0.0.1:{port}/Math-Tower/midnight/?v=0.4.0"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"),
            headless=True,
            args=["--no-sandbox", "--enable-unsafe-swiftshader"],
        )
        page = browser.new_page(viewport={"width": 960, "height": 640})
        page.set_default_timeout(90000)
        errors, requests = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))

        def instrument(route):
            response = route.fetch()
            source = response.text()
            assert "if (world) start();" in source
            route.fulfill(
                response=response,
                body=source.replace(
                    "if (world) start();",
                    "window.__actorTest = world; if (world) start();",
                ),
            )

        page.route("**/engines/midnight/game.js*", instrument)
        page.add_init_script(
            "const s=sessionStorage.getItem('actor-checkpoint');if(s){localStorage.setItem('mathTower.midnight.tower1.v2',s);sessionStorage.removeItem('actor-checkpoint');}"
        )
        page.goto(url)
        page.locator("#begin").click()
        expect(page.locator("#line")).to_contain_text(
            "forty-three minutes", timeout=90000
        )
        page.screenshot(path="/tmp/math-tower-human-intro.png")
        page.locator("#skip").click()
        expect(page.locator("#hud")).to_be_visible()
        for keys in [
            ("w",),
            ("w", "d"),
            ("d",),
            ("d", "s"),
            ("s",),
            ("s", "a"),
            ("a",),
            ("a", "w"),
        ]:
            for key in keys:
                page.keyboard.down(key)
            # Measure a stable chord, before sequential key-up events can turn
            # the actor into the remaining key's direction for another frame.
            page.evaluate("window.__actorTest.player.position.set(-5,0,5)")
            page.wait_for_function(
                "Math.hypot(__actorTest.player.position.x+5,__actorTest.player.position.z-5)>.4"
            )
            result = page.evaluate("""()=>{
              const root=__actorTest.player, model=root.userData.human.model;
              root.updateMatrixWorld(true);
              const at=name=>model.getObjectByName(name).getWorldPosition(root.position.clone());
              const front=at('Bip01_LEye').add(at('Bip01_REye')).multiplyScalar(.5).sub(at('Bip01_Head')).setY(0).normalize();
              const motion=root.position.clone();motion.x+=5;motion.z-=5;motion.y=0;motion.normalize();
              return {dot:front.dot(motion),name:root.userData.head.name};
            }""")
            for key in keys:
                page.keyboard.up(key)
            assert result["dot"] > 0.8, (keys, result)
            assert result["name"] == "Bip01_Head"
        page.screenshot(path="/tmp/math-tower-human-play.png")
        state = {
            "version": 2,
            "seed": 14,
            "floor": 19,
            "bankId": "readiness",
            "position": {"x": -8, "z": 7},
            "seen": [],
            "visited": list(range(20)),
            "flags": {},
        }
        page.evaluate(
            "s=>sessionStorage.setItem('actor-checkpoint',JSON.stringify(s))", state
        )
        page.reload()
        page.locator("#continue").click()
        expect(page.locator("#speaker")).to_have_text("MARA VOSS", timeout=90000)
        casting = page.evaluate(
            """()=>{let mara=null,researcher=null;__actorTest.scene.traverse(o=>{if(o.userData.role==='mara')mara=o;if(o.userData.role==='researcher')researcher=o;});let source='';mara?.userData.human.model.traverse(o=>{if(o.userData.source)source=o.userData.source;});return {mara:!!mara,researcher:!!researcher,source};}"""
        )
        assert casting["mara"] and casting["researcher"], casting
        assert "Female_Adult_01" in casting["source"], casting
        page.screenshot(path="/tmp/math-tower-mara-recording.png")
        assert any("/mara.glb" in r for r in requests)
        assert not errors, errors
        assert any("/explorer.glb" in r for r in requests)
        assert any("/researcher.glb" in r for r in requests)
        assert not any("/operative.glb" in r for r in requests)
        browser.close()
        print(
            "PASS: visible human intro, civilian assets, real keyboard movement faces forward in all eight directions; Mara Voss has a separate female model in the recording"
        )
finally:
    server.terminate()
    server.wait(timeout=5)
