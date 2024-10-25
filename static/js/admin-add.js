const re = /\$\$\$.+?@@@/g;

document.addEventListener('DOMContentLoaded', () => {
    // 用户下拉栏位置偏移
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger')
    const userDropdownMenu = document.getElementById('user-dropdown-menu')
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
    const choiceRadio = document.getElementById('choice-radio')
    const blankRadio = document.getElementById('blank-radio')
    const choicesInput = document.getElementById('choices-input')
    const answersInput = document.getElementById('answers-input')
    choiceRadio.addEventListener('click', () => {
        choicesInput.classList.remove('visually-hidden')
        answersInput.classList.add('visually-hidden')
    })
    blankRadio.addEventListener('click', () => {
        choicesInput.classList.add('visually-hidden')
        answersInput.classList.remove('visually-hidden')
    })

    // 删除填空题答案
    const answers = document.getElementById('answers')
    answers.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON') {
            e.preventDefault()
            target.parentNode.remove()
        }
    })

    // 添加填空题答案
    const addAnswerBtn = document.getElementById('add-answer-btn')
    addAnswerBtn.addEventListener('click', (e) => {
        e.preventDefault()
        // 不能直接 innerHTML +=，因为会导致先前的输入丢失
        let newElement = document.createElement("div")
        newElement.classList.add('d-flex')
        newElement.innerHTML = '<input type="text" class="form-control flex-grow-1" aria-label="" maxlength="100"><button class="btn btn-outline-danger ms-2 text-nowrap">删除</button>'
        answers.appendChild(newElement)
    })

    // 获取所有的占位符
    const questionArea = document.getElementById('question-area')
    const selectionA = document.getElementById('selection-a')
    const selectionB = document.getElementById('selection-b')
    const selectionC = document.getElementById('selection-c')
    const selectionD = document.getElementById('selection-d')
    function resolveImg() {
        let arr = questionArea.value.match(re)
        if (arr === null) {
            arr = []
        }
        let arr1 = selectionA.value.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = selectionB.value.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = selectionC.value.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr1 = selectionD.value.match(re)
        if (arr1 !== null) {
            arr = arr.concat(arr1)
        }
        arr = arr.map((str) => str.substring(3, str.length - 3))                              // 干掉开头结尾的字符
            .filter((item, index, arr) => arr.indexOf(item) === index)      // 去重
        return arr
    }

    // 解析占位符按钮
    const imgs = document.getElementById('imgs')
    const resolveBtn = document.getElementById('resolve-btn')
    const errModal = new bootstrap.Modal(document.getElementById('err-modal'));
    const errText = document.getElementById('err-text');
    resolveBtn.addEventListener('click', (e) => {
        e.preventDefault()
        const arr = resolveImg()
        if (arr.includes('Subject') || arr.includes('Question') || arr.includes('Answer') || arr.includes('Qid')
            || arr.includes('SelectionA') || arr.includes('SelectionB') || arr.includes('SelectionC') || arr.includes('SelectionD')) {
            errText.innerText = '图片占位符不能为“Qid”、“Question”、“Answer”、“Subject”、“SelectionA”、“SelectionB”、“SelectionC”、“SelectionD”！'
            errModal.show()
            return
        }
        const childDivs = imgs.querySelectorAll('div');
        childDivs.forEach(function(childDiv) {
            childDiv.remove();
        });

        arr.forEach((element) => {
            let newElement = document.createElement("div")
            newElement.className = 'd-flex gap-2 align-items-center'
            newElement.innerHTML = `<label>${element}</label><input type="file" class="form-control" accept="image/png">`
            imgs.appendChild(newElement)
        })
    })

    // 点击上传
    const okModal = new bootstrap.Modal(document.getElementById('ok-modal'))
    const form = document.getElementById('add-form')
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        if (questionArea.value === '') {
            errText.innerText = '题目不能为空！'
            errModal.show()
            return
        }

        if (choiceRadio.checked) {
            if (selectionA.value === '' || selectionB.value === '' || selectionC.value === '' || selectionD.value === '') {
                errText.innerText = '选项不能为空！'
                errModal.show()
                return
            }
        } else {
            const childInputs = answers.querySelectorAll('input')
            if (childInputs.length === 0) {
                errText.innerText = '请至少添加一个答案！'
                errModal.show()
                return
            }
            for (let item of childInputs) {
                if (item.value === '') {
                    errText.innerText = '答案不能为空！'
                    errModal.show()
                    return
                }
            }
        }

        const arr = resolveImg()
        const arr1 = []
        const childLabels = imgs.querySelectorAll('label')
        childLabels.forEach(function(element) {
            arr1.push(element.innerText)
        })
        if (arr.toString() !== arr1.toString()) {
            errText.innerText = '请重新解析占位符！'
            errModal.show()
            return
        }

        const childImgDivs = imgs.querySelectorAll('div')
        for (let item of childImgDivs) {
            const k = item.querySelector('label').innerText
            const f = item.querySelector('input')
            if (f.files.length === 0) {
                errText.innerText = `请为“${k}”选择一张图片！`
                errModal.show()
                return
            }
        }

        // fetch

        okModal.show()
    })
})
