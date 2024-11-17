document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById('username');
    const uid = document.getElementById('uid');
    const userAvatar = document.getElementById('user-avatar');
    const logoutLink = document.getElementById('logout-link');
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    const subjectNavTab = document.getElementById('subject-nav-tab');
    const navTabContent = document.getElementById('nav-tab-content');

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
    uid.innerText = getCookie('uid');
    userAvatar.src = `img/user/${uid.innerText}.png`;

    // 对战科目信息的逻辑
    fetch('rank_info')
        .then(response => response.json())
        .then(result => {
            result.forEach((element, index) => {
                // 插入导航栏按钮
                const btn = document.createElement('button');
                btn.id = `nav-${element.Subject}-tab`;
                btn.setAttribute('data-bs-toggle', 'tab');
                btn.setAttribute('data-bs-target', `#nav-${element.Subject}`);
                btn.type = 'button';
                btn.role = 'tab';
                btn.setAttribute('aria-controls', `nav-${element.Subject}`);
                if (index === 0) {
                    btn.className = 'nav-link active';
                    btn.setAttribute('aria-selected', 'true');
                } else {
                    btn.className = 'nav-link';
                    btn.setAttribute('aria-selected', 'false');
                    btn.tabIndex = -1;
                }
                btn.innerText = element.Subject;
                subjectNavTab.appendChild(btn);

                // 插入每一个科目的详情
                const outerDiv = document.createElement('div');
                outerDiv.id = `nav-${element.Subject}`;
                outerDiv.role = 'tabpanel';
                outerDiv.setAttribute('aria-labelledby', `nav-${element.Subject}-tab`);
                if (index === 0) {
                    outerDiv.className = 'tab-pane fade active show';
                } else {
                    outerDiv.className = 'tab-pane fade';
                }
                outerDiv.innerHTML = `
                    <div class="row px-3 py-2">
                        <div class="col-md p-0 pe-md-2">
                            <table class="table table-hover m-0">
                                <thead>
                                    <tr>
                                        <th scope="col" class="text-center">#</th>
                                        <th scope="col">用户名</th>
                                        <th scope="col" class="text-end">ELO</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                        <div class="col-md p-0 pt-3 pt-md-0 ps-md-2">
                            <div class="h-100 p-3 d-flex flex-column justify-content-center align-items-center gap-2 border border-2 border-info-subtle" style="border-radius: 16px">
                                <span class="display-2 text-info">${element.Elo}</span>
                                <span>做题数: ${element.Total}</span>
                                <span>正确率: ${element.Total === 0 ? '无' : (element.Right / element.Total * 100).toFixed(2) + '%'}</span>
                                <a class="btn btn-lg btn-primary mt-2 mt-md-3" style="min-width: 6.5em" href="battle.html?subject=${element.Subject}" target="_blank">开始匹配</a>
                            </div>
                        </div>
                    </div>
                `;

                // 写排行榜
                const tBody = outerDiv.querySelector('tbody');
                let flag = false;
                element.Ranks.forEach((element1, index1) => {
                    const tr = document.createElement('tr');
                    if (element.SelfRank === index1 + 1) {
                        tr.classList.add('table-warning');
                        flag = true;
                    }
                    if (index1 === 0) {
                        tr.innerHTML = `
                            <th scope="row" class="text-danger text-center">1</th>
                                <td class="w-100">
                                    <div class="d-flex align-items-center gap-2">
                                        <img src="img/user/${element1.Uid}.png" width="32" height="32" class="rounded-circle">
                                        <span>${element1.Username}</span>
                                    </div>
                                </td>
                            <td class="text-end text-danger">${element1.Elo}</td>
                        `;
                    } else {
                        tr.innerHTML = `
                            <th scope="row" class="text-center">${index1 + 1}</th>
                                <td class="w-100">
                                    <div class="d-flex align-items-center gap-2">
                                        <img src="img/user/${element1.Uid}.png" width="32" height="32" class="rounded-circle">
                                        <span>${element1.Username}</span>
                                    </div>
                                </td>
                            <td class="text-end">${element1.Elo}</td>
                        `;
                    }
                    tBody.appendChild(tr);
                });
                // 如果中途没有上榜，最后补一个自己的排名
                if (!flag) {
                    const tr = document.createElement('tr');
                    tr.classList.add('table-warning');
                    tr.innerHTML = `
                        <tr class="table-warning">
                            <th scope="row" class="text-center">${element.SelfRank > 9999 ? '9999+' : element.SelfRank}</th>
                            <td class="w-100">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="img/user/${uid.innerText}.png" width="32" height="32" class="rounded-circle">
                                    <span>${username.innerText}</span>
                                </div>
                            </td>
                            <td class="text-end">${element.Elo}</td>
                        </tr>
                    `;
                    tBody.appendChild(tr);
                }
                navTabContent.appendChild(outerDiv);
            });
        });
});
