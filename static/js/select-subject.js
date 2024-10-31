document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById('username');
    const uid = document.getElementById('uid');
    const logoutLink = document.getElementById('logout-link');
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    function showSubjects(subjects){
        // 获取要插入内容的容器
        const listGroup = document.getElementById('subject-list');

        // 遍历数据，创建HTML元素并插入到容器中
        subjects.forEach(function(item) {
            // 创建a标签
            const a = document.createElement('a');
            a.href = `/subject-exercise.html?querysubject=${item.Subject}`;
            a.className = "list-group-item list-group-item-action d-flex gap-3 py-3";
            a.target = "_blank";
            a.setAttribute("aria-current", "true");
            a.innerHTML = `
                <div class="d-flex align-items-center gap-3 w-100">
                    <img src="/img/subject/${item.Subject}.png" alt="${item.Subject}" width="64" height="64" class="rounded-circle flex-shrink-0">
                    <div class="flex-grow-1 d-flex flex-column gap-2">
                        <h4 class="mb-0">${item.Subject}</h4>
                        <p class="mb-0 opacity-75">做题数: ${item.Total}，正确率: ${item.Total === 0 ? '无' : (item.Right / item.Total * 100).toFixed(2) + '%'}</p>
                    </div>
                    <i class="fa fa-angle-right opacity-75" style="font-size: 24px"></i>
                </div>
            `;
            // 将a标签添加到容器中
            listGroup.appendChild(a);
        });
    }

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
        fetch('/logout', {method: 'POST'})
            .then(response => response.text())
            .then(result => {
                window.location.href = '/signin.html'
            })
            .catch(error => {
                window.location.href = '/signin.html'
            })
    });

    username.innerText = getCookie('username');
    uid.innerText = getCookie('uid');

    fetch('subject')
        .then(response => response.json())
        .then(subjects => {
            // 调用函数来处理和显示数据
            showSubjects(subjects);
        })
        .catch(error => console.error('Error:', error));
})
// 假设这是从服务器接收到的JSON数据
// var subjects = [
//     {"subject": "数学", "total": 100, "right": 80},
//     {"subject": "语文", "total": 90, "right": 81},
//     // ... 其他科目
// ];
// showSubjects(subjects)
