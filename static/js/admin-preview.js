const re = /%%%.+?@@@/g
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
    const username = document.getElementById('username')
    const uid = document.getElementById('uid')
    const logoutLink = document.getElementById('logout-link')

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

    // 获取所有的占位符
    function resolveImg1(str1, str2, str3, str4, str5) {
        let arr = str1.match(re)
        if (arr === null) {
            arr = []
        }
        let arr1 = str2.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = str3.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = str4.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = str5.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr = arr.map((str) => str.substring(3, str.length - 3))                             // 干掉开头结尾的字符
            .filter((item, index, arr) => arr.indexOf(item) === index)      // 去重
        return arr
    }

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
            location.href = 'admin-search.html?from_delete=1'
        })
        .catch(error => {
            alert('服务器错误：' + error.message)
        })
    })

    updateBtn.addEventListener('click', () => {
        location.href = 'admin-add.html?update=1'     // session storage已经设置过了
    })

    // 登出
    logoutLink.addEventListener('click', (e) => {
        fetch('/logout', {method: 'POST'})
            .then(response => response.text())
            .then(result => {
                window.location.href = '/signin.html'
            })
            .catch(error => {
                window.location.href = '/signin.html'
            })
    })

    username.innerText = getCookie('username')
    uid.innerText = getCookie('uid')

    // 读取从上个页面过来的数据，设置文档
    let questionStr = sessionStorage.getItem('Question')
    let selectionAStr = sessionStorage.getItem('SelectionA')
    let selectionBStr = sessionStorage.getItem('SelectionB')
    let selectionCStr = sessionStorage.getItem('SelectionC')
    let selectionDStr = sessionStorage.getItem('SelectionD')
    let subjectStr = sessionStorage.getItem('Subject')
    const arr = resolveImg1(questionStr, selectionAStr, selectionBStr, selectionCStr, selectionDStr)
    arr.forEach((item) => {
        const re1 = new RegExp(`%%%${item}@@@`, 'g')
        const replaceStr = `<img class="question-img" src="img/q/${item}">`
        questionStr = questionStr.replace(re1, replaceStr)
        selectionAStr = selectionAStr.replace(re1, replaceStr)
        selectionBStr = selectionBStr.replace(re1, replaceStr)
        selectionCStr = selectionCStr.replace(re1, replaceStr)
        selectionDStr = selectionDStr.replace(re1, replaceStr)
    })
    question.innerHTML = questionStr        // 因为有图，所以用innerHTML
    subject.innerText = subjectStr
    if (selectionAStr === '') {
        selection.classList.add('visually-hidden')
    } else {
        selectionA.innerHTML = selectionAStr
        selectionB.innerHTML = selectionBStr
        selectionC.innerHTML = selectionCStr
        selectionD.innerHTML = selectionDStr
    }
    const answerCount = parseInt(sessionStorage.getItem('AnswerCount'));
    for (let i = 0; i < answerCount; i++) {
        let li = document.createElement('li')
        li.innerText = sessionStorage.getItem(`Answer${i}`)
        answer.appendChild(li)
    }
})
