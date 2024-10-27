from main import db


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


class Math1LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class Math2LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class PolLearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)


class CS408LearningStatus(db.Model):
    Uid = db.Column(db.Integer, db.ForeignKey('user.Uid'), primary_key=True)
    Elo = db.Column(db.Float, default=1000)
    ExerciseRight = db.Column(db.Integer, default=0)
    ExerciseTotal = db.Column(db.Integer, default=0)
    Right = db.Column(db.Integer, default=0)
    Total = db.Column(db.Integer, default=0)
