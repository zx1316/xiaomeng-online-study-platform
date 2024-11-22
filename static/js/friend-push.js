const socket = io('/friend');
let flag = false
let pendingFriendUid;
const newFriendModalText = document.getElementById('new-friend-modal-text');
const confirmAddFriendBtn = document.getElementById('confirm-add-friend-btn');

document.getElementById('new-friend-modal').addEventListener('hide.bs.modal', () => {
    flag = false;
    console.log('close');
});

confirmAddFriendBtn.addEventListener('click', () => {
    socket.emit('friend_request_feedback', {"Uid": pendingFriendUid});
});

socket.on('friend_request', (data) => {
    if (!flag) {
        flag = true;
        pendingFriendUid = data.Uid;
        // 显示模态框
        newFriendModalText.innerText = `${data.Username}（UID：${data.Uid}）请求添加您为好友。`;
        const modal = new bootstrap.Modal(document.getElementById('new-friend-modal'));
        modal.show();
    }
});
