from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


HOST = "127.0.0.1"
PORT = 8009


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def main():
    root = Path(__file__).resolve().parent
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(root), **kwargs)
    server = ThreadingHTTPServer((HOST, PORT), handler)

    if sys.stdout:
      print("Orbit Bastion local server")
      print(f"Serving: {root}")
      print(f"Open: http://{HOST}:{PORT}")
      print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        if sys.stdout:
          print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
