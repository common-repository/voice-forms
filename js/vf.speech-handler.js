// *****************************************************************************************************
// *******              speak2web VOICE FORMS                                                ***********
// *******               Get your subscription at                                            ***********
// *******                    https://speak2web.com/plugin#plans                             ***********
// *******               Need support? https://speak2web.com/support                         ***********
// *******               Licensed GPLv2+                                                     ***********
//******************************************************************************************************

// Cross browser 'trim()' funtion support
if (typeof String.prototype.trim !== 'function') { String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); } }

var respTimeOut = false;
var errcnt = 0;
let vfHostName = typeof (vf.vfCurrentHostName) != 'undefined' ? vf.vfCurrentHostName : null;

/**
 * An audio player handler Object
 *
 */
var vfAudioPlayer = {
    'htmlAudioElement': document.createElement('AUDIO'),
    'lastFilePath': null,
    'antiMuteButtonPlaybacks': [vfSilenceSoundPath],
    'isAntiMutePlayback': false,
    'configure': function (filePath = null, playbackEndedCallback = null) {
        try {
            let pathOfFile = typeof filePath != 'undefined' && filePath ? filePath : null;

            if (pathOfFile) {
                let partialFilePath = !!vfIsMuteSimon ? vfSilenceSoundPath : pathOfFile;
                this.htmlAudioElement.src = vf._vfPath + partialFilePath;
                this.htmlAudioElement.preload = 'auto';
                this.lastFilePath = pathOfFile;

                if (this.antiMuteButtonPlaybacks.indexOf(pathOfFile) !== -1) {
                    this.isAntiMutePlayback = true;
                } else {
                    this.isAntiMutePlayback = false;
                }
            } else {
                this.htmlAudioElement.src = '';
                this.isAntiMutePlayback = false;
            }

            /**
             * The play event occurs when the audio has been started or is no longer paused.
             */
            this.htmlAudioElement.onplay = function () {
                // Do nothing for now
            }.bind(this);

            /**
             * The ended event occurs when the audio has reached the end.
             */
            this.htmlAudioElement.onended = function () {
                this.htmlAudioElement.src = ''
                this.isAntiMutePlayback = false;

                // Callback to be executed when video playback ends
                if (pathOfFile && (typeof playbackEndedCallback === "function")) {
                    playbackEndedCallback();
                    playbackEndedCallback = null;
                }
            }.bind(this);

            /**
             * The error event occurs when an error occurred during the loading of an audio
             */
            this.htmlAudioElement.onerror = function () {
                this.isAntiMutePlayback = false;
            }.bind(this);

            /**
             * The playing event occurs when the audio is playing after having been paused or stopped for buffering.
             */
            this.htmlAudioElement.onplaying = function () {
                // Do nothing for now
            }.bind(this);
        } catch (err) {
            this.clear();
            this.isAntiMutePlayback = false;
        }
    },
    'play': function () {
        try {
            if (this.htmlAudioElement && !!this.htmlAudioElement.src) {
                this.htmlAudioElement.play().catch(function (error) {
                    console.log('VDN Exception: Failed to play audio.');
                });
            }
        } catch (err) {
            this.clear();
        }
    },
    'stop': function () {
        try {
            this.clear();
        } catch (err) {
            this.clear();
        }
    },
    'clear': function () {
        try {
            if (this.htmlAudioElement) {
                let duration = isNaN(this.htmlAudioElement.duration) ? 0 : this.htmlAudioElement.duration;
                this.htmlAudioElement.currentTime = duration;
            }

            this.lastFilePath = null;
        } catch (err) {
            this.lastFilePath = null;
            this.isAntiMutePlayback = false;
        }
    },
    'isPlaying': function () {
        let currentTime = isNaN(this.htmlAudioElement.currentTime) ? 0 : this.htmlAudioElement.currentTime;
        let duration = isNaN(this.htmlAudioElement.duration) ? 0 : this.htmlAudioElement.duration;

        return currentTime < duration;
    }
};

