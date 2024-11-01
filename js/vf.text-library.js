// *****************************************************************************************************
// *******              speak2web VOICE FORMS                                                ***********
// *******               AI Service requires subcriptions                                    ***********
// *******               Get your subscription at                                            ***********
// *******                    https://speak2web.com/plugin#plans                             ***********
// *******               Need support? https://speak2web.com/support                         ***********
// *******               Licensed GPLv2+                                                     ***********
//******************************************************************************************************


//####################################
// PLUGIN LANGUAGE
//####################################
var vfTypeOfSelectedLanguage = (typeof (vf.vfSelectedLanguage) != 'undefined' && vf.vfSelectedLanguage !== null) ? vf.vfSelectedLanguage.trim() : 'English';
var vfSelectedLang = (typeof (vf.vfSelectedLanguage) != 'undefined' && vf.vfSelectedLanguage !== null) ? vf.vfSelectedLanguage.trim() : 'en-US';

var vfIsSttLangCtx = typeof _vfSttLanguageContext != 'undefined' && !!_vfSttLanguageContext && _vfSttLanguageContext instanceof Object ? true : false;
var vfSttLanguageContext = {
    'gcp': {
        'stt': null,
        'langCode': null,
        'endPoint': null,
        'key': null,
        'qs': { 'key': null }
    }
}

if (vfIsSttLangCtx === true) {

    //###############################
    // GCP
    //###############################
    let gcp = 'gcp' in _vfSttLanguageContext && _vfSttLanguageContext['gcp'] instanceof Object ? _vfSttLanguageContext['gcp'] : {};
    vfSttLanguageContext['gcp']['stt'] = 'stt' in gcp && gcp['stt'] == 'Y' ? true : false;

    if (!!vfSttLanguageContext['gcp']['stt']) {
        vfSttLanguageContext['gcp']['endPoint'] = 'endPoint' in gcp && typeof gcp['endPoint'] != 'undefined' && !!gcp['endPoint'] ? gcp['endPoint'] : null;
        vfSttLanguageContext['gcp']['key'] = 'key' in gcp && typeof gcp['key'] != 'undefined' && !!gcp['key'] ? gcp['key'] : null;
        vfSttLanguageContext['gcp']['langCode'] = 'langCode' in gcp && typeof gcp['langCode'] != 'undefined' && !!gcp['langCode'] ? gcp['langCode'] : null;

        let qs = 'qs' in gcp && gcp['qs'] instanceof Object ? gcp['qs'] : {};
        vfSttLanguageContext['gcp']['qs']['key'] = 'key' in qs && typeof qs['key'] != 'undefined' && !!qs['key'] ? qs['key'] : null;
    }
}

//####################################
// CLIENT INFO
//####################################
let vfNavigator = { 'navigatorUserAgent': navigator.userAgent.toLowerCase(), 'navigatorPlatform': navigator.platform };
var vfClientInfo = {
    'chrome': vfNavigator.navigatorUserAgent.indexOf('chrome') > -1,
    'firefox': vfNavigator.navigatorUserAgent.indexOf('firefox') > -1,
    'edge': vfNavigator.navigatorUserAgent.indexOf('edge') > -1 || vfNavigator.navigatorUserAgent.indexOf('edg') > -1,
    'ie': vfNavigator.navigatorUserAgent.indexOf('msie') > -1 || vfNavigator.navigatorUserAgent.indexOf('trident') > -1,
    'opera': vfNavigator.navigatorUserAgent.indexOf('opera') > -1 || vfNavigator.navigatorUserAgent.indexOf('opr') > -1,

    'ios': !!vfNavigator.navigatorPlatform && /iPad|iPhone|iPod/.test(vfNavigator.navigatorPlatform),
    'android': vfNavigator.navigatorUserAgent.indexOf("android") > -1,
    'windows': vfNavigator.navigatorUserAgent.indexOf("windows") > -1,
    'linux': vfNavigator.navigatorUserAgent.indexOf("linux") > -1,

    'macSafari': vfNavigator.navigatorUserAgent.indexOf('mac') > -1 && vfNavigator.navigatorUserAgent.indexOf('safari') > -1 && vfNavigator.navigatorUserAgent.indexOf('chrome') === -1,
    'iosSafari': this.ios === true && vfNavigator.navigatorUserAgent.indexOf('safari') > -1,
};

