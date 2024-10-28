document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("form-signin");
    const usernameInput = document.getElementById("username-input");
    const passwordInput = document.getElementById("password-input");
    const submitBtn = document.querySelector("button[type='submit']");

    function showError(errModalId, errId) {
        const errModal = new bootstrap.Modal(document.getElementById(errModalId));
        const parentDiv = document.querySelector(`#${errModalId} #${errModalId}-body`);
        const allChildren = parentDiv.children;
        for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            if (child.id !== errId) {
                child.classList.add('visually-hidden');
            } else {
                child.classList.remove('visually-hidden');
            }
        }
        errModal.show();
    }

    form.onsubmit = function(e) {
        e.preventDefault();
        if (usernameInput.value === '' || passwordInput.value === '') {
            showError('err-modal', 'empty-err-text');    // 显示不能为空
            return;
        }

        submitBtn.disabled = true;
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },    // 告诉服务器这是一个JSON格式的数据
            body: `{"Username":"${usernameInput.value}","Password":"${passwordInput.value}"}`       // todo: 考虑加密密码？，RSA之类的
        })
            .then(response => response.json())
            .then(result => {
                if (result.Msg === 'ok') {
                    // 添加一个永久用户名cookie
                    document.cookie = `username=${usernameInput.value}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                    document.cookie = `uid=${result.Uid}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                    window.location.href = '/select-subject.html';  // todo: 临时导航到科目选择，待定
                } else if (result.Msg === 'admin_ok') {
                    document.cookie = `username=${usernameInput.value}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                    document.cookie = `uid=${result.Uid}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                    window.location.href = '/admin-search.html';  // 导航到检索
                } else {
                    showError('err-modal', 'password-err-text');   // 显示用户名或密码错误
                    submitBtn.disabled = false;
                }
            })
            .catch(error => {
                showError('err-modal', 'network-err-text');    // 显示网络错误
                submitBtn.disabled = false;
            })
    };
});
