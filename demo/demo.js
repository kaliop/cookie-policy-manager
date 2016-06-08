void function(){

    var notice = document.querySelector('.CookieNotice');
    var infoLink = notice.querySelector('.CookieNotice-more');
    var closeBtn = notice.querySelector('.CookieNotice-close');

    var manager = CookiePolicyManager({
        navigation: true,
        ignoreUrls: infoLink && [infoLink.href]
    });

    // Will be called immediately if we already have an agreement
    manager.action(function() {
        notice.parentNode.removeChild(notice);
    });

    // CookieNotice is hidden by default in our example,
    // so we only make it visible if we need to.
    if (manager.status().allowed === false) {
        closeBtn && closeBtn.addEventListener('click', function(){
            manager.update('explicit', 'close-button');
        });
        notice.removeAttribute('hidden');
    }

    // Making the manager public so you can play with it in the console,
    // or call it from different places. (e.g. cookiepm.status())
    window.cookiepm = manager;

}();
