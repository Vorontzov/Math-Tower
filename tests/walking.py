"""Keyboard-only traversal helpers. Inspection exists only in intercepted test JS."""

import re


def instrument_walking(route):
    response = route.fetch()
    source = response.text()
    source = re.sub(r"cameraYaw\s*=\s*0?\.6,", "cameraYaw = 0,", source)
    source = source.replace(
        "  function frame(now) {",
        "  window.__walk=()=>({world,room,save,mode,stairContext,ride,time});\n  function frame(now) {",
    )
    route.fulfill(response=response, body=source)


def walk_axis(page, axis, target, floor=None):
    start = page.evaluate(f"__walk().world.player.position.{axis}")
    if abs(target - start) < 0.09:
        return
    key = (
        ("d" if target > start else "a")
        if axis == "x"
        else ("s" if target > start else "w")
    )
    sign = 1 if target > start else -1
    page.keyboard.down(key)
    try:
        page.wait_for_function(
            "([axis,target,sign,floor])=>{const v=__walk();return (floor!==null&&v.save.floor!==floor)||sign*(v.world.player.position[axis]-target)>-.075}",
            arg=[axis, target, sign, floor],
            timeout=120000,
        )
    finally:
        page.keyboard.up(key)


def walk_stairs(page, core, ascending):
    x, z, sign = (-9, 8.2, 1) if core == "A" else (9, -8.2, -1)
    start = page.evaluate("__walk().save.floor")
    # Through the door, around the central balustrade, along both complete flights.
    walk_axis(page, "x", x)
    walk_axis(page, "z", z + sign * 0.53)
    side = -0.76 if ascending else 0.76
    walk_axis(page, "x", x + side * sign)
    walk_axis(page, "z", z + sign * 4.76)
    height = page.evaluate("__walk().world.player.position.y")
    assert abs(height - (1.95 if ascending else -1.95)) < 0.12, height
    page.screenshot(path=f"/tmp/math-tower-stair-{core}-landing.png")
    walk_axis(page, "x", x - side * sign)
    walk_axis(page, "z", z + sign * 0.86, start)
    page.wait_for_function(
        "floor=>__walk().save.floor===floor", arg=start + (-1 if ascending else 1)
    )
