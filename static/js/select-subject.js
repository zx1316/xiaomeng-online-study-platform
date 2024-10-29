document.addEventListener('DOMContentLoaded', () => {
    function showSubjects(subjects){

        // 获取要插入内容的容器
        var listGroup = document.getElementById('subject-list');

        // 遍历数据，创建HTML元素并插入到容器中
        subjects.forEach(function(item) {
            // 创建a标签
            var a = document.createElement('a');
            a.href = `/subject-exercise.html?querysubject=${item.Subject}`;
            a.className = "list-group-item list-group-item-action d-flex gap-3 py-3";
            a.target = "_blank";
            a.setAttribute("aria-current", "true");

            // 创建img标签
            var img = document.createElement('img');
            img.src = `/img/subject/${item.subject}.png`;
            img.alt = item.subject;
            img.width = 64;
            img.height = 64;
            img.className = "rounded-circle flex-shrink-0";

            // 创建div容器
            var div = document.createElement('div');
            div.className = "d-flex align-items-center gap-3 w-100";

            // 创建内部div
            var innerDiv = document.createElement('div');
            innerDiv.className = "flex-grow-1 d-flex flex-column gap-2"

            // 创建h6标签
            var h6 = document.createElement('h4');
            h6.className = "mb-0";
            h6.textContent = item.Subject;

            // 创建p标签
            var p = document.createElement('p');
            p.className = "mb-0 opacity-75";
            if(item.Total!=0){
                p.textContent = `总体数:${item.Total}, 正确率:${item.Right / item.Total}`
            }else{
                p.textContent = `总体数:${item.Total}, 正确率:无`
            }


            // 将h6和p标签添加到内部div中
            innerDiv.appendChild(h6);
            innerDiv.appendChild(p);

            // 将img和内部div添加到外层div中
            div.appendChild(img);
            div.appendChild(innerDiv);


            // 将div添加到a标签中
            a.appendChild(div);

            // 将a标签添加到容器中
            listGroup.appendChild(a);
        });
    }

    fetch('subject')
        .then(response => response.json())
        .then(subjects => {
            // 调用函数来处理和显示数据
            showSubjects(subjects);
        })
        .catch(error => console.error('Error:', error))
})
// 假设这是从服务器接收到的JSON数据
// var subjects = [
//     {"subject": "数学", "total": 100, "right": 80},
//     {"subject": "语文", "total": 90, "right": 81},
//     // ... 其他科目
// ];
// showSubjects(subjects)
