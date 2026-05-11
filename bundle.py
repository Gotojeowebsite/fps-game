#!/usr/bin/env python3
"""Bundle src/*.js ES modules into a single classic script `game.js` so the
game can run by double-clicking index.html (file://) — no server needed.

Strategy: wrap each module in an IIFE that returns its exports onto a single
global namespace `G`. Imports are rewritten to `const { ... } = G.<module>;`.
The `import * as THREE from "three"` becomes `const THREE = window.THREE`.
"""

import os, re, sys

ORDER = [
    "settings.js",
    "economy.js",
    "maps.js",
    "physics.js",
    "input.js",
    "effects.js",
    "weapons.js",
    "charms.js",
    "beans.js",
    "world.js",
    "building.js",
    "edit.js",
    "bots.js",
    "hud.js",
    "modes.js",
    "net.js",
    "player.js",
    "shop.js",
    "menu.js",
    "main.js",
]

SRC = "src"
OUT = "game.js"

IMPORT_RE = re.compile(
    r"^import\s+(?:\*\s+as\s+(\w+)|\{([^}]+)\})\s+from\s+['\"]([^'\"]+)['\"]\s*;?\s*$",
    re.MULTILINE,
)
EXPORT_DECL_RE = re.compile(
    r"^export\s+(const|let|var|function|class|async\s+function)\s+(\w+)",
    re.MULTILINE,
)


def module_name(path):
    return os.path.splitext(os.path.basename(path))[0]


def parse_file(path):
    with open(os.path.join(SRC, path), "r") as f:
        src = f.read()

    # Collect exports.
    exports = []
    for m in EXPORT_DECL_RE.finditer(src):
        exports.append(m.group(2))

    # Collect imports.
    imports = []  # list of (target, mapping)
    def repl_import(m):
        ns, names, target = m.group(1), m.group(2), m.group(3)
        if target == "three":
            imports.append(("three", [("THREE", "THREE")]))
        else:
            mod = module_name(target)
            if ns:
                # import * as Foo — unusual here, but support it.
                imports.append((mod, [("*", ns)]))
            else:
                pairs = []
                for piece in names.split(","):
                    piece = piece.strip()
                    if not piece:
                        continue
                    if " as " in piece:
                        a, b = [p.strip() for p in piece.split(" as ")]
                        pairs.append((a, b))
                    else:
                        pairs.append((piece, piece))
                imports.append((mod, pairs))
        return ""

    src = IMPORT_RE.sub(repl_import, src)
    # Strip `export ` prefixes.
    src = re.sub(r"^export\s+", "", src, flags=re.MULTILINE)
    return imports, exports, src


def emit_module(name, imports, exports, body):
    out = [f"// ── {name}.js ──", f"G.{name} = (() => {{"]
    # Inject shims.
    if any(t == "three" for t, _ in imports):
        out.append("  const THREE = window.THREE;")
    for target, pairs in imports:
        if target == "three":
            continue
        if pairs == [("*", "ns")]:
            out.append(f"  const ns = G.{target};")
        else:
            star = next((p for p in pairs if p[0] == "*"), None)
            if star:
                out.append(f"  const {star[1]} = G.{target};")
                continue
            names = ", ".join(f"{a}: {b}" if a != b else a for a, b in pairs)
            out.append(f"  const {{ {names} }} = G.{target};")
    out.append(body.rstrip())
    if exports:
        names = ", ".join(exports)
        out.append(f"  return {{ {names} }};")
    else:
        out.append("  return {};")
    out.append("})();")
    out.append("")
    return "\n".join(out)


def main():
    pieces = [
        "// Auto-generated bundle of Operation Polygon — DO NOT EDIT.",
        "// Source modules live under src/. Re-run `python3 bundle.py` after changes.",
        "// Loaded as a classic script so the game runs from file:// without a server.",
        "(function () {",
        "  const G = {};",
        "",
    ]
    for f in ORDER:
        if not os.path.exists(os.path.join(SRC, f)):
            print(f"missing: {f}", file=sys.stderr)
            sys.exit(1)
        imports, exports, body = parse_file(f)
        pieces.append(emit_module(module_name(f), imports, exports, body))
    pieces.append("})();")
    pieces.append("")
    with open(OUT, "w") as f:
        f.write("\n".join(pieces))
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
