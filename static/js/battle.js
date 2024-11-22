var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
});

document.addEventListener('DOMContentLoaded', () => {
    let current = 1;
    let opponentCurrent = 1;
    let opponentName;
    let pendingQuestion;
    const questionArr = [];
    let reviewCurrent = 1;
    let countdown;

    const mainDisplay = document.getElementById('main-display');
    const continueReviewBtn = document.getElementById('continue-review-btn');

    function getCookie(name) {
        const cookieArray = document.cookie.split(';'); // 分割cookie字符串
        // 遍历cookie数组
        for (let i = 0; i < cookieArray.length; i++) {
            const cookiePair = cookieArray[i].trim();   // 获取每个cookie的名称和值
            const cookieNameValuePair = cookiePair.split('=');  // 分割名称和值
            // 检查cookie名称是否匹配
            if (cookieNameValuePair[0] === name) {
                return decodeURIComponent(cookieNameValuePair[1]);
            }
        }
        return null;
    }

    function updateExerciseUI(newQuestion) {
        const selfProgressStack = document.getElementById('self-progress-stack');
        const questionText = document.getElementById('question-text');
        const questionCount = document.getElementById('question-count');
        const selectionArea = document.getElementById('selection-area');
        const selectionA = document.getElementById('selection-a');
        const selectionB = document.getElementById('selection-b');
        const selectionC = document.getElementById('selection-c');
        const selectionD = document.getElementById('selection-d');
        const selectionARadio = document.getElementById('selection-a-radio');
        const selectionBRadio = document.getElementById('selection-b-radio');
        const selectionCRadio = document.getElementById('selection-c-radio');
        const selectionDRadio = document.getElementById('selection-d-radio');
        const blankArea = document.getElementById('blank-area');
        const blankInput = document.getElementById('blank-input');
        const submitBtn = document.getElementById('submit-btn');


        // 进度条往前推一格
        const add_style_progress = document.createElement("div");
        add_style_progress.className = "progress-bar progress-bar-striped progress-bar-animated text-bg-info";
        add_style_progress.id = `${current}-self-progress`;
        const add_width_progress = document.createElement("div");
        add_width_progress.className = "progress";
        add_width_progress.role = "progressbar";
        add_width_progress.style.width="10%";
        add_width_progress.appendChild(add_style_progress);
        selfProgressStack.appendChild(add_width_progress);

        submitBtn.disabled = true;      // 默认禁用提交按钮

        questionCount.innerText = `${current}/10`;
        questionText.innerHTML = newQuestion.Question.replace(/%%%(.+?)@@@/g, '<img class="question-img" src="img/q/$1">');
        if (newQuestion.SelectionA === null) {
            // 填空题
            selectionArea.classList.add('visually-hidden');
            blankArea.classList.remove('visually-hidden');
            blankInput.value = '';  // 清空
        } else {
            // 选择题
            selectionArea.classList.remove('visually-hidden');
            blankArea.classList.add('visually-hidden');
            selectionARadio.checked = false;    // 清空
            selectionBRadio.checked = false;
            selectionCRadio.checked = false;
            selectionDRadio.checked = false;
            // 设置选项
            selectionA.innerHTML = `A<div><span class="opacity-50">${newQuestion.SelectionA.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionB.innerHTML = `B<div><span class="opacity-50">${newQuestion.SelectionB.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionC.innerHTML = `C<div><span class="opacity-50">${newQuestion.SelectionC.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionD.innerHTML = `D<div><span class="opacity-50">${newQuestion.SelectionD.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
        }
        pendingQuestion = newQuestion;
    }

    function updateReviewUI() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const questionCount = document.getElementById('review-question-count');
        const questionText = document.getElementById('review-question-text');
        const selectionArea = document.getElementById('review-selection-area');
        const selectionA = document.getElementById('review-selection-a');
        const selectionB = document.getElementById('review-selection-b');
        const selectionC = document.getElementById('review-selection-c');
        const selectionD = document.getElementById('review-selection-d');
        const blankArea = document.getElementById('review-blank-area');
        const blankInput = document.getElementById('review-blank-input');
        const blankCorrectArea = document.getElementById('review-blank-correct-area');
        const blankCorrect = document.getElementById('review-blank-correct');

        // 设置翻页按钮
        if (reviewCurrent <= 1) {
            prevBtn.style.visibility = 'hidden';
        } else {
            prevBtn.style.visibility = 'visible';
        }
        if (reviewCurrent >= questionArr.length) {
            nextBtn.style.visibility = 'hidden';
        } else {
            nextBtn.style.visibility = 'visible';
        }

        questionCount.innerText = `回顾 ${reviewCurrent}/${questionArr.length}`;
        const question = questionArr[reviewCurrent - 1];
        questionText.innerHTML = question.Question.replace(/%%%(.+?)@@@/g, '<img class="question-img" src="img/q/$1">');
        if (question.SelectionA === null) {
            // 填空题
            selectionArea.classList.add('visually-hidden');
            blankArea.classList.remove('visually-hidden');
            blankInput.value = question.UserAnswer;
            if (question.RightAnswer.indexOf(question.UserAnswer) < 0) {
                // 错了
                blankCorrectArea.classList.remove('visually-hidden');
                blankInput.classList.remove('text-success');
                blankInput.classList.add('text-danger');
                blankCorrect.value = question.RightAnswer[0];
            } else {
                blankCorrectArea.classList.add('visually-hidden');
                blankInput.classList.remove('text-danger');
                blankInput.classList.add('text-success');
            }
        } else {
            // 选择题
            selectionArea.classList.remove('visually-hidden');
            blankArea.classList.add('visually-hidden');
            blankCorrectArea.classList.add('visually-hidden');
            // 根据正确和错误设置选项颜色
            if (question.RightAnswer[0] === 'A') {
                selectionA.classList.remove('text-danger');
                selectionA.classList.add('text-success');
            } else {
                selectionA.classList.remove('text-success');
                if (question.UserAnswer === 'A') {
                    selectionA.classList.add('text-danger');
                } else {
                    selectionA.classList.remove('text-danger');
                }
            }
            if (question.RightAnswer[0] === 'B') {
                selectionB.classList.remove('text-danger');
                selectionB.classList.add('text-success');
            } else {
                selectionB.classList.remove('text-success');
                if (question.UserAnswer === 'B') {
                    selectionB.classList.add('text-danger');
                } else {
                    selectionB.classList.remove('text-danger');
                }
            }
            if (question.RightAnswer[0] === 'C') {
                selectionC.classList.remove('text-danger');
                selectionC.classList.add('text-success');
            } else {
                selectionC.classList.remove('text-success');
                if (question.UserAnswer === 'C') {
                    selectionC.classList.add('text-danger');
                } else {
                    selectionC.classList.remove('text-danger');
                }
            }
            if (question.RightAnswer[0] === 'D') {
                selectionD.classList.remove('text-danger');
                selectionD.classList.add('text-success');
            } else {
                selectionD.classList.remove('text-success');
                if (question.UserAnswer === 'D') {
                    selectionD.classList.add('text-danger');
                } else {
                    selectionD.classList.remove('text-danger');
                }
            }
            selectionA.innerHTML = `A<div><span class="opacity-50">${question.SelectionA.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionB.innerHTML = `B<div><span class="opacity-50">${question.SelectionB.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionC.innerHTML = `C<div><span class="opacity-50">${question.SelectionC.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionD.innerHTML = `D<div><span class="opacity-50">${question.SelectionD.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
        }
    }

    function initReview() {
        const progressHtml = document.getElementById('self-progress-stack').innerHTML;
        // 这里不需要改主容器的类
        mainDisplay.innerHTML = `
            <!--Show answer process-->
            <div class="progress-stacked w-100" id="review-progress-stack">${progressHtml}</div>
            <!--Show question count-->
            <div class="answer-container d-flex justify-content-between align-items-center">
                <button class="btn btn-outline-primary" id="prev-btn">上一题</button>
                <span id="review-question-count" class="h2 mb-0"></span>
                <button class="btn btn-outline-primary" id="next-btn">下一题</button>
            </div>
            <!--Show question-->
            <p id="review-question-text"></p>
            <!--选择题作答-->
            <div id="review-selection-area" class="list-group list-group-checkable d-grid gap-2 border-0 visually-hidden">
                <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="review-selection-a-radio" value="A" disabled="disabled">
                <label class="list-group-item rounded-3 py-3 opacity-100" for="review-selection-a-radio" id="review-selection-a"></label>
                <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="review-selection-b-radio" value="B" disabled="disabled">
                <label class="list-group-item rounded-3 py-3 opacity-100" for="review-selection-b-radio" id="review-selection-b"></label>
                <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="review-selection-c-radio" value="C" disabled="disabled">
                <label class="list-group-item rounded-3 py-3 opacity-100" for="review-selection-c-radio" id="review-selection-c"></label>
                <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="review-selection-d-radio" value="D" disabled="disabled">
                <label class="list-group-item rounded-3 py-3 opacity-100" for="review-selection-d-radio" id="review-selection-d"></label>
            </div>
            <!--填空题你的答案-->
            <div class="form-floating answer-container visually-hidden" id="review-blank-area">
                <input class="form-control" id="review-blank-input" disabled="disabled">
                <label class="list-group-item rounded-3 py-3" for="review-blank-input">你的答案</label>
            </div>
            <!--填空题正确答案-->
            <div class="form-floating answer-container visually-hidden" id="review-blank-correct-area">
                <input class="form-control text-success" id="review-blank-correct" disabled="disabled">
                <label class="list-group-item rounded-3 py-3" for="review-blank-correct">正确答案</label>
            </div>
        `;

        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        prevBtn.addEventListener('click', () => {
            if (reviewCurrent > 1) {
                reviewCurrent--;
                updateReviewUI();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (reviewCurrent < questionArr.length) {
                reviewCurrent++;
                updateReviewUI();
            }
        });

        updateReviewUI();
    }

    const timer = setInterval(() => {
        const waitingText = document.getElementById('waiting-text');
        if (waitingText.innerText.substring(11) === '.') {
            waitingText.innerText = '正在匹配旗鼓相当的对手..';
        } else if (waitingText.innerText.substring(11) === '..') {
            waitingText.innerText = '正在匹配旗鼓相当的对手...';
        } else {
            waitingText.innerText = '正在匹配旗鼓相当的对手.';
        }
    }, 500);

    const socket = io('/battle');

    socket.on('connect', () => {
        socket.emit('start', {Subject: new URLSearchParams(window.location.search).get('subject')});
    });

    // 已经开匹配了，不能同时进行两场对战
    socket.on('match_fail', () => {
        // todo
    });

    // 服务器匹配成功
    socket.on('match_success', (data) => {
        // 匹配成功，转换状态至对战
        clearInterval(timer);
        opponentName = data.Username;
        // 删掉全屏居中样式
        document.documentElement.classList.remove("h-100");
        document.body.className = '';
        // 写HTML框架
        mainDisplay.className = 'container py-3 d-flex flex-column gap-3 align-items-center';
        mainDisplay.style.cssText = '';
        mainDisplay.innerHTML = `
            <div class="d-flex flex-column gap-2 w-100">
                <!--Show self answer process-->
                <div class="d-flex gap-2 align-items-center" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${getCookie('username')}（我）">
                    <img id="self-avatar" src="img/user/${getCookie('uid')}.png" alt="${getCookie('username')}" width="32" height="32" class="rounded-circle">
                    <div class="flex-grow-1 progress-stacked" id="self-progress-stack"></div>
                </div>
                <!--Show opponent answer process-->
                <div class="d-flex gap-2 align-items-center" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${data.Username}">
                    <img id="opponent-avatar" src="img/user/${data.Uid}.png" alt="${data.Username}" width="32" height="32" class="rounded-circle">
                    <div class="flex-grow-1 progress-stacked" id="opponent-progress-stack">
                        <div class="progress" style="width: 10%" role="progressbar">
                            <div id="1-opponent-progress" class="progress-bar progress-bar-striped progress-bar-animated text-bg-warning"></div>
                        </div>
                    </div>
                </div>
            </div>
    
            <!--Show remaining time-->
            <div id="time-div">
                <span class="h4 mb-0 pe-3">剩余时间</span>
                <span id="time-left" class="h4 mb-0">20:00</span>
            </div>
        
            <div id="question-div" class="w-100 d-flex flex-column gap-3 align-items-center">
                <!--Show question count-->
                <span id="question-count" class="h2 mb-0"></span>
                <!--Show question-->
                <p id="question-text"></p>
                <!--选择题作答-->
                <div id="selection-area" class="list-group list-group-checkable d-grid gap-2 border-0 visually-hidden">
                    <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="selection-a-radio" value="A">
                    <label class="list-group-item rounded-3 py-3" for="selection-a-radio" id="selection-a"></label>
                    <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="selection-b-radio" value="B">
                    <label class="list-group-item rounded-3 py-3" for="selection-b-radio" id="selection-b"></label>
                    <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="selection-c-radio" value="C">
                    <label class="list-group-item rounded-3 py-3" for="selection-c-radio" id="selection-c"></label>
                    <input class="list-group-item-check pe-none" type="radio" name="listGroupCheckableRadios" id="selection-d-radio" value="D">
                    <label class="list-group-item rounded-3 py-3" for="selection-d-radio" id="selection-d"></label>
                </div>
                <!--填空题作答-->
                <div class="form-floating answer-container visually-hidden" id="blank-area">
                    <input class="form-control" id="blank-input">
                    <label class="list-group-item rounded-3 py-3" for="blank-input">你的答案</label>
                </div>
                <button class="btn btn-primary" id="submit-btn" style="min-width: 5em" disabled="disabled">提交</button>
            </div>
        `;

        // 刷新tooltip
        tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });

        const submitBtn = document.getElementById('submit-btn');
        const selectionARadio = document.getElementById('selection-a-radio');
        const selectionBRadio = document.getElementById('selection-b-radio');
        const selectionCRadio = document.getElementById('selection-c-radio');
        const selectionDRadio = document.getElementById('selection-d-radio');
        const blankInput = document.getElementById('blank-input');
        // 注册点击提交事件
        submitBtn.addEventListener('click', () => {
            if (pendingQuestion.SelectionA === null) {
                // 提交的是填空题
                socket.emit('submit_answer', {Answer: blankInput.value});
                pendingQuestion.UserAnswer = blankInput.value;
            } else {
                // 提交的是选择题
                let userAnswer;

                if (selectionARadio.checked) {
                    userAnswer = 'A'
                } else if (selectionBRadio.checked) {
                    userAnswer = 'B'
                } else if (selectionCRadio.checked) {
                    userAnswer = 'C'
                } else {
                    userAnswer = 'D'
                }
                socket.emit('submit_answer', {Answer: userAnswer});
                pendingQuestion.UserAnswer = userAnswer;
            }
            submitBtn.disabled = true;
        });
        // 一旦输入了，就解除禁止提交
        selectionARadio.addEventListener('click', () => {
            submitBtn.disabled = false;
        });
        selectionBRadio.addEventListener('click', () => {
            submitBtn.disabled = false;
        });
        selectionCRadio.addEventListener('click', () => {
            submitBtn.disabled = false;
        });
        selectionDRadio.addEventListener('click', () => {
            submitBtn.disabled = false;
        });
        blankInput.addEventListener('input', () => {
            submitBtn.disabled = blankInput.value === '';
        });
        const countDownDate = new Date().getTime() + 20 * 60 * 1000;
        const timeLeft = document.getElementById('time-left');
        countdown = setInterval(() => {
            const now = new Date().getTime();   // 获取当前时间
            const distance = countDownDate - now;   // 计算剩余时间
            if (distance > 0) {
                // 时间计算
                let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                let seconds = Math.floor((distance % (1000 * 60)) / 1000);
                // 格式化时间，确保分钟和秒钟始终为两位数
                if (minutes < 10) {
                    minutes = '0' + minutes;
                }
                if (seconds < 10) {
                    seconds = '0' + seconds;
                }
                timeLeft.innerText = `${minutes}:${seconds}`;
            }
        }, 1000);

        // 更新题目的UI
        updateExerciseUI({Question: data.Question, SelectionA: data.SelectionA, SelectionB: data.SelectionB, SelectionC: data.SelectionC, SelectionD: data.SelectionD});
    });

    // 服务器发来判题结果
    socket.on('judge_result', (data) => {
        const currentProgress = document.getElementById(`${current}-self-progress`);
        // 设置进度条颜色
        if (data.Correct) {
            currentProgress.className = "progress-bar bg-success";      // 回答正确
        } else {
            currentProgress.className = "progress-bar bg-danger";       // 回答错误
        }
        pendingQuestion.RightAnswer = data.RightAnswer;
        questionArr.push(pendingQuestion);
        if (data.Question !== null) {
            // 新题目
            current++;
            updateExerciseUI({Question: data.Question, SelectionA: data.SelectionA, SelectionB: data.SelectionB, SelectionC: data.SelectionC, SelectionD: data.SelectionD});
        } else {
            // 答题结束，让用户等待
            const questionDiv = document.getElementById('question-div');
            mainDisplay.removeChild(questionDiv);
            const waitForFinishDiv = document.createElement('div');
            waitForFinishDiv.id = 'wait-for-finish-div';
            waitForFinishDiv.className = 'd-flex flex-column align-items-center';
            waitForFinishDiv.innerHTML = `
                <img src="img/wait.png" alt="wait for finish" width="192">
                <h2 class="mt-3">正在等待对手作答完毕</h2>
                <button id="direct-review-btn" class="btn btn-primary mt-1">不等了，直接回顾</button>
            `;
            mainDisplay.appendChild(waitForFinishDiv);
            const directReviewBtn = document.getElementById('direct-review-btn');
            // 直接显示回顾
            directReviewBtn.addEventListener('click', () => {
                new bootstrap.Modal(document.getElementById('warning-modal')).show();   // 显示模态框询问
            });
        }
    });

    // 服务器发来对手答题情况
    socket.on('opponent', (data) => {
        const opponentProgressStack = document.getElementById('opponent-progress-stack');
        const currentProgress = document.getElementById(`${opponentCurrent}-opponent-progress`);
        if (data.Correct) {
            currentProgress.className = "progress-bar bg-success";      // 对手回答正确
        } else {
            currentProgress.className = "progress-bar bg-danger";       // 对手回答错误
        }
        // 如果不是最后一题，对手进度条往前推一格
        if (opponentCurrent < 10) {
            opponentCurrent++;
            const add_style_progress = document.createElement("div");
            add_style_progress.className = "progress-bar progress-bar-striped progress-bar-animated text-bg-warning";
            add_style_progress.id = `${opponentCurrent}-opponent-progress`;
            const add_width_progress = document.createElement("div");
            add_width_progress.className = "progress";
            add_width_progress.role = "progressbar";
            add_width_progress.style.width = "10%";
            add_width_progress.appendChild(add_style_progress);
            opponentProgressStack.appendChild(add_width_progress);
        }
    });

    // 对战结果
    socket.on('match_result', (data) => {
        clearInterval(countdown);   // 停止倒计时
        const questionDiv = document.getElementById('question-div');
        const waitForFinishDiv = document.getElementById('wait-for-finish-div');
        const timeDiv = document.getElementById('time-div');
        if (questionDiv !== null) {
            mainDisplay.removeChild(questionDiv);
        }
        if (waitForFinishDiv !== null) {
            mainDisplay.removeChild(waitForFinishDiv);
        }
        mainDisplay.removeChild(timeDiv);
        const resultDiv = document.createElement('div');
        resultDiv.className = 'd-flex flex-column align-items-center';
        if (data.Self >= 0 && data.Opponent <= 0) {
            // 你胜利
            resultDiv.innerHTML = `
                <img src="img/win.png" alt="win" width="192">
                <h2 class="mt-3">恭喜你胜出🎉🎉🎉</h2>
                <span>${getCookie('username')}: <span class="text-danger">+${Math.round(data.Self)}</span></span>
                <span>${opponentName}: <span class="text-primary">-${Math.round(-data.Opponent)}</span></span>
                <button id="review-btn" class="btn btn-primary mt-3" style="min-width: 5em">回顾</button>
            `;
        } else {
            // 你失败
            resultDiv.innerHTML = `
                <img src="img/lose.png" alt="lose" width="192">
                <h2 class="mt-3">请再接再厉~</h2>
                <span>${getCookie('username')}: <span class="text-primary">${Math.round(data.Self)}</span></span>
                <span>${opponentName}: <span class="text-danger">+${Math.round(data.Opponent)}</span></span>
                <button id="review-btn" class="btn btn-primary mt-3" style="min-width: 5em">回顾</button>
            `;
        }
        mainDisplay.appendChild(resultDiv);
        const reviewBtn = document.getElementById('review-btn');
        reviewBtn.addEventListener('click', initReview);    // 点击按钮后回顾
    });

    // 确定直接回顾
    continueReviewBtn.addEventListener('click', () => {
        socket.disconnect();
        initReview();
    });
});
