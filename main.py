import functools
import threading
import uuid
from datetime import datetime
import json
import os
from functools import wraps

from flask import Flask, redirect, request, url_for, jsonify, send_from_directory, abort, make_response, Response
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from jsonschema import validate
from sqlalchemy import or_, and_
from sqlalchemy.sql import func
from flask_socketio import SocketIO, emit, disconnect
from werkzeug.exceptions import NotFound

import Elo_match
from db_models import *
from image_process import process_images_and_text, resize_image, AVATAR_SAVE_PATH
from Elo_match import Player, Game, Game_dict, player_list, lock, base_step, my_room_lock, lock2

IMAGE_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/img/q')
os.makedirs(IMAGE_SAVE_PATH, exist_ok=True)
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learning_platform.db'
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
socketio = SocketIO(app)

question_nums = 10


# we use this because before_first_request is deprecated
def initialize_database():
    with app.app_context():
        db.create_all()
        # 至少创建一个管理员账号，有了也没关系
        try:
            new_user = User()
            new_user.Username = "admin_sxm"
            new_user.set_password('sxmjs123')
            new_user.IsAdmin = True
            db.session.add(new_user)
            db.session.commit()
        except Exception:
            pass


# 用于优雅验证json的包装器
def validate_json(schema):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                json_data = request.get_json(force=True)
                validate(instance=json_data, schema=schema)
                return f(*args, **kwargs, json_data=json_data)
            except Exception as e:
                return jsonify(Msg=str(e)), 400

        return wrapper

    return decorator


# --- User System ---
@login_manager.user_loader
def load_user(user_id):
    # 从数据库中根据用户ID加载用户
    return User.query.get(int(user_id))


# 登录
@app.route('/login', methods=['POST'])
@validate_json({
    "type": "object",
    "properties": {
        "Username": {"type": "string"},
        "Password": {"type": "string"},
    },
    "required": ["Username", "Password"]
})
def login(json_data):
    username = json_data.get('Username')
    password = json_data.get('Password')

    user = User.query.filter_by(Username=username).first()

    if user and user.check_password(password):
        login_user(user)
        if user.IsAdmin:
            return jsonify(Msg="admin_ok", Uid=user.Uid)
        return jsonify(Msg="ok", Uid=user.Uid)
    return jsonify(Msg="password_err"), 400


# 登出
@app.route('/logout', methods=['POST'])
@login_required
def logout():
    current_user.LastLogout = datetime.utcnow()  # 记录登出时间
    db.session.commit()
    logout_user()
    return ''


# 注册
@app.route('/register', methods=['POST'])
@validate_json({
    "type": "object",
    "properties": {
        "Username": {
            "type": "string",
            "pattern": "^\\S{2,20}$"
        },
        "Password": {
            "type": "string",
            "pattern": "^[!-~]{8,30}$"
        },
    },
    "required": ["Username", "Password"]
})
def register(json_data):
    username = json_data.get('Username')
    password = json_data.get('Password')

    user_exists = User.query.filter_by(Username=username).first() is not None

    if user_exists:
        return jsonify(Msg="user_exists"), 400

    # 创建新用户记录
    new_user = User()
    new_user.Username = username
    new_user.LastLogout = datetime.utcnow()  # 记录登出时间
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    Uid = new_user.get_id()
    print(Uid)
    new_Math1 = Math1LearningStatus(Uid=Uid)
    new_Math2 = Math2LearningStatus(Uid=Uid)
    new_Pol = PolLearningStatus(Uid=Uid)
    new_CS408 = CS408LearningStatus(Uid=Uid)
    db.session.add_all([new_Math1, new_Math2, new_Pol, new_CS408])
    db.session.commit()
    return jsonify(Msg="ok"), 200


# Decorator for checking admin rights
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.IsAdmin:
            abort(403)
        return f(*args, **kwargs)

    return decorated_function


# Decorator for checking student rights
def student_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.IsAdmin:
            abort(403)
        return f(*args, **kwargs)

    return decorated_function


# --- Question Management  ---
@app.route('/admin_add', methods=['POST'])
@login_required
@admin_required
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"},
        "Question": {"type": "string"},
        "SelectionA": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionB": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionC": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionD": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "Answer": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["Subject", "Question", "SelectionA", "SelectionB", "SelectionC", "SelectionD", "Answer"]
})
def add_question(json_data):
    processed_data, error = process_images_and_text(json_data)
    if error:
        return jsonify({"Msg": error}), 400

    new_question = Question(
        Subject=processed_data['Subject'],
        Question=processed_data['Question'],
        SelectionA=processed_data.get('SelectionA'),
        SelectionB=processed_data.get('SelectionB'),
        SelectionC=processed_data.get('SelectionC'),
        SelectionD=processed_data.get('SelectionD'),
        Answer=json.dumps(processed_data['Answer'], ensure_ascii=False)
    )
    db.session.add(new_question)
    db.session.commit()
    return '', 200


