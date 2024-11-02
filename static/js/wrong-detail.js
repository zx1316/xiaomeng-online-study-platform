const re = /%%%(.+?)@@@/g;

document.addEventListener('DOMContentLoaded', () => {
    const question = document.getElementById('question');
    const subject = document.getElementById('subject');
    const selection = document.getElementById('selection');
    const selectionA = document.getElementById('selection-a');
    const selectionB = document.getElementById('selection-b');
    const selectionC = document.getElementById('selection-c');
    const selectionD = document.getElementById('selection-d');
    const yourAnswer = document.getElementById('your-answer');
    const answer = document.getElementById('answer');
    const notesArea = document.getElementById('notes-area');
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    const username = document.getElementById('username');
    const uid = document.getElementById('uid');
    const logoutLink = document.getElementById('logout-link');
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

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

    // 用户下拉栏位置偏移
    userDropdownTrigger.addEventListener('shown.bs.dropdown', () => {
        const rect = userDropdownMenu.getBoundingClientRect()
        if (rect.x + rect.width > window.innerWidth) {
            userDropdownMenu.style.transform = `translateX(${window.innerWidth - rect.x - rect.width}px)`
        }
    });
    userDropdownTrigger.addEventListener('hidden.bs.dropdown', () => {
        userDropdownMenu.style.transform = 'none'
    });

    // 登出
    logoutLink.addEventListener('click', (e) => {
        sessionStorage.clear();
        fetch('/logout', {method: 'POST'})
            .then(response => response.text())
            .then(result => {
                window.location.href = '/signin.html'
            })
            .catch(error => {
                window.location.href = '/signin.html'
            })
    });

    // 删除
    deleteBtn.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('warning-modal')).show();
    });

    // 确认删除
    confirmDeleteBtn.addEventListener('click', () => {
        fetch('/delete_wrong', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Wid":${sessionStorage.getItem('Wid')}}`
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
            location.href = 'search-wrong.html'
        })
        .catch(error => {
            alert('服务器错误：' + error.message)
        });
    });

    saveBtn.addEventListener('click', () => {
        fetch('/add_notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Wid":${sessionStorage.getItem('Wid')},"Notes":"${notesArea.value}"}`
        }).then(response => {
            // 检查响应状态码
            if (response.status === 200) {
                // 状态码为200时，处理正常情况
                return response.text();  // 由于内容为空，这里使用text()方法
            } else {
                throw new Error('Unexpected status code: ' + response.status);
            }
        })
        .then(result => {
            sessionStorage.setItem('Notes', notesArea.value);
            new bootstrap.Modal(document.getElementById('save-modal')).show();
        })
        .catch(error => {
            alert('服务器错误：' + error.message);
        });
    });

    username.innerText = getCookie('username');
    uid.innerText = getCookie('uid');

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
    yourAnswer.innerText = sessionStorage.getItem('WrongAnswer');
    notesArea.value = sessionStorage.getItem('Notes');
});