function stt(blob, errorRecovery, cb) {
    if (errorRecovery == false) {
        let i = Math.floor(Math.random() * 10);
        let resp = vfAlternativeResponse['randomLib'];

        if (respTimeOut == false) {
            // Play 'random' playback
            vfAudioPlayer.configure(resp[i]);
            vfAudioPlayer.play();

            respTimeOut = true;

            setTimeout(function () {
                respTimeOut = false;
            }, 6000);
        }
    }

}

/**
 * Function to make asynch call to GCP server for STT
 *
 * @param String base64AudioStr  Base64 String representation of Audio Blob
 * @retur Promise
 *
 */
function vfGcpStt(base64AudioStr) {
    return new Promise(function (resolve, reject) {
        if (!(
            !!vfSttLanguageContext['gcp']['endPoint'] &&
            !!vfSttLanguageContext['gcp']['key'] &&
            !!vfSttLanguageContext['gcp']['langCode'] &&
            typeof base64AudioStr != 'undefined' &&
            !!base64AudioStr
        )) {
            reject(null);
            return;
        }

        let vfXhr = new XMLHttpRequest();

        vfXhr.onreadystatechange = function () {
            if (this.readyState == 4) {
                try {
                    let res = JSON.parse(this.response);

                    if (this.status === 200) {
                        errcnt = 0;
                        let results = typeof res != 'undefined' && res instanceof Object && 'results' in res ? res['results'] : [];
                        let efficientResult = !!results && results.length > 0 && results[0] instanceof Object ? results[0] : {};
                        let alternatives = 'alternatives' in efficientResult && !!efficientResult['alternatives'] ? efficientResult['alternatives'] : [];
                        let alternativeObj = alternatives.length > 0 && alternatives[0] instanceof Object ? alternatives[0] : {};
                        let transcript = 'transcript' in alternativeObj && !!alternativeObj['transcript'] ? alternativeObj['transcript'] : null;

                        if (typeof transcript != 'undefined' && !!transcript) {
                            resolve(transcript);
                        } else {
                            reject(null);
                        }
                    } else {
                        // Handle response errors
                        let error = 'error' in res ? res['error'] : {};
                        let message = 'message' in error && !!error['message'] ? error['message'].toLowerCase() : '';

                        if (errcnt < 1 && !!message && message.indexOf('api key') !== -1) {
                            errcnt++;

                            //$$$$$$$$$$$$$$$ FETCH NEW TOKEN MIGHT HAVE EXPIRED $$$$$$$$$$$$$$$$$$
                            vfRefreshVoiceServicesKeys().then(function (result) {
                                vfSttLanguageContext['gcp']['key'] = result;

                                // Try to transcript again with updated key
                                vfGcpStt().then(function (res) {
                                    if (!!res) {
                                        resolve(res);
                                    } else {
                                        errcnt = 0;
                                        reject(null);
                                    }
                                }).catch(function (err) {
                                    errcnt = 0;
                                    reject(null);
                                })
                            }).catch(function (error) {
                                alert(error);
                                errcnt = 0;
                                reject(null);
                            });
                        } else {
                            errcnt = 0;
                            if (errcnt == 0) {
                                let i = Math.floor(Math.random() * 10);
                                let resp = vfAlternativeResponse['randomLib'];

                                // Play 'random' playback
                                vfAudioPlayer.configure(resp[i]);
                                vfAudioPlayer.play();
                            }
                            reject(null);
                        }
                    }
                } catch (err) {
                    reject(null);
                }
            }
        }

        // Handle parsing or transmission errors
        vfXhr.onerror = function (error) { reject(null); }

        vfXhr.open("POST", vfSttLanguageContext['gcp']['endPoint'] + vfSttLanguageContext['gcp']['qs']['key'] + vfSttLanguageContext['gcp']['key'], true);
        vfXhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        let recognitionConfig = {
            'config': {
                'encoding': 'ENCODING_UNSPECIFIED',
                'languageCode': vfSttLanguageContext['gcp']['langCode'],
                'enableWordTimeOffsets': false,
            },
            'audio': {
                'content': base64AudioStr
            },
        };

        vfXhr.send(JSON.stringify(recognitionConfig, null, true));
    })
}