@app.route('/admin_update', methods=['POST'])
@login_required
@admin_required
@validate_json({
    "type": "object",
    "properties": {
        "Qid": {"type": "integer"},
        "Subject": {"type": "string"},
        "Question": {"type": "string"},
        "SelectionA": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionB": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionC": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "SelectionD": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "Answer": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["Qid", "Subject", "Question", "SelectionA", "SelectionB", "SelectionC", "SelectionD", "Answer"]
})
def update_question(json_data):
    question = Question.query.filter_by(Qid=json_data['Qid']).first()
    if not question:
        return jsonify({"Msg": "Question not found"}), 400
    old_data = {
        "Question": question.Question,
        "SelectionA": question.SelectionA,
        "SelectionB": question.SelectionB,
        "SelectionC": question.SelectionC,
        "SelectionD": question.SelectionD
    }
    processed_data, error = process_images_and_text(json_data, old_data)
    if error:
        return jsonify({"Msg": error}), 400

    question.Subject = processed_data['Subject']
    question.Question = processed_data['Question']
    question.SelectionA = processed_data.get('SelectionA')
    question.SelectionB = processed_data.get('SelectionB')
    question.SelectionC = processed_data.get('SelectionC')
    question.SelectionD = processed_data.get('SelectionD')
    question.Answer = json.dumps(processed_data['Answer'], ensure_ascii=False)

    db.session.commit()
    return '', 200


@app.route('/admin_search', methods=['POST'])
@login_required
@admin_required
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"},
        "Keyword": {"type": "string"},
        "Page": {"type": "integer"},
        "Size": {"type": "integer"}
    },
    "required": ["Subject", "Keyword", "Page", "Size"]
})
def search_questions(json_data):
    subject = json_data.get('Subject')
    keyword = json_data.get('Keyword')
    page = json_data.get('Page')
    page_size = json_data.get('Size')
    query = Question.query
    if subject != '任意':
        query = query.filter(Question.Subject == subject)
    if keyword:
        query = query.filter(Question.Question.like(f'%{keyword}%'))

    paginated = query.paginate(page=page, per_page=page_size)
    result = {
        "Total": paginated.total,
        "Questions": [
            {
                "Qid": q.Qid,
                "Subject": q.Subject,
                "Question": q.Question,
                "SelectionA": q.SelectionA,
                "SelectionB": q.SelectionB,
                "SelectionC": q.SelectionC,
                "SelectionD": q.SelectionD,
                "Answer": json.loads(q.Answer)
            } for q in paginated.items
        ]
    }
    return jsonify(result)


@app.route('/admin_delete', methods=['POST'])
@login_required
@admin_required
@validate_json({
    "type": "object",
    "properties": {
        "Qid": {"type": "integer"}
    },
    "required": ["Qid"]
})
def delete_question(json_data):
    qid = json_data.get('Qid')
    question = Question.query.filter_by(Qid=qid).first()
    if question:
        db.session.delete(question)
        db.session.commit()
        return '', 200
    else:
        return jsonify({"Msg": "Question not found"}), 400


# --- Exercise Module  ---
@app.route('/subject', methods=['GET'])
@login_required
def get_subject():
    uid = current_user.Uid
    print(type(uid))
    Math1 = Math1LearningStatus.query.filter_by(Uid=uid).first()
    Math2 = Math2LearningStatus.query.filter_by(Uid=uid).first()
    Pol = PolLearningStatus.query.filter_by(Uid=uid).first()
    CS408 = CS408LearningStatus.query.filter_by(Uid=uid).first()
    result = [
        {
            "Subject": '数学Ⅰ',
            "Total": Math1.ExerciseTotal,
            "Right": Math1.ExerciseRight
        },
        {
            "Subject": '数学Ⅱ',
            "Total": Math2.ExerciseTotal,
            "Right": Math2.ExerciseRight
        },
        {
            "Subject": '政治',
            "Total": Pol.ExerciseTotal,
            "Right": Pol.ExerciseRight
        },
        {
            "Subject": '计算机学科专业基础综合',
            "Total": CS408.ExerciseTotal,
            "Right": CS408.ExerciseRight
        }
    ]
    print(result)
    return jsonify(result)


@app.route('/exercise', methods=['POST'])
@login_required
@student_required
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"}
    },
    "required": ["Subject"]
})
def get_exercise_questions(json_data):
    subject = json_data.get('Subject')
    num_questions = 10  # 定死一个值

    questions = Question.query.filter_by(Subject=subject).order_by(func.random()).limit(num_questions).all()
    result = [
        {
            "Qid": q.Qid,
            "Subject": q.Subject,
            "Question": q.Question,
            "SelectionA": q.SelectionA,
            "SelectionB": q.SelectionB,
            "SelectionC": q.SelectionC,
            "SelectionD": q.SelectionD,
            "Answer": json.loads(q.Answer)
        } for q in questions
    ]
    return jsonify(result)


