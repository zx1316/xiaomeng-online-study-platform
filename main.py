from datetime import datetime
import json
import os
from functools import wraps

from flask import Flask, redirect, request, url_for, jsonify, send_from_directory, abort
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from jsonschema import validate
from sqlalchemy.sql import func
from flask_socketio import SocketIO
from werkzeug.exceptions import NotFound

from db_models import *
from image_process import process_images_and_text

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
        Answer=json.dumps(processed_data['Answer'])
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
    question.Answer = json.dumps(processed_data['Answer'])

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
    total = 10      # 定死这个练习数量
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
    self_elo = 0
    ranks = []
    for idx, (status, username) in enumerate(subject_data):
        if status.Uid == current_user_id:
            self_rank = idx + 1
            self_total = status.Total
            self_right = status.Right
            self_elo = status.Elo
        ranks.append({
            "Uid": status.Uid,
            "Username": username,
            "Total": status.Total,
            "Right": status.Right,
            "Elo": status.Elo
        })

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


# static res
@app.route('/js/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'js'), path=filename)


@app.route('/css/<path:filename>')
def send_css(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'css'), path=filename)


@app.route('/img/q/<path:filename>')
def send_question_img(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/q'), path=filename)


@app.route('/img/subject/<path:filename>')
def send_subject_img(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/subject'), path=filename)


@app.route('/img/user/<path:filename>')
def send_user_avatar(filename):
    try:
        return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/user'), path=filename)
    except NotFound:
        return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img/user'), path='default-avatar.png')


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


@app.route('/select-subject.html')
@login_required
@student_required
def select_subject_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'select-subject.html')


@app.route('/subject-exercise.html')
@login_required
@student_required
def subject_exercise_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'subject-exercise.html')


@app.route('/battle-select.html')
@login_required
@student_required
def battle_select_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'battle-select.html')


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


@app.route('/signin.html')
def login_page():
    if current_user.is_authenticated:
        if current_user.IsAdmin:
            return redirect(url_for('admin_search_page'))
        return redirect(url_for('select_subject_page'))
    return send_from_directory(app.config['STATIC_FOLDER'], 'signin.html')


@app.route('/signup.html')
def signup_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'signup.html')


@app.route('/')
def index():
    return redirect(url_for('login_page'))


if __name__ == '__main__':
    initialize_database()
    socketio.run(app, host='127.0.0.1', debug=True)
