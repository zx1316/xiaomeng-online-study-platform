let searchResult = []
const re = /%%%.+?@@@/g

document.addEventListener('DOMContentLoaded', () => {
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger')
    const userDropdownMenu = document.getElementById('user-dropdown-menu')
    const keywordInput = document.getElementById('keyword-input')
    const subjectSelect = document.getElementById('subject-select')
    const searchBtn = document.getElementById('search-btn')
    const pagination = document.getElementById('pagination')
    const resultP = document.getElementById('result-p')
    const resultList = document.getElementById('result-list')
    const form = document.getElementById('search-form')
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn')
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

    function createPageItem(str) {
        let li = document.createElement('li')
        li.className = 'page-item'
        li.innerHTML = `<a class="page-link" href="#">${str}</a>`
        return li
    }

    function addPageNumItem(begin, end) {
        for (let i = begin; i <= end; i++) {
            let li = createPageItem(i)
            const currentPage = parseInt(sessionStorage.getItem('currentPage'))
            if (currentPage === i) {
                li.classList.add('active')
            }
            pagination.appendChild(li)
        }
    }

     function setPaginationStyle() {
         const currentPage = parseInt(sessionStorage.getItem('currentPage'))
         const totalPage = parseInt(sessionStorage.getItem('totalPage'))
         if (totalPage <= 1) {
             pagination.classList.add('visually-hidden')
         } else {
             pagination.innerHTML = '';
             if (totalPage <= 5) {
                 addPageNumItem(1, totalPage)
             } else {
                 let li = createPageItem('«')
                 pagination.appendChild(li)
                 li = createPageItem('‹')
                 pagination.appendChild(li)
                 if (currentPage === 1 || currentPage === 2) {
                     addPageNumItem(1, 5)
                 } else if (currentPage === totalPage - 1 || currentPage === totalPage) {
                     addPageNumItem(totalPage - 4, totalPage)
                 } else {
                     addPageNumItem(currentPage - 2, currentPage + 2)
                 }
                 li = createPageItem('›')
                 pagination.appendChild(li)
                 li = createPageItem('»')
                 pagination.appendChild(li)
             }
             pagination.classList.remove('visually-hidden')
         }
    }

    function writeResultCount(total) {
        if (total === 0) {
            resultP.innerHTML = '无结果！'
        } else if (total <= 10) {
            resultP.innerHTML = `共${total}条结果。`
        } else {
            const currentPage = parseInt(sessionStorage.getItem('currentPage'))
            resultP.innerHTML = `共${total}条结果，正在显示第${10 * currentPage - 9}-${Math.min(10 * currentPage, total)}条。`
        }
    }

    function writeJsonToList(data) {
        searchResult = data     // 浅拷贝备份
        resultList.innerHTML = ''
        data.forEach((item) => {
            let li = document.createElement('li')
            let newQuestion = item.Question.replace(re, '[图片]')
            if (newQuestion.length > 200) {
                newQuestion = newQuestion.substring(0, 200) + '...'
            }

            li.className = 'list-group-item list-group-item-action'
            li.innerHTML = `
                <div class="d-grid gap-2 d-md-flex my-2">
                    <div class="flex-grow-1 cursor-pointer">
                        <p>${newQuestion}</p>
                        <p class="small mb-0">QID：${item.Qid}</p>
                        <p class="small mb-2">科目：${item.Subject}</p>
                    </div>
                    <div class="d-flex gap-2 justify-content-center item-btn-group">
                        <button type="button" class="btn btn-outline-primary text-nowrap">修改</button>
                        <button type="button" class="btn btn-outline-danger text-nowrap">删除</button>
                    </div>
                </div>
            `
            resultList.appendChild(li)
        })
    }

    function setUI(result) {
        sessionStorage.setItem('totalPage', Math.ceil(result.Total / 10).toString())
        writeJsonToList(result.Questions)
        setPaginationStyle()
        writeResultCount(result.Total)
        keywordInput.value = sessionStorage.getItem('keywordStr')
        subjectSelect.selectedIndex = parseInt(sessionStorage.getItem('subjectIndex'))
        searchBtn.disabled = false
    }

    userDropdownTrigger.addEventListener('shown.bs.dropdown', () => {
        const rect = userDropdownMenu.getBoundingClientRect()
        if (rect.x + rect.width > window.innerWidth) {
            userDropdownMenu.style.transform = `translateX(${window.innerWidth - rect.x - rect.width}px)`
        }
    })
    userDropdownTrigger.addEventListener('hidden.bs.dropdown', () => {
        userDropdownMenu.style.transform = 'none'
    })

    function setSessionStorageForJump(qidStr) {
        const qidNum = parseInt(qidStr)
        for (let obj of searchResult) {
            if (obj.Qid === qidNum) {
                sessionStorage.setItem('Qid', qidStr);
                sessionStorage.setItem('Subject', obj.Subject)
                sessionStorage.setItem('Question', obj.Question)
                sessionStorage.setItem('SelectionA', obj.SelectionA === null ? '' : obj.SelectionA)
                sessionStorage.setItem('SelectionB', obj.SelectionB === null ? '' : obj.SelectionB)
                sessionStorage.setItem('SelectionC', obj.SelectionC === null ? '' : obj.SelectionC)
                sessionStorage.setItem('SelectionD', obj.SelectionD === null ? '' : obj.SelectionD)
                sessionStorage.setItem('AnswerCount', obj.Answer.length)
                obj.Answer.forEach((item, index) => {
                    sessionStorage.setItem(`Answer${index}`, item)
                })
                break
            }
        }
    }


    resultList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            const qid = target.parentNode.parentNode.querySelector('.cursor-pointer').querySelector('.mb-0').innerText.substring(4)
            if (target.classList.contains('btn-outline-danger')) {
                // 删除题目并二次确认
                document.getElementById('delete-qid-span').innerText = qid
                new bootstrap.Modal(document.getElementById('warning-modal')).show()
            } else {
                // 跳转修改题目
                setSessionStorageForJump(qid)
                location.href = 'admin-add.html?update=1'
            }
        } else if (target.tagName === 'DIV' && target.classList.contains('cursor-pointer')) {
            // 查看详情
            setSessionStorageForJump(target.querySelector('.mb-0').innerText.substring(4))
            location.href = 'admin-preview.html'
        } else if (target.tagName === 'P') {
            // 查看详情
            if (target.classList.contains('mb-0')) {
                setSessionStorageForJump(target.innerText.substring(4))
            } else {
                setSessionStorageForJump(target.parentNode.querySelector('.mb-0').innerText.substring(4))
            }
            location.href = 'admin-preview.html'
        }
    })

    // 确认删除
    confirmDeleteBtn.addEventListener('click', (e) => {
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
            // 视情况调整页号
            let currentPage = parseInt(sessionStorage.getItem('currentPage'))
            if (searchResult.length <= 1 && currentPage > 1) {
                currentPage--
                sessionStorage.setItem('currentPage', currentPage.toString())
            }
            // 重新拉列表
            searchBtn.disabled = true
            const keywordStr = sessionStorage.getItem('keywordStr')
            const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'))
            fetch('/admin_search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Page":${currentPage},"Size":10}`
            })
                .then(response => response.json())
                .then(result => setUI(result))
        })
        .catch(error => {
            alert('服务器错误：' + error.message)
        })
    })

    // 换页
    pagination.addEventListener('click', (event) => {
        const target = event.target
        if (target.tagName === 'A' && !target.parentNode.classList.contains('active')) {
            let currentPage = parseInt(sessionStorage.getItem('currentPage'))
            if (target.textContent === '«') {
                currentPage = 1
            } else if (target.textContent === '‹') {
                if (currentPage > 1) {
                    currentPage--
                }
            } else if (target.textContent === '›') {
                if (currentPage < parseInt(sessionStorage.getItem('totalPage'))) {
                    currentPage++
                }
            } else if (target.textContent === '»') {
                currentPage = parseInt(sessionStorage.getItem('totalPage'))
            } else {
                currentPage = parseInt(target.textContent)
            }
            sessionStorage.setItem('currentPage', currentPage.toString())
            searchBtn.disabled = true
            const keywordStr = sessionStorage.getItem('keywordStr')
            const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'))
            fetch('/admin_search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Page":${currentPage},"Size":10}`
            })
                .then(response => response.json())
                .then(result => setUI(result))
        }
    })

    // 提交表单
    form.onsubmit = function(event) {
        event.preventDefault()
        searchBtn.disabled = true
        sessionStorage.setItem('currentPage', '1')
        sessionStorage.setItem('keywordStr', keywordInput.value)
        sessionStorage.setItem('subjectIndex', subjectSelect.selectedIndex.toString())
        fetch('/admin_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: `{"Keyword":"${keywordInput.value}","Subject":"${subjectSelect.options[subjectSelect.selectedIndex].value}","Page":1,"Size":10}`
        })
            .then(response => response.json())
            .then(result => setUI(result))
    }

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

    // 如果没有会话存储，设置默认值
    if (sessionStorage.getItem('currentPage') === null) {
        sessionStorage.setItem('currentPage', '1')
    }
    if (sessionStorage.getItem('totalPage') === null) {
        sessionStorage.setItem('totalPage', '0')
    }
    if (sessionStorage.getItem('keywordStr') === null) {
        sessionStorage.setItem('keywordStr', '')
    }
    if (sessionStorage.getItem('subjectIndex') === null) {
        sessionStorage.setItem('subjectIndex', '0')
    }

    // 如果从预览界面删除后返回
    if (new URLSearchParams(window.location.search).get('from_delete') !== null) {
        // 视情况调整页号
        let currentPage = parseInt(sessionStorage.getItem('currentPage'))
        if (searchResult.length <= 1 && currentPage > 1) {
            sessionStorage.setItem('currentPage', (currentPage - 1).toString())
        }
    }

    // 进来默认先搜索一次
    const subjectIndex = parseInt(sessionStorage.getItem('subjectIndex'))
    const keywordStr = sessionStorage.getItem('keywordStr')
    const currentPage = sessionStorage.getItem('currentPage')
    fetch('/admin_search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: `{"Subject":"${subjectSelect.options[subjectIndex].value}","Keyword":"${keywordStr}","Page":${currentPage},"Size":10}`
    })
        .then(response => response.json())
        .then(result => setUI(result))
})
