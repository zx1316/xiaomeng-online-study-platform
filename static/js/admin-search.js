let currentPage = 1, totalPage = 0;
let keywordsStr = '', subjectIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger')
    const userDropdownMenu = document.getElementById('user-dropdown-menu')
    userDropdownTrigger.addEventListener('shown.bs.dropdown', () => {
        const rect = userDropdownMenu.getBoundingClientRect()
        if (rect.x + rect.width > window.innerWidth) {
            userDropdownMenu.style.transform = `translateX(${window.innerWidth - rect.x - rect.width}px)`
        }
    })
    userDropdownTrigger.addEventListener('hidden.bs.dropdown', () => {
        userDropdownMenu.style.transform = 'none'
    })
})