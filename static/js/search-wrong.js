let searchResult = [];
const re = /%%%.+?@@@/g;

const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const keywordInput = document.getElementById('keyword-input');
const subjectSelect = document.getElementById('subject-select');
const searchBtn = document.getElementById('search-btn');
const pagination = document.getElementById('pagination');
const resultP = document.getElementById('result-p');
const resultList = document.getElementById('result-list');
const form = document.getElementById('search-form');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const username = document.getElementById('username');
const uid = document.getElementById('uid');
const userAvatar = document.getElementById('user-avatar');
const logoutLink = document.getElementById('logout-link');

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

function createPageItem(str) {
    let li = document.createElement('li');
    li.className = 'page-item';
    li.innerHTML = `<a class="page-link" href="#">${str}</a>`;
    return li;
}

function addPageNumItem(begin, end) {
    for (let i = begin; i <= end; i++) {
        let li = createPageItem(i);
        const currentPage = parseInt(sessionStorage.getItem('currentPage'));
        if (currentPage === i) {
            li.classList.add('active');
        }
        pagination.appendChild(li);
    }
}

function setPaginationStyle() {
    const currentPage = parseInt(sessionStorage.getItem('currentPage'));
    const totalPage = parseInt(sessionStorage.getItem('totalPage'));
    if (totalPage <= 1) {
        pagination.classList.add('visually-hidden');
    } else {
        pagination.innerHTML = '';
        if (totalPage <= 5) {
            addPageNumItem(1, totalPage);
        } else {
            let li = createPageItem('«');
            pagination.appendChild(li);
            li = createPageItem('‹');
            pagination.appendChild(li);
            if (currentPage === 1 || currentPage === 2) {
                addPageNumItem(1, 5);
            } else if (currentPage === totalPage - 1 || currentPage === totalPage) {
                addPageNumItem(totalPage - 4, totalPage);
            } else {
                addPageNumItem(currentPage - 2, currentPage + 2);
            }
            li = createPageItem('›');
            pagination.appendChild(li);
            li = createPageItem('»');
            pagination.appendChild(li);
        }
        pagination.classList.remove('visually-hidden');
    }
}

function writeResultCount(total) {
    if (total === 0) {
        resultP.innerHTML = '无结果！';
    } else if (total <= 10) {
        resultP.innerHTML = `共${total}条结果。`;
    } else {
        const currentPage = parseInt(sessionStorage.getItem('currentPage'));
        resultP.innerHTML = `共${total}条结果，正在显示第${10 * currentPage - 9}-${Math.min(10 * currentPage, total)}条。`;
    }
}

function writeJsonToList(data) {
    searchResult = data;     // 浅拷贝备份
    resultList.innerHTML = '';
    data.forEach((item) => {
        let newQuestion = item.Question.replace(re, '[图片]');
        if (newQuestion.length > 200) {
            newQuestion = newQuestion.substring(0, 200) + '...';
        }
        let li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action'
        li.innerHTML = `
            <div class="d-grid d-md-flex gap-2 my-2 align-items-center">
                <div class="flex-grow-1 cursor-pointer" id="wq-div-${item.Wid}">
                    <p>${newQuestion}</p>
                    <p class="small mb-0">WID：${item.Wid}&emsp;QID：${item.Qid}</p>
                    <p class="small mb-2">科目：${item.Subject}</p>
                </div>
                <button type="button" class="btn btn-outline-danger text-nowrap" style="min-width: 5em">删除</button>
            </div>
        `;
        resultList.appendChild(li);
    });
}

function setUI(result) {
    sessionStorage.setItem('totalPage', Math.ceil(result.Total / 10).toString());
    writeJsonToList(result.Questions);
    setPaginationStyle();
    writeResultCount(result.Total);
    keywordInput.value = sessionStorage.getItem('keywordStr');
    subjectSelect.selectedIndex = parseInt(sessionStorage.getItem('subjectIndex'));
    searchBtn.disabled = false;
}

function setSessionStorageForJump(widStr) {
    const widNum = parseInt(widStr);
    for (let obj of searchResult) {
        if (obj.Wid === widNum) {
            sessionStorage.setItem('Wid', widStr);
            sessionStorage.setItem('Qid', obj.Qid);
            sessionStorage.setItem('Subject', obj.Subject);
            sessionStorage.setItem('Question', obj.Question);
            sessionStorage.setItem('SelectionA', obj.SelectionA === null ? '' : obj.SelectionA);
            sessionStorage.setItem('SelectionB', obj.SelectionB === null ? '' : obj.SelectionB);
            sessionStorage.setItem('SelectionC', obj.SelectionC === null ? '' : obj.SelectionC);
            sessionStorage.setItem('SelectionD', obj.SelectionD === null ? '' : obj.SelectionD);
            sessionStorage.setItem('AnswerCount', obj.Answer.length);
            obj.Answer.forEach((item, index) => {
                sessionStorage.setItem(`Answer${index}`, item);
            })
            sessionStorage.setItem('WrongAnswer', obj.WrongAnswer);
            sessionStorage.setItem('Notes', obj.Notes);
            break;
        }
    }
}

