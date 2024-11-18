document.addEventListener('DOMContentLoaded', () => {
    let exerciseListInner = '', battleListInner = '';

    const username = document.getElementById('username');
    const uid = document.getElementById('uid');
    const userAvatar = document.getElementById('user-avatar');
    const logoutLink = document.getElementById('logout-link');
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const selfUid = document.getElementById('self-uid');
    const selfName = document.getElementById('self-name');
    const bigUserAvatar = document.getElementById('big-user-avatar');
    const battleSwitch = document.getElementById('battle-switch');
    const subjectList = document.getElementById('subject-list');

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
        sessionStorage.clear();
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
    selfName.innerText = username.innerText;
    uid.innerText = getCookie('uid');
    selfUid.innerText = `UID：${uid.innerText}`;
    userAvatar.src = `img/user/${uid.innerText}.png`;
    bigUserAvatar.src = `img/user/${uid.innerText}.png`;

    fetch('/subject')
        .then(response => response.json())
        .then(subjects => {
            // 排序
            subjects.sort((a, b) => {
                return b.Total - a.Total;
            });
            // 缓存html
            subjects.forEach((obj) => {
                exerciseListInner += `
                    <li class="list-group-item d-flex align-items-center gap-3 py-3">
                        <img src="/img/subject/${obj.Subject}.png" alt="${obj.Subject}" width="64" height="64" class="rounded-circle">
                        <div class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                            <span class="mb-0 h4">${obj.Subject}</span>
                            <span class="mb-0 opacity-75">${obj.Total}题 / 正确率${obj.Total === 0 ? '无' : (obj.Right / obj.Total * 100).toFixed(2) + '%'}</span>
                        </div>
                    </li>
                `;
            });
            // 查找对战数据并缓存html
            fetch('/rank_info')
                .then(response => response.json())
                .then(result => {
                    result.sort((a, b) => {
                        return b.Elo - a.Elo;
                    });
                    let element = result[0];
                    battleListInner += `
                        <li class="list-group-item d-flex align-items-center gap-3 py-3">
                            <img src="/img/subject/${element.Subject}.png" alt="${element.Subject}" width="64" height="64" class="rounded-circle">
                            <div class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                                <div class="d-flex justify-content-between align-items-center gap-2">
                                    <span class="mb-0 h4">${element.Subject}</span>
                                    <span class="mb-0 h4 text-danger">${Math.round(element.Elo)}</span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center gap-2">
                                    <span class="mb-0 opacity-75">${element.Total}题 / 正确率${element.Total === 0 ? '无' : (element.Right / element.Total * 100).toFixed(2) + '%'}</span>
                                    <span class="mb-0 opacity-75 text-danger">#${element.SelfRank > 9999 ? '9999+' : element.SelfRank}</span>
                                </div>
                            </div>
                        </li>
                    `;
                    for (let i = 1; i < result.length; i++) {
                        element = result[i];
                        battleListInner += `
                            <li class="list-group-item d-flex align-items-center gap-3 py-3">
                                <img src="/img/subject/${element.Subject}.png" alt="${element.Subject}" width="64" height="64" class="rounded-circle">
                                <div class="flex-grow-1 d-flex flex-column justify-content-center gap-2">
                                    <div class="d-flex justify-content-between align-items-center gap-2">
                                        <span class="mb-0 h4">${element.Subject}</span>
                                        <span class="mb-0 h4 text-info">${Math.round(element.Elo)}</span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center gap-2">
                                        <span class="mb-0 opacity-75">${element.Total}题 / 正确率${element.Total === 0 ? '无' : (element.Right / element.Total * 100).toFixed(2) + '%'}</span>
                                        <span class="mb-0 opacity-75">#${element.SelfRank > 9999 ? '9999+' : element.SelfRank}</span>
                                    </div>
                                </div>
                            </li>
                        `;
                    }
                    // 显示练习信息
                    subjectList.innerHTML = exerciseListInner;
                    // 设置切换显示事件监听
                    battleSwitch.addEventListener('change', () => {
                        subjectList.innerHTML = battleSwitch.checked ? battleListInner : exerciseListInner;
                    });
                });
        })
        .catch(error => console.error('Error:', error));
});