@app.route('/exercise_result', methods=['POST'])
@login_required
@student_required
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"},
        "WrongQuestion": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "Qid": {"type": "integer"},
                    "WrongAnswer": {"type": "string"}
                },
                "required": ["Qid", "WrongAnswer"]
            }
        }
    },
    "required": ["Subject", "WrongQuestion"]
})
def submit_exercise_results(json_data):
    uid = current_user.Uid
    subject = json_data.get('Subject')
    total = 10  # 定死这个练习数量
    wrong_questions = json_data.get('WrongQuestion')

    right_cnt = total - len(wrong_questions)
    for wrong in wrong_questions:
        Qid = wrong['Qid']
        if not isinstance(Qid, int):
            return jsonify({"Msg": "Qid must be an integer"}), 400

        new_wrong = WrongAnswer(
            Uid=uid,
            Qid=Qid,
            WrongAnswer=wrong['WrongAnswer']
        )
        db.session.add(new_wrong)
    learning_status = {
        '数学Ⅰ': Math1LearningStatus,
        '数学Ⅱ': Math2LearningStatus,
        '政治': PolLearningStatus,
        '计算机学科专业基础综合': CS408LearningStatus
    }
    LearningStatus = learning_status.get(subject)
    user_status = LearningStatus.query.filter_by(Uid=uid).first()
    if user_status:
        user_status.ExerciseRight += right_cnt
        user_status.ExerciseTotal += total
    else:
        new_status = LearningStatus(
            Uid=uid,
            ExerciseRight=right_cnt,
            ExerciseTotol=total
        )
        db.session.add(new_status)
    db.session.commit()

    return '', 200


# --- Wrong Question Book Module  ---
@app.route('/search_wrong', methods=['POST'])
@login_required
@student_required
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"},
        "Keyword": {"type": "string"},
        "Page": {"type": "integer"},
        "Size": {"type": "integer"}
    },
    "required": ["Subject", "Keyword", "Page", "Size"]
})
def get_wrong_questions(json_data):
    uid = current_user.Uid
    subject = json_data.get('Subject')
    keyword = json_data.get('Keyword')
    page = json_data.get('Page')
    page_size = json_data.get('Size')
    query = db.session.query(
        WrongAnswer.Wid,
        Question.Qid,
        Question.Subject,
        Question.Question,
        Question.SelectionA,
        Question.SelectionB,
        Question.SelectionC,
        Question.SelectionD,
        Question.Answer,
        WrongAnswer.WrongAnswer,
        WrongAnswer.Notes
    ).join(Question, WrongAnswer.Qid == Question.Qid).filter(WrongAnswer.Uid == uid)

    if subject != '任意':
        query = query.filter(Question.Subject == subject)
    if keyword:
        query = query.filter(Question.Question.like(f'%{keyword}%'))

    # 分页
    paginated = query.paginate(page=page, per_page=page_size)

    # 格式化结果
    result = {
        "Total": paginated.total,
        "Questions": [
            {
                "Wid": item.Wid,
                "Qid": item.Qid,
                "Subject": item.Subject,
                "Question": item.Question,
                "SelectionA": item.SelectionA,
                "SelectionB": item.SelectionB,
                "SelectionC": item.SelectionC,
                "SelectionD": item.SelectionD,
                "Answer": json.loads(item.Answer),
                "WrongAnswer": item.WrongAnswer,
                "Notes": item.Notes
            }
            for item in paginated.items
        ]
    }

    return jsonify(result)


@app.route('/add_notes', methods=['POST'])
@login_required
@student_required
@validate_json({
    "type": "object",
    "properties": {
        "Wid": {"type": "integer"},
        "Notes": {"type": "string"}
    },
    "required": ["Wid", "Notes"]
})
def add_wrong_notes(json_data):
    wronganswer = WrongAnswer.query.filter_by(Wid=json_data['Wid']).first()
    if not wronganswer:
        return jsonify({"Msg": "Wrong answer not found"}), 400
    wronganswer.Notes = json_data['Notes']
    db.session.commit()
    return '', 200


@app.route('/delete_wrong', methods=['POST'])
@login_required
@student_required
@validate_json({
    "type": "object",
    "properties": {
        "Wid": {"type": "integer"}
    },
    "required": ["Wid"]
})
def delete_wrong(json_data):
    wid = json_data.get('Wid')
    wrong = WrongAnswer.query.filter_by(Wid=wid).first()
    if wrong:
        db.session.delete(wrong)
        db.session.commit()
        return '', 200
    else:
        return jsonify({"Msg": "Wrong answer not found"}), 400


# ---  Battle Module  ---
def get_rank_info_for_subject(subject, status_model, current_user_id):
    subject_data = db.session.query(status_model, User.Username).join(User, status_model.Uid == User.Uid).all()
    subject_data = sorted(subject_data, key=lambda x: x[0].Elo, reverse=True)

    self_rank = 0
    self_total = 0
    self_right = 0
    self_elo = int(0)
    ranks = []
    for idx, (status, username) in enumerate(subject_data):
        ranks.append({
            "Uid": status.Uid,
            "Username": username,
            "Total": status.Total,
            "Right": status.Right,
            "Elo": status.Elo
        })
        # 只发前十名
        if idx == 9:
            break

    for idx, (status, username) in enumerate(subject_data):
        if status.Uid == current_user_id:
            self_rank = idx + 1
            self_total = status.Total
            self_right = status.Right
            self_elo = status.Elo
            break

    return {
        "Subject": subject,
        "Total": self_total,
        "Right": self_right,
        "SelfRank": self_rank,
        "Elo": self_elo,
        "Ranks": ranks
    }


