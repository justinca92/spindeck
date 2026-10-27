import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
import decky, main
p = main.Plugin()
async def run():
    for f in (main._settings_path(), main._update_marker()):
        if os.path.exists(f): os.remove(f)
    assert await p.get_settings() is None, "missing file → defaults"
    assert await p.set_settings({"a": 1}) is True
    assert await p.get_settings() == {"a": 1}, "written settings read back"
    assert await p.set_settings([1, 2]) is False, "non-dict write refused"
    open(main._settings_path(), "w").write("{corrupt")
    assert await p.get_settings() is None, "corrupt file → defaults"
    open(main._settings_path(), "w").write("[1,2]")
    assert await p.get_settings() is None, "non-dict file → defaults"
    # An update keeps the settings once; a real uninstall removes them.
    await p.set_settings({"b": 2}); await p.prepare_update(); await p._uninstall()
    assert await p.get_settings() == {"b": 2}, "update keeps settings"
    assert not os.path.exists(main._update_marker()), "update marker cleared"
    await p._uninstall()
    assert not os.path.exists(main._settings_path()), "uninstall removes settings"
    print("backend tests passed")
asyncio.run(run())
