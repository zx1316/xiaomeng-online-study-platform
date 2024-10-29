//页号信息
let currentPage = 1
const totalPage = 10
//记录题目信息
let questionList = []
let question_no = 0;
let right = 0;
const wrong_list = [];
const question_show = [];

document.addEventListener('DOMContentLoaded', () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const subject = urlParams.get('querysubject');
    //进度条stack
    const progress_stack = document.getElementById("progress-stack");
    //题面显示
    const question_text = document.getElementById("question-text");
    //回答显示
    const outer_answer_div = document.getElementById("answer-div");
    //底部控制栏
    const buttom_control_div = document.getElementById("buttom-control-div")

    function init(question_list){
        questionList = question_list
        showQuestion();
        updateProgress();
        addSubmitButton();
    }

    function updateProgress(status){
        if(question_no!==0){
            const current_progress = document.getElementById(`${question_no}-progress`)
            current_progress.className = "progress";
            if(status){
                current_progress.className = "progress-bar bg-success";
            }else{
                current_progress.className = "progress-bar bg-danger";
            }
        }
        if(question_no!==10){
            const add_width_progress = document.createElement("div");
            add_width_progress.className = "progress";
            add_width_progress.role = "progressbar";
            add_width_progress.style.width="10%";

            const add_style_progress = document.createElement("div");
            add_style_progress.className = "progress-bar progress-bar-striped progress-bar-animated text-bg-info";
            add_style_progress.id = `${question_no+1}-progress`
            add_width_progress.appendChild(add_style_progress)

            progress_stack.appendChild(add_width_progress)
        }
    }

    function showQuestion(){
        question_text.textContent = questionList[question_no].Question;
        if(questionList[question_no].SelectionA == null || questionList[question_no].SelectionA === ''){
            showBlankQuestion();
        }else{
            showSelectionQuestion();
        }
    }

    function showSelectionQuestion(){
        outer_answer_div.innerHTML = ""

        const selections = ["SelectionA","SelectionB","SelectionC","SelectionD"]
        const selections_div = document.createElement("div");
        selections_div.id = `${question_no}-answer-div`
        selections_div.className = "list-group list-group-checkable d-grid gap-2 border-0"

        selections.forEach(function(selection, index) {
            // 获取选择项的值
            const selectionValue = questionList[question_no][selection];

            // 创建input元素
            const input = document.createElement('input');
            input.className = 'list-group-item-check pe-none';
            input.type = 'radio';
            input.name = 'listGroupCheckableRadios';
            input.id = 'listGroupCheckableRadios' + (index + 1);
            input.value = selection.slice(-1);

            // 创建label元素
            const label = document.createElement('label');
            label.className = 'list-group-item rounded-3 py-3';
            label.htmlFor = input.id;
            label.id = `${question_no}-${selection.slice(-1)}`
            label.textContent = selection.slice(-1);

            // 创建包含支持文本的span元素
            const span = document.createElement('span');
            span.className = 'd-block opacity-50';
            span.textContent = selectionValue;

            // 将input和label添加到列表组
            selections_div.appendChild(input);
            label.appendChild(span);
            selections_div.appendChild(label);
        });
        outer_answer_div.appendChild(selections_div);
    }

    function showBlankQuestion(){
        outer_answer_div.innerHTML = ""

        //创建div元素
        const blank_div = document.createElement("div");
        blank_div.className = "blank-input-frame mb-3"
        blank_div.id= `${question_no}-answer-div`

        //创建input_div
        const input_div = document.createElement("div");
        input_div.className = "form-floating"
        input_div.id= `${question_no}-input-div`

        //创建input元素
        const input = document.createElement('input');
        input.className = "form-control";
        input.id = `${question_no}-blank_input`

        //创建label元素
        const label = document.createElement('label');
        label.id = `${question_no}-blank-label`;
        label.className = 'list-group-item rounded-3 py-3';
        label.htmlFor = input.id;
        label.textContent = "Answer"

        //将input和label添加
        input_div.appendChild(input);
        input_div.appendChild(label);
        blank_div.appendChild(input_div);



        outer_answer_div.appendChild(blank_div);
    }

    function submitAnswer(){
        if(questionList[question_no]["SelectionA"] == null || questionList[question_no]["SelectionA"] === ""){
            submitBlankQuestion();
        }else{
            submitSelectionQuestion();
        }
        if(question_no!==10){
            showQuestion();
        }else{
            showResult();
        }
    }

    function submitBlankQuestion(){
        const answer_div = document.getElementById(`${question_no}-answer-div`);
        //获取用户答案
        const blank_input = document.getElementById(`${question_no}-blank_input`);
        const answer = blank_input.value;
        //获取标准答案
        const answers = questionList[question_no]["Answer"];
        //回答正确
        if(answers.indexOf(answer)>-1){
            // blank_input.style.color = "blue";
            blank_input.classList.add('text-success');
            right = right + 1;
            question_no = question_no + 1;
            updateProgress(true);
        }else{
            const wrong_label = document.getElementById(`${question_no}-blank-label`);
            wrong_label.textContent = "你的答案"
            //标记错误答案
            blank_input.classList.add('text-danger');
            blank_input.disabled = true;
            //添加正确答案
            //创建input_div
            const input_div = document.createElement("div");
            input_div.className = "form-floating mt-3"
            input_div.id= `${question_no}-correct-input-div`

            //创建input元素
            const input = document.createElement('input');
            input.className = "form-control text-success";
            input.id = `${question_no}-correct-blank_input`
            input.value = questionList[question_no]["Answer"][0]
            input.disabled = true

            //创建label元素
            const label = document.createElement('label');
            label.id = `${question_no}-correct-blank-label`;
            label.className = 'list-group-item rounded-3 py-3';
            label.htmlFor = input.id;
            label.textContent = "正确答案"

            //将input和label添加
            input_div.appendChild(input);
            input_div.appendChild(label);
            answer_div.appendChild(input_div)

            //记录错误答案
            const wrong = {"Qid":questionList[question_no]["Qid"],"WrongAnswer":answer};
            wrong_list.push(wrong);

            question_no = question_no + 1;
            updateProgress(false);
        }
        //保存
        question_show.push(answer_div);
    }

    function submitSelectionQuestion(){
        const answer_div = document.getElementById(`${question_no}-answer-div`);
        //获取用户答案
        const selectedValue = document.querySelector('input[name="listGroupCheckableRadios"]:checked').value;
        // 获取div中所有的input元素，并设置为disabled
        const inputs = answer_div.getElementsByTagName('input');
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].disabled = true;
            inputs[i].checked = false;
        }
        //获取所有label元素，并设置不透明
        const labels = answer_div.getElementsByTagName('label');
        for (let i = 0; i < inputs.length; i++) {
            labels[i].style.opacity = '1';
        }
        //回答正确
        if(selectedValue===questionList[question_no]["Answer"][0]){
            //标注正确选项
            const label = document.getElementById(`${question_no}-${selectedValue}`)
            label.classList.add('text-success');
            // label.style.color = 'green';
            //记录错误信息
            right = right + 1;
            question_no = question_no + 1;
            //更新进度条
            updateProgress(true);
        }else{
            //标注正确和错误选项
            const wrong_label = document.getElementById(`${question_no}-${selectedValue}`)
            wrong_label.classList.add('text-danger');
            // wrong_label.style.color = 'red';
            const right_label = document.getElementById(`${question_no}-${questionList[question_no]["Answer"]}`);
            right_label.classList.add('text-success');
            // right_label.style.color = 'green';
            //记录错误信息
            const wrong = {"Qid":questionList[question_no]["Qid"],"WrongAnswer":selectedValue};
            wrong_list.push(wrong);
            question_no = question_no + 1;
            //更新进度条
            updateProgress(false);
        }
        question_show.push(answer_div);
    }

    function showResult(){
        addPageChange();
        changePage();
        postResult();
    }

    function postResult(){
        const json_data = {
            "Subject":subject,
            "Total":10,
            "WrongQuestion":wrong_list
        }
        fetch('/exercise_result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json_data), // 将JavaScript对象转换为JSON字符串
        })
    }
    function changePage(){
        setPaginationStyle();
        question_text.textContent = questionList[currentPage-1].Question;
        outer_answer_div.innerHTML = ""
        outer_answer_div.appendChild(question_show[currentPage-1])
    }

    function addSubmitButton(){
        const submitButton = document.createElement("button")
        submitButton.type = "button"
        submitButton.className = "btn btn-primary"
        submitButton.textContent = "提交"
        submitButton.style.minWidth = '5em'
        submitButton.addEventListener('click', submitAnswer)
        buttom_control_div.appendChild(submitButton)
    }

    let pagination;

    function addPageChange(){
        buttom_control_div.innerHTML = ""
        pagination = document.createElement("ul")
        pagination.className = "pagination"
        pagination.id = "pagination"
        buttom_control_div.appendChild(pagination)
        setPaginationStyle();
        pagination.addEventListener('click', (event) => {
            const target = event.target
            if (target.tagName === 'A' && !target.parentNode.classList.contains('active')) {
                if (target.textContent === '«') {
                    currentPage = 1
                } else if (target.textContent === '‹') {
                    if (currentPage > 1) {
                        currentPage--
                    }
                } else if (target.textContent === '›') {
                    if (currentPage < totalPage) {
                        currentPage++
                    }
                } else if (target.textContent === '»') {
                    currentPage = totalPage
                } else {
                    currentPage = parseInt(target.textContent)
                }
                console.log(currentPage)
                changePage()
            }
        })
    }

    function createPageItem(str) {
        let li = document.createElement('li')
        li.className = 'page-item'
        li.innerHTML = `<a class="page-link" href="#">${str}</a >`
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

    fetch('exercise', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"Subject": subject})
    })
        .then(response => response.json())
        .then(question_list => {
            // 调用函数来处理和显示数据
            init(question_list);
        })
        .catch(error => console.error('Error:', error))
})
