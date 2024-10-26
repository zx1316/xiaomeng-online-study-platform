let currentPage = 1, totalPage = 0;
let keywordStr = '', subjectIndex = 0;
let searchResult
const re = /\$\$\$.+?@@@/g

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

    function createPageItem(str) {
        let li = document.createElement('li')
        li.className = 'page-item'
        li.innerHTML = `<a class="page-link" href="#">${str}</a>`
        return li
    }

    function addPageNumItem(begin, end) {
        for (let i = begin; i <= end; i++) {
            let li = createPageItem(i)
            if (currentPage === i) {
                li.classList.add('active')
            }
            pagination.appendChild(li)
        }
    }

     function setPaginationStyle() {
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
        totalPage = Math.ceil(result.Total / 10)
        writeJsonToList(result.Questions)
        setPaginationStyle()
        writeResultCount(result.Total)
        keywordInput.value = keywordStr
        subjectSelect.selectedIndex = subjectIndex
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


    // 删除题目并二次确认
    resultList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON' && target.classList.contains('btn-outline-danger')) {
            const deleteQidSpan = document.getElementById('delete-qid-span')
            deleteQidSpan.innerText = target.parentNode.parentNode.querySelector('.cursor-pointer').querySelector('.mb-0').innerHTML.substring(4)
            const modal = new bootstrap.Modal(document.getElementById('warning-modal'))
            modal.show()
        }
    })

    // 确认删除
    confirmDeleteBtn.addEventListener('click', (e) => {
        fetch('/admin_delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{Qid:${document.getElementById('delete-qid-span').innerText}}`
        })      // 忽略删除接口的返回
        // 视情况调整页号
        if (searchResult.length <= 1 && currentPage > 1) {
            currentPage--
        }
        // 重新拉列表
        searchBtn.disabled = true
        fetch('/admin_search', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Index":${(currentPage - 1) * 10},"Size":10}`
        })
            .then(response => response.json())
            .then(result => setUI(result))
    })

    // 换页
    pagination.addEventListener('click', (event) => {
        const target = event.target
        if (target.tagName === 'A' && !target.parentNode.classList.contains('active')) {
            if (target.textContent === '«') {
                currentPage = 1
            } else if (target.textContent === '‹') {
                currentPage--
            } else if (target.textContent === '›') {
                currentPage++
            } else if (target.textContent === '»') {
                currentPage = totalPage
            } else {
                currentPage = parseInt(target.textContent)
            }
            searchBtn.disabled = true
            fetch('/admin_search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Index":${(currentPage - 1) * 10},"Size":10}`
            })
                .then(response => response.json())
                .then(result => setUI(result))
        }
    })

    // 提交表单
    form.onsubmit = function(event) {
        event.preventDefault()
        searchBtn.disabled = true
        currentPage = 1
        keywordStr = keywordInput.value
        subjectIndex = subjectSelect.selectedIndex

        fetch('/admin_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: `{"Keyword":"${keywordStr}","Subject":"${subjectSelect.options[subjectIndex].value}","Index":0,"Size":10}`
        })
            .then(response => response.json())
            .then(result => setUI(result))
    }

    // 进来默认先搜索一次
    fetch('/admin_search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: `{"Subject":"任意","Keyword":"","Index":0,"Size":10}`
    })
        .then(response => response.json())
        .then(result => setUI(result))
})