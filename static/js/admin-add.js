const re = /%%%.+?@@@/g

// 悬浮提示的初始化代码
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

// todo: 限制答案数量和图片数量？
document.addEventListener('DOMContentLoaded', () => {
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger')
    const userDropdownMenu = document.getElementById('user-dropdown-menu')

    const choicesInput = document.getElementById('choices-input')
    const answersInput = document.getElementById('answers-input')

    const answers = document.getElementById('answers')
    const imgs = document.getElementById('imgs')

    const questionArea = document.getElementById('question-area')
    const subjectSelect = document.getElementById('subject-select')
    const selectionA = document.getElementById('selection-a')
    const selectionB = document.getElementById('selection-b')
    const selectionC = document.getElementById('selection-c')
    const selectionD = document.getElementById('selection-d')
    const choiceRadio = document.getElementById('choice-radio')
    const blankRadio = document.getElementById('blank-radio')
    const selectionARadio = document.getElementById('selection-a-radio')
    const selectionBRadio = document.getElementById('selection-b-radio')
    const selectionCRadio = document.getElementById('selection-c-radio')
    const selectionDRadio = document.getElementById('selection-d-radio')

    const resolveBtn = document.getElementById('resolve-btn')
    const addAnswerBtn = document.getElementById('add-answer-btn')

    const form = document.getElementById('add-form')

    const continueBtn = document.getElementById('continue-btn')
    const closeOkBtn = document.getElementById('close-ok-btn')
    const backBtn = document.getElementById('back-btn')
    const submitBtn = document.getElementById('submit-btn')

    const isUpdate = new URLSearchParams(window.location.search).get('update') !== null;
    const currentNav = document.getElementById('current-nav')
    const imgNameMap = new Map();


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

    function resolveImg() {
        let arr
        if (choiceRadio.checked) {
            arr = resolveImg1(questionArea.value, selectionA.value, selectionB.value, selectionC.value, selectionD.value)
        } else {
            arr = resolveImg1(questionArea.value, '', '', '', '')
        }
        const arr1 = []
        arr.forEach((item) => {
            if (!imgNameMap.has(item)) {
                arr1.push(item)
            }
        })
        return arr1
    }

    function strArrEquals(arr1, arr2) {
        if (arr1.length !== arr2.length) {
            return false
        }
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false
            }
        }
        return true
    }

    function showErrModal(msg) {
        const errModal = new bootstrap.Modal(document.getElementById('err-modal'))
        const errText = document.getElementById('err-text');
        errText.innerText = msg
        errModal.show()
    }

    // 重置表单
    function resetForm() {
        form.reset()
        imgs.innerHTML = ''
        answers.innerHTML = ''
        choicesInput.classList.remove('visually-hidden')
        answersInput.classList.add('visually-hidden')
    }

    backBtn.addEventListener('click', () => {
        location.href = 'admin-search.html'
    })

    continueBtn.addEventListener('click', resetForm)
    closeOkBtn.addEventListener('click', resetForm)

    // 用户下拉栏位置偏移
    userDropdownTrigger.addEventListener('shown.bs.dropdown', () => {
        const rect = userDropdownMenu.getBoundingClientRect()
        if (rect.x + rect.width > window.innerWidth) {
            userDropdownMenu.style.transform = `translateX(${window.innerWidth - rect.x - rect.width}px)`
        }
    })
    userDropdownTrigger.addEventListener('hidden.bs.dropdown', () => {
        userDropdownMenu.style.transform = 'none'
    })

    // 切换题目类型
    choiceRadio.addEventListener('click', () => {
        choicesInput.classList.remove('visually-hidden')
        answersInput.classList.add('visually-hidden')
    })
    blankRadio.addEventListener('click', () => {
        choicesInput.classList.add('visually-hidden')
        answersInput.classList.remove('visually-hidden')
    })

    // 删除填空题答案
    answers.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            e.preventDefault()
            target.parentNode.remove()
        }
    })

    // 添加填空题答案
    addAnswerBtn.addEventListener('click', (e) => {
        e.preventDefault()
        // 不能直接 innerHTML +=，因为会导致先前的输入丢失
        const newElement = document.createElement("div")
        newElement.classList.add('d-flex')
        newElement.innerHTML = '<input type="text" class="form-control flex-grow-1" aria-label="" maxlength="100"><button class="btn btn-outline-danger ms-2 text-nowrap">删除</button>'
        answers.appendChild(newElement)
    })

    // 解析占位符
    resolveBtn.addEventListener('click', (e) => {
        e.preventDefault()
        const arr = resolveImg()
        if (arr.includes('Subject') || arr.includes('Question') || arr.includes('Answer') || arr.includes('Qid')
            || arr.includes('SelectionA') || arr.includes('SelectionB') || arr.includes('SelectionC') || arr.includes('SelectionD')) {
            showErrModal('图片占位符不能为“Qid”、“Question”、“Answer”、“Subject”、“SelectionA”、“SelectionB”、“SelectionC”、“SelectionD”！')
            return
        }

        imgs.innerHTML = ''

        arr.forEach((element) => {
            let newElement = document.createElement("div")
            newElement.className = 'd-flex gap-2 align-items-center'
            newElement.innerHTML = `<label class="text-nowrap" style="max-width: 75%">${element}</label><input type="file" class="form-control" accept="image/png">`
            imgs.appendChild(newElement)
        })
    })

    // 点击上传
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        // 首先进行检查
        if (questionArea.value === '') {
            showErrModal('题目不能为空！')
            return
        }

        const childInputs = answers.querySelectorAll('input')
        if (choiceRadio.checked) {
            if (selectionA.value === '') {
                showErrModal('A选项不能为空！')
                return
            }
            if (selectionB.value === '') {
                showErrModal('B选项不能为空！')
                return
            }
            if (selectionC.value === '') {
                showErrModal('C选项不能为空！')
                return
            }
            if (selectionD.value === '') {
                showErrModal('D选项不能为空！')
                return
            }
        } else {
            if (childInputs.length === 0) {
                showErrModal('请至少添加一个答案！')
                return
            }
            for (let item of childInputs) {
                if (item.value === '') {
                    showErrModal('答案不能为空！')
                    return
                }
            }
        }

        const arr = resolveImg()
        const arr1 = []
        const imgsChildLabels = imgs.querySelectorAll('label')
        imgsChildLabels.forEach(function(element) {
            arr1.push(element.innerText)
        })
        if (!strArrEquals(arr, arr1)) {
            showErrModal('请重新解析占位符！')
            return
        }

        const imgsChildDivs = imgs.querySelectorAll('div')
        for (let item of imgsChildDivs) {
            const k = item.querySelector('label').innerText
            const f = item.querySelector('input')
            if (f.files.length === 0) {
                showErrModal(`请为“${k}”选择一张图片！`)
                return
            }
        }

        const base64Images = [];
        // fetch api，当转换完图片后回调
        function postToServer() {
            let answerArr;
            if (choiceRadio.checked) {
                if (selectionARadio.checked) {
                    answerArr = ['A']
                } else if (selectionBRadio.checked) {
                    answerArr = ['B']
                } else if (selectionCRadio.checked) {
                    answerArr = ['C']
                } else {
                    answerArr = ['D']
                }
            } else {
                answerArr = []
                childInputs.forEach((element) => {
                    answerArr.push(element.value)
                })
            }

            let questionStr = questionArea.value
            let selectionAStr = selectionA.value
            let selectionBStr = selectionB.value
            let selectionCStr = selectionC.value
            let selectionDStr = selectionD.value

            if (isUpdate) {
                // 如果是修改，还原原来没改过的图片名
                for (const [key, value] of imgNameMap) {
                    const re1 = new RegExp(`%%%${key}@@@`, 'g')
                    const replaceStr = `%%%${value}@@@`
                    questionStr = questionStr.replace(re1, replaceStr)
                    selectionAStr = selectionAStr.replace(re1, replaceStr)
                    selectionBStr = selectionBStr.replace(re1, replaceStr)
                    selectionCStr = selectionCStr.replace(re1, replaceStr)
                    selectionDStr = selectionDStr.replace(re1, replaceStr)
                }
            }

            let postBody = {
                "Subject": subjectSelect.options[subjectSelect.selectedIndex].value,
                "Question": questionStr,
                "SelectionA": choiceRadio.checked ? selectionAStr : null,
                "SelectionB": choiceRadio.checked ? selectionBStr : null,
                "SelectionC": choiceRadio.checked ? selectionCStr : null,
                "SelectionD": choiceRadio.checked ? selectionDStr : null,
                "Answer": answerArr
            }
            base64Images.forEach((element) => {
                postBody[element.name] = element.base64
            })

            if (isUpdate) {
                postBody['Qid'] = Number(sessionStorage.getItem('Qid'))
                // console.log(postBody)
                fetch('/admin_update', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(postBody)
                })
                    .then(response => {
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
                        const okModal = new bootstrap.Modal(document.getElementById('ok-modal'))
                        document.getElementById('ok-text').innerText = '您已成功修改该题目。'
                        continueBtn.classList.add('visually-hidden')
                        okModal.show()
                        submitBtn.disabled = false
                    })
                    .catch(error => {
                        showErrModal('服务器错误：' + error.message)
                        submitBtn.disabled = false
                    })
            } else {
                fetch('/admin_add', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(postBody)
                })
                    .then(response => {
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
                        const okModal = new bootstrap.Modal(document.getElementById('ok-modal'))
                        document.getElementById('ok-text').innerText = '您已成功添加该题目。'
                        continueBtn.classList.remove('visually-hidden')
                        okModal.show()
                        submitBtn.disabled = false
                    })
                    .catch(error => {
                        showErrModal('服务器错误：' + error.message)
                        submitBtn.disabled = false
                    })
            }
        }

        // 开始图片转换
        submitBtn.disabled = true
        if (imgsChildDivs.length === 0) {
            postToServer()
        } else {
            imgsChildDivs.forEach((element, index) => {
                const k = element.querySelector('label').innerText
                const file = element.querySelector('input').files[0]
                const reader = new FileReader()
                reader.onload = function (e) {
                    base64Images[index] = {"name": k, "base64": e.target.result.split(',')[1]}
                    console.log(e.target.result)
                    if (base64Images.filter(b64 => b64 !== undefined).length === imgsChildDivs.length) {
                        postToServer()  // 如果所有文件都已转换，则发送POST请求
                    }
                }
                reader.readAsDataURL(file)
            })
        }
    })

    if (isUpdate) {
        // 设置界面
        submitBtn.value = '更新题目！'
        currentNav.innerText = '题目更新'
        document.title = '题目更新 · 小萌在线学习平台';

        // 读取从上个页面过来的数据，设置表单
        let questionStr = sessionStorage.getItem('Question')
        let selectionAStr = sessionStorage.getItem('SelectionA')
        let selectionBStr = sessionStorage.getItem('SelectionB')
        let selectionCStr = sessionStorage.getItem('SelectionC')
        let selectionDStr = sessionStorage.getItem('SelectionD')

        const arr = resolveImg1(questionStr, selectionAStr, selectionBStr, selectionCStr, selectionDStr)
        // 替换md5图片名为原图x
        arr.forEach((item, index) => {
            imgNameMap.set('原图' + index, item)
            const re1 = new RegExp(`%%%${item}@@@`, 'g')
            const replaceStr = `%%%原有图${index}@@@`
            questionStr = questionStr.replace(re1, replaceStr)
            selectionAStr = selectionAStr.replace(re1, replaceStr)
            selectionBStr = selectionBStr.replace(re1, replaceStr)
            selectionCStr = selectionCStr.replace(re1, replaceStr)
            selectionDStr = selectionDStr.replace(re1, replaceStr)
        })
        questionArea.value = questionStr
        selectionA.value = selectionAStr
        selectionB.value = selectionBStr
        selectionC.value = selectionCStr
        selectionD.value = selectionDStr
        subjectSelect.value = sessionStorage.getItem('Subject')

        if (selectionAStr === '') {
            // 填空题
            let answerCount = Number(sessionStorage.getItem('AnswerCount'))
            for (let i = 0; i < answerCount; i++) {
                const newElement = document.createElement("div")
                newElement.classList.add('d-flex')
                newElement.innerHTML = '<input type="text" class="form-control flex-grow-1" aria-label="" maxlength="100"><button class="btn btn-outline-danger ms-2 text-nowrap">删除</button>'
                newElement.querySelector('input').value = sessionStorage.getItem('Answer' + i)
                answers.appendChild(newElement)
            }
            blankRadio.checked = true
            choicesInput.classList.add('visually-hidden')
            answersInput.classList.remove('visually-hidden')
        } else {
            // 选择题
            const answer = sessionStorage.getItem('Answer0')
            if (answer === 'A') {
                selectionARadio.checked = true
            } else if (answer === 'B') {
                selectionBRadio.checked = true
            } else if (answer === 'C') {
                selectionCRadio.checked = true
            } else {
                selectionDRadio.checked = true
            }
        }
    }
})
