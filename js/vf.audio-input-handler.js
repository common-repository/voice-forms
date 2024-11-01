// *****************************************************************************************************
// *******              speak2web VOICE FORMS                                                ***********
// *******               Get your subscription at                                            ***********
// *******                    https://speak2web.com/plugin#plans                             ***********
// *******               Need support? https://speak2web.com/support                         ***********
// *******               Licensed GPLv2+                                                     ***********
//******************************************************************************************************

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var vfAudioContext = null;
var vfAudioInput = null,
    vfRealAudioInput = null,
    vfInputPoint = null,
    vfAudioRecorder = null;
var vfRecIndex = 0;
var initCB = null;
let vfStream = null;

/**
 * Function to initialize audio capturing resources
 * 
 * @param { cb: function } A callback function
 */
function vfInitAudio(cb) {
    initCB = cb;

    // Check when last service log was updated
    try {
        let vfLastUpdatedAtTimestamp = vfServiceLogs.updatedAt || null;

        if (vfLastUpdatedAtTimestamp !== null) {
            vfLastUpdatedAtTimestamp = Number(vfLastUpdatedAtTimestamp);
            let currentUtcTimestamp = Math.round(new Date().getTime() / 1000);

            // Add 24 hours to last updated timestamp
            vfLastUpdatedAtTimestamp = vfLastUpdatedAtTimestamp + (24 * 3600);

            // Check if last service call log update was older than 24 hours
            if (currentUtcTimestamp >= vfLastUpdatedAtTimestamp) {
                // Log service call count
                vfLogServiceCall(1);
            }
        }
    } catch (err) {
        // do nothing
    }

    vfAudioContext = new AudioContext();

    navigator.mediaDevices.getUserMedia({ "audio": !0 })
        .then(vfGotStream)
        .catch(function (e) {
            // Play 'micConnect' playback
            vfAudioPlayer.configure(vfAlternativeResponse['micConnect']);
            vfAudioPlayer.play();

            console.log("VF: We caught en error while gaining access to audio input due to: ", e.message);
        }
        );
}

/**
 * A callback function to obtain audio stream
 * 
 * @param { stream: MediaStream } An audio track 
 */
function vfGotStream(stream) {
    vfInputPoint = vfAudioContext.createGain();
    vfStream = stream;

    // Create an AudioNode from the stream.
    vfRealAudioInput = vfAudioContext.createMediaStreamSource(stream);
    vfAudioInput = vfRealAudioInput;
    vfAudioInput.connect(vfInputPoint);

    vfAudioRecorder = new Recorder(vfInputPoint);
    initCB(vfAudioRecorder);
}

/**
 * Function to stop accessing audio resource
 *
 */
function vfStopAudio() {
    try {
        vfStream.getTracks().forEach(function (track) {
            track.stop();
        });

        vfAudioContext.close();
        vfAudioContext = null;
    } catch (err) {
        console.log('VF Exception: Unable to release audio resource due to: ' + err.message);
    }
}
