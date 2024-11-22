document.addEventListener('DOMContentLoaded', () => {
    let exerciseListInner = '', battleListInner = '';
    let uploadFlag = false;
    let selectedSubject = '';   // 现在选中的科目
    let defaultSubject = '';    // 默认选中的科目
    let currentPage = 1, maxPage = 1;
    let friendObj;
    const socket = io('/friend');

    const selfUid = document.getElementById('self-uid');
    const selfName = document.getElementById('self-name');
    const bigUserAvatar = document.getElementById('big-user-avatar');
    const battleSwitch = document.getElementById('battle-switch');
    const subjectList = document.getElementById('subject-list');
    const friendList = document.getElementById('friend-list');
    const friendPage = document.getElementById('friend-page');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

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

    function updateFriendsUI() {
        maxPage = Math.max(1, Math.ceil(friendObj.Total / 10));
        let friendListInner = '';
        if (battleSwitch.checked) {
            friendObj.Friends.forEach(friend => {
                friendListInner += `
                    <li class="list-group-item list-group-item-action pe-2">
                        <div class="d-flex gap-2 align-items-center">
                            <img src="img/user/${friend.Uid}.png" alt="${friend.Uid}" width="40" height="40" class="rounded-circle">
                            <div class="d-flex flex-grow-1 justify-content-between align-items-center">
                                <div class="d-flex flex-column">
                                    <span>${friend.Username} <span class="badge bg-primary">${Math.round(friend.Elo[selectedSubject])}</span> <span class="badge bg-success">#${friend.Rank[selectedSubject]}</span></span>
                                    <span class="very-small opacity-75">UID：${friend.Uid}</span>
                                </div>
                                <div class="dropdown">
                                    <div class="dropdown-toggle px-2 cursor-pointer" data-bs-toggle="dropdown"></div>
                                    <ul class="dropdown-menu">
                                        <li class="dropdown-item cursor-pointer">发起对战</li>
                                        <li class="dropdown-item cursor-pointer text-danger" id="delete-${friend.Uid}">删除</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            });
        } else {
            friendObj.Friends.forEach(friend => {
                friendListInner += `
                    <li class="list-group-item list-group-item-action pe-2">
                        <div class="d-flex gap-2 align-items-center">
                            <img src="img/user/${friend.Uid}.png" alt="${friend.Uid}" width="40" height="40" class="rounded-circle">
                            <div class="d-flex flex-grow-1 justify-content-between align-items-center">
                                <div class="d-flex flex-column">
                                    <span>${friend.Username}</span>
                                    <span class="very-small opacity-75">UID：${friend.Uid}</span>
                                </div>
                                <div class="dropdown">
                                    <div class="dropdown-toggle px-2 cursor-pointer" data-bs-toggle="dropdown"></div>
                                    <ul class="dropdown-menu">
                                        <li class="dropdown-item cursor-pointer">发起对战</li>
                                        <li class="dropdown-item cursor-pointer text-danger" id="delete-${friend.Uid}">删除</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            });
        }
        friendList.innerHTML = friendListInner;     // 设置列表
        if (friendObj.Total === 0) {
            friendPage.innerText = '您没有朋友！';
        } else {
            friendPage.innerText = `${currentPage}/${maxPage}`; // 设置页码
        }
        // 设置分页按钮隐藏显示
        if (currentPage <= 1) {
            prevBtn.classList.add('visually-hidden');
        } else {
            prevBtn.classList.remove('visually-hidden');
        }
        if (currentPage >= maxPage) {
            nextBtn.classList.add('visually-hidden');
        } else {
            nextBtn.classList.remove('visually-hidden');
        }
    }

    selfName.innerText = getCookie('username');
    selfUid.innerText = `UID：${getCookie('uid')}`;
    bigUserAvatar.src = `img/user/${selfUid.innerText}.png`;

    const fetchRequests = [
        fetch('/subject'),
        fetch('/rank_info'),
        fetch('/friend_list', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: '{"Page":1,"Size":10}'
        })
    ];

    Promise.all(fetchRequests)
        .then(responses => {
            // 这里的 responses 是一个数组，包含每个 fetch 请求的结果
            return Promise.all(responses.map(response => response.json())); // 响应是 JSON 格式
        })
        .then(dataArray => {
            // 这里的 dataArray 包含每个请求解析后的 JSON 数据
            // 现在所有 fetch 请求都处理完毕，可以执行后续代码
            let result = dataArray[0];  // subject的返回结果
            // 排序
            result.sort((a, b) => {
                return b.Total - a.Total;
            });
            // 缓存html
            let obj = result[0];
            defaultSubject = obj.Subject;       // 初始化默认选中的科目
            exerciseListInner += `
                <div>
                    <input class="form-check-input visually-hidden" type="radio" name="subject" id="${obj.Subject}-radio" value="${obj.Subject}" checked="">
                    <label class="list-group-item d-flex align-items-center gap-3 py-3" for="${obj.Subject}-radio">
                        <img src="/img/subject/${obj.Subject}.png" alt="${obj.Subject}" width="64" height="64" class="rounded-circle">
                        <span class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                            <span class="mb-0 h4">${obj.Subject}</span>
                            <span class="mb-0 opacity-75">${obj.Total}题 / 正确率${obj.Total === 0 ? '无' : (obj.Right / obj.Total * 100).toFixed(2) + '%'}</span>
                        </span>
                    </label>
                </div>
            `;
            for (let i = 1; i < result.length; i++) {
                obj = result[i];
                exerciseListInner += `
                    <div>
                        <input class="form-check-input visually-hidden" type="radio" name="subject" id="${obj.Subject}-radio" value="${obj.Subject}">
                        <label class="list-group-item d-flex align-items-center gap-3 py-3" for="${obj.Subject}-radio">
                            <img src="/img/subject/${obj.Subject}.png" alt="${obj.Subject}" width="64" height="64" class="rounded-circle">
                            <span class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                                <span class="mb-0 h4">${obj.Subject}</span>
                                <span class="mb-0 opacity-75">${obj.Total}题 / 正确率${obj.Total === 0 ? '无' : (obj.Right / obj.Total * 100).toFixed(2) + '%'}</span>
                            </span>
                        </label>
                    </div>
                `;
            }

            result = dataArray[1];  // rank_info的返回结果
            result.sort((a, b) => {
                return b.Elo - a.Elo;
            });
            obj = result[0];
            battleListInner += `
                <div>
                    <input class="form-check-input visually-hidden" type="radio" name="subject" id="${obj.Subject}-radio" value="${obj.Subject}" checked="">
                    <label class="list-group-item d-flex align-items-center gap-3 py-3" for="${obj.Subject}-radio">
                        <img src="/img/subject/${obj.Subject}.png" alt="${obj.Subject}" width="64" height="64" class="rounded-circle">
                        <span class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                            <span class="d-flex justify-content-between align-items-center gap-2">
                                <span class="mb-0 h4">${obj.Subject}</span>
                                <span class="mb-0 h4 text-danger">${Math.round(obj.Elo)}</span>
                            </span>
                            <span class="d-flex justify-content-between align-items-center gap-2">
                                <span class="mb-0 opacity-75">${obj.Total}题 / 正确率${obj.Total === 0 ? '无' : (obj.Right / obj.Total * 100).toFixed(2) + '%'}</span>
                                <span class="mb-0 opacity-75 text-danger">#${obj.SelfRank > 9999 ? '9999+' : obj.SelfRank}</span>
                            </span>
                        </span>
                    </label>
                </div>
            `;
            for (let i = 1; i < result.length; i++) {
                obj = result[i];
                battleListInner += `
                    <div>
                        <input class="form-check-input visually-hidden" type="radio" name="subject" id="${obj.Subject}-radio" value="${obj.Subject}">
                        <label class="list-group-item d-flex align-items-center gap-3 py-3" for="${obj.Subject}-radio">
                            <img src="/img/subject/${obj.Subject}.png" alt="${obj.Subject}" width="64" height="64" class="rounded-circle">
                            <span class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                                <span class="d-flex justify-content-between align-items-center gap-2">
                                    <span class="mb-0 h4">${obj.Subject}</span>
                                    <span class="mb-0 h4 text-info">${Math.round(obj.Elo)}</span>
                                </span>
                                <span class="d-flex justify-content-between align-items-center gap-2">
                                    <span class="mb-0 opacity-75">${obj.Total}题 / 正确率${obj.Total === 0 ? '无' : (obj.Right / obj.Total * 100).toFixed(2) + '%'}</span>
                                    <span class="mb-0 opacity-75">#${obj.SelfRank > 9999 ? '9999+' : obj.SelfRank}</span>
                                </span>
                            </span>
                        </label>
                    </div>
                `;
            }
            // 显示练习信息
            subjectList.innerHTML = exerciseListInner;
            selectedSubject = defaultSubject;

            friendObj = dataArray[2];  // friend_list的返回结果
            updateFriendsUI();


            // 设置切换显示事件监听
            battleSwitch.addEventListener('change', () => {
                subjectList.innerHTML = battleSwitch.checked ? battleListInner : exerciseListInner;
                selectedSubject = defaultSubject;
                updateFriendsUI();
            });

            // radio选中事件
            subjectList.addEventListener('change', (event) => {
                if (event.target.name === 'subject') {
                    selectedSubject = event.target.value;
                    updateFriendsUI();
                }
            });

            // 加上两个换页按钮的事件监听
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    fetch('/friend_list', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: `{"Page":${currentPage},"Size":10}`
                    })
                        .then(response => response.json())
                        .then(result => {
                            friendObj = result;
                            updateFriendsUI();
                        })
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentPage < maxPage) {
                    currentPage++;
                    fetch('/friend_list', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: `{"Page":${currentPage},"Size":10}`
                    })
                        .then(response => response.json())
                        .then(result => {
                            friendObj = result;
                            updateFriendsUI();
                        })
                }
            });

        })
        .catch(error => {
            // 如果任一请求失败，则会进入这个 catch 块
            console.error('Error:', error);
        });

    // 设置点击头像的事件
    const fileInput = document.getElementById('file-input');
    bigUserAvatar.addEventListener('click', () => {
        if (!uploadFlag) {
            fileInput.click();
        }
    });
    // 当文件被选中后，执行上传操作
    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file) {
            uploadFlag = true;
            const formData = new FormData();
            formData.append('Avatar', file); // 'file' 是服务器端接收文件的字段名

            // 使用fetch API发送请求
            fetch('/change_avatar', {
                method: 'POST',
                body: formData
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
            .then(data => {
                // 处理上传成功后的逻辑
                uploadFlag = false;
                const okModal = new bootstrap.Modal(document.getElementById('avatar-ok-modal'));
                okModal.show();
            })
            .catch(error => {
                uploadFlag = false;
                alert('Error: ' + error);
            });
        }
    });
});
