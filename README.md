# CookiePolicyManager

This script helps you manage the requirements of EU cookie regulations, while enabling you to provide a good user experience. It enables:

1. Saving and retrieving information about the user’s choice (info is saved locally using localStorage or… a cookie).
2. Detecting user navigation to a second page, which counts as implicit consent *provided you have shown a notice to the user*.
3. Executing one or several functions (callbacks) *when* the user consents to tracking cookies, *or* on page load if consent was already given and recorded.

This script does *not* provide a user interface, such as a cookie “banner”. You will have to build your own UI, and write a JS script for basic features such as showing or hiding the UI, adding event listeners to buttons, etc. If that looks intimidating, you can [look at our demo][DEMO] for inspiration.

Read more about the legal side: [gov.uk guide][GOV_UK_GUIDE] and [CNIL guide (in French)][CNIL_GUIDE].

## Usage

These examples use native JavaScript (and DOM) methods, but you can convert to jQuery-based code if you like it better. Basic usage of `CookiePolicyManager` might look like this: 

```js
var cookiepm = CookiePolicyManager({ navigation: true });

// Hide the banner on user agreement (or immediately)
cookiepm.action(function(){
    document.querySelector('.CookieNotice').setAttribute('hidden', '');
});
```

This only hides the banner when we detect a second page navigation (and on page views after that). If you want to provide a button for closing the banner (and registering the user choice), you will need to add an event listener:

```js
document.querySelector('.CookieNotice button').addEventListener('click', function(){
    cookiepm.update('explicit', 'close button');
});
```

You can register additional actions:

```js
cookiepm.action(function(){
    // For instance: copy Google Analytics code here,
    // to only use Analytics AFTER implicit or explicit
    // user agreement. (It’s a legal requirement!)
});
```

What if you want to give users a way to opt out? Let’s say that you have a “Legal notice” or “Privacy policy” page, and you want to create a button for denying tracking there:

```
var denyButton = document.querySelector('#refuse-cookies');
denyButton && denyButton.addEventListener('click', function(){
    cookiepm.update('deny', 'deny-button');
});
```

Want to see a different example? Look at [our demo’s script][DEMO_JS].

## Options and methods

The `CookiePolicyManager` function takes an optional object of configuration with the following options:

-   `navigation` (defaults to `false`): whether to automatically check for more than one page view in the same session (which counts as explicit agreement under EU policies).
-   `ignoreUrls` (defaults to `[]`): an array of URLs which should not count as page views for implicit agreement (typically, the "more info about cookies" page should not count for the `navigation` mechanism).

And it returns an object with these methods:

-   `action(callback)`: add a callback function to be called immediately (if we already have a user agreement) or when we get the user's agreement.

-   `update(type, subType)`: saves information on user agreement in localStorage.
    - `type` must be a string with one of those values: `'deny'`, `'explicit'` or `'implicit'`.
    - `subType` can be a string, with any value you like (use it to store additional information on the “source” of user agreement).

-   `status()`: shows saved information on user agreement for this user, with two properties:
    - `allowed` (boolean)
    - `because` (string: type and subtype of user agreement)

-   `clear()`: remove all saved information on user agreement for this browser (localStorage or cookie, sessionStorage if any).


## FAQ (Nobody asked these yet but they might!)

### I made a cookie banner but it flashes briefly before hiding

Like any HTML content, it can be rendered by the browser before your script has the chance to hide it. This means it can flash briefly or even be displayed for one or two seconds in some situations. You could make sure the banner is hidden by default, e.g. using the `hidden` attribute.

```html
<aside class="CookieNotice" hidden>
    …
</aside>
```

And then remove the `hidden` attribute if the `cookiepm.status().allowed` property is false. See [the demo script][DEMO_JS] for an example of that behavior.

### I’m calling update() but my banner is still there

Are you calling `CookiePolicyManager().update('explicit', 'something')`?

Every time you call `CookiePolicyManager()`, you get a new object with its own action queue. So the code in the previous paragraph will save the provided information in localStorage (good), but it will execute an empty action queue.

If you need to use `CookiePolicyManager` from several scripts, add to its action queue, etc., you should create one instance and expose it globally:

```js
// cookie-policy.js
window.myCPM = CookiePolicyManager(options);

// marketing-automation.js
myCPM.action(function(){ /* do something */ });
```

### Safari in Private Browsing doesn’t detect page views

In Private Browsing mode, Safari (on iOS at least) doesn’t allow access to localStorage or sessionStorage. We can store the user choice in a cookie, but detecting the navigation relies on sessionStorage, so it’s disabled.

### So this solution relies on JavaScript?

Yep. This shouldn’t be an issue because all tracking, analytics etc. tools targetted by the EU regulations tend to be JavaScript-only, too, so if a user has disabled JS your probably respect EU regulations already. Note that session cookies, authentification cookies and shopping cart cookies are always valid and require no consent.

[DEMO]: https://kaliop.github.io/cookie-policy-manager/demo/
[DEMO_JS]: https://kaliop.github.io/cookie-policy-manager/demo/demo.js
[GOV_UK_GUIDE]: https://www.gov.uk/service-manual/making-software/cookies
[CNIL_GUIDE]: https://www.cnil.fr/fr/cookies-traceurs-que-dit-la-loi
