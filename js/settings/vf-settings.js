
/**
 * Function to reset auto end mic listening timeout
 *
 * @param this- DOMElement Object
 * @param evt - Event 
 */
function vfResetTimeoutDefaultValue(el, evt) {
    if (typeof (el) == 'undefined') return;

    if (el.value.length == 0) {
        el.value = "8";
    } else if (parseInt(el.value) > 20) {
        el.value = "20";
    } else if (parseInt(el.value) < 8) {
        el.value = "8";
    }
}

/**
 * Function to validate length of timeout value
 *
 * @param this- DOMElement Object
 * @param evt - Event 
 */
function vfValidateTimeoutValue(el, evt) {
    if (typeof (el) == 'undefined') return;

    if (el.value.length == 2 && parseInt(el.value) > 20) {
        evt.preventDefault();
    }
}

/**
 * Function to handel keyboard special key or normal key
 * 
 * @param Key - string : Selected key type
 */
function vftoggleInputFieldOtherKey(Key = 'OtherKey') {
    try {
        let warningField = document.getElementsByClassName('vfWarningInputKey')[0];
        let vfaOtherKey = document.querySelector('input#vfKeyBoardSwitch');
        let vfaOtherInput = document.getElementsByClassName('vfShowOtherInput')[0];
        if (Key === 'OtherKey') {
            vfaOtherKey.removeAttribute('disabled');
            vfaOtherInput.classList.remove('vf-hide');
            vfaOtherKey.setAttribute('required', 'required');
            warningField.innerHTML = "";
        } else {
            vfaOtherKey.setAttribute('disabled', 'disabled');
            vfaOtherInput.classList.add('vf-hide');
            vfaOtherKey.removeAttribute('required');
            warningField.innerHTML = "";
        }
    } catch (error) {

    }
}

/**
 * Function for validate input keyboard key that can store only single char from a-z
 * 
 * @param {el: HTMLDomObject} 
 * @param {evt} event  
 */
function vfValidateValueForOtherKey(el, evt) {
    let warningField = document.getElementsByClassName('vfWarningInputKey')[0];
    if (evt.data == null) {
        warningField.innerHTML = "";
    } else if (evt.data.charCodeAt(0) >= 97 && evt.data.charCodeAt(0) <= 122) {
        el.value = evt.data;
        warningField.innerHTML = "";
    } else {
        warningField.innerHTML = `<span style="color: red;"><b>&#9888;</b> Please enter lowercase letters only (a-z) </span>`;
        el.value = '';
    }
}

// ########################################################################
//
// For Window and Document load and Unload Events
//
// ########################################################################
window.addEventListener('load', function () {

    if (this.document.getElementById('vfSpecialKeyOtherKey')) {
        if (this.document.getElementById('vfSpecialKeyOtherKey').checked) {
            this.document.getElementsByClassName('vfShowOtherInput')[0].classList.remove('vf-hide');
            this.document.getElementById('vfKeyBoardSwitch').setAttribute('required', 'required');
        }
    }
});
