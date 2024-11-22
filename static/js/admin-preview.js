const re = /%%%(.+?)@@@/g;

document.addEventListener('DOMContentLoaded', () => {
    const question = document.getElementById('question');
    const subject = document.getElementById('subject');
    const selection = document.getElementById('selection');
    const selectionA = document.getElementById('selection-a');
    const selectionB = document.getElementById('selection-b');
    const selectionC = document.getElementById('selection-c');
    const selectionD = document.getElementById('selection-d');
    const answer = document.getElementById('answer');
    const updateBtn = document.getElementById('update-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    deleteBtn.addEventListener('click', () => {
        document.getElementById('delete-qid-span').innerText = sessionStorage.getItem('Qid');
        new bootstrap.Modal(document.getElementById('warning-modal')).show()
    })

    confirmDeleteBtn.addEventListener('click', () => {
        fetch('/admin_delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Qid":${document.getElementById('delete-qid-span').innerText}}`
        }).then(response => {
            // 检查响应状态码
            if (response.status === 200) {
                // 状态码为200时，处理正常情况
                return response.text()  // 由于内容为空，这里使用text()方法
            } else if (response.status === 400) {
                // 状态码为400时，解析JSON错误信息
                return response.json().then(data => {
                    throw new Error(data.Msg)
                });
            } else {
                // 其他状态码，抛出错误
                throw new Error('Unexpected status code: ' + response.status)
            }
        })
        .then(result => {
            sessionStorage.setItem('fromDelete', '1');  // 设置删除标识
            location.href = 'admin-search.html'
        })
        .catch(error => {
            alert('服务器错误：' + error.message)
        })
    })

    updateBtn.addEventListener('click', () => {
        location.href = 'admin-add.html?update=1'     // session storage已经设置过了
    })

    // 读取从上个页面过来的数据，设置文档
    let questionStr = sessionStorage.getItem('Question')
    let selectionAStr = sessionStorage.getItem('SelectionA')
    let selectionBStr = sessionStorage.getItem('SelectionB')
    let selectionCStr = sessionStorage.getItem('SelectionC')
    let selectionDStr = sessionStorage.getItem('SelectionD')
    let subjectStr = sessionStorage.getItem('Subject')
    question.innerHTML = questionStr.replace(re, '<img class="question-img" src="img/q/$1">')       // 因为有图，所以用innerHTML
    subject.innerText = subjectStr
    if (selectionAStr === '') {
        selection.classList.add('visually-hidden')
    } else {
        selectionA.innerHTML = selectionAStr.replace(re, '<img class="question-img" src="img/q/$1">')
        selectionB.innerHTML = selectionBStr.replace(re, '<img class="question-img" src="img/q/$1">')
        selectionC.innerHTML = selectionCStr.replace(re, '<img class="question-img" src="img/q/$1">')
        selectionD.innerHTML = selectionDStr.replace(re, '<img class="question-img" src="img/q/$1">')
    }
    const answerCount = parseInt(sessionStorage.getItem('AnswerCount'));
    for (let i = 0; i < answerCount; i++) {
        let li = document.createElement('li')
        li.innerText = sessionStorage.getItem(`Answer${i}`)
        answer.appendChild(li)
    }
})