@app.route('/rank_info', methods=['GET'])
def rank_info():
    current_user_id = current_user.Uid
    subjects = ['数学Ⅰ', '数学Ⅱ', '政治', '计算机学科专业基础综合']
    status_models = {
        '数学Ⅰ': Math1LearningStatus,
        '数学Ⅱ': Math2LearningStatus,
        '政治': PolLearningStatus,
        '计算机学科专业基础综合': CS408LearningStatus
    }
    response_data = []
    for subject in subjects:
        # 对每个科目获取段位信息
        status_model = status_models[subject]
        subject_data = get_rank_info_for_subject(subject, status_model, current_user_id)
        response_data.append(subject_data)

    return jsonify(response_data), 200


class My_room:
    def __init__(self):
        self.dict1 = {}
        self.dict2 = {}

    def join_players(self, sid1, sid2, room_id):
        self.dict1[sid1] = room_id
        self.dict2[sid2] = room_id

    def remove_players(self, sid1, sid2):
        print('remove_players')
        if self.dict1.get(sid1):
            self.dict1.pop(sid1)
            self.dict2.pop(sid2)
        else:
            self.dict2.pop(sid2)
            self.dict1.pop(sid1)

    def get_room(self, sid):
        print('sid=' + sid)
        if self.dict1.get(sid):
            return self.dict1[sid]
        elif self.dict2.get(sid):
            return self.dict2[sid]
        else:
            return None


my_room = My_room()


def authenticated_only(f):
    # 长连接鉴权
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return f(*args, **kwargs)

    return wrapped


@socketio.on('connect', namespace='/battle')
def handle_connect():
    # 终于有用了
    sid = request.sid
    uid = online_users.get_uid_by_sid(sid)
    for friend_battle in friend_battle_permitted:
        if (uid == friend_battle.player1_uid) and (not friend_battle.player1_connected):
            friend_battle.player1_sid = sid
            friend_battle.player1_connected = True
        elif (uid == friend_battle.player2_uid) and (not friend_battle.player2_connected):
            friend_battle.player2_sid = sid
            friend_battle.player2_connected = True
        if friend_battle.player1_connected and friend_battle.player2_connected:
            player1 = Player(friend_battle.player1_uid, friend_battle.player1_sid, friend_battle.subject)
            player2 = Player(friend_battle.player2_uid, friend_battle.player2_sid, friend_battle.subject)
            game = Game(player1, player2)
            # 在这里注册room
            new_room_id = f'{game.player1.sid}_{game.player2.sid}_{uuid.uuid4()}'
            my_room.join_players(game.player1.sid, game.player2.sid, new_room_id)
            Game_dict[new_room_id] = game
            print('send match ok to ' + game.player1.username + " and " + game.player2.username)
            socketio.emit('match_success', {
                "Username": game.player2.username,
                "Uid": game.player2.uid,
                "Question": game.questions[game.player1.total].Question,
                "SelectionA": game.questions[game.player1.total].SelectionA,
                "SelectionB": game.questions[game.player1.total].SelectionB,
                "SelectionC": game.questions[game.player1.total].SelectionC,
                "SelectionD": game.questions[game.player1.total].SelectionD
            }, to=game.player1.sid, namespace='/battle')
            print(game.player2.username, game.player2.uid, game.questions[game.player1.total].Question
                  , game.questions[game.player1.total].SelectionA,
                  game.questions[game.player1.total].SelectionB,
                  game.questions[game.player1.total].SelectionC,
                  game.questions[game.player1.total].SelectionD,
                  game.player1.sid)
            print('player1.sid = ' + game.player1.sid)
            socketio.emit('match_success', {
                "Username": game.player1.username,
                "Uid": game.player1.uid,
                "Question": game.questions[game.player2.total].Question,
                "SelectionA": game.questions[game.player2.total].SelectionA,
                "SelectionB": game.questions[game.player2.total].SelectionB,
                "SelectionC": game.questions[game.player2.total].SelectionC,
                "SelectionD": game.questions[game.player2.total].SelectionD
            }, to=game.player2.sid, namespace='/battle')
            print('player2.sid = ' + game.player2.sid)


