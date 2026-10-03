import json
import os

import decky


def _settings_path() -> str:
    return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")


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

    async def _main(self):
        pass

    async def _unload(self):
        pass

    async def _uninstall(self):
        # Leave nothing behind when the plugin is removed from Decky.
        for p in (_settings_path(), _settings_path() + ".tmp"):
            try:
                os.remove(p)
            except FileNotFoundError:
                pass
            except Exception as e:
                decky.logger.error(f"failed to remove {p}: {e}")