if (vfClientInfo['chrome'] === true && (vfClientInfo['opera'] === true || vfClientInfo['edge'] === true)) {
    vfClientInfo['chrome'] = false;
}

/**
 * Path map for audio files of short phrases
 * 
 */
var vfAudioShortPharasesPaths = {
    'root': 'short_phrases/',
    'voice': vfSelectedLang + '/',
    'random': 'random/',
    'general': 'general/',
    'getRandomVoicesPath': function () {
        return this.root + this.random + this.voice + vfSelectedLang + '_';
    },
    'getGeneralVoicesPath': function () {
        return this.root + this.general + this.voice + vfSelectedLang + '_';
    }
}

let vfRandomShortPhrasePath = vfAudioShortPharasesPaths.getRandomVoicesPath();
let vfGeneralShortPhrasePath = vfAudioShortPharasesPaths.getGeneralVoicesPath();
let vfSilenceSoundPath = vfAudioShortPharasesPaths.root + 'silence.mp3';

/**
 * Alternative response audio files to be played/spoken
 *
 */
var vfAlternativeResponse = {
    /**
     * Text in audio file: Let me search it
     */
    'basic': vfGeneralShortPhrasePath + "basic.mp3",
    /**
     * Text in audio file: I am sorry but I am unable to access your microphone, Please connect a microphone or you can also type your question if needed
     */
    'micConnect': vfGeneralShortPhrasePath + "mic_connect.mp3",
    /**
     * Text in audio file: Voice search is currently unavailable, Please try again after some time
     */
    'unavailable': vfGeneralShortPhrasePath + "unavailable.mp3",
    /**
     * Text in audio file: I am unable to hear you
     */
    'notAudible': vfGeneralShortPhrasePath + "not_audible.mp3",
    'randomLib': [
        /**
         * Text in audio file: Just a second please
         */
        vfRandomShortPhrasePath + "0.mp3",
        /**
         * Text in audio file: I am on it
         */
        vfRandomShortPhrasePath + "1.mp3",
        /**
         * Text in audio file: No problem
         */
        vfRandomShortPhrasePath + "2.mp3",
        /**
         * Text in audio file: Just a moment, I need a brief rest
         */
        vfRandomShortPhrasePath + "3.mp3",
        /**
         * Text in audio file: You seem to work too hard, Get your self a coffee and I will find it up for you
         */
        vfRandomShortPhrasePath + "4.mp3",
        /**
         * Text in audio file: Coming right up
         */
        vfRandomShortPhrasePath + "5.mp3",
        /**
         * Text in audio file: I will do my best
         */
        vfRandomShortPhrasePath + "6.mp3",
        /**
         * Text in audio file: Anything for you. I will get right on it
         */
        vfRandomShortPhrasePath + "7.mp3",
        /**
         * Text in audio file: Working on it, One moment please
         */
        vfRandomShortPhrasePath + "8.mp3",
        /**
         * Text in audio file: Beep - Beep - Beep, just kidding, One moment please
         */
        vfRandomShortPhrasePath + "9.mp3"
    ],
};

var vfMessages = _vfTextPhrases['vfMessages'];
var vfErrorLibrary = _vfTextPhrases['vfErrorLibrary'];
var vfWidgetMessages = _vfTextPhrases['vfWidgetMessages'];

var vfIsMuteSimon = typeof vf._vfMuteAudioPhrases != 'undefined' && !!vf._vfMuteAudioPhrases && vf._vfMuteAudioPhrases == 'yes' ? true : false;
var vfIsSingleClick = typeof vf._vfSingleClick != 'undefined' && !!vf._vfSingleClick && vf._vfSingleClick == 'yes' ? true : false;
var vfIsElementor = typeof vf._vfElementor != 'undefined' && !!vf._vfElementor && vf._vfElementor == 'yes' ? true : false;
var vfIsMicInputField = typeof vf._vfInputField != 'undefined' && !!vf._vfInputField && vf._vfInputField == 'yes' ? true : false;
var vfDisableSearchField = typeof vf._vfSearchField != 'undefined' && !!vf._vfSearchField && vf._vfSearchField == 'yes' ? true : false;