@socketio.on('start', namespace='/battle')
@authenticated_only
def handle_match_request(data):
    player = Player(uid=current_user.Uid, subject=data['Subject'], sid=request.sid)
    print(player.username + ' want ' + player.subject + ' whose sid is ' + player.sid)
    # 匹配相关
    # 匹配前需要检查用户是否已经在对战中了，一个用户一次只能进行一个对战
    for room_id, exist in Game_dict.items():
        if exist.player1.uid == player.uid or exist.player2.uid:
            # 该用户已经在一场对战中了
            emit('match_fail', {}, to=player.sid, namespace='/battle')
            disconnect(player.sid)
            return
    if Elo_match.join_new_player(player):
        socketio.start_background_task(target=zxx_matcher)
    else:
        emit('match_fail', {}, to=player.sid, namespace='/battle')


@socketio.on('end')
@authenticated_only
def handle_end_request(data):
    pass


@socketio.on('friendStart')
@authenticated_only
def handle_friend_start_request(data):
    pass


@socketio.on('friendEnd')
@authenticated_only
def handle_friend_end_request(data):
    pass


def get_model(subject):
    subject_to_model = {
        "数学Ⅰ": Math1LearningStatus,
        "数学Ⅱ": Math2LearningStatus,
        "政治": PolLearningStatus,
        "计算机学科专业基础综合": CS408LearningStatus
    }
    return subject_to_model[subject]


@socketio.on('submit_answer', namespace='/battle')
@authenticated_only
def handle_submit_answer(data):
    answer = data['Answer']
    sid = request.sid
    room_id = my_room.get_room(sid)
    print('room_id = ' + room_id)
    game = Game_dict[room_id]
    right = False
    if sid == game.player1.sid:
        player = game.player1
        opponent = game.player2
    else:
        player = game.player2
        opponent = game.player1
    print(player.username, player.total)
    print('answer : ' + answer)
    if answer in game.questions[player.total].Answer:
        player.right += 1
        right = True
    else:
        # 记录错题本
        wrong_answer = WrongAnswer(Uid=player.uid, Qid=game.questions[player.total].Qid, WrongAnswer=answer)
        db.session.add(wrong_answer)
        db.session.commit()

    answer_json = json.loads(game.questions[player.total].Answer)
    player.total += 1
    print(player.total)

    if player.total < question_nums:
        emit('judge_result', {
            "Correct": right,
            "Question": game.questions[player.total].Question,
            "RightAnswer": answer_json,
            "SelectionA": game.questions[player.total].SelectionA,
            "SelectionB": game.questions[player.total].SelectionB,
            "SelectionC": game.questions[player.total].SelectionC,
            "SelectionD": game.questions[player.total].SelectionD
        }, to=player.sid, namespace='/battle')
        emit('opponent', {
            "Correct": right
        }, to=opponent.sid, namespace='/battle')
    else:
        emit('judge_result', {
            "Correct": right,
            "Question": None,
            "RightAnswer": answer_json,
            "SelectionA": None,
            "SelectionB": None,
            "SelectionC": None,
            "SelectionD": None
        }, to=player.sid, namespace='/battle')
        emit('opponent', {
            "Correct": right
        }, to=opponent.sid, namespace='/battle')

    if player.total == question_nums and opponent.win == 0:
        player.win = 1

    if game.player1.total == question_nums and game.player2.total == question_nums:
        # 正常结束
        # 更新数据库
        model = get_model(game.player1.subject)
        player1_status = model.query.filter_by(Uid=game.player1.uid).first()
        player2_status = model.query.filter_by(Uid=game.player2.uid).first()
        player1_status.Total += game.player1.total
        player1_status.Right += game.player1.right
        player2_status.Total += game.player2.total
        player2_status.Right += game.player2.right
        # 判断胜负
        if game.player1.right > game.player2.right:
            winner = 0
        elif game.player2.right > game.player1.right:
            winner = 1
        else:
            if game.player1.win == 1:
                winner = 0
            else:
                winner = 1
        elo_delta_a, elo_delta_b = Elo_match.elo_calculater(game.player1.elo, game.player2.elo, winner)
        player1_status.Elo = game.player1.elo + elo_delta_a
        player2_status.Elo = game.player2.elo + elo_delta_b
        db.session.commit()
        # 发送结果
        emit('match_result', {
            "Self": elo_delta_a,
            "Opponent": elo_delta_b
        }, to=game.player1.sid, namespace='/battle')
        emit('match_result', {
            "Self": elo_delta_b,
            "Opponent": elo_delta_a
        }, to=game.player2.sid, namespace='/battle')
        # 事后清理
        if Game_dict.get(room_id):
            my_room.remove_players(game.player1.sid, game.player2.sid)
            Game_dict.pop(room_id)
        disconnect(game.player1.sid)
        disconnect(game.player2.sid)


