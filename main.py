import json
import os
import time

import decky


def _settings_path() -> str:
    return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")


# Decky updates a plugin by uninstalling the old copy, then installing the new
# one; the uninstall runs _uninstall below. The panel's update button writes
# this marker first, so that one uninstall keeps the user's settings. It's
# only honoured for a few minutes (an update the user cancelled must not
# protect a real uninstall later) and removed when the new copy starts.
UPDATE_WINDOW_S = 10 * 60


def _update_marker() -> str:
    return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "updating")


def _updating() -> bool:
    try:
        return time.time() - os.path.getmtime(_update_marker()) < UPDATE_WINDOW_S
    except OSError:
        return False


def _clear_marker():
    try:
        os.remove(_update_marker())
    except FileNotFoundError:
        pass
    except Exception as e:
        decky.logger.error(f"failed to remove update marker: {e}")


class Plugin:
    async def get_settings(self):
        try:
            with open(_settings_path(), "r", encoding="utf-8") as f:
                data = json.load(f)
            # A corrupted or hand-edited file must never break the plugin: defaults are used instead.
            return data if isinstance(data, dict) else None
        except FileNotFoundError:
            return None
        except Exception as e:
            decky.logger.error(f"failed to read settings: {e}")
            return None

    async def set_settings(self, settings: dict) -> bool:
        if not isinstance(settings, dict):
            return False
        path = _settings_path()
        tmp = path + ".tmp"
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
            os.replace(tmp, path)  # atomic: a crash mid-write never leaves a half file
            return True
        except Exception as e:
            decky.logger.error(f"failed to write settings: {e}")
            try:
                os.remove(tmp)
            except OSError:
                pass
            return False

    async def prepare_update(self) -> bool:
        try:
            os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
            with open(_update_marker(), "w", encoding="utf-8") as f:
                f.write(str(time.time()))
            return True
        except Exception as e:
            decky.logger.error(f"failed to write update marker: {e}")
            return False

    async def _main(self):
        # A fresh start (after an update, or a cancelled one) ends the update window.
        _clear_marker()

    async def _unload(self):
        pass

    async def _uninstall(self):
        if _updating():
            # Decky is replacing us with a newer version: keep the settings.
            decky.logger.info("update in progress: keeping settings")
            _clear_marker()
            return
        # Leave nothing behind when the plugin is removed from Decky.
        _clear_marker()
        for p in (_settings_path(), _settings_path() + ".tmp"):
            try:
                os.remove(p)
            except FileNotFoundError:
                pass
            except Exception as e:
                decky.logger.error(f"failed to remove {p}: {e}")
