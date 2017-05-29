/**
 * Record explicit or implicit EU Cookie Policy agreement in localStorage,
 * and hides the cookie policy notice if we have a user agreement.
 * Also tries to detect second pageviews, which count as implicit agreement.
 *
 * @param {Object}   options
 * @param {boolean}  options.navigation - track last page view to detect implicit agreement?
 * @param {Array}    options.ignoreUrls - URLs that should not count as a page view
 *
 * @returns {CookiePolicyManager} manager
 * @typedef CookiePolicyManager
 * @type {object}
 * @property {Function} status - Show cookie agreement status
 * @property {Function} action - Provide a function to call on user agreement
 * @property {Function} update - Update cookie agreement status
 * @property {Function} clear  - Remove user data
 */
function CookiePolicyManager(options) {
  'use strict';

  var AGREEMENT_TYPES = {
    'deny': false,
    'explicit': true,
    'implicit': true
  };
  var AGREEMENT_KEY = 'cpm-agree';
  var PAGEVIEW_KEY = 'cpm-prev';

  // Chek that localStorage is usable
  var LS = testStorage('local');

  // Default settings
  var settings = {
    navigation: false,
    ignoreUrls: []
  };

  // Action queue
  var actions = [];

  // Merge settings
  if (typeof options === 'object') {
    for (var key in settings) {
      if (settings.hasOwnProperty(key) && typeof options[key] === typeof settings[key]) {
        settings[key] = options[key];
      }
    }
  }

  // Check if we have a "page navigation" implicit agreement,
  // and record current page URL
  // for the next page view. We clean up after ourselves if we have an agreement.
  if (settings.navigation) checkNavigation();

  return {
    status: showAgreementStatus,
    action: addAgreementAction,
    update: updateAgreement,
    clear: clearUserData
  };

  /**
   * Reads localStorage and returns a type and subtype of agreement
   * @returns { {type:string, subType:string, rawValue:string} }
   */
  function getAgreementValue() {
    var types = decodeTypes(remember(AGREEMENT_KEY));
    var allowed = AGREEMENT_TYPES[types[0]];
    return {
      allowed: typeof allowed === 'boolean' ? allowed : false,
      type: types[0],
      subType: types[1]
    };
  }

  /**
   * Add a callback to the queue or execute immediately
   * @param {function} callback
   */
  function addAgreementAction(callback) {
    if (typeof callback !== 'function') {
      throw 'callback must be a function, was: ' + typeof callback;
    }
    if (actions.indexOf(callback) === -1) {
      actions.push(callback);
      callMeMaybe();
    }
  }

  /**
   * Public - update the agreement info or clear recorded data
   * @param {string} type
   * @param {string|undefined} subType
   */
  function updateAgreement(type, subType) {
    type = (typeof type === 'string') ? type.trim().toLowerCase() : '';
    subType = (typeof subType === 'string') ? subType.trim().toLocaleLowerCase() : '';
    if (typeof AGREEMENT_TYPES[type] !== 'boolean') {
      throw 'type must be one of "' + Object.keys(AGREEMENT_TYPES).join('", "') + '"';
    }
    // Don't override 'deny' or 'explicit' with an 'implicit' value,
    // but avoid throwing in this situation
    var prev = getAgreementValue();
    if (type === 'implicit' && prev.type !== '' && prev.type !== type) {
      'console' in window && console.log('Ignored implicit agreement. Current type: "'
      + encodeTypes(prev.type, prev.subType) + '"');
    }
    else {
      remember(AGREEMENT_KEY, encodeTypes(type, subType));
    }
    callMeMaybe();
  }

  /**
   * Remove all user data (localStorage or cookie, sessionStorage)
   */
  function clearUserData() {
    remember(AGREEMENT_KEY, '');
    try { sessionStorage.removeItem(PAGEVIEW_KEY) } catch(e) {}
  }

  /**
   * Public - show current status of the user's consent to cookie use
   */
  function showAgreementStatus() {
    var value = getAgreementValue();
    return {
      allowed: value.allowed,
      because: encodeTypes(value.type, value.subType)
    };
  }

  /**
   * Run the each callback function if we have an agreement, and only once
   */
  function callMeMaybe() {
    if (getAgreementValue().allowed) {
      actions.forEach(function(action){ action() });
      actions = [];
    }
  }

  /**
   * Store the current URL in sessionStorage and/or check existing data
   * to determine if we have an implicit "navigation"-type agreement.
   * (Note that we're stripping the hashes when comparing URLs.)
   */
  function checkNavigation() {
    if (!testStorage('session') || getAgreementValue().type !== '') {
      return;
    }
    var url = location.href.split('#')[0];
    var prev = (sessionStorage.getItem(PAGEVIEW_KEY) || '').split('#')[0];
    var ignore = settings.ignoreUrls.map(function(s){
      return s.split('#')[0];
    });
    // We have a different recorded previous page
    if (prev !== '' && prev !== url && ignore.indexOf(url) === -1) {
      updateAgreement('implicit', 'navigation');
      sessionStorage.removeItem(PAGEVIEW_KEY);
    }
    else {
      sessionStorage.setItem(PAGEVIEW_KEY, location.href);
    }
  }

  /**
   * Simple utility to set or get a localStorage value, falling back to a cookie
   * in case localStorage is blocked (especially in Safari Private Browsing mode).
   * Cookie reading implementation from:
   * https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie/Simple_document.cookie_framework
   * @param {string} key
   * @param {string|undefined} [value] - new value (empty string to unset)
   */
  function remember(key, value) {
    // one week tops for the cookie fallback
    var COOKIE_MAX = 7 * 24 * 3600;
    var LS = typeof LS === 'boolean' ? LS : testStorage('local');
    if (value === '') {
      if (LS) localStorage.removeItem(key);
      else document.cookie = key + '=;max-age=0';
      return;
    }
    else if (typeof value === 'string') {
      if (LS) localStorage.setItem(key, value);
      else document.cookie = key + '=' + encodeURIComponent(value) + ';max-age=' + COOKIE_MAX;
      return;
    }
    return LS
      ? localStorage.getItem(key)
      : decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(key).replace(/[\-.+*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null
  }

  /**
   * Test either localStorage or sessionStorage support
   * @param {object} name - storage name
   */
  function testStorage(name) {
    try {
      var x = 'cpm-test';
      var store = window[name + 'Storage'];
      store.setItem(x, x);
      store.removeItem(x);
      return true;
    } catch(err) {
      return false;
    }
  }

  /**
   * Make sure we always convert type and subtype to a single string format
   * @param {string} type
   * @param {string} subType
   * @returns {string}
   */
  function encodeTypes(type, subType) {
    return type + (subType ? '/' + subType : '')
  }

  /**
   * Make sure we always read type/subtype strings in the same way
   * @param {string} raw
   * @returns {Array}
   */
  function decodeTypes(raw) {
    var details = (raw || '').split('/');
    return [details[0], details.length ? details[1] : '']
  }

}