@socketio.on('disconnect', '/battle')
def handle_disconnect():
    print(request.sid + " is disconnected")
    sid = request.sid
    room_id = my_room.get_room(sid)
    print(room_id)
    if room_id is None:
        # 还未分配房间号 匹配中断开了
        print("room is None")
        Elo_match.remove_player_by_sid(sid=sid)
        return
    # 得区分事件

    # 处理浏览器主动断开连接
    game = Game_dict[room_id]
    # player 是断开连接的
    if game.player1.sid == sid:
        player = game.player1
        opponent = game.player2
    else:
        player = game.player2
        opponent = game.player1
    print(player.username)
    print(opponent.username)
    if player.total < question_nums:
        # 直接判负
        model = get_model(player.subject)
        player_status = model.query.filter_by(Uid=player.uid).first()
        opponent_status = model.query.filter_by(Uid=opponent.uid).first()
        player_status.Total += player.total
        player_status.Right += player.right
        opponent_status.Total += opponent.total
        opponent_status.Right += opponent.right
        elo_delta_a, elo_delta_b = Elo_match.elo_calculater(player.elo, opponent.elo, 1)
        print(player.elo, opponent.elo)
        print(player.username, elo_delta_a, opponent.username, elo_delta_b)
        player_status.Elo = player.elo + elo_delta_a
        opponent_status.Elo = opponent.elo + elo_delta_b
        print(player_status.Elo, opponent_status.Elo)
        db.session.commit()
        # 发送结果
        emit('match_result', {
            "Self": elo_delta_b,
            "Opponent": elo_delta_a
        }, to=opponent.sid, namespace='/battle')
        # 事后清理
        if Game_dict.get(room_id):
            my_room.remove_players(game.player1.sid, game.player2.sid)
            Game_dict.pop(room_id)
        print('disconnect end')
        disconnect(opponent.sid)


def zxx_matcher():
    from Elo_match import Game_queue
    while len(Game_queue) == 0:
        socketio.sleep(1)
    print('zxx is working')
    while len(Game_queue) > 0:
        game = Game_queue.pop()
        # 在这里注册room
        new_room_id = f'{game.player1.sid}_{game.player2.sid}_{uuid.uuid4()}'
        my_room.join_players(game.player1.sid, game.player2.sid, new_room_id)
        Game_dict[new_room_id] = game
        print('send match ok to ' + game.player1.username + " and " + game.player2.username)
        socketio.emit('match_success', {
            "Username": game.player2.username,
            "Uid": game.player2.uid,
            "Question": game.questions[game.player1.total].Question,
            "SelectionA": game.questions[game.player1.total].SelectionA,
            "SelectionB": game.questions[game.player1.total].SelectionB,
            "SelectionC": game.questions[game.player1.total].SelectionC,
            "SelectionD": game.questions[game.player1.total].SelectionD
        }, to=game.player1.sid, namespace='/battle')
        print(game.player2.username, game.player2.uid, game.questions[game.player1.total].Question
              , game.questions[game.player1.total].SelectionA,
              game.questions[game.player1.total].SelectionB,
              game.questions[game.player1.total].SelectionC,
              game.questions[game.player1.total].SelectionD,
              game.player1.sid)
        print('player1.sid = ' + game.player1.sid)
        socketio.emit('match_success', {
            "Username": game.player1.username,
            "Uid": game.player1.uid,
            "Question": game.questions[game.player2.total].Question,
            "SelectionA": game.questions[game.player2.total].SelectionA,
            "SelectionB": game.questions[game.player2.total].SelectionB,
            "SelectionC": game.questions[game.player2.total].SelectionC,
            "SelectionD": game.questions[game.player2.total].SelectionD
        }, to=game.player2.sid, namespace='/battle')
        print('player2.sid = ' + game.player2.sid)
    print('zxx finished')


# --- Friend Module  ---
class Online_users:
    def __init__(self):
        self.user_dict = {}

    def join_user(self, uid):
        if uid not in self.user_dict:
            self.user_dict[uid] = []

    def join_sid(self, uid, sid):
        if uid not in self.user_dict:
            self.user_dict[uid] = []
        self.user_dict[uid].append(sid)

    def get_user_list(self, uid):
        return self.user_dict[uid]

    def get_uid_by_sid(self, sid):
        for uid, sid_list in self.user_dict.items():
            if sid in sid_list:
                return uid

    def remove_sid(self, uid, sid):
        self.user_dict[uid].remove(sid)
        if len(self.user_dict[uid]) == 0:
            self.user_dict.pop(uid)


online_users = Online_users()


@app.route('/change_avatar', methods=['POST'])
@login_required
@student_required
def change_avatar():
    if 'Avatar' not in request.files:
        return jsonify({"Msg": "Avatar field is required"}), 400

    avatar = request.files['Avatar']
    if avatar.mimetype != 'image/png':
        return jsonify({"Msg": "Avatar must be in PNG format"}), 400
    avatar_data = avatar.read()
    resized_data, error = resize_image(avatar_data)
    if error:
        return jsonify({"Msg": error}), 400
    user_id = current_user.Uid
    file_name = f"{user_id}.png"
    file_path = os.path.join(AVATAR_SAVE_PATH, file_name)
    try:
        with open(file_path, 'wb') as f:
            f.write(resized_data)
    except Exception as e:
        return jsonify({"Msg": f"Failed to save avatar: {str(e)}"}), 400

    return '', 200


