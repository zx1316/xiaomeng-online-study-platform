document.addEventListener('DOMContentLoaded', () => {
    let exerciseListInner = '', battleListInner = '';
    let uploadFlag = false;
    let friendBattleFlag = false;      // 用于判断关闭模态框时要不要发送终止对战
    let selectedSubject = '';   // 现在选中的科目
    let defaultSubject = '';    // 默认选中的科目
    let currentPage = 1, maxPage = 1;
    let friendObj;
    let toDeleteUid;
    let waitingTimer;

    const selfUid = document.getElementById('self-uid');
    const selfName = document.getElementById('self-name');
    const bigUserAvatar = document.getElementById('big-user-avatar');
    const battleSwitch = document.getElementById('battle-switch');
    const subjectList = document.getElementById('subject-list');
    const friendList = document.getElementById('friend-list');
    const friendPage = document.getElementById('friend-page');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const deleteFriendModalText = document.getElementById('delete-friend-modal-text');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const uidInput = document.getElementById('uid-input');
    const addFriendBtn = document.getElementById('add-friend-btn');
    const addFriendModalHeading = document.getElementById('add-friend-modal-heading');
    const addFriendModalText = document.getElementById('add-friend-modal-text');
    const waitingImg = document.getElementById('waiting-img');
    const waitingText = document.getElementById('waiting-text');
    const waitFriendBattleBtn = document.getElementById('wait-friend-battle-btn');

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
                                        <li class="dropdown-item cursor-pointer friend-battle" data-uid="${friend.Uid}">发起该科目对战</li>
                                        <li class="dropdown-item cursor-pointer text-danger delete-friend" data-username="${friend.Username}" data-uid="${friend.Uid}">删除</li>
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
                                        <li class="dropdown-item cursor-pointer friend-battle" data-uid="${friend.Uid}">发起该科目对战</li>
                                        <li class="dropdown-item cursor-pointer text-danger delete-friend" data-username="${friend.Username}" data-uid="${friend.Uid}">删除</li>
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
        // 设置删除好友事件监听
        document.querySelectorAll('.delete-friend').forEach((el) => {
            el.addEventListener('click', () => {
                toDeleteUid = el.getAttribute('data-uid');
                deleteFriendModalText.innerText = `您确定要从好友列表中删除${el.getAttribute('data-username')}（UID：${el.getAttribute('data-uid')}）吗？`;
                new bootstrap.Modal(document.getElementById('delete-friend-modal')).show();
            });
        });
        // 设置发起对战事件监听
        document.querySelectorAll('.friend-battle').forEach((el) => {
            el.addEventListener('click', () => {
                // 显示模态框
                waitingText.innerText = '正在等待对方接受您的对战请求.';
                waitingImg.src = 'img/matching.gif';
                waitFriendBattleBtn.className = 'btn btn-secondary';
                waitFriendBattleBtn.innerText = '取消对战';
                waitingTimer = setInterval(() => {
                    if (waitingText.innerText.substring(14) === '.') {
                        waitingText.innerText = '正在等待对方接受您的对战请求..';
                    } else if (waitingText.innerText.substring(14) === '..') {
                        waitingText.innerText = '正在等待对方接受您的对战请求...';
                    } else {
                        waitingText.innerText = '正在等待对方接受您的对战请求.';
                    }
                }, 500);
                friendBattleFlag = true;
                new bootstrap.Modal(document.getElementById('wait-friend-battle-modal')).show();
                // 发送请求
                socket.emit('friend_battle_request', {Uid: Number(el.getAttribute('data-uid')), Subject: selectedSubject});
            });
        });
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
                        });
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
                        });
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
                new bootstrap.Modal(document.getElementById('avatar-ok-modal')).show();
            })
            .catch(error => {
                uploadFlag = false;
                alert('Error: ' + error);
            });
        }
    });

    // 点击确认删除好友
    confirmDeleteBtn.addEventListener('click', () => {
        fetch('/delete_friend', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"Uid":${toDeleteUid}}`
        })
            .then(response => response.text())
            .then(result => {
                if (friendObj.Friends.length <= 1 && currentPage > 1) {
                    // 跳到上一页
                    currentPage--;
                }
                // 再查询好友
                fetch('/friend_list', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: `{"Page":${currentPage},"Size":10}`
                })
                    .then(response => response.json())
                    .then(result => {
                        friendObj = result;
                        updateFriendsUI();
                    });
            });
    });

    // 添加好友
    addFriendBtn.addEventListener('click', () => {
        const num = Number(uidInput.value);
        if (Number.isInteger(num) && num.toString() === uidInput.value) {
            if (num !== Number(getCookie('uid'))) {
                // 添加好友
                fetch('/add_friend', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: `{"Uid":${num}}`
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
                        addFriendModalHeading.innerText = '喜报';
                        addFriendModalText.innerText = `已经发送申请，待对方同意后，你们将成为好友。`;
                        new bootstrap.Modal(document.getElementById('add-friend-modal')).show();
                    })
                    .catch(error => {
                        addFriendModalHeading.innerText = '错误';
                        if (error.message === 'not_found') {
                            addFriendModalText.innerText = '找不到这个用户！';
                        } else if (error.message === 'offline') {
                            addFriendModalText.innerText = '对方不在线，请等对方上线后再发送申请！';
                        } else {
                            addFriendModalText.innerText = error.message;
                        }
                        new bootstrap.Modal(document.getElementById('add-friend-modal')).show();
                    });
            } else {
                // 不能添加自己
                addFriendModalHeading.innerText = '错误';
                addFriendModalText.innerText = '你不能添加自己为好友！';
                new bootstrap.Modal(document.getElementById('add-friend-modal')).show();
            }
        } else {
            // 输入的不是整数
            addFriendModalHeading.innerText = '错误';
            addFriendModalText.innerText = '输入的不是UID！';
            new bootstrap.Modal(document.getElementById('add-friend-modal')).show();
        }
    });

    // 关闭匹配框时
    document.getElementById('wait-friend-battle-modal').addEventListener('hide.bs.modal', () => {
        if (friendBattleFlag) {
            // 如果正在等待对方接受
            socket.emit('end_friend_battle_request');   // 发送终止对战
            clearInterval(friendBattleFlag);
            friendBattleFlag = false;
        }
    });

    // 收到对战请求许可
    socket.on('friend_battle_permit', (data) => {
        clearInterval(friendBattleFlag);
        friendBattleFlag = false;
        if (data.Answer === 'yes') {
            // 可以对战，开新窗口吧
            new bootstrap.Modal(document.getElementById('add-friend-modal')).hide();
            window.open('battle-friend.html', '_blank');
        } else {
            // 对战个勾八
            waitingImg.src = 'img/lose.png';
            waitFriendBattleBtn.className = 'btn btn-primary';
            waitFriendBattleBtn.innerText = '关闭';
            if (data.Answer === 'offline') {
                waitingText.innerText = '对方不在线！';
            } else if (data.Answer === 'opponent_already_in_battle') {
                waitingText.innerText = '对方已经开始了一场对战！';
            } else if (data.Answer === 'already_in_battle') {
                waitingText.innerText = '您已经在一场对战中了！';
            } else if (data.Answer === 'not_friend') {
                waitingText.innerText = '对方不是您的好友！';
            } else {
                waitingText.innerText = '对方拒绝了您的请求！';
            }
        }
    });
});
