#!/usr/bin/env python3
"""Tiny static server for local play.

Usage:
    python3 serve.py            # serves on http://localhost:8000
    python3 serve.py 5173       # custom port

Then open the printed URL in your browser. Works offline once the CDN
modules have been cached by your browser at least once.
"""
import sys
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n  Operation Polygon ready at:  http://localhost:{PORT}\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down.")
