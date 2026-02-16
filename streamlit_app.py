from __future__ import annotations

import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent
DIST_DIR = ROOT / "dist"
INDEX_FILE = DIST_DIR / "index.html"


def _extract_asset_path(index_html: str, pattern: str) -> str | None:
    match = re.search(pattern, index_html)
    if not match:
        return None
    raw_path = match.group(1).strip()
    if raw_path.startswith("/"):
        raw_path = raw_path[1:]
    return raw_path


def _load_built_app() -> tuple[str, str]:
    if not INDEX_FILE.exists():
        raise FileNotFoundError("dist/index.html not found.")

    index_html = INDEX_FILE.read_text(encoding="utf-8")
    js_path = _extract_asset_path(index_html, r'<script[^>]*src="([^"]+)"')
    css_path = _extract_asset_path(index_html, r'<link[^>]*href="([^"]+)"')

    if not js_path or not css_path:
        raise ValueError("Could not locate built JS/CSS assets in dist/index.html.")

    js_file = DIST_DIR / js_path
    css_file = DIST_DIR / css_path

    if not js_file.exists() or not css_file.exists():
        missing = []
        if not js_file.exists():
            missing.append(str(js_file))
        if not css_file.exists():
            missing.append(str(css_file))
        raise FileNotFoundError(f"Missing build asset(s): {', '.join(missing)}")

    return css_file.read_text(encoding="utf-8"), js_file.read_text(encoding="utf-8")


def _render_embed(css: str, js: str) -> None:
    # Inject the built bundle directly so Streamlit Cloud can host the React prototype
    # while preserving the original hold-to-pray interactions.
    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {{
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #080b10;
      }}
      #root {{
        width: 100%;
        height: 100%;
      }}
{css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>{js}</script>
  </body>
</html>
"""
    components.html(html, height=940, scrolling=False)


def main() -> None:
    st.set_page_config(page_title="PrayerFeed Prototype", page_icon="🙏", layout="wide")
    st.title("PrayerFeed Prototype")
    st.caption("Interactive prototype with hold-to-pray glow and timer.")

    try:
        css, js = _load_built_app()
    except Exception as exc:
        st.error(f"Could not load the built prototype: {exc}")
        st.code("npm install\nnpm run build", language="bash")
        st.info(
            "After building, commit the dist folder so Streamlit Community Cloud can render the prototype."
        )
        return

    _render_embed(css, js)


if __name__ == "__main__":
    main()
