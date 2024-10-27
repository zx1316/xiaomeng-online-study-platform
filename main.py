import json
import os
from functools import wraps

from flask import Flask, redirect, request, url_for, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from jsonschema import validate
from sqlalchemy.sql import func
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash
from io import BytesIO

from db_models import *
from image_process import process_images_and_text

IMAGE_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/img/q')
os.makedirs(IMAGE_SAVE_PATH, exist_ok=True)
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learning_platform.db'
socketio = SocketIO(app)
db.init_app(app)

first_request_processed = False


# we use this because before_first_request is deprecated
def initialize_database():
    with app.app_context():
        db.create_all()


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


# --- Question Management  ---
@app.route('/admin_add', methods=['POST'])
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
@app.route('/exercise', methods=['POST'])
@validate_json({
    "type": "object",
    "properties": {
        "Subject": {"type": "string"}
    },
    "required": ["Subject"]
})
def get_exercise_questions(json_data):
    subject = json_data.get('Subject')
    num_questions = json_data.get('Number')  # todo: 定死一个值，待定

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
    uid = json_data.get('Uid')           # todo: 加入鉴权后不需要uid
    subject = json_data.get('Subject')
    total = json_data.get('Total')       # todo: 定死这个练习数量
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


# static res
@app.route('/js/<path:filename>')
def send_js(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'js'), path=filename)


@app.route('/css/<path:filename>')
def send_css(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'css'), path=filename)


@app.route('/img/<path:filename>')
def send_img(filename):
    return send_from_directory(os.path.join(app.config['STATIC_FOLDER'], 'img'), path=filename)

# Serve index page
# Currently we don't have an index so comment the code
# @app.route("/")
# def hello():
#    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-add.html')


@app.route('/admin-add.html')
def admin_add_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-add.html')


@app.route('/admin-search.html')
def admin_search_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-search.html')


@app.route('/admin-preview.html')
def admin_preview_page():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-preview.html')


if __name__ == '__main__':
    initialize_database()
    socketio.run(app, host='127.0.0.1', debug=True)
