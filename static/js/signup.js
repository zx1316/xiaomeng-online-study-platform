document.addEventListener('DOMContentLoaded', function() {
    const successModal = new bootstrap.Modal(document.getElementById('success-modal'));
    const form = document.getElementById("form-signup");
    const usernameInput = document.getElementById("username-input");
    const passwordInput = document.getElementById("password-input");
    const confirmPasswordInput = document.getElementById("confirm-password-input");
    const submitBtn = document.querySelector("button[type='submit']");
    const gotoSignInBtn = document.getElementById("goto-signin-btn");
    const signinLink = document.getElementById("signin-link");

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

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
        const usernameRegex = /^\S{2,20}$/;
        const passwordRegex = /^[!-~]{8,30}$/;
        if (!usernameRegex.test(usernameInput.value)) {
            showError('err-modal', 'username-limit-err-text');   // 显示用户名不符合要求
            return;
        }
        if (!passwordRegex.test(passwordInput.value)) {
            showError('err-modal', 'password-limit-err-text');   // 显示密码不符合要求
            return;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            showError('err-modal', 'password-confirm-err-text'); // 显示确认密码和密码不一致
            return;
        }

        submitBtn.disabled = true;
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },    // 告诉服务器这是一个JSON格式的数据
            body: `{"Username":"${usernameInput.value}","Password":"${passwordInput.value}"}`       // todo: 考虑加密
        })
            .then(response => response.json())
            .then(result => {
                if (result.Msg === 'ok') {
                    successModal.show();
                } else {
                    showError('err-modal', 'username-exist-err-text');   // 显示用户名已被注册
                    submitBtn.disabled = false;
                }
            })
            .catch(error => {
                showError('err-modal', 'network-err-text');    // 显示网络错误
                submitBtn.disabled = false;
            })
    };

    function logoutAndJump() {
        fetch('/logout', {method: 'POST'})
            .then(response => response.text())
            .then(result => {
                window.location.href = '/signin.html';
            })
            .catch(error => {
                window.location.href = '/signin.html';
            })
    }

    gotoSignInBtn.addEventListener("click", logoutAndJump);
    signinLink.addEventListener("click", logoutAndJump);
});
