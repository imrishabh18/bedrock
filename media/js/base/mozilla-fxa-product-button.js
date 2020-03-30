/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// create namespace
if (typeof window.Mozilla === 'undefined') {
    window.Mozilla = {};
}

(function() {
    'use strict';

    var FxaProductButton = {};

    var whitelist = [
        'https://accounts.firefox.com/',
        'https://monitor.firefox.com/',
        'https://getpocket.com/',
        'https://latest.dev.lcip.org/',
        'https://accounts.firefox.com.cn/'
    ];

    var buttons;

    FxaProductButton.isSupported = function() {
        return 'Promise' in window && 'fetch' in window;
    };

    /**
     * Returns the hostname for a given URL.
     * @param {String} url.
     * @returns {String} hostname.
     */
    FxaProductButton.getHostName = function(url) {
        var matches = url.match(/^https?:\/\/(?:[^/?#]+)(?:[/?#]|$)/i);
        return matches && matches[0];
    };

    FxaProductButton.fetchTokens = function() {
        var buttonURL = buttons[0].getAttribute('href');

        // strip url to everything after `?`
        var buttonURLParams = buttonURL.match(/\?(.*)/)[1];

        var destURL = buttons[0].getAttribute('data-action') + 'metrics-flow';

        // collect values from Fxa product button
        var params = window._SearchParams.queryStringToObject(buttonURLParams);

        // add required params to the token fetch request
        destURL += '?entrypoint=' + params.entrypoint;
        destURL += '&form_type=' + params.form_type;
        destURL += '&utm_source=' + params.utm_source;

        // add optional utm params to the token fetch request
        if (params.utm_campaign) {
            destURL += '&utm_campaign=' + params.utm_campaign;
        }

        if (params.utm_content) {
            destURL += '&utm_content=' + params.utm_content;
        }

        if (params.utm_term) {
            destURL += '&utm_term=' + params.utm_term;
        }

        if (params.entrypoint_experiment) {
            destURL += '&entrypoint_experiment=' + params.entrypoint_experiment;
        }

        if (params.entrypoint_variation) {
            destURL += '&entrypoint_variation=' + params.entrypoint_variation;
        }

        return fetch(destURL).then(function(resp) {
            return resp.json();
        }).then(function(r) {
            // add retrieved deviceID, flowBeginTime and flowId values to cta url
            var flowParams = '&deviceId=' + r.deviceId;
            flowParams += '&flowBeginTime=' + r.flowBeginTime;
            flowParams += '&flowId=' + r.flowId;

            // applies url to all buttons and adds cta position
            for (var i = 0; i < buttons.length; i++) {
                var hostName = FxaProductButton.getHostName(buttons[i].href);
                // check if link is in the FxA referral whitelist.
                if (hostName && whitelist.indexOf(hostName) !== -1) {
                    console.log(buttons[i].href += flowParams);
                    buttons[i].href += flowParams;
                }
            }
        }).catch(function() {
            // silently fail: deviceId, flowBeginTime, flowId are not added to url.
        });
    };

    FxaProductButton.init = function() {
        var metrics;
        var dist;

        if (!FxaProductButton.isSupported()) {
            return false;
        }

        // Collect all Fxa product buttons
        buttons = document.getElementsByClassName('js-fxa-product-button');

        // Exit if no valid button in DOM
        if (buttons.length === 0) {
            return;
        }

        dist = new window.Promise(function(resolve) {
            Mozilla.Client.getFirefoxDetails(function(data) {
                // Only switch to China re-pack URL if UITour call is successful
                // (marked by data.accurate being true)
                if (data.accurate && data.distribution && data.distribution.toLowerCase() === 'mozillaonline') {
                    for (var i = 0; i < buttons.length; i++) {
                        var mozillaonlineAction = buttons[i].getAttribute('data-mozillaonline-action');
                        var mozillaonlineLink = buttons[i].getAttribute('data-mozillaonline-link');

                        if (mozillaonlineAction && mozillaonlineLink) {
                            buttons[i].href = mozillaonlineLink;
                            buttons[i].setAttribute('data-action', mozillaonlineAction);
                        }
                    }
                }
                // Add metrics params only once the distribution has been set.
                metrics = new window.Promise(function(resolve) {
                    FxaProductButton.fetchTokens().then(function() {
                        resolve();
                    });
                });

                resolve();
            });
        });

        return window.Promise.all([dist, metrics]);
    };

    window.Mozilla.FxaProductButton = FxaProductButton;
})();

