// *****************************************************************************************************
// *******              speak2web VOICE FORMS                                                ***********
// *******               Get your subscription at                                            ***********
// *******                    https://speak2web.com/plugin#plans                             ***********
// *******               Need support? https://speak2web.com/support                         ***********
// *******               Licensed GPLv2+                                                     ***********
//******************************************************************************************************
window.onload = (event) => {
    (function () {
        'use strict';

        // Auto timeout duration to stop listening Mic
        var vfMicListenAutoTimeoutDuration = null;
        let vfOtherInputTimeoutDuration = null;
        let vfTextareaTimeoutDuration = 20 * 1000;

        if (typeof (vf.vfMicListenTimeoutDuration) != 'undefined' && vf.vfMicListenTimeoutDuration !== null) {
            vfOtherInputTimeoutDuration = parseInt(vf.vfMicListenTimeoutDuration);
            vfOtherInputTimeoutDuration = isNaN(vfOtherInputTimeoutDuration) ? 8 : vfOtherInputTimeoutDuration;
        } else {
            vfOtherInputTimeoutDuration = 8;
        }

        vfOtherInputTimeoutDuration = (vfOtherInputTimeoutDuration < 8) ? 8 : vfOtherInputTimeoutDuration;
        vfOtherInputTimeoutDuration = (vfOtherInputTimeoutDuration > 20) ? 20 : vfOtherInputTimeoutDuration;
        vfOtherInputTimeoutDuration = vfOtherInputTimeoutDuration * 1000;

        /**
         * Function to clear mic reset timeout
         *
         */
        function vfClearMicResetTimeout() {
            try {
                if (window.vfMicTimeoutIdentifier) {
                    clearTimeout(window.vfMicTimeoutIdentifier);
                    window.vfMicTimeoutIdentifier = null;
                }
            } catch (err) {
                // Do nothing for now
            }
        }

        // sanitize alpha-numeric css values to get numeric value
        function getNumber(number) {
            number = parseInt(number, 10);
            return isNaN(number) || number === null || typeof (number) === 'undefined' ? 0 : number;
        }

        // Function to check if any mic already listening
        function vfAnyOtherMicListening(vfExceptionBtnId = null) {
            var vfOneOfMicListening = false;
            try {
                var vfAllMicButtons = document.querySelectorAll('button.voice-forms-button');

                if (typeof (vfAllMicButtons) == 'undefined'
                    || vfAllMicButtons === null
                    || vfExceptionBtnId == null) { return vfOneOfMicListening; }

                for (var vfI = 0; vfI < vfAllMicButtons.length; vfI++) {
                    var vfClassNames = vfAllMicButtons[vfI].className;
                    var vfBtnId = vfAllMicButtons[vfI].getAttribute('id');

                    if (!(typeof (vfClassNames) != 'undefined' && vfClassNames.trim() != '')) continue;

                    if (vfClassNames.indexOf('listening') != -1 && vfExceptionBtnId != vfBtnId) {
                        vfOneOfMicListening = true;
                        break;
                    }
                }
            } catch (err) {
                vfOneOfMicListening = false;
            }

            return vfOneOfMicListening;
        }

        // Clear any pre-existing timeouts
        vfClearMicResetTimeout();

        var typeOfInputFieldsToSeek = ['text', 'email', 'search'];

        var vfMicEventToListen = 'click';
        // Detect Android OS
        var ua = navigator.userAgent.toLowerCase();
        var isAndroid = ua.indexOf("android") > -1;

        var speechInputWrappers = document.querySelectorAll('form');// Get all forms on a page
        let formElementForWidget = null;

        [].forEach.call(speechInputWrappers, function (speechInputWrapper, index) {
            try {
                // Try to show the form temporarily so we can calculate the sizes
                var speechInputWrapperStyle = speechInputWrapper.getAttribute('style');
                var havingInlineStyle = (typeof (speechInputWrapperStyle) != 'undefined'
                    && speechInputWrapperStyle !== null && speechInputWrapperStyle.trim() !== '') ? true : false;
                speechInputWrapperStyle = (havingInlineStyle) ? speechInputWrapperStyle + ';' : '';
                speechInputWrapper.setAttribute('style', speechInputWrapperStyle + 'display: block !important');
                // speechInputWrapper.classList.add('voice-forms-wrapper');
                speechInputWrapper.classList.add('vf-sanitize-form-wrapper');

                let isSearchForm = false;
                var recognizing = false;
                let roleOfForm = speechInputWrapper.getAttribute('role') || "";
                let classesOfForm = speechInputWrapper.classList;
                let allInputElements = speechInputWrapper.querySelectorAll('input:not([type=hidden]):not([style*="none"]), button[type=submit], textarea:not([style*="none"])');

                if (roleOfForm.toLowerCase() === 'search' || classesOfForm.contains('searchform')
                    || classesOfForm.contains('search_form') || classesOfForm.contains('search-form')
                    || classesOfForm.contains('searchForm')) {
                    isSearchForm = true;
                }

                // Preserve first form on page and it's input element for widget
                if (index == 0) {
                    formElementForWidget = speechInputWrapper;
                }

                [].forEach.call(allInputElements, function (inputElement, inputIndex) {
                    var inputEl = null;
                    let inputType = inputElement.getAttribute('type') || "";
                    let classesOfInput = inputElement.className || "";
                    let idOfInputElement = inputElement.getAttribute('id') || null;
                    let tagNameOfInputElement = inputElement.tagName;

                    if (idOfInputElement && idOfInputElement !== null) {
                        idOfInputElement = idOfInputElement.toLowerCase();
                    }

                    if (classesOfInput && classesOfInput !== null) {
                        classesOfInput = classesOfInput.toLowerCase();
                    }

                    // Check if input marked with keywords related to date
                    let isDateField = false;

                    // Check for search form
                    if (classesOfInput.indexOf('datepicker') !== -1
                        || classesOfInput.indexOf('date') !== -1
                        || idOfInputElement === 'datepicker'
                        || idOfInputElement === 'date') {
                        isDateField = true;
                    }

                    // check if input field is intented for date picking
                    if (classesOfInput.indexOf('datepicker') === -1
                        && idOfInputElement !== 'datepicker'
                        && classesOfInput.search(/validat|candidat/ig) !== -1) {
                        isDateField = false;
                    }

                    // check if text field is intended for email
                    if (inputType === 'text' && classesOfInput.search(/email/ig) !== -1) {
                        inputType = 'email';
                    }

                    // Check textarea/large input box
                    let isTextArea = (tagNameOfInputElement.toLowerCase() === 'textarea') ? true : false;
                    vfMicListenAutoTimeoutDuration = isTextArea == true ? vfTextareaTimeoutDuration : vfOtherInputTimeoutDuration;

                    if ((typeOfInputFieldsToSeek.includes(inputType) && isDateField == false) || isTextArea == true) {
                        inputEl = inputElement;
                    } else if (inputType.toLowerCase() == 'submit') {
                        // Restrict form submission if mic is recording
                        speechInputWrapper.addEventListener('submit', function (event) {
                            if (recognizing == true) {
                                event.preventDefault();
                            }
                        }, false);

                        // Remove any overlapping icon from submit button of search form
                        if (isSearchForm === true) {
                            try {
                                let submitButtonChildNodes = inputElement.querySelectorAll('img, svg');

                                for (let j = 0; j < submitButtonChildNodes.length; j++) {
                                    let submitBtnChildNode = submitButtonChildNodes[j];
                                    submitBtnChildNode.classList.add('vf-hide-element');
                                }
                            } catch (err) {
                                // do nothing for now
                            }
                        }
                    }

                    // If search input field not found then continue
                    if (null === inputEl) { return true; }

                    // Adding manual mic position on specified input fields 
                    if (vfIsMicInputField == false) {
                        var inputFieldPlaceholder = inputEl.placeholder;
                        if (inputFieldPlaceholder.includes("{allow_stt}") == true) {
                            inputEl.placeholder = inputFieldPlaceholder.replace("{allow_stt}", "");
                        } else if (vfDisableSearchField == false && isSearchForm == true) {

                        } else return true;
                    } else {
                        var inputFieldPlaceholder = inputEl.placeholder;
                        if (inputFieldPlaceholder.includes("{allow_stt}") == true) {
                            inputEl.placeholder = inputFieldPlaceholder.replace("{allow_stt}", "");
                        }
                    }

                    // Add some markup as a button to the search form
                    var micBtn = document.createElement('button');
                    micBtn.setAttribute('type', 'button');
                    micBtn.setAttribute('class', 'voice-forms-button');
                    micBtn.setAttribute('id', 'voice-forms-button' + inputIndex);
                    micBtn.appendChild(document.createTextNode(voice_forms.button_message));

                    // Add mic image icon
                    var vfMicIcon = document.createElement('img');
                    vfMicIcon.setAttribute('src', vf.vfImagesPath + 'vf_mic.svg');
                    vfMicIcon.setAttribute('class', 'vf-mic-image');

                    micBtn.appendChild(vfMicIcon);

                    var inputHeight = getNumber(inputEl.offsetHeight);// Get search input height
                    var buttonSize = getNumber(0.8 * inputHeight);

                    // Set default mic button size to 35px when button size calculated to 0 or unknown
                    if (getNumber(buttonSize) == 0) { inputHeight = buttonSize = 35; }

                    var micbtnPositionTop = getNumber(0.1 * inputHeight);

                    // For textarea/large input
                    if (isTextArea === true) {
                        micbtnPositionTop = 10;
                        buttonSize = 35;
                    }

                    // Size and position of complete mic button
                    var inlineStyle = 'top: ' + micbtnPositionTop + 'px; ';
                    inlineStyle += 'height: ' + buttonSize + 'px !important; ';
                    inlineStyle += 'width: ' + buttonSize + 'px !important; ';
                    inlineStyle += 'z-index: 999 !important; margin-left: 3px !important; border-radius: 50% !important; border: 2px solid #ffff !important;';
                    micBtn.setAttribute('style', inlineStyle);

                    // Create Wrapper to wrap around input search field like a elastic band
                    var wrapper = document.createElement('div');
                    wrapper.setAttribute('style', speechInputWrapperStyle + 'display: inline-block !important');

                    let inputCurrentStyle = window.getComputedStyle(inputEl);
                    wrapper.setAttribute('class', 'vf-mic-band');
                    wrapper.setAttribute('onclick', 'return false');
                    wrapper.style.width = inputCurrentStyle.width;
                    inputEl.insertAdjacentElement('beforebegin', wrapper);// Place wrapper before input search field

                    // Set parent element's (parent of inputEl) display stack order higher 
                    // To handle overlapped submit button on mic icon
                    var parentEl = inputEl.parentNode.nodeName;

                    if (typeof (parentEl) != 'undefined' && parentEl !== null && parentEl.length != 0) {
                        parentEl = parentEl.toLowerCase();

                        if (parentEl != 'form') {
                            inputEl.parentNode.style.zIndex = 1;
                        }
                    }

                    // Append search input field element inside a wrapper band
                    wrapper.appendChild(inputEl);

                    // Place mic button/icon exact before search input field element
                    inputEl.insertAdjacentElement('beforebegin', micBtn);
                    inputEl.setAttribute('style', speechInputWrapperStyle + 'width: 100% !important;');
                    inputEl.classList.add('vf-mic-band');

                    // Setup recognition
                    var finalTranscript = '';
                    var final_transcript = "";
                    var ignore_onend;

                    if ('webkitSpeechRecognition' in window && vfClientInfo['chrome'] === true) {
                        var recognition = new webkitSpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = true;

                        recognition.onstart = function () {
                            recognizing = true;
                        };

                        recognition.onerror = function (event) {
                            micBtn.classList.remove('listening');
                            recognizing = false;

                            if (event.error == 'no-speech') {
                                inputEl.placeholder = vfMessages['unableToHear'];

                                // Play 'notAudible' playback
                                vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                vfAudioPlayer.play();

                                ignore_onend = true;
                            }
                            if (event.error == 'audio-capture') {
                                // Play 'micConnect' playback
                                vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                                vfAudioPlayer.play();

                                inputEl.placeholder = vfMessages['micNotAccessible'];
                                ignore_onend = true;
                            }
                            if (event.error == 'not-allowed') {
                                // Play 'micConnect' playback
                                vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                                vfAudioPlayer.play();

                                inputEl.placeholder = vfMessages['browserDenyMicAccess'];
                                micBtn.style.setProperty("color", "white");
                                ignore_onend = true;
                            }
                        };

                        function processEnd() {
                            recognizing = false;

                            if (ignore_onend) { return; }

                            micBtn.classList.remove('listening');
                            micBtn.style.setProperty("color", "white");

                            if (typeof (finalTranscript) != 'undefined' && finalTranscript.length != 0) {
                                let transcribedText = finalTranscript;

                                // Sanitize email before putting transcribed text in input field
                                if (inputType === 'email') {
                                    transcribedText = vfFormatEmail(transcribedText);
                                }


                                let newChromeTranscribedText = transcribedText && transcribedText !== null ? transcribedText : finalTranscript;

                                if (isTextArea === true) {
                                    // Preserve previous input value for textarea and append new value
                                    inputEl.value += ' ' + newChromeTranscribedText;
                                } else {
                                    inputEl.value = newChromeTranscribedText;
                                }

                                if (isSearchForm == true) {
                                    // Play 'basic' playback
                                    vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () { speechInputWrapper.submit(); });
                                    vfAudioPlayer.play();
                                }
                            } else {
                                // tts(vfAlternativeResponse['notAudible'], function(){});
                                inputEl.placeholder = vfMessages['ask'];
                            }
                        };

                        recognition.onend = function () {
                            if (isAndroid) {
                                processEnd();
                            }
                        };

                        recognition.onresult = function (event) {
                            let interim_transcript = '';

                            if (typeof (event.results) == 'undefined') {
                                recognition.onend = null;
                                recognition.stop();
                                inputEl.placeholder = vfMessages['unableToHear'];

                                // Play 'micConnect' playback
                                vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                                vfAudioPlayer.play();

                                return;
                            }

                            for (var i = event.resultIndex; i < event.results.length; ++i) {
                                if (event.results[i].isFinal) {
                                    finalTranscript = event.results[i][0].transcript;

                                    if (isAndroid == false) {
                                        processEnd();
                                        recognition.stop();
                                    }
                                } else {
                                    if (isTextArea === false) {
                                        interim_transcript += event.results[i][0].transcript;
                                        inputEl.value = interim_transcript;
                                    }
                                }
                            }
                        };

                        micBtn.addEventListener(vfMicEventToListen, function (event) {
                            // micBtn.onclick = function (event) {
                            if (vfAnyOtherMicListening(micBtn.getAttribute('id')) === true) return;

                            if (recognizing) {
                                // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                vfClearMicResetTimeout();

                                // Stop ongoing playback if nay
                                if (vfAudioPlayer.isPlaying()) {
                                    vfAudioPlayer.stop();
                                }

                                if (isAndroid == false) {
                                    processEnd();
                                    recognition.stop();
                                }
                            } else {
                                micBtn.classList.add('listening');
                                event.preventDefault();

                                // Stop ongoing playback if nay
                                if (vfAudioPlayer.isPlaying()) {
                                    vfAudioPlayer.stop();
                                }

                                finalTranscript = '';

                                if (isTextArea === false) {
                                    inputEl.value = '';
                                }
                                recognizing = true;
                                recognition.lang = !!vfSttLanguageContext['gcp']['stt'] ? vfSttLanguageContext['gcp']['langCode'] : 'en-US';
                                recognition.start();
                                ignore_onend = false;

                                // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                vfClearMicResetTimeout();

                                // To set new mic reset timeout. (Based on duration from settings)
                                window.vfMicTimeoutIdentifier = setTimeout(function () {
                                    let updatedClassList = micBtn.classList;

                                    if (updatedClassList && updatedClassList.contains('listening')) {
                                        micBtn.click();
                                    }
                                }, inputEl.tagName.toLowerCase() == 'textarea' ? vfTextareaTimeoutDuration : vfOtherInputTimeoutDuration);

                            }
                        });
                    } else {
                        //CODE FOR BROWSERS THAT DO NOT SUPPORT STT NATIVLY
                        // MUST USE THE BUILT IN MICROPHONE
                        micBtn.addEventListener(vfMicEventToListen, function (event) {

                            /**
                              * Audio element's play method must be invoked in exact influence of user gesture to avoid auto play restriction
                              * 
                              */
                            if (
                                vfClientInfo.ios === true
                                || (vfClientInfo.iosSafari && !vfClientInfo.chrome && !vfClientInfo.firefox)
                                || (vfClientInfo.windows && vfClientInfo.firefox)
                            ) {
                                vfAudioPlayer.configure(vfSilenceSoundPath);
                                vfAudioPlayer.play();
                            }

                            ////********************************************///
                            if (vfAnyOtherMicListening(micBtn.getAttribute('id')) === true) return;

                            // Deny recording if microphone is not accessible
                            if (!vfAudioRecorder || !vfAudioContext) {
                                vfInitAudio(function (a) {
                                    if (!vfAudioRecorder || !vfAudioContext) {
                                        alert(vfMessages['cantAccessMicrophone']);
                                        return false;
                                    } else {
                                        listenEvent();
                                    }
                                });
                            } else {
                                listenEvent();
                            }

                            function listenEvent() {
                                // If API system key is unavailable then acknowledge service unavailability and stop voice navigation.
                                if (!(typeof (vf.vfXApiKey) != 'undefined' && vf.vfXApiKey !== null)) {
                                    // Play 'unavailable' playback
                                    vfAudioPlayer.configure(vfAlternativeResponse['unavailable']);
                                    vfAudioPlayer.play();

                                    return false;
                                }

                                // User ending recording by clicking back mic
                                if (recognizing) {
                                    // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                    vfClearMicResetTimeout();

                                    // Stop recorder
                                    vfAudioRecorder.stop();

                                    // Stop access to audio resource
                                    vfStopAudio();

                                    // Stop ongoing playback if nay
                                    if (vfAudioPlayer.isPlaying()) {
                                        vfAudioPlayer.stop();
                                    }

                                    //replace recording with mic icon
                                    micBtn.classList.remove('listening');

                                    micBtn.style.setProperty("color", "white");
                                    inputEl.placeholder = vfMessages['transcribeText'];

                                    vfAudioRecorder.getBuffers(function (buffers) {
                                        if (!!vfSttLanguageContext['gcp']['stt']) {
                                            vfAudioRecorder.exportMonoWAV(function (blob) {
                                                vfAudioRecorder.convertBlobToBase64(blob).then(function (resultedBase64) {
                                                    vfGcpStt(resultedBase64).then(function (transcriptResult) {
                                                        let transcribedText = transcriptResult;

                                                        // Sanitize email before putting transcribed text in input field
                                                        if (inputType === 'email') {
                                                            transcribedText = vfFormatEmail(transcribedText);
                                                        }

                                                        let newNonChromeTranscribedText = transcribedText && transcribedText !== null ? transcribedText : transcriptResult;

                                                        if (isTextArea === true) {
                                                            // Preserve previous input value for textarea and append new value
                                                            inputEl.value += ' ' + newNonChromeTranscribedText;
                                                        } else {
                                                            inputEl.value = newNonChromeTranscribedText;
                                                        }

                                                        if (isSearchForm == true) {
                                                            // Play 'basic' playback
                                                            vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                                                                speechInputWrapper.submit();
                                                            });
                                                            vfAudioPlayer.play();
                                                        }
                                                    }).catch(function (error) {
                                                        // Play 'notAudible' playback
                                                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                        vfAudioPlayer.play();

                                                        inputEl.placeholder = vfMessages['ask'];
                                                    })
                                                }).catch(function (error) {
                                                    // Play 'notAudible' playback
                                                    vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                    vfAudioPlayer.play();

                                                    inputEl.placeholder = vfMessages['ask'];
                                                });
                                            });
                                        } else {
                                            // Play 'notAudible' playback
                                            vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                            vfAudioPlayer.play();

                                            inputEl.placeholder = vfMessages['ask'];
                                        }
                                    });

                                    recognizing = false;
                                    return;

                                } else {// User started recording by clicking mic
                                    micBtn.classList.add('listening');
                                    event.preventDefault();

                                    // Stop ongoing playback if nay
                                    if (vfAudioPlayer.isPlaying()) {
                                        vfAudioPlayer.stop();
                                    }

                                    inputEl.value = finalTranscript = '';

                                    recognizing = true;
                                    vfAudioRecorder.clear();
                                    vfAudioRecorder.record(micBtn, inputEl.tagName);

                                    // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                    vfClearMicResetTimeout();

                                    // To set new mic reset timeout. (Based on duration from settings)
                                    window.vfMicTimeoutIdentifier = setTimeout(function () {
                                        let updatedClassList = micBtn.classList;

                                        if (updatedClassList && updatedClassList.contains('listening')) {
                                            micBtn.click();
                                        }
                                    }, inputEl.tagName.toLowerCase() == 'textarea' ? vfTextareaTimeoutDuration : vfOtherInputTimeoutDuration);

                                }
                            }
                        }, false);
                    }
                });

                // Reset form style again
                speechInputWrapper.setAttribute('style', speechInputWrapperStyle);
            } catch (err) {  /* do nothing */ }
        });

        // Load dloating mic with search bar
        //############################# Floating mic - Widget ###################################
        // Create root/widget wrapper
        let vfDocFragment = document.createDocumentFragment();
        let vfWidgetWrapper = document.createElement('div');

        let vfWrapperMicPositionClass = 'vf-widget-wrapper-middle-right';
        let vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-middle-right';
        let vfMicPosition = vf.vfSelectedMicPosition ? vf.vfSelectedMicPosition.toLowerCase() : 'middle right';

        switch (vfMicPosition) {
            case 'middle left':
                vfWrapperMicPositionClass = 'vf-widget-wrapper-middle-left';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-middle-left';
                break;
            case 'top right':
                vfWrapperMicPositionClass = 'vf-widget-wrapper-top-right';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-top-right';
                break;
            case 'top left':
                vfWrapperMicPositionClass = 'vf-widget-wrapper-top-left';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-top-left';
                break;
            case 'bottom right':
                vfWrapperMicPositionClass = 'vf-widget-wrapper-bottom-right';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-bottom-right';
                break;
            case 'bottom left':
                vfWrapperMicPositionClass = 'vf-widget-wrapper-bottom-left';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-bottom-left';
                break;
            default:
                vfWrapperMicPositionClass = 'vf-widget-wrapper-middle-right';
                vfChatWrapperMicPositionClass = 'vf-widget-chat-wrapper-middle-right';
        }

        vfWidgetWrapper.setAttribute('class', 'vf-widget-wrapper ' + vfWrapperMicPositionClass + '');

        // Create chat wrapper
        let vfWidgetChatWrapper = document.createElement('div');
        vfWidgetChatWrapper.setAttribute('class', 'vf-widget-chat-wrapper ' + vfChatWrapperMicPositionClass + '');

        // ############################ Widget Fields (Input section) ############################
        // Create widget text field and mic (Input Section)
        let vfWidgetField = document.createElement('div');
        vfWidgetField.setAttribute('class', 'vf-widget-field');

        // Create mic icon wrapper
        let vfWidgetMic = document.createElement('a');
        vfWidgetMic.setAttribute('id', 'vfWidgetMic');
        vfWidgetMic.setAttribute('class', 'vf-widget-button');

        // Create and append mic icon/image to mic wrapper
        let vfWidgetMicImg = document.createElement('img');
        vfWidgetMicImg.setAttribute('src', vf.vfImagesPath + 'vf-widget-mic-black.svg');
        vfWidgetMic.appendChild(vfWidgetMicImg);

        // Create button wrapper next to input text field
        let vfWidgetSearchBtn = document.createElement('a');
        vfWidgetSearchBtn.setAttribute('id', 'vfWidgetSearchBtn');

        // Create and append search button to button wrapper
        let vfWidgetSearchBtnEl = document.createElement('button');
        vfWidgetSearchBtnEl.setAttribute('class', 'vf-widget-form-submit-btn');
        vfWidgetSearchBtnEl.setAttribute('type', 'submit');
        vfWidgetSearchBtnEl.setAttribute('alt', 'Go');
        vfWidgetSearchBtnEl.setAttribute('title', 'Search');
        vfWidgetSearchBtn.appendChild(vfWidgetSearchBtnEl);

        // Create form for widget
        let vfWidgetForm = document.createElement('form');
        vfWidgetForm.setAttribute("class", "vf-widget-form");

        if (formElementForWidget !== null) {
            vfWidgetForm.action = formElementForWidget.action;
            vfWidgetForm.method = formElementForWidget.method;
        } else {
            vfWidgetForm.action = vfGetCurrentHostURL() + '/';
            vfWidgetForm.method = "get";
        }

        // Create input text field 
        let vfWidgetSearch = document.createElement('input');
        vfWidgetSearch.setAttribute('id', 'vfWidgetSearch');
        vfWidgetSearch.setAttribute('class', 'vf-widget-search vf-widget-search-text');
        vfWidgetSearch.setAttribute('name', 'vf-widget-search');
        vfWidgetSearch.setAttribute('placeholder', vfWidgetMessages['placeholder']);
        vfWidgetSearch.setAttribute('name', 's');

        vfWidgetForm.appendChild(vfWidgetSearch);
        vfWidgetForm.appendChild(vfWidgetSearchBtn);

        // Append mic and form to widget field section (input section)
        vfWidgetField.appendChild(vfWidgetMic);
        vfWidgetField.appendChild(vfWidgetForm);

        // Append chat header, chat conversation and input fields to widget chat wrapper
        vfWidgetChatWrapper.appendChild(vfWidgetField);

        // ################################ Widget Toggle button #########################
        // Create a widget toggle button wrapper
        let vfWidgetToggleButton = document.createElement('a');

        // Create toggle button icon element
        let vfWidgetIcon = document.createElement('div');

        // Create a pulse effect it's show when user trigger stt
        let vfWidgetPulseEffect = document.createElement('span');
        vfWidgetPulseEffect.setAttribute('id', 'vfWidgetPulseEffect');

        if (vf.vfFloatingMic && vf.vfFloatingMic === 'yes') {
            vfWidgetToggleButton.setAttribute('id', 'vfWidgetToggleButton');
            vfWidgetToggleButton.setAttribute('class', 'vf-widget-button');
            vfWidgetIcon.setAttribute('class', 'vf-widget-icon vf-widget-toggle-button vf-toggle-btn-mic');
            // Append toggle button icon to toggle button wrapper
            vfWidgetToggleButton.appendChild(vfWidgetIcon);
        }


        // Append chat wrapper and toggle button to widget wrapper
        vfWidgetWrapper.appendChild(vfWidgetChatWrapper);
        vfWidgetWrapper.appendChild(vfWidgetPulseEffect);
        vfWidgetWrapper.appendChild(vfWidgetToggleButton);

        // Append widget to body
        vfDocFragment.appendChild(vfWidgetWrapper);
        document.body.appendChild(vfDocFragment);

        // Listen event to show/hide widget
        vfWidgetToggleButton.addEventListener('click', function (event) {
            vfToggleWidgetElements();
        });

        /*############################# Widget mic handling ################################*/
        // Setup recognition
        let widgetFinalTranscript = '';
        let widgetRecognizing = false;
        let widget_final_transcript = "";
        let widget_ignore_onend;

        /*###############################################################################*/

        /**
         * Function for add pulse animation in elementor mic
         *
         */
        function vfElementorMicPulseAnimation(vfElementorMicElement) {
            let size = 0, left = 0;
            if (vfElementorMicElement.clientHeight >= 80) {
                size = vfElementorMicElement.clientHeight + 15;
                left = -(size / 6);
            } if (vfElementorMicElement.clientHeight >= 60) {
                size = vfElementorMicElement.clientHeight + 12;
                left = -(size / 5);
            } else if (vfElementorMicElement.clientHeight >= 30) {
                size = vfElementorMicElement.clientHeight + 10;
                left = -(size / 4);
            } else {
                size = vfElementorMicElement.clientHeight + 8;
                left = -(size / 3.5);
            }


            const vfPulse = document.createElement('div');
            vfPulse.setAttribute('id', 'pulse');
            vfPulse.setAttribute('class', 'pulse-color');
            vfPulse.style.width = size + 'px';
            vfPulse.style.height = size + 'px';
            vfPulse.style.left = left + 'px';

            const vfPulseRate = document.createElement('div');
            vfPulseRate.setAttribute('id', 'pulse-rate');
            vfPulseRate.setAttribute('class', 'pulse-color');
            vfPulseRate.style.width = size + 'px';
            vfPulseRate.style.height = size + 'px';
            vfPulseRate.style.left = left + 'px';

            return { vfPulse, vfPulseRate };
        }

        function enableElementor() {
            const vfFloatingMic = document.getElementById('flt-mic');
            if (vfFloatingMic != null) {
                const vfElementorMicColor = vfFloatingMic.getElementsByClassName('my-icon-wrapper')[0].getElementsByTagName('i')[0];
                const vfPulseItem = vfElementorMicPulseAnimation(vfElementorMicColor);
                if ('webkitSpeechRecognition' in window && vfClientInfo['chrome'] === true) {
                    let widgetRecognition = new webkitSpeechRecognition();
                    widgetRecognition.continuous = true;
                    widgetRecognition.interimResults = true;

                    widgetRecognition.onstart = function () {
                        widgetRecognizing = true;
                    };

                    widgetRecognition.onerror = function (event) {
                        vfFloatingMic.classList.remove('listening');
                        widgetRecognizing = false;
                        vfElementorMicColor.classList.remove('my-icon-animation-wrapper');
                        vfElementorMicColor.removeChild(vfPulseItem['vfPulse']);
                        vfElementorMicColor.removeChild(vfPulseItem['vfPulseRate']);

                        if (event.error == 'no-speech') {
                            // Play feature unavailable playback
                            vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                            vfAudioPlayer.play();

                            widget_ignore_onend = true;
                        }

                        if (event.error == 'audio-capture') {
                            // Play 'micConnect' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                            vfAudioPlayer.play();

                            widget_ignore_onend = true;
                        }

                        if (event.error == 'not-allowed') {
                            // Play 'micConnect' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                            vfAudioPlayer.play();

                            widget_ignore_onend = true;
                        }
                    };

                    function widgetProcessEnd() {
                        widgetRecognizing = false;

                        if (widget_ignore_onend) { return; }

                        widgetFinalTranscript = widget_final_transcript;
                        vfFloatingMic.classList.remove('listening');
                        vfElementorMicColor.classList.remove('my-icon-animation-wrapper');
                        vfElementorMicColor.removeChild(vfPulseItem['vfPulse']);
                        vfElementorMicColor.removeChild(vfPulseItem['vfPulseRate']);

                        if (typeof (widgetFinalTranscript) != 'undefined' && widgetFinalTranscript.length != 0) {
                            vfWidgetSearch.value = widgetFinalTranscript;

                            // Play 'basic' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                            });
                            vfAudioPlayer.play();
                            setTimeout(() => {
                                vfWidgetForm.submit();
                            }, 2000);
                        } else {
                            // Play 'notAudible' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                            vfAudioPlayer.play();

                            vfWidgetSearch.placeholder = vfMessages['ask'];
                        }
                    }

                    widgetRecognition.onend = function () {
                        if (isAndroid) { widgetProcessEnd(); }
                    };

                    widgetRecognition.onresult = function (event) {
                        let interim_transcript = '';
                        if (typeof (event.results) == 'undefined') {
                            widgetRecognition.onend = null;
                            widgetRecognition.stop();

                            // Play 'micConnect' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                            vfAudioPlayer.play();
                            return;
                        }

                        let eventResultsLength = event.results.length;

                        for (let i = event.resultIndex; i < eventResultsLength; ++i) {
                            if (event.results[i].isFinal) {
                                widget_final_transcript = event.results[i][0].transcript;

                                if (isAndroid == false) {
                                    widgetProcessEnd();
                                    widgetRecognition.stop();
                                }
                            } else {
                                interim_transcript += event.results[i][0].transcript;
                            }
                        }
                    };
                    vfFloatingMic.addEventListener(vfMicEventToListen, function (event) {

                        if (vfAnyOtherMicListening(vfFloatingMic.getAttribute('id'), vfFloatingMic) === true) return;

                        if (widgetRecognizing) {
                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            if (isAndroid == false) {
                                widgetProcessEnd();
                                widgetRecognition.stop();
                            }
                        } else {
                            vfFloatingMic.classList.add('listening');
                            vfElementorMicColor.classList.add('my-icon-animation-wrapper');
                            vfElementorMicColor.appendChild(vfPulseItem['vfPulse']);
                            vfElementorMicColor.appendChild(vfPulseItem['vfPulseRate']);
                            event.preventDefault();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            widgetFinalTranscript = '';
                            widgetRecognizing = true;
                            widgetRecognition.lang = !!vfSttLanguageContext['gcp']['stt'] ? vfSttLanguageContext['gcp']['langCode'] : 'en-US';
                            widgetRecognition.start();
                            widget_ignore_onend = false;

                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // To set new mic reset timeout. (Based on duration from settings)
                            window.vfMicTimeoutIdentifier = setTimeout(function () {
                                let updatedClassList = vfFloatingMic.classList;

                                if (updatedClassList && updatedClassList.contains('listening')) {
                                    vfFloatingMic.click();
                                }
                            }, vfOtherInputTimeoutDuration);
                        }
                    });
                } else {
                    //CODE FOR BROWSERS THAT DO NOT SUPPORT STT NATIVLY
                    // MUST USE THE BUILT IN MICROPHONE
                    vfFloatingMic.addEventListener(vfMicEventToListen, function (event) {

                        /**
                         * Audio element's play method must be invoked in exact influence of user gesture to avoid auto play restriction
                         * 
                         */
                        if (
                            vfClientInfo.ios === true
                            || (vfClientInfo.iosSafari && !vfClientInfo.chrome && !vfClientInfo.firefox)
                            || (vfClientInfo.windows && vfClientInfo.firefox)
                        ) {
                            vfAudioPlayer.configure(vfSilenceSoundPath);
                            vfAudioPlayer.play();
                        }

                        if (vfAnyOtherMicListening(vfFloatingMic.getAttribute('id'), vfFloatingMic) === true) return;

                        // Deny recording if microphone is not accessible
                        if (!vfAudioRecorder || !vfAudioContext) {
                            vfInitAudio(function (a) {
                                if (!vfAudioRecorder || !vfAudioContext) {
                                    vfWidgetSearch.placeholder = vfMessages['micNotAccessible'];
                                    return false;
                                } else {
                                    widgetListenEvent();
                                }
                            });
                        } else {
                            widgetListenEvent();
                        }

                        function widgetListenEvent() {
                            // If API system key is unavailable then acknowledge service unavailability and stop voice navigation.
                            if (!(typeof (vf.vfXApiKey) != 'undefined' && vf.vfXApiKey !== null)) {
                                // Play 'unavailable' playback
                                vfAudioPlayer.configure(vfAlternativeResponse['unavailable']);
                                vfAudioPlayer.play();

                                return false;
                            }

                            // User ending recording by clicking back mic
                            if (widgetRecognizing) {
                                // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                vfClearMicResetTimeout();

                                // Stop recorder
                                vfAudioRecorder.stop();

                                // Stop access to audio resource
                                vfStopAudio();

                                // Stop ongoing playback if nay
                                if (vfAudioPlayer.isPlaying()) {
                                    vfAudioPlayer.stop();
                                }

                                //replace recording with mic icon
                                vfFloatingMic.classList.remove('listening');
                                vfElementorMicColor.classList.remove('my-icon-animation-wrapper');
                                vfElementorMicColor.removeChild(vfPulseItem['vfPulse']);
                                vfElementorMicColor.removeChild(vfPulseItem['vfPulseRate']);

                                vfWidgetSearch.placeholder = vfMessages['transcribeText'];

                                vfAudioRecorder.getBuffers(function (buffers) {
                                    if (!!vfSttLanguageContext['gcp']['stt']) {
                                        vfAudioRecorder.exportMonoWAV(function (blob) {
                                            vfAudioRecorder.convertBlobToBase64(blob).then(function (resultedBase64) {
                                                vfGcpStt(resultedBase64).then(function (transcriptResult) {
                                                    vfWidgetSearch.value = transcriptResult;

                                                    // Play 'basic' playback
                                                    vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                                                    });
                                                    vfAudioPlayer.play();
                                                    setTimeout(() => {
                                                        vfWidgetForm.submit();
                                                    }, 2000);
                                                }).catch(function (error) {
                                                    // Play 'notAudible' playback
                                                    vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                    vfAudioPlayer.play();

                                                    vfWidgetSearch.placeholder = vfMessages['ask'];
                                                })
                                            }).catch(function (error) {
                                                // Play 'notAudible' playback
                                                vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                vfAudioPlayer.play();

                                                vfWidgetSearch.placeholder = vfMessages['ask'];
                                            });
                                        });
                                    } else {
                                        // Play 'notAudible' playback
                                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                        vfAudioPlayer.play();
                                        vfWidgetSearch.placeholder = vfMessages['ask'];
                                    }
                                });

                                widgetRecognizing = false;
                                return;
                            } else {// User started recording by clicking mic
                                vfFloatingMic.classList.add('listening');
                                vfElementorMicColor.classList.add('my-icon-animation-wrapper');
                                vfElementorMicColor.appendChild(vfPulseItem['vfPulse']);
                                vfElementorMicColor.appendChild(vfPulseItem['vfPulseRate']);
                                event.preventDefault();

                                // Stop ongoing playback if nay
                                if (vfAudioPlayer.isPlaying()) {
                                    vfAudioPlayer.stop();
                                }

                                widgetFinalTranscript = '';

                                widgetRecognizing = true;
                                vfAudioRecorder.clear();
                                vfAudioRecorder.record(vfFloatingMic);

                                // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                                vfClearMicResetTimeout();

                                // To set new mic reset timeout. (Based on duration from settings)
                                window.vfMicTimeoutIdentifier = setTimeout(function () {
                                    let updatedClassList = vfFloatingMic.classList;

                                    if (updatedClassList && updatedClassList.contains('listening')) {
                                        vfFloatingMic.click();
                                    }
                                }, vfOtherInputTimeoutDuration);
                            }
                        }
                    }, false);
                }
            }
        }

        /**
         * Function for made a indication on single click
         * 
         * @param action: add for add indication , remove for remove indication
         */
        function vfSingleClickMicEffect(action) {
            if (action == 'add') {
                vfWidgetToggleButton.classList.add('listening');
                vfWidgetToggleButton.classList.add('singleClick');
                vfWidgetPulseEffect.classList.add('singleClick');
            } else if (action == 'remove') {
                vfWidgetToggleButton.classList.remove('listening');
                vfWidgetToggleButton.classList.remove('singleClick');
                vfWidgetPulseEffect.classList.remove('singleClick');
            }
        }

        /**
         * Function for provide simplicity to interct with floating mic using keyboard key between a-z
         * 
         * @param clickType: single or double
         */
        function vfFloatingMicKeyBoardAccess(clickType) {
            if (vf.vfFloatingMic && vf.vfFloatingMic === 'yes') {
                var keyFormSetting = vf.vfKeyboardSpecialKey == 'OtherKey' ? vf.vfKeyboardMicSwitch : vf.vfKeyboardSpecialKey == 'Space' ? ' ' : vf.vfKeyboardSpecialKey;
                var spaceCount = 0;
                window.addEventListener('keydown', (event) => {
                    let target = event.target;

                    // Check if the event originated from an input field
                    if (target.tagName === 'INPUT') {
                        // Ignore keyboard events on input fields
                        return;
                    }

                    if (event.key == keyFormSetting) {
                        spaceCount++;
                        event.preventDefault();
                        if (spaceCount == 2) {
                            if (clickType == 'single') {
                                vfWidgetToggleButton.click();
                            } else if (clickType == 'double') {
                                if (vfWidgetChatWrapper.classList.contains('vf-widget-visible')) {
                                    vfWidgetMic.click();
                                } else {
                                    vfWidgetToggleButton.click();
                                    vfWidgetMic.click();
                                }
                            }
                            spaceCount = 0;
                        }
                    }
                });
            }
        }

        function enableSingleClick() {
            vfWidgetWrapper.classList.remove('vfWidgetChatWrapper');
            if ('webkitSpeechRecognition' in window && vfClientInfo['chrome'] === true) {
                let widgetRecognition = new webkitSpeechRecognition();
                widgetRecognition.continuous = true;
                widgetRecognition.interimResults = true;

                widgetRecognition.onstart = function () {
                    widgetRecognizing = true;
                };

                widgetRecognition.onerror = function (event) {
                    vfSingleClickMicEffect('remove');
                    widgetRecognizing = false;

                    if (event.error == 'no-speech') {
                        // Play feature unavailable playback
                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['unableToHear'];
                    }

                    if (event.error == 'audio-capture') {
                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['micNotAccessible'];
                    }

                    if (event.error == 'not-allowed') {
                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['browserDenyMicAccess'];
                    }
                };

                function widgetProcessEnd() {
                    widgetRecognizing = false;

                    if (widget_ignore_onend) { return; }

                    widgetFinalTranscript = widget_final_transcript;
                    vfSingleClickMicEffect('remove');

                    if (typeof (widgetFinalTranscript) != 'undefined' && widgetFinalTranscript.length != 0) {
                        vfWidgetSearch.value = widgetFinalTranscript;

                        // Play 'basic' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                        });
                        vfAudioPlayer.play();
                        setTimeout(() => {
                            vfWidgetForm.submit();
                        }, 2000);
                    } else {
                        // Play 'notAudible' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                        vfAudioPlayer.play();

                        vfWidgetSearch.placeholder = vfMessages['ask'];
                    }

                }

                widgetRecognition.onend = function () {
                    if (isAndroid) { widgetProcessEnd(); }
                };

                widgetRecognition.onresult = function (event) {
                    let interim_transcript = '';

                    if (typeof (event.results) == 'undefined') {
                        widgetRecognition.onend = null;
                        widgetRecognition.stop();
                        vfWidgetSearch.placeholder = vfMessages['unableToHear'];

                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        return;
                    }

                    let eventResultsLength = event.results.length;

                    for (let i = event.resultIndex; i < eventResultsLength; ++i) {
                        if (event.results[i].isFinal) {
                            widget_final_transcript = event.results[i][0].transcript;

                            if (isAndroid == false) {
                                widgetProcessEnd();
                                widgetRecognition.stop();
                            }
                        } else {
                            interim_transcript += event.results[i][0].transcript;
                        }
                    }
                };

                vfWidgetToggleButton.addEventListener(vfMicEventToListen, function (event) {
                    if (vfAnyOtherMicListening(vfWidgetMic.getAttribute('id'), vfWidgetMic) === true) return;

                    if (widgetRecognizing) {
                        // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                        vfClearMicResetTimeout();

                        // Stop ongoing playback if nay
                        if (vfAudioPlayer.isPlaying()) {
                            vfAudioPlayer.stop();
                        }

                        if (isAndroid == false) {
                            widgetProcessEnd();
                            widgetRecognition.stop();
                        }
                    } else {
                        vfSingleClickMicEffect('add');
                        event.preventDefault();

                        // Stop ongoing playback if nay
                        if (vfAudioPlayer.isPlaying()) {
                            vfAudioPlayer.stop();
                        }

                        widgetFinalTranscript = '';
                        widgetRecognizing = true;
                        widgetRecognition.lang = !!vfSttLanguageContext['gcp']['stt'] ? vfSttLanguageContext['gcp']['langCode'] : 'en-US';
                        widgetRecognition.start();
                        widget_ignore_onend = false;

                        // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                        vfClearMicResetTimeout();

                        // To set new mic reset timeout. (Based on duration from settings)
                        window.vfMicTimeoutIdentifier = setTimeout(function () {
                            let updatedClassList = vfWidgetToggleButton.classList;

                            if (updatedClassList && updatedClassList.contains('listening')) {
                                vfWidgetToggleButton.click();
                            }
                        }, vfOtherInputTimeoutDuration);
                    }
                });
            } else {
                //CODE FOR BROWSERS THAT DO NOT SUPPORT STT NATIVLY
                // MUST USE THE BUILT IN MICROPHONE
                vfWidgetToggleButton.addEventListener(vfMicEventToListen, function (event) {
                    /**
                     * Audio element's play method must be invoked in exact influence of user gesture to avoid auto play restriction
                     * 
                     */
                    if (
                        vfClientInfo.ios === true
                        || (vfClientInfo.iosSafari && !vfClientInfo.chrome && !vfClientInfo.firefox && !vfClientInfo.edge)
                        || (vfClientInfo.windows && vfClientInfo.firefox)
                    ) {
                        vfAudioPlayer.configure(vfSilenceSoundPath);
                        vfAudioPlayer.play();
                    }

                    if (vfAnyOtherMicListening(vfWidgetToggleButton.getAttribute('id'), vfWidgetMic) === true) return;

                    // Deny recording if microphone is not accessible
                    if (!vfAudioRecorder || !vfAudioContext) {
                        vfInitAudio(function (a) {
                            if (!vfAudioRecorder || !vfAudioContext) {
                                vfWidgetSearch.placeholder = vfMessages['micNotAccessible'];
                                return false;
                            } else {
                                widgetListenEvent();
                            }
                        });
                    } else {
                        widgetListenEvent();
                    }

                    function widgetListenEvent() {
                        // If API system key is unavailable then acknowledge service unavailability and stop voice navigation.
                        if (!(typeof (vf.vfXApiKey) != 'undefined' && vf.vfXApiKey !== null)) {
                            // Play 'unavailable' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['unavailable']);
                            vfAudioPlayer.play();

                            return false;
                        }

                        // User ending recording by clicking back mic
                        if (widgetRecognizing) {
                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // Stop recorder
                            vfAudioRecorder.stop();

                            // Stop access to audio resource
                            vfStopAudio();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            //replace recording with mic icon
                            vfSingleClickMicEffect('remove');

                            vfWidgetSearch.placeholder = vfMessages['transcribeText'];

                            vfAudioRecorder.getBuffers(function (buffers) {
                                if (!!vfSttLanguageContext['gcp']['stt']) {
                                    vfAudioRecorder.exportMonoWAV(function (blob) {
                                        vfAudioRecorder.convertBlobToBase64(blob).then(function (resultedBase64) {
                                            vfGcpStt(resultedBase64).then(function (transcriptResult) {
                                                vfWidgetSearch.value = transcriptResult;

                                                // Play 'basic' playback
                                                vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                                                });
                                                vfAudioPlayer.play();
                                                setTimeout(() => {
                                                    vfWidgetForm.submit();
                                                }, 2000);
                                            }).catch(function (error) {
                                                // Play 'notAudible' playback
                                                vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                vfAudioPlayer.play();

                                                vfWidgetSearch.placeholder = vfMessages['ask'];
                                            })
                                        }).catch(function (error) {
                                            // Play 'notAudible' playback
                                            vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                            vfAudioPlayer.play();

                                            vfWidgetSearch.placeholder = vfMessages['ask'];
                                        });
                                    });
                                } else {
                                    // Play 'notAudible' playback
                                    vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                    vfAudioPlayer.play();

                                    vfWidgetSearch.placeholder = vfMessages['ask'];
                                }
                            });

                            widgetRecognizing = false;
                            return;
                        } else {// User started recording by clicking mic
                            vfSingleClickMicEffect('add');
                            event.preventDefault();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            widgetFinalTranscript = '';

                            widgetRecognizing = true;
                            vfAudioRecorder.clear();
                            vfAudioRecorder.record(vfWidgetToggleButton);

                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // To set new mic reset timeout. (Based on duration from settings)
                            window.vfMicTimeoutIdentifier = setTimeout(function () {
                                let updatedClassList = vfWidgetToggleButton.classList;

                                if (updatedClassList && updatedClassList.contains('listening')) {
                                    vfWidgetToggleButton.click();
                                }
                            }, vfOtherInputTimeoutDuration);
                        }
                    }
                }, false);
            }
        }
        function disableSingleClick() {
            if ('webkitSpeechRecognition' in window && vfClientInfo['chrome'] === true) {
                let widgetRecognition = new webkitSpeechRecognition();
                widgetRecognition.continuous = true;
                widgetRecognition.interimResults = true;

                widgetRecognition.onstart = function () {
                    widgetRecognizing = true;
                };

                widgetRecognition.onerror = function (event) {
                    vfWidgetMic.classList.remove('listening');
                    widgetRecognizing = false;

                    if (event.error == 'no-speech') {
                        // Play feature unavailable playback
                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['unableToHear'];
                    }

                    if (event.error == 'audio-capture') {
                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['micNotAccessible'];
                    }

                    if (event.error == 'not-allowed') {
                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        widget_ignore_onend = true;
                        vfWidgetSearch.placeholder = vfMessages['browserDenyMicAccess'];
                    }
                };

                function widgetProcessEnd() {
                    widgetRecognizing = false;

                    if (widget_ignore_onend) { return; }

                    widgetFinalTranscript = widget_final_transcript;
                    vfWidgetMic.classList.remove('listening');

                    if (typeof (widgetFinalTranscript) != 'undefined' && widgetFinalTranscript.length != 0) {
                        vfWidgetSearch.value = widgetFinalTranscript;

                        // Play 'basic' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                        });
                        vfAudioPlayer.play();
                        setTimeout(() => {
                            vfWidgetForm.submit();
                        }, 2000);
                    } else {
                        // Play 'notAudible' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                        vfAudioPlayer.play();

                        vfWidgetSearch.placeholder = vfMessages['ask'];
                    }

                }

                widgetRecognition.onend = function () {
                    if (isAndroid) { widgetProcessEnd(); }
                };

                widgetRecognition.onresult = function (event) {
                    let interim_transcript = '';

                    if (typeof (event.results) == 'undefined') {
                        widgetRecognition.onend = null;
                        widgetRecognition.stop();
                        vfWidgetSearch.placeholder = vfMessages['unableToHear'];

                        // Play 'micConnect' playback
                        vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
                        vfAudioPlayer.play();

                        return;
                    }

                    let eventResultsLength = event.results.length;

                    for (let i = event.resultIndex; i < eventResultsLength; ++i) {
                        if (event.results[i].isFinal) {
                            widget_final_transcript = event.results[i][0].transcript;

                            if (isAndroid == false) {
                                widgetProcessEnd();
                                widgetRecognition.stop();
                            }
                        } else {
                            interim_transcript += event.results[i][0].transcript;
                        }
                    }
                };

                vfWidgetMic.addEventListener(vfMicEventToListen, function (event) {
                    if (vfAnyOtherMicListening(vfWidgetMic.getAttribute('id'), vfWidgetMic) === true) return;

                    if (widgetRecognizing) {
                        // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                        vfClearMicResetTimeout();

                        // Stop ongoing playback if nay
                        if (vfAudioPlayer.isPlaying()) {
                            vfAudioPlayer.stop();
                        }

                        if (isAndroid == false) {
                            widgetProcessEnd();
                            widgetRecognition.stop();
                        }
                    } else {
                        vfWidgetMic.classList.add('listening');
                        event.preventDefault();

                        // Stop ongoing playback if nay
                        if (vfAudioPlayer.isPlaying()) {
                            vfAudioPlayer.stop();
                        }

                        widgetFinalTranscript = '';
                        widgetRecognizing = true;
                        widgetRecognition.lang = !!vfSttLanguageContext['gcp']['stt'] ? vfSttLanguageContext['gcp']['langCode'] : 'en-US';
                        widgetRecognition.start();
                        widget_ignore_onend = false;

                        // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                        vfClearMicResetTimeout();

                        // To set new mic reset timeout. (Based on duration from settings)
                        window.vfMicTimeoutIdentifier = setTimeout(function () {
                            let updatedClassList = vfWidgetMic.classList;

                            if (updatedClassList && updatedClassList.contains('listening')) {
                                vfWidgetMic.click();
                            }
                        }, vfOtherInputTimeoutDuration);
                    }
                });
            } else {
                //CODE FOR BROWSERS THAT DO NOT SUPPORT STT NATIVLY
                // MUST USE THE BUILT IN MICROPHONE
                vfWidgetMic.addEventListener(vfMicEventToListen, function (event) {
                    /**
                     * Audio element's play method must be invoked in exact influence of user gesture to avoid auto play restriction
                     * 
                     */
                    if (
                        vfClientInfo.ios === true
                        || (vfClientInfo.iosSafari && !vfClientInfo.chrome && !vfClientInfo.firefox)
                        || (vfClientInfo.windows && vfClientInfo.firefox)
                    ) {
                        vfAudioPlayer.configure(vfSilenceSoundPath);
                        vfAudioPlayer.play();
                    }

                    if (vfAnyOtherMicListening(vfWidgetMic.getAttribute('id'), vfWidgetMic) === true) return;

                    // Deny recording if microphone is not accessible
                    if (!vfAudioRecorder || !vfAudioContext) {
                        vfInitAudio(function (a) {
                            if (!vfAudioRecorder || !vfAudioContext) {
                                vfWidgetSearch.placeholder = vfMessages['micNotAccessible'];
                                return false;
                            } else {
                                widgetListenEvent();
                            }
                        });
                    } else {
                        widgetListenEvent();
                    }

                    function widgetListenEvent() {
                        // If API system key is unavailable then acknowledge service unavailability and stop voice navigation.
                        if (!(typeof (vf.vfXApiKey) != 'undefined' && vf.vfXApiKey !== null)) {
                            // Play 'unavailable' playback
                            vfAudioPlayer.configure(vfAlternativeResponse['unavailable']);
                            vfAudioPlayer.play();

                            return false;
                        }

                        // User ending recording by clicking back mic
                        if (widgetRecognizing) {
                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // Stop recorder
                            vfAudioRecorder.stop();

                            // Stop access to audio resource
                            vfStopAudio();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            //replace recording with mic icon
                            vfWidgetMic.classList.remove('listening');

                            vfWidgetSearch.placeholder = vfMessages['transcribeText'];

                            vfAudioRecorder.getBuffers(function (buffers) {
                                if (!!vfSttLanguageContext['gcp']['stt']) {
                                    vfAudioRecorder.exportMonoWAV(function (blob) {
                                        vfAudioRecorder.convertBlobToBase64(blob).then(function (resultedBase64) {
                                            vfGcpStt(resultedBase64).then(function (transcriptResult) {
                                                vfWidgetSearch.value = transcriptResult;

                                                // Play 'basic' playback
                                                vfAudioPlayer.configure(vfAlternativeResponse['basic'], function () {
                                                });
                                                vfAudioPlayer.play();
                                                setTimeout(() => {
                                                    vfWidgetForm.submit();
                                                }, 2000);
                                            }).catch(function (error) {
                                                // Play 'notAudible' playback
                                                vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                                vfAudioPlayer.play();

                                                vfWidgetSearch.placeholder = vfMessages['ask'];
                                            })
                                        }).catch(function (error) {
                                            // Play 'notAudible' playback
                                            vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                            vfAudioPlayer.play();

                                            vfWidgetSearch.placeholder = vfMessages['ask'];
                                        });
                                    });
                                } else {
                                    // Play 'notAudible' playback
                                    vfAudioPlayer.configure(vfAlternativeResponse['notAudible']);
                                    vfAudioPlayer.play();

                                    vfWidgetSearch.placeholder = vfMessages['ask'];
                                }
                            });

                            widgetRecognizing = false;
                            return;
                        } else {// User started recording by clicking mic
                            vfWidgetMic.classList.add('listening');
                            event.preventDefault();

                            // Stop ongoing playback if nay
                            if (vfAudioPlayer.isPlaying()) {
                                vfAudioPlayer.stop();
                            }

                            widgetFinalTranscript = '';

                            widgetRecognizing = true;
                            vfAudioRecorder.clear();
                            vfAudioRecorder.record(vfWidgetMic);

                            // To clear pre-existing mic reset timeout if any. (Based on duration from settings)
                            vfClearMicResetTimeout();

                            // To set new mic reset timeout. (Based on duration from settings)
                            window.vfMicTimeoutIdentifier = setTimeout(function () {
                                let updatedClassList = vfWidgetMic.classList;

                                if (updatedClassList && updatedClassList.contains('listening')) {
                                    vfWidgetMic.click();
                                }
                            }, vfOtherInputTimeoutDuration);
                        }
                    }
                }, false);
            }
        }

        if (vfIsElementor == true) {
            enableElementor();
        }

        if (vfIsSingleClick == true) {
            enableSingleClick();
            vfFloatingMicKeyBoardAccess('single');
        }
        else {
            disableSingleClick();
            vfFloatingMicKeyBoardAccess('double');
        }



        /**
         * Function to toggle class of the HTML element
         *
         * @param {elmSelector - String} : CSS Selector
         * @param {nameOfClass - String} : Class name to add/remove
         */
        function vfToggleClass(elmSelector, nameOfClass) {
            if (!(typeof (elmSelector) != 'undefined' && elmSelector != null && elmSelector.length != 0)) return false;

            let element = document.querySelector(elmSelector);

            if (element.classList) {
                element.classList.toggle(nameOfClass);
            } else {
                // For IE9

                let classes = element.className.split(" ");
                let i = classes.indexOf(nameOfClass);

                if (i >= 0) {
                    classes.splice(i, 1);
                } else {
                    classes.push(nameOfClass);
                    element.className = classes.join(" ");
                }
            }
        }

        /**
         * Function to toggle chat and links
         */
        function vfToggleWidgetElements() {
            if (vfIsSingleClick == true) {
                vfToggleClass('.vf-widget-toggle-button', 'vf-toggle-btn-mic');
                vfToggleClass('.vf-widget-toggle-button', 'vf-toggle-btn-mic');
                vfToggleClass('.vf-widget-toggle-button', 'vf-widget-active');
                vfToggleClass('.vf-widget-toggle-button', 'vf-widget-visible');
                vfToggleClass('#vfWidgetToggleButton', 'vf-widget-float');
                vfToggleClass('.vf-widget-button', 'vf-widget-visible');
            }

            else {
                vfToggleClass('.vf-widget-toggle-button', 'vf-toggle-btn-mic');
                vfToggleClass('.vf-widget-toggle-button', 'vf-toggle-btn-close');
                vfToggleClass('.vf-widget-toggle-button', 'vf-widget-active');
                vfToggleClass('.vf-widget-toggle-button', 'vf-widget-visible');
                vfToggleClass('#vfWidgetToggleButton', 'vf-widget-float');
                vfToggleClass('.vf-widget-chat-wrapper', 'vf-widget-visible');
                vfToggleClass('.vf-widget-button', 'vf-widget-visible');
            }
        }
    })();
};
