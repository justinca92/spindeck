import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
import decky, main
p = main.Plugin()
async def run():
    print("missing:", await p.get_settings())
    print("write:", await p.set_settings({"a": 1}), await p.get_settings())
    print("bad type write:", await p.set_settings([1, 2]))
    open(main._settings_path(), "w").write("{corrupt")
    print("corrupt read:", await p.get_settings())
    open(main._settings_path(), "w").write("[1,2]")
    print("non-dict read:", await p.get_settings())
    await p.set_settings({"b": 2}); await p._uninstall()
    print("after uninstall exists:", os.path.exists(main._settings_path()))
asyncio.run(run())