@socketio.on('connect', namespace='/friend')
@authenticated_only
def handle_friend_connect():
    uid = current_user.Uid
    sid = request.sid
    online_users.join_user(uid)
    online_users.join_sid(uid, sid)


@socketio.on('disconnect', namespace='/friend')
@authenticated_only
def handle_friend_disconnect():
    uid = current_user.Uid
    sid = request.sid
    online_users.remove_sid(uid, sid)
    if friend_battle_request.get(uid) is not None:
        friend_battle_request.pop(uid)


@app.route('/add_friend', methods=['POST'])
@login_required
@student_required
def add_friend():
    json_data = request.get_json()
    to_uid = json_data.get('Uid')
    if to_uid == current_user.Uid:
        return jsonify({"Msg": "add_yourself"}), 400
    # 检查Uid是否在
    user = User.query.filter_by(Uid=to_uid).first()
    if user is None:
        return jsonify({"Msg": "not_found"}), 400
    elif online_users.user_dict[to_uid] is None:
        return jsonify({"Msg": "offline"}), 400
    else:
        # 可以理会
        from_user = User.query.filter_by(Uid=current_user.Uid).first()
        for to_sid in online_users.get_user_list(to_uid):
            emit('friend_request', {
                "Uid": from_user.Uid,
                "Username": from_user.Username
            }, to=to_sid, namespace='/friend')
        return Response(status=200)


@app.route('/delete_friend', methods=['POST'])
@login_required
@student_required
def delete_friend():
    json_data = request.get_json()
    to_uid = json_data.get('Uid')
    from_uid = current_user.Uid
    friend = Friend.query.filter(
        or_(
            and_(Friend.Uid1 == to_uid, Friend.Uid2 == from_uid),
            and_(Friend.Uid1 == from_uid, Friend.Uid2 == to_uid)
        )).first()
    print(friend)
    db.session.delete(friend)
    db.session.commit()
    if friend is None:
        return Response(status=400)
    else:
        return Response(status=200)


@app.route('/friend_list', methods=['POST'])
@login_required
@student_required
def friend_list():
    json_data = request.get_json()
    page = json_data.get('Page')
    size = json_data.get('Size')
    user_id = current_user.Uid
    friends_relations = Friend.query.filter(
        or_(
            Friend.Uid1 == user_id,
            Friend.Uid2 == user_id
        )
    ).paginate(page=page, per_page=size)

    # 创建一个空列表来存储朋友信息
    friends_list = []
    subjects = ['数学Ⅰ', '数学Ⅱ', '政治', '计算机学科专业基础综合']
    status_models = {
        '数学Ⅰ': Math1LearningStatus,
        '数学Ⅱ': Math2LearningStatus,
        '政治': PolLearningStatus,
        '计算机学科专业基础综合': CS408LearningStatus
    }

    # 遍历朋友关系并获取朋友信息
    for relation in friends_relations.items:
        # 确定朋友是Uid1还是Uid2
        friend_uid = relation.Uid2 if relation.Uid1 == user_id else relation.Uid1
        friend_user = User.query.get(friend_uid)
        elo_obj = {}
        rank_obj = {}
        for subject in subjects:
            # 对每个科目获取段位信息
            status_model = status_models[subject]
            subject_data = get_rank_info_for_subject(subject, status_model, friend_uid)
            elo_obj[subject] = subject_data['Elo']
            rank_obj[subject] = subject_data['SelfRank']

        # 添加朋友信息到列表
        friends_list.append({
            "Username": friend_user.Username,
            "Uid": friend_uid,
            "Elo": elo_obj,
            "Rank": rank_obj
        })

    # 构造并返回最终的JSON响应
    response = {
        "Total": friends_relations.total,
        "Friends": friends_list
    }
    return jsonify(response)


@socketio.on('friend_request_feedback', namespace='/friend')
@authenticated_only
def handle_friend_request_feedback(data):
    from_uid = data['Uid']
    from_user = User.query.filter_by(Uid=from_uid).first()
    if from_user is not None:
        new_friend = Friend(Uid1=from_uid, Uid2=current_user.Uid)
        db.session.add(new_friend)
        db.session.commit()


class FriendBattlePermitted:
    def __init__(self, uid1, uid2, subject):
        self.player1_uid = uid1
        self.player2_uid = uid2
        self.subject = subject
        self.player1_connected = False
        self.player2_connected = False
        self.player1_sid = None
        self.player2_sid = None


friend_battle_permitted = []
friend_battle_request = {}


# 检查是否已在对战
def check_game_dict(uid):
    for game in Game_dict:
        if game.player1_uid == uid or game.player2_uid == uid:
            return True
    return False


