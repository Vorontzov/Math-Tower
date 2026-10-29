"""Actual controls, directed combat, opening objectives and wide-screen rendering.

The private state reference is injected only into this test's HTTP response.
The shipped game exposes neither a debugger nor answers.
"""

import base64
import json
import os
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEY = "mathTower.midnight.tower1.v2"
server = subprocess.Popen(
    ["node", "tools/serve.mjs", "--port", "0", "--base", "/Math-Tower/"],
    cwd=ROOT,
    stdout=subprocess.PIPE,
    text=True,
)
try:
    port = int(server.stdout.readline().split("port ")[1].split(";")[0])
    url = f"http://127.0.0.1:{port}/Math-Tower/midnight/"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"),
            headless=True,
            args=["--no-sandbox", "--enable-unsafe-swiftshader"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.set_default_timeout(90000)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        def instrument(route):
            response = route.fetch()
            source = response.text()
            assert "  function frame(now) {" in source
            route.fulfill(
                response=response,
                body=source.replace(
                    "  function frame(now) {",
                    "  window.__combat=()=>({world,room,save,mode,time,shotCooldown,shoveCooldown});\n  function frame(now) {",
                ),
            )

        page.route("**/engines/midnight/game.js*", instrument)
        page.add_init_script(
            "const s=sessionStorage.getItem('test-checkpoint');if(s){localStorage.setItem('mathTower.midnight.tower1.v2',s);sessionStorage.removeItem('test-checkpoint');}"
        )
        page.goto(url)
        page.locator("#begin").click()
        page.locator("#skip").click()
        expect(page.locator("#hud")).to_be_visible()
        assert page.evaluate("__combat().room.enemies.length") == 1
        assert page.evaluate("__combat().room.enemies[0].visible"), (
            "Skipping the movie must leave the roof threat visible"
        )
        assert page.evaluate(
            "__combat().room.enemies.every(e=>e.userData.kind==='presence')"
        )

        def position_enemy(px, pz, ex, ez, yaw=0):
            page.evaluate(
                """([px,pz,ex,ez,yaw])=>{const {world,room}=__combat();world.player.position.set(px,0,pz);world.player.rotation.y=yaw;world.player.userData.aiming=true;const e=room.enemies[0];e.position.set(ex,0,ez);Object.assign(e.userData,{stun:0,windup:0,rush:0,grace:999,knockback:null,disabled:false});e.visible=true;}""",
                [px, pz, ex, ez, yaw],
            )

        def ready():
            page.wait_for_function("__combat().shotCooldown===0")

        # An opponent behind the player cannot be stunned without turning.
        position_enemy(-6, 4, -6, 1)
        page.keyboard.press("x")
        expect(page.locator("#toast")).to_contain_text("missed")
        assert page.evaluate("__combat().room.enemies[0].userData.stun") == 0
        expect(page.locator("#weapon-status")).to_contain_text("charging")
        ready()
        page.keyboard.press("q")
        page.keyboard.press("x")
        expect(page.locator("#toast")).to_contain_text("Direct hit")
        assert page.evaluate("__combat().room.enemies[0].userData.stun") > 2
        page.screenshot(path="/tmp/math-tower-directed-stun.png")
        ready()
        # A real rooftop HVAC cabinet stops the shot.
        position_enemy(0, 4, 0, 0, 3.141592653589793)
        page.keyboard.press("x")
        expect(page.locator("#toast")).to_contain_text("blocked")
        assert page.evaluate("__combat().room.enemies[0].userData.stun") == 0
        # The keyboard shove moves only the target in front.
        position_enemy(-6, 4, -6, 5.1)
        page.keyboard.press("c")
        expect(page.locator("#toast")).to_contain_text("Shoved back")
        page.wait_for_function("__combat().room.enemies[0].position.z>5.7")
        page.wait_for_function("__combat().shoveCooldown===0")
        position_enemy(-6, 4, -6, 3)
        page.keyboard.press("c")
        expect(page.locator("#toast")).to_contain_text("Shove missed")
        assert page.evaluate("__combat().room.enemies[0].userData.stun") == 0
        position_enemy(-6, 4, -6, 5.5)
        page.keyboard.press("f")
        page.wait_for_function("__combat().room.enemies[0].userData.disabled")
        assert page.evaluate("__combat().save.techniqueCount") == 1
        page.wait_for_function(
            "__combat().time-__combat().room.enemies[0].userData.knockedAt>1.5"
        )
        assert page.evaluate(
            "Math.abs(__combat().room.enemies[0].userData.human.model.rotation.x)>1.5"
        )
        first = page.locator("#toast").inner_text()
        position_enemy(-6, 4, -6, 5.5)
        page.keyboard.press("f")
        page.wait_for_function("__combat().save.techniqueCount===2")
        assert page.locator("#toast").inner_text() != first
        page.wait_for_function("__combat().room.enemies[0].userData.disabled")
        page.wait_for_function(
            "__combat().time-__combat().room.enemies[0].userData.knockedAt>1.5"
        )
        position_enemy(-6, 4, -6, 1)
        # Shift + direction pivots in place instead of walking backwards.
        page.keyboard.down("Shift")
        page.keyboard.down("ArrowRight")
        page.wait_for_function("Math.abs(__combat().world.player.rotation.y-2.171)<.02")
        assert (
            page.evaluate(
                "Math.hypot(__combat().world.player.position.x+6,__combat().world.player.position.z-4)"
            )
            < 0.01
        )
        page.keyboard.up("ArrowRight")
        page.keyboard.up("Shift")
        print(
            "PASS: real X/Q/C controls, wall collision, cooldown, directional shove and aim-in-place",
            flush=True,
        )

        def checkpoint(floor, position, flags):
            state = {
                "version": 2,
                "seed": 91542,
                "floor": floor,
                "bankId": "readiness",
                "position": position,
                "seen": ["arrival", "welcome", "number"],
                "visited": list(range(floor + 1)),
                "flags": flags,
            }
            page.evaluate(
                's=>sessionStorage.setItem("test-checkpoint",JSON.stringify(s))', state
            )
            page.reload()
            page.locator("#continue").click()

        checkpoint(1, {"x": 0, "z": -0.3}, {})
        expect(page.locator("#objective")).to_contain_text("security desk")
        page.keyboard.press("e")
        expect(page.locator("#inventory")).to_contain_text("Emergency badge")
        assert page.evaluate("__combat().save.flags.receptionSecured")
        page.wait_for_function("__combat().room.features.shutter.position.y<1.4")
        page.locator("#pause").click()
        page.evaluate("document.querySelector('#pause-menu').close()")
        png = page.screenshot(path="/tmp/math-tower-new-reception.png")
        # A real canvas read of the screenshot catches the earlier large black
        # render tiles at desktop widths, which do not raise JavaScript errors.
        brightness = page.evaluate(
            """async data=>{const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(200,250,880,420).data;let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>100)lit++;return lit/(pixels.length/4);}""",
            "data:image/png;base64," + base64.b64encode(png).decode(),
        )
        assert brightness > 0.2, brightness
        checkpoint(2, {"x": 6, "z": 4.2}, {"receptionSecured": True})
        page.keyboard.press("e")
        assert page.evaluate("__combat().save.flags.routeReleased")
        assert page.evaluate(
            "__combat().room.enemies.every(e=>e.userData.kind==='presence')"
        )
        print(
            "PASS: both opening objectives, persistent badge, visible fire door and wide-screen render",
            flush=True,
        )
        page.close()
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True
        )
        mp = mobile.new_page()
        mp.set_default_timeout(90000)
        mp.on("pageerror", lambda e: errors.append(str(e)))
        mp.route("**/engines/midnight/game.js*", instrument)
        mp.goto(url)
        mp.locator("#begin").tap()
        mp.locator("#skip").tap()
        mp.evaluate(
            "const {world,room}=__combat();world.player.position.set(-6,0,4);world.player.rotation.y=0;room.enemies[0].position.set(-6,0,1);room.enemies[0].userData.grace=999"
        )
        mp.locator("[data-key=KeyQ]").tap()
        mp.locator("[data-key=KeyX]").tap()
        expect(mp.locator("#toast")).to_contain_text("Direct hit")
        assert mp.evaluate("document.documentElement.scrollWidth<=innerWidth")
        for code in [
            "KeyX",
            "KeyC",
            "KeyQ",
            "ShiftLeft",
            "KeyE",
            "KeyF",
            "KeyZ",
            "KeyV",
        ]:
            expect(mp.locator(f"[data-key={code}]")).to_be_visible()
        mp.screenshot(path="/tmp/math-tower-new-mobile-combat.png")
        assert not errors, errors
        browser.close()
        print("PASS: mobile turn/fire controls, layout and no runtime errors")
finally:
    server.terminate()
    server.wait(timeout=5)