/**
 * Function to log STT service call
 *
 * @param {vfUpdateLastValue - int/Number} : 0 to not to update last value or 1 to update last value
 */
function vfLogServiceCall(vfUpdateLastValue = 0) {
    try {
        let vfXhr = new XMLHttpRequest();

        vfXhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                let res = JSON.parse(this.responseText);

                // Update localized variables of service log 
                vfServiceLogs.updatedAt = res.updatedAt || vfServiceLogs.updatedAt;
                vfServiceLogs.currentValue = res.currentValue || vfServiceLogs.currentValue;
                vfServiceLogs.lastValue = res.lastValue || vfServiceLogs.lastValue;
            }
        };

        vfXhr.open("POST", vfAjaxObj.ajax_url, true);
        vfXhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        vfXhr.send("action=vf_log_service_call&_ajax_nonce=" + vfAjaxObj.nonce + "&updateLastValue=" + vfUpdateLastValue);
    } catch (err) {
        // Do nothing for now
    }
}

/**
 * Function to get current host/domain full URL
 *
 */
function vfGetCurrentHostURL() {
    var currentHostUrl = null;
    try {
        if (!(typeof (window.location) != 'undefined'
            && typeof (window.location.hostname) != 'undefined'
            && typeof (window.location.protocol) != 'undefined')) {
            return vfGetHostName();
        }

        var thisProtocol = window.location.protocol;
        var thisHostname = window.location.hostname;

        currentHostUrl = thisProtocol + '//' + thisHostname;
    } catch (err) {
        currentHostUrl = vfGetHostName();
        console.log('Something went wrong while discovering current domain.');
    }

    return currentHostUrl;
}

/**
 * Function to get current host name from backend.
 */
function vfGetHostName() {
    return vfHostName;
}

/**
 * Function to obtain voice services token and keys
 *
 */
function vfRefreshVoiceServicesKeys() {
    return new Promise(function (resolve, reject) {
        let vfXhr = new XMLHttpRequest();

        vfXhr.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status === 200) {
                    let res = JSON.parse(this.response);

                    if (typeof res == 'undefined') reject(vfErrorLibrary['outOfService']);

                    if (!!vfSttLanguageContext['gcp']['stt'] && 'gStt' in res && !!res['gStt']) {
                        resolve(res['gStt']);
                        return;
                    }

                    reject(vfErrorLibrary['outOfService']);
                } else {
                    // Handle response errors
                    reject(vfErrorLibrary['outOfService']);
                }
            }
        };

        let queryString = "?action=vf_refresh_access_keys&_ajax_nonce=" + vfAjaxObj.keys_nonce;
        vfXhr.open("GET", vfAjaxObj.ajax_url + queryString, true);

        // Handle parsing or transmission errors
        vfXhr.onerror = function (error) { reject(vfErrorLibrary['outOfService']); }
        vfXhr.send(null);
    });
}

/**
 * Function to sanitize/smartly format email to avoid text in a place of anticipated symbols
 *
 * @param { emailString: String } Email string to be formatted
 *
 * @returns { formattedEmail: String } Smartly formatted/sanitized email.
 */
function vfFormatEmail(emailString = null) {
    let formattedEmail = emailString;
    try {
        if (emailString && emailString !== null) {
            let vfEmail = emailString.toLowerCase();
            vfEmail = vfEmail.replace(/dot/gi, ".")
                .replace(/at/gi, "@")
                .replace(/underscore/gi, "_")
                .replace(/dotcom/gi, ".com")
                .replace(/dotorg/gi, ".org")
                .replace(/dotnet/gi, ".net")
                .replace(/dotint/gi, ".int")
                .replace(/dotedu/gi, ".edu")
                .replace(/ /g, "");

            formattedEmail = vfEmail;
        }
    } catch (err) {
        formattedEmail = emailString;
    }

    return formattedEmail;
}

