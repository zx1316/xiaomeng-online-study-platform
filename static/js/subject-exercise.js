let questionArr
let feedbackObj = {}
let current = 1

document.addEventListener('DOMContentLoaded', () => {
    const questionCount = document.getElementById('question-count')
    const questionText = document.getElementById('question-text');
    const selectionA = document.getElementById('selection-a');
    const selectionB = document.getElementById('selection-b');
    const selectionC = document.getElementById('selection-c');
    const selectionD = document.getElementById('selection-d');
    const selectionARadio = document.getElementById('selection-a-radio');
    const selectionBRadio = document.getElementById('selection-b-radio');
    const selectionCRadio = document.getElementById('selection-c-radio');
    const selectionDRadio = document.getElementById('selection-d-radio');
    const blankInput = document.getElementById('blank-input');
    const blankCorrect = document.getElementById('blank-correct');
    const selectionArea = document.getElementById('selection-area');
    const blankArea = document.getElementById('blank-area');
    const blankCorrectArea = document.getElementById('blank-correct-area');
    const submitBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressStack = document.getElementById('progress-stack');

    function updateExerciseUI() {
        // 进度条往前推一格
        const add_style_progress = document.createElement("div");
        add_style_progress.className = "progress-bar progress-bar-striped progress-bar-animated text-bg-info";
        add_style_progress.id = `${current}-progress`;
        const add_width_progress = document.createElement("div");
        add_width_progress.className = "progress";
        add_width_progress.role = "progressbar";
        add_width_progress.style.width="10%";
        add_width_progress.appendChild(add_style_progress)
        progressStack.appendChild(add_width_progress)

        submitBtn.disabled = true;      // 默认禁用提交按钮

        questionCount.innerText = `${current}/10`;
        const question = questionArr[current - 1];
        questionText.innerHTML = question.Question.replace(/%%%(.+?)@@@/g, '<img class="question-img" src="img/q/$1">');
        if (question.SelectionA === null) {
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
            selectionA.innerHTML = `A<div><span class="opacity-50">${question.SelectionA.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionB.innerHTML = `B<div><span class="opacity-50">${question.SelectionB.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionC.innerHTML = `C<div><span class="opacity-50">${question.SelectionC.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
            selectionD.innerHTML = `D<div><span class="opacity-50">${question.SelectionD.replace(/%%%(.+?)@@@/g, '</span><img class="question-img" src="img/q/$1"><span class="opacity-50">')}</span></div>`
        }
    }

    function updateReviewUI() {
        // 设置翻页按钮
        if (current <= 1) {
            prevBtn.style.visibility = 'hidden';
        } else {
            prevBtn.style.visibility = 'visible';
        }
        if (current >= 10) {
            nextBtn.style.visibility = 'hidden';
        } else {
            nextBtn.style.visibility = 'visible';
        }

        questionCount.innerText = `回顾 ${current}/10`;
        const question = questionArr[current - 1];
        questionText.innerHTML = question.Question.replace(/%%%(.+?)@@@/g, '<img class="question-img" src="img/q/$1">');
        if (question.SelectionA === null) {
            // 填空题
            selectionArea.classList.add('visually-hidden');
            blankArea.classList.remove('visually-hidden');
            blankInput.value = question.UserAnswer;
            if (question.Answer.indexOf(question.UserAnswer) < 0) {
                // 错了
                blankCorrectArea.classList.remove('visually-hidden');
                blankInput.classList.remove('text-success');
                blankInput.classList.add('text-danger');
                blankCorrect.value = question.Answer[0];
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
            if (question.Answer[0] === 'A') {
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
            if (question.Answer[0] === 'B') {
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
            if (question.Answer[0] === 'C') {
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
            if (question.Answer[0] === 'D') {
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

    submitBtn.addEventListener('click', () => {
        const question = questionArr[current - 1];
        const currentProgress = document.getElementById(`${current}-progress`);
        if (question.SelectionA === null) {
            // 填空题
            question.UserAnswer = blankInput.value;
            if (question.Answer.indexOf(blankInput.value) < 0) {
                // 错了
                feedbackObj.WrongQuestion.push({"Qid": question.Qid, "WrongAnswer": blankInput.value});
                currentProgress.className = "progress-bar bg-danger";       // 设置进度条颜色
            } else {
                currentProgress.className = "progress-bar bg-success";      // 设置进度条颜色
            }
        } else {
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
            question.UserAnswer = userAnswer;
            if (question.Answer[0] !== userAnswer) {
                // 错了
                feedbackObj.WrongQuestion.push({"Qid": question.Qid, "WrongAnswer": userAnswer});
                currentProgress.className = "progress-bar bg-danger";       // 设置进度条颜色
            } else {
                currentProgress.className = "progress-bar bg-success";      // 设置进度条颜色
            }
        }
        if (current === 10) {
            // 提交练习结果
            fetch('/exercise_result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackObj),
            });
            // 转场
            current = 1
            submitBtn.classList.add('visually-hidden');
            blankInput.disabled = true;
            selectionARadio.checked = false;
            selectionBRadio.checked = false;
            selectionCRadio.checked = false;
            selectionDRadio.checked = false;
            selectionARadio.disabled = true;
            selectionBRadio.disabled = true;
            selectionCRadio.disabled = true;
            selectionDRadio.disabled = true;
            selectionA.style.opacity = '1';
            selectionB.style.opacity = '1';
            selectionC.style.opacity = '1';
            selectionD.style.opacity = '1';
            updateReviewUI();   // 显示回顾界面
        } else {
            // 更新练习进度，下一题
            current++;
            updateExerciseUI();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (current > 1) {
            current--;
            updateReviewUI();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (current < 10) {
            current++;
            updateReviewUI();
        }
    });

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
    blankInput.addEventListener('input', e => {
        submitBtn.disabled = blankInput.value === '';
    });


    const subject = new URLSearchParams(window.location.search).get('querysubject');
    feedbackObj.Subject = subject;
    feedbackObj.WrongQuestion = [];
    fetch('exercise', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Subject": subject})
    })
        .then(response => response.json())
        .then(question_list => {
            // 调用函数来处理和显示数据
            questionArr = question_list;
            updateExerciseUI();
        })
        .catch(error => console.error('Error:', error));
});
