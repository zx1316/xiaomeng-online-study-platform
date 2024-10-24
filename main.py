import os

from flask import Flask, send_from_directory
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
socketio = SocketIO(app)


@app.route("/")
@app.route("/index.html")
def hello():
    return send_from_directory(app.config['STATIC_FOLDER'], 'index.html')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', debug=True)