@socketio.on('friend_battle_request', namespace='/friend')
@authenticated_only
def handle_friend_battle_request(data):
    from_uid = current_user.Uid
    from_sid = request.sid
    from_user = User.query.filter_by(Uid=from_uid).first()
    to_uid = data['Uid']
    subject = data['Subject']
    to_user = User.query.filter_by(Uid=to_uid).first()
    friend = Friend.query.filter(
        or_(
            and_(Friend.Uid1 == from_uid, Friend.Uid2 == to_uid),
            and_(Friend.Uid2 == to_uid, Friend.Uid1 == from_uid)
        )
    ).first()
    # 你奶奶的抽象行为啊
    # 首先查询是否已经在对战中了
    if (Elo_match.check_exist(from_uid) or check_game_dict(from_uid)
            or friend_battle_request.get(from_uid) is not None):
        emit('friend_battle_permit', {
            "Answer": "already_in_battle"
        }, to=from_sid, namespace='/friend')
    elif (Elo_match.check_exist(to_uid) or check_game_dict(to_uid)
          or friend_battle_request.get(to_uid) is not None):
        emit('friend_battle_permit', {
            "Answer": "opponent_already_in_battle"
        }, to=from_sid, namespace='/friend')
    elif friend is None:
        # not_friend
        emit('friend_battle_permit', {
            "Answer": "not_friend"
        }, to=from_sid, namespace='/friend')
    elif online_users.user_dict[to_uid] is None:
        # offline
        emit('friend_battle_permit', {
            "Answer": "offline"
        }, to=from_sid, namespace='/friend')
    else:
        friend_battle_request[from_uid] = subject
        emit('friend_battle_request', {
            "Uid": from_uid,
            "Username": from_user.Username,
            "Subject": subject
        }, to=to_uid, namespace='/friend')


@socketio.on('end_friend_battle_request', namespace='/friend')
@authenticated_only
def handle_end_friend_battle_request(data):
    uid = current_user.Uid
    if friend_battle_request.get(uid) is not None:
        friend_battle_request.pop(uid)


@socketio.on('friend_battle_feedback', namespace='/friend')
@authenticated_only
def handle_friend_battle_feedback(data):
    answer = data['Answer']
    from_uid = data['Uid']
    to_sid = request.sid
    to_uid = online_users.get_uid_by_sid(to_sid)
    if answer == "yes":
        if friend_battle_request.get(from_uid) is not None:
            subject = friend_battle_request[from_uid]
            new_friend_battle_permitted = FriendBattlePermitted(from_uid, to_uid, subject)
            friend_battle_request.pop(from_uid)
            friend_battle_permitted.append(new_friend_battle_permitted)
            for from_sid in online_users.get_user_list(from_uid):
                emit('friend_battle_permit', {
                    "Answer": "yes"
                }, to=from_sid, namespace='/friend')
            emit('friend_battle_permit', {
                "Answer": "yes"
            }, to=to_sid)
        else:
            # 已经取消了或者断线了
            emit('friend_battle_permit', {
                "Answer": "no"
            }, to=to_sid, namespace='/friend')
    elif answer == "no":
        if friend_battle_request.get(from_uid) is not None:
            friend_battle_request.pop(from_uid)
            for from_sid in online_users.get_user_list(from_uid):
                emit('friend_battle_permit', {
                    "Answer": "no"
                }, to=from_sid, namespace='/friend')
    else:
        print("未定义行为")


# static res
@app.route('/js/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'js'), path=filename)


@app.route('/css/<path:filename>')
def send_css(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'css'), path=filename)


@app.route('/img/user/<path:filename>')
def send_user_avatar(filename):
    try:
        return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/user'), path=filename)
    except NotFound:
        return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/user'), path='default-avatar.png')


@app.route('/img/<path:filename>')
def send_img(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img'), path=filename)


@app.route('/admin-add.html')
@login_required
@admin_required
def admin_add_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-add.html')


@app.route('/admin-search.html')
@login_required
@admin_required
def admin_search_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-search.html')


@app.route('/admin-preview.html')
@login_required
@admin_required
def admin_preview_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-preview.html')


@app.route('/exercise-select.html')
@login_required
@student_required
def exercise_select_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'exercise-select.html')


@app.route('/exercise.html')
@login_required
@student_required
def exercise_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'exercise.html')


@app.route('/battle-select.html')
@login_required
@student_required
def battle_select_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'battle-select.html')


@app.route('/battle.html')
@login_required
@student_required
def battle_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'battle.html')


@app.route('/search-wrong.html')
@login_required
@student_required
def search_wrong_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'search-wrong.html')


@app.route('/wrong-detail.html')
@login_required
@student_required
def add_notes_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'wrong-detail.html')


@app.route('/profile.html')
@login_required
@student_required
def profile_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'profile.html')


@app.route('/signin.html')
def login_page():
    if current_user.is_authenticated:
        if current_user.IsAdmin:
            return redirect(url_for('admin_search_page'))
        return redirect(url_for('exercise_select_page'))
    return send_from_directory(app.config['STATIC_FOLDER'], 'signin.html')


@app.route('/signup.html')
def signup_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'signup.html')


@app.route('/')
def index():
    return redirect(url_for('login_page'))


if __name__ == '__main__':
    initialize_database()
    thread = threading.Thread(target=Elo_match.zxx_worker)
    thread.start()
    socketio.run(app, host='0.0.0.0', debug=True)
