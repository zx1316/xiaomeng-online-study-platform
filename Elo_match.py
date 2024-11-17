import threading
import time
from db_models import *

player_list = {
    'Math1': [],
    'Math2': [],
    'Politic': [],
    'CS408': []
}

subject_to_queue = {
    "数学Ⅰ": 'Math1',
    "数学Ⅱ": 'Math2',
    "政治": 'Politic',
    "计算机学科专业基础综合": 'CS408'
}

subject_to_model = {
    'CS408': CS408LearningStatus,
    'Math1': Math1LearningStatus,
    'Math2': Math2LearningStatus,
    'Politic': PolLearningStatus
}

Game_dict = {}
#
first_step = 50


class Player:
    def __init__(self, uid, sid, subject):
        self.uid = uid
        self.total = 0
        self.right = 0
        self.sid = sid
        self.subject = subject
        self.username = None
        self.elo = None
        self.get_elo()
        self.get_username()

    def get_username(self):
        self.username = User.query.filter_by(Uid=self.uid).first().Username

    def get_elo(self):
        if self.subject == '数学Ⅰ':
            self.elo = Math1LearningStatus.query.filter_by(Uid=self.uid).first().Elo
        elif self.subject == '数学Ⅱ':
            self.elo = Math2LearningStatus.query.filter_by(Uid=self.uid).first().Elo
        elif self.subject == '政治':
            self.elo = PolLearningStatus.query.filter_by(Uid=self.uid).first().Elo
        elif self.subject == '计算机专业学科基础综合':
            self.elo = CS408LearningStatus.query.filter_by(Uid=self.uid).first().Elo
        else:
            self.elo = 0



class Game:
    def __init__(self, player1, player2):
        self.player1 = player1
        self.player2 = player2
        self.questions = None
        self.get_questions()

    def get_questions(self):
        player_subject = subject_to_queue.get(self.player1.subject)
        num_questions = 10
        try:
            if player_subject is not None:
                print(self.player1.subject)
                self.questions = (Question.query.filter(Question.Subject == self.player1.subject).
                                  limit(num_questions).all())
                for q in self.questions:
                    print(q.Question)
            else:
                print(f"Warning: Unknown subject '{self.player1.subject}'")
                self.questions = []  # 或者你可以设置为默认问题集
        except Exception as e:
            print(f"Error while fetching questions: {e}")
            self.questions = []  # 如果查询失败，避免程序崩溃


def search_player(player):
    queue_name = subject_to_queue.get(player.subject)
    if len(player_list[queue_name]) < 1:
        return False, None, None
    for exist in player_list[queue_name]:
        # 搜索现有的等待用户中是否有满足匹配要求的
        if abs(player.elo - exist.elo) < first_step:
            remove_player(exist)
            # 匹配成功
            return True, player, exist
        else:
            join_new_player(player)
            return False, None, None


def elo_calculater(elo_a, elo_b, winner, k=32):
    # K值可变
    expected_a = 1 / (1 + 10 ** ((elo_b - elo_a) / 400))
    expected_b = 1 / (1 + 10 ** ((elo_a - elo_b) / 400))
    if winner == 0:
        # A 胜
        score_a = 1
        score_b = 0
    else:
        score_a = 0
        score_b = 1
    delta_a = k * (score_a - expected_a)
    delta_b = k * (score_b - expected_b)
    return delta_a, delta_b


def join_new_player(player):
    queue_name = subject_to_queue.get(player.subject)
    if queue_name:
        player_list[queue_name].append(player)
    else:
        print(f"未知学科: {player.subject}")

    for subject, players in player_list.items():
        # 排序
        players.sort(key=lambda exist: exist.elo if exist.elo is not None else float('-inf'), reverse=True)


def remove_player(old_player):
    queue_name = subject_to_queue.get(old_player.subject)
    if queue_name:
        player_list[queue_name].remove(old_player)
    else:
        print(f"未知学科: {old_player.subject}")


def remove_player_by_sid(sid):
    for subject in player_list:
        for player in player_list[subject]:
            if player.sid == sid:
                remove_player(player)


def secondary_match_func():
    for subject in player_list.keys():
        index = 0
        while index + 1 < len(player_list[subject]):
            player1 = player_list[subject][index]
            player2 = player_list[subject][index + 1]
            player_list[subject].remove(player1)
            player_list[subject].remove(player2)
            from main import matcher, observer
            matcher.notify_observers(player1, player2)


def start_timer(timeout):
    timer = threading.Timer(timeout, secondary_match_func)
    timer.start()


if __name__ == '__main__':
    pass
