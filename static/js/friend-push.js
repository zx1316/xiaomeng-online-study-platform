const socket = io('/friend');
let newFriendFlag = false;
let newBattleFlag = false;
let pendingFriendUid;
let pendingBattleUid;
const newFriendModalText = document.getElementById('new-friend-modal-text');
const confirmAddFriendBtn = document.getElementById('confirm-add-friend-btn');
const friendBattleRequestModalText = document.getElementById('friend-battle-request-modal-text');
const rejectFriendBattleBtn = document.getElementById('reject-friend-battle-btn');
const acceptFriendBattleBtn = document.getElementById('accept-friend-battle-btn');

document.getElementById('new-friend-modal').addEventListener('hide.bs.modal', () => {
    newFriendFlag = false;
});

document.getElementById('friend-battle-request-modal').addEventListener('hide.bs.modal', () => {
    newBattleFlag = false;
});

confirmAddFriendBtn.addEventListener('click', () => {
    socket.emit('friend_request_feedback', {"Uid": pendingFriendUid});
});

rejectFriendBattleBtn.addEventListener('click', () => {
    socket.emit('friend_battle_feedback', {"Uid": pendingBattleUid, "Answer": "no"});
});

acceptFriendBattleBtn.addEventListener('click', () => {
    socket.emit('friend_battle_feedback', {"Uid": pendingBattleUid, "Answer": "yes"});
});

socket.on('friend_request', (data) => {
    if (!newFriendFlag) {
        newFriendFlag = true;
        pendingFriendUid = data.Uid;
        // 显示模态框
        newFriendModalText.innerText = `${data.Username}（UID：${data.Uid}）请求添加您为好友。`;
        new bootstrap.Modal(document.getElementById('new-friend-modal')).show();
    }
});

socket.on('friend_battle_request', (data) => {
    if (!newBattleFlag) {
        newBattleFlag = true;
        pendingBattleUid = data.Uid;
        friendBattleRequestModalText.innerText = `${data.Username}（UID：${data.Uid}）想与你进行对战，科目为《${data.Subject}》，是否接受？<br>若点击接受后无反应，说明请求超时。`;
        new bootstrap.Modal(document.getElementById('friend-battle-request-modal')).show();
    }
});

socket.on('friend_battle_permit', (data) => {
    if (data.Answer === 'yes') {
        window.open('battle-friend.html', '_blank');
    }
});
