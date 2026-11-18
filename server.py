import http.server
import socket
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable aggressive caching during local usage so edits appear immediately
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('0.0.0.0', PORT), QuietHandler) as httpd:
        lan_ip = get_lan_ip()
        print('=' * 52)
        print('  時光方塊 · 24H 時間管理 App 已啟動！')
        print('=' * 52)
        print(f'  電腦開啟： http://localhost:{PORT}')
        if lan_ip:
            print(f'  iPhone 開啟（同 Wi-Fi）： http://{lan_ip}:{PORT}')
            print('  提示：在 iPhone Safari 開啟後點「分享 → 加入主畫面」即可當作原生 App 使用')
        print('  按 Ctrl+C 可關閉伺服器')
        print('=' * 52)
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n伺服器已關閉。')