// 换页
pagination.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'A' && !target.parentNode.classList.contains('active')) {
        let currentPage = parseInt(sessionStorage.getItem('currentPage'));
        if (target.textContent === '«') {
            currentPage = 1;
        } else if (target.textContent === '‹') {
            if (currentPage > 1) {
                currentPage--;
            }
        } else if (target.textContent === '›') {
            if (currentPage < parseInt(sessionStorage.getItem('totalPage'))) {
                currentPage++;
            }
        } else if (target.textContent === '»') {
            currentPage = parseInt(sessionStorage.getItem('totalPage'));
        } else {
            currentPage = parseInt(target.textContent);
        }
        sessionStorage.setItem('currentPage', currentPage.toString());
        searchBtn.disabled = true;
        const keywordStr = sessionStorage.getItem('keywordStr');
        const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'));
        fetch('/search_wrong', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Page":${currentPage},"Size":10}`
        })
            .then(response => response.json())
            .then(result => setUI(result));
    }
})

resultList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
        // 删除题目并二次确认
        document.getElementById('delete-wid-span').innerText = target.parentNode.querySelector('.cursor-pointer').id.substring(7);
        new bootstrap.Modal(document.getElementById('warning-modal')).show()
    } else if (target.tagName === 'DIV' && target.classList.contains('cursor-pointer')) {
        // 查看详情
        setSessionStorageForJump(target.id.substring(7));
        location.href = 'wrong-detail.html';
    } else if (target.tagName === 'P') {
        // 查看详情
        setSessionStorageForJump(target.parentNode.id.substring(7));
        location.href = 'wrong-detail.html';
    }
})

// 确认删除
confirmDeleteBtn.addEventListener('click', (e) => {
    fetch('/delete_wrong', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: `{"Wid":${document.getElementById('delete-wid-span').innerText}}`
    })
        .then(response => {
            // 检查响应状态码
            if (response.status === 200) {
                // 状态码为200时，处理正常情况
                return response.text();  // 由于内容为空，这里使用text()方法
            } else if (response.status === 400) {
                // 状态码为400时，解析JSON错误信息
                return response.json().then(data => {
                    throw new Error(data.Msg);
                });
            } else {
                // 其他状态码，抛出错误
                throw new Error('Unexpected status code: ' + response.status);
            }
        })
        .then(result => {
            // 视情况调整页号
            let currentPage = parseInt(sessionStorage.getItem('currentPage'));
            if (searchResult.length <= 1 && currentPage > 1) {
                currentPage--;
                sessionStorage.setItem('currentPage', currentPage.toString());
            }
            // 重新拉列表
            searchBtn.disabled = true;
            const keywordStr = sessionStorage.getItem('keywordStr');
            const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'));
            fetch('/search_wrong', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Page":${currentPage},"Size":10}`
            })
                .then(response => response.json())
                .then(result => setUI(result));
        })
        .catch(error => {
            alert('服务器错误：' + error.message);
        });
});

// 提交表单
form.onsubmit = function(event) {
    event.preventDefault();
    searchBtn.disabled = true;
    sessionStorage.setItem('currentPage', '1');
    sessionStorage.setItem('keywordStr', keywordInput.value);
    sessionStorage.setItem('subjectIndex', subjectSelect.selectedIndex.toString());
    fetch('/search_wrong', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: `{"Keyword":"${keywordInput.value}","Subject":"${subjectSelect.options[subjectSelect.selectedIndex].value}","Page":1,"Size":10}`
    })
        .then(response => response.json())
        .then(result => setUI(result));
}

// 用户头像下拉位移
userDropdownTrigger.addEventListener('shown.bs.dropdown', () => {
    const rect = userDropdownMenu.getBoundingClientRect();
    if (rect.x + rect.width > window.innerWidth) {
        userDropdownMenu.style.transform = `translateX(${window.innerWidth - rect.x - rect.width}px)`;
    }
});
userDropdownTrigger.addEventListener('hidden.bs.dropdown', () => {
    userDropdownMenu.style.transform = 'none';
});

// 登出
logoutLink.addEventListener('click', (e) => {
    sessionStorage.clear();
    fetch('/logout', {method: 'POST'})
        .then(response => response.text())
        .then(result => {
            window.location.href = '/signin.html';
        })
        .catch(error => {
            window.location.href = '/signin.html';
        })
});

username.innerText = getCookie('username');
uid.innerText = getCookie('uid');
userAvatar.src = `img/user/${uid.innerText}.png`;

// 如果没有会话存储，设置默认值
if (sessionStorage.getItem('currentPage') === null) {
    sessionStorage.setItem('currentPage', '1');
}
if (sessionStorage.getItem('totalPage') === null) {
    sessionStorage.setItem('totalPage', '0');
}
if (sessionStorage.getItem('keywordStr') === null) {
    sessionStorage.setItem('keywordStr', '');
}
if (sessionStorage.getItem('subjectIndex') === null) {
    sessionStorage.setItem('subjectIndex', '0');
}

// 如果从详情界面删除后返回
if (sessionStorage.getItem('fromDelete') !== null) {
    // 视情况调整页号
    let currentPage = parseInt(sessionStorage.getItem('currentPage'));
    if (searchResult.length <= 1 && currentPage > 1) {
        sessionStorage.setItem('currentPage', (currentPage - 1).toString());
    }
    sessionStorage.removeItem('fromDelete');        // 删除标记
}

// 进来默认先搜索一次
const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'));
const keywordStr = sessionStorage.getItem('keywordStr');
const currentPage = sessionStorage.getItem('currentPage');

fetch('/search_wrong', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: `{"Subject":"${subjectSelect.options[subjectIndex].value}","Keyword":"${keywordStr}","Page":${currentPage},"Size":10}`
})
    .then(response => response.json())
    .then(result => setUI(result));
