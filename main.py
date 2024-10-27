import json
import os
from flask import Flask, redirect, request, url_for, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
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
db = SQLAlchemy(app)

first_request_processed = False


# we use before_request because before_first_request is deprecated
@app.before_request
def create_tables():
    global first_request_processed
    if not first_request_processed:
        # 执行首次请求前的操作
        db.create_all()
        first_request_processed = True


# --- Question Management  ---
@app.route('/admin_add', methods=['POST'])
def add_question():
    data = request.json
    print(data)
    if not data.get('Subject') or not data.get('Question') or not data.get('Answer') or not data.get('SelectionA') or not data.get('SelectionB') or not data.get('SelectionC') or not data.get('SelectionD'):
        return jsonify({"Msg": "Subject, Question, Selections and Answer are required fields"}), 400

    processed_data, error = process_images_and_text(data)
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
    return '', 200


@app.route('/admin_update', methods=['POST'])
def update_question():
    data = request.json
    print(data)
    if not data.get('Subject') or not data.get('Question') or not data.get('Answer') or not data.get('Qid') or not data.get('SelectionA') or not data.get('SelectionB') or not data.get('SelectionC') or not data.get('SelectionD'):
        return jsonify({"Msg": "Qid, Subject, Question, Selections and Answer are required fields"}), 400

    processed_data, error = process_images_and_text(data)
    if error:
        return jsonify({"Msg": error}), 400

    question = Question.query.filter_by(Qid=data['Qid']).first()
    if not question:
        return jsonify({"Msg": "Question not found"}), 400
    old_data = {
        "Question": question.Question,
        "SelectionA": question.SelectionA,
        "SelectionB": question.SelectionB,
        "SelectionC": question.SelectionC,
        "SelectionD": question.SelectionD
    }
    processed_data, error = process_images_and_text(data, old_data)
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
def search_questions():
    subject = request.args.get('Subject')
    if not subject:
        return jsonify({"Msg": "Subject is required"}), 400
    keyword = request.args.get('Keyword')
    page_index = request.args.get('Index', 1)
    page_size = request.args.get('Size', 10)
    if not isinstance(page_index, int):
        return jsonify({"Msg": "Page_index must be an integer"}), 400
    if not isinstance(page_size, int):
        return jsonify({"Msg": "Page_size must be an integer"}), 400

    query = Question.query.filter(Question.Subject == subject)
    if keyword:
        query = query.filter(Question.Question.like(f'%{keyword}%'))

    questions = query.paginate(page_index, page_size, False).items
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


@app.route('/admin_delete', methods=['POST'])
def delete_question():
    qid = request.json.get('Qid')
    if not qid:
        return jsonify({"Msg": "Qid is required"}), 400
    if not isinstance(qid, int):
        return jsonify({"Msg": "Qid must be an integer"}), 400

    question = Question.query.filter_by(Qid=qid).first()
    if question:
        db.session.delete(question)
        db.session.commit()
        return '', 200
    else:
        return jsonify({"Msg": "Question not found"}), 400


# --- Exercise Module  ---
@app.route('/exercise', methods=['GET'])
def get_exercise_questions():
    subject = request.args.get('Subject')
    num_questions = request.args.get('Number')

    if not subject:
        return jsonify({"Msg": "Subject is required"}), 400
    if not num_questions or not num_questions.isdigit():
        return jsonify({"Msg": "A valid Number of questions is required"}), 400

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
def submit_exercise_results():
    data = request.json
    uid = data.get('Uid')
    subject = data.get('Subject')
    total = data.get('Total')
    wrong_questions = data.get('WrongQuestion')

    if not uid or not subject or total is None:
        return jsonify({"Msg": "Uid, Subject, and Total are required"}), 400
    if not isinstance(total, int):
        return jsonify({"Msg": "Total must be an integer"}), 400
    if not isinstance(wrong_questions, list):
        return jsonify({"Msg": "WrongQuestion must be a list"}), 400

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
    socketio.run(app, host='0.0.0.0', debug=True)
