import os
import base64
import hashlib
from flask import Flask, redirect, request, url_for, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash

from io import BytesIO
import re


IMAGE_SAVE_PATH = 'images'
os.makedirs(IMAGE_SAVE_PATH, exist_ok=True)
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learning_platform.db'
db = SQLAlchemy(app)
socketio = SocketIO(app)


def extract_image_hashes(text):
    """Extracts MD5 hashed filenames from <img> tags in a text field."""
    return set(re.findall(r'<img src="/images/([^"]+)"', text))


def save_image(base64_str):
    try:
        image_data = base64.b64decode(base64_str)
    except base64.binascii.Error:
        return None, "Invalid base64 image encoding"
    # Verify
    if image_data[:8] != b'\x89PNG\r\n\x1a\n':
        return None, "Image must be in PNG format"

    # Create MD5 hash for image name
    md5_hash = hashlib.md5(image_data).hexdigest()
    file_name = f"{md5_hash}.png"
    file_path = os.path.join(IMAGE_SAVE_PATH, file_name)

    with open(file_path, 'wb') as f:
        f.write(image_data)
    return file_name, None


def process_images_and_text(data, old_data=None):
    text_fields = ['Question', 'SelectionA', 'SelectionB', 'SelectionC', 'SelectionD']
    placeholder_pattern = r"\$\$\$(.*?)@@@"
    updated_image_hashes = set()

    for field in text_fields:
        if field in data and data[field]:
            placeholders = set(re.findall(placeholder_pattern, data[field]))
            # print("pipeigeshu:", len(placeholders))
            for placeholder in placeholders:
                image_key = placeholder
                if image_key not in data:
                    return None, f"Missing image for placeholder '{image_key}'"

                image_filename, error = save_image(data[image_key])
                print("image_name:", image_filename)
                if error:
                    return None, error
                img_tag = f'<img src="/images/{image_filename}">'
                data[field] = data[field].replace(f"$$${placeholder}@@@", img_tag)
                print("question:", data[field])
                updated_image_hashes.add(image_filename)
    if old_data:
        old_image_hashes = set()
        for field in text_fields:
            if old_data.get(field):
                old_image_hashes.update(extract_image_hashes(old_data[field]))

        # Delete images in old_data but not in new_data
        unused_images = old_image_hashes - updated_image_hashes
        for image_filename in unused_images:
            image_path = os.path.join(IMAGE_SAVE_PATH, image_filename)
            if os.path.exists(image_path):
                os.remove(image_path)

    return data, None


# --- Database Models ---
class User(db.Model):
    Uid = db.Column(db.Integer, primary_key=True)
    Username = db.Column(db.String(32), nullable=False, unique=True)
    Password = db.Column(db.String(32), nullable=False)
    IsAdmin = db.Column(db.Boolean, default=False)
    LastLoginIn = db.Column(db.DateTime)


class Friend(db.Model):
    Uid1 = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Uid2 = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)


class Question(db.Model):
    Qid = db.Column(db.Integer, primary_key=True)
    Subject = db.Column(db.String(32), nullable=False)
    Question = db.Column(db.String(8192), nullable=False)
    SelectionA = db.Column(db.String(256))
    SelectionB = db.Column(db.String(256))
    SelectionC = db.Column(db.String(256))
    SelectionD = db.Column(db.String(256))
    Answer = db.Column(db.String(1024), nullable=False)


class WrongAnswer(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Qid = db.Column(db.Integer, db.ForeignKey('question.Qid'), primary_key=True)
    WrongAnswer = db.Column(db.String(256))
    Notes = db.Column(db.String(1024))


class math1LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class math2LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class polLearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class _408LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


@app.before_first_request
def create_tables():
    db.create_all()


# Serve index page
@app.route("/")
def hello():
    return send_from_directory(app.config['STATIC_FOLDER'], 'admin-add.html')


# --- Question Management  ---
@app.route('/admin_add', methods=['POST'])
def add_or_update_question():
    data = request.json
    print(data)
    if not data.get('Subject') or not data.get('Question') or not data.get('Answer'):
        return jsonify({"Msg": "Subject, Question are required fields"}), 400

    processed_data, error = process_images_and_text(data)
    if error:
        return jsonify({"Msg": error}), 400

    if data.get('Qid') is None:  # Adding a new question
        new_question = Question(
            Subject=processed_data['Subject'],
            Question=processed_data['Question'],
            SelectionA=processed_data.get('SelectionA'),
            SelectionB=processed_data.get('SelectionB'),
            SelectionC=processed_data.get('SelectionC'),
            SelectionD=processed_data.get('SelectionD'),
            Answer='@#@'.join(processed_data['Answer'])
        )
        db.session.add(new_question)
    else:  # Updating an existing question
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
        question.Answer = '@#@'.join(processed_data['Answer'])

    db.session.commit()
    return '', 200


@app.route('/admin_search', methods=['GET'])
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
            "Answer": [ans for ans in q.Answer.split('@#@')]
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
            "Answer": [ans for ans in q.Answer.split('@#@')]
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
        '数学Ⅰ': math1LearningStatus,
        '数学Ⅱ': math2LearningStatus,
        '政治': polLearningStatus,
        '计算机学科专业基础综合': _408LearningStatus
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


if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', debug=True)
