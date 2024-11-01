<?php
defined('WPINC') or die;

class Voice_Forms_Plugin extends WP_Stack_Plugin2
{

    /**
     * @var self
     */
    public static $plugin_directory_path = null;
    public static $vf_ios = false;
    public static $vf_url = "";
    public static $is_chrome = false;
    public static $vf_license_key = "";
    public static $vf_api_access_key = null;
    public static $vf_admin_notice_logo = "";
    public static $vf_selected_language = "en-US";
    public static $vf_floating_mic_position = "Middle Right";
    //public static $vf_file_type  = '.min';
    public static $vf_file_type = ''; // For debugging
    public static $vf_settings_updated_ts = null;

    // ##########################################################################################################################
    // This map of language name as value (Eg: English) maps to value being saved to DB for plugin language option on settings page
    // With additional 130 language support feature this fallback is needed to preserve plugin language while upgrading/updating existing plugin on their site
    // ##########################################################################################################################
    public static $vf_fallback_lang_map = array(
        'en-US' => 'English',
        'en-GB' => 'British English',
        'de-DE' => 'German',
        'pt-PT' => 'Portuguese',
        'zh-CN' => 'Chinese',
        'zh-TW' => 'Chinese',
        'fr-FR' => 'French',
        'ja-JP' => 'Japanese',
        'ko-KR' => 'Korean',
        'es-ES' => 'Spanish'
    );

    // For access keys
    public static $vf_voice_services_access_keys = array(
        'api_url' => "https://yjonpgjqs9.execute-api.us-east-1.amazonaws.com/V2",
        'db_col_name' => 'vf_navigation_voice_services_access_keys',
        'value' => array(
            'g_stt_key' => null,
            'g_tts_key' => null,
            'synched_at' => null
        )
    );

    /**
     * Plugin version.
     */
    const VF_VERSION = '3.1.0';

    /**
     * Constructs the object, hooks in to `plugins_loaded`.
     */
    protected function __construct()
    {
        // Get database values
        self::$vf_license_key = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['license_key'], null);
        self::$vf_license_key = self::vf_sanitize_variable_for_local_script(self::$vf_license_key);

        // Get API access key.
        self::$vf_api_access_key = get_option('vf_api_system_key', null);
        self::$vf_api_access_key = self::vf_sanitize_variable_for_local_script(self::$vf_api_access_key);

        self::$vf_selected_language = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], 'en-US');
        self::$vf_selected_language = self::vf_sanitize_variable_for_local_script(self::$vf_selected_language);

        // Detect OS by user agent
        //$iPod   = stripos($_SERVER['HTTP_USER_AGENT'],"iPod");
        //$iPhone = stripos($_SERVER['HTTP_USER_AGENT'],"iPhone");
        //$iPad   = stripos($_SERVER['HTTP_USER_AGENT'],"iPad");
        //$chrome_browser = stripos($_SERVER['HTTP_USER_AGENT'],"Chrome");

        //if (!($iPod == false && $iPhone == false && $iPad == false)) { /*self::$vf_ios = true;*/ }

        //if ($chrome_browser != false) { self::$is_chrome = true; }

        $this->hook('plugins_loaded', 'add_hooks');
    }

    /**
     * Static method to get third party voice services access keys
     *
     */
    public static function vf_get_access_keys_from_db()
    {
        $temp_access_keys_from_db = get_option(self::$vf_voice_services_access_keys['db_col_name'], null);

        if (!!$temp_access_keys_from_db && is_array($temp_access_keys_from_db)) {

            if (array_key_exists('g_stt_key', $temp_access_keys_from_db)) {
                self::$vf_voice_services_access_keys['value']['g_stt_key'] = $temp_access_keys_from_db['g_stt_key'];
            }

            if (array_key_exists('g_tts_key', $temp_access_keys_from_db)) {
                self::$vf_voice_services_access_keys['value']['g_tts_key'] = $temp_access_keys_from_db['g_tts_key'];
            }

            if (array_key_exists('synched_at', $temp_access_keys_from_db)) {
                self::$vf_voice_services_access_keys['value']['synched_at'] = $temp_access_keys_from_db['synched_at'];
            }

            unset($temp_access_keys_from_db);
        }
    }

    /**
     * Adds hooks.
     */
    public function add_hooks()
    {
        self::$vf_settings_updated_ts = Voice_Forms_Settings_Page::vf_settings_modified_timestamp('set');

        $this->hook('init');
        $this->hook('admin_enqueue_scripts', 'enqueue_admin_scripts');

        if (
            (!empty(self::$vf_license_key) && !empty(self::$vf_api_access_key)) ||
            (VF_CLIENT['chrome'] === true && VfLanguage::gcp_supported(self::$vf_selected_language))
        ) {
            $this->hook('wp_enqueue_scripts', 'enqueue_frontend_scripts');
        }

        // Register action to hook into admin_notices to display dashboard notice for non-HTTPS site
        if (is_ssl() == false) {
            add_action('admin_notices', function () {
                ?>
                <div class="notice notice-error is-dismissible">
                    <p>
                        <?php echo wp_kses_post(self::$vf_admin_notice_logo); ?>
                        <br />
                        <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['other']['nonHttpsNotice']); ?>
                    </p>
                </div>
                <?php
            });
        }

        // Generate mp3 files on version changes
        Voice_Forms_Settings_Page::vf_generate_short_phrases_on_update(self::$vf_selected_language);

        // Register the STT service call action
        add_action('wp_ajax_' . 'vf_log_service_call', array($this, 'vf_log_service_call'));
        add_action('wp_ajax_nopriv_' . 'vf_log_service_call', array($this, 'vf_log_service_call'));

        // Register the action for HTTP Ajax request to refresh voice services token and keys
        add_action('wp_ajax_nopriv_' . 'vf_refresh_access_keys', array($this, 'vf_refresh_access_keys'));
        add_action('wp_ajax_' . 'vf_refresh_access_keys', array($this, 'vf_refresh_access_keys'));

        // Register action to hook into admin_notices to display dahsboard notices when license key is missing or invalid
        if ((empty(self::$vf_license_key) || empty(self::$vf_api_access_key)) && VF_CLIENT['chrome'] === false) {
            add_action('admin_notices', array($this, 'notice_non_chrome'));
        }
    }

    /**
     * Method as action to invoke when license key is missing and browser is non chrome
     */
    public function notice_non_chrome()
    {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p>
                <?php echo wp_kses_post(self::$vf_admin_notice_logo); ?>
                <br />
                <?php echo wp_kses_post("<b>" . VF_LANGUAGE_LIBRARY['other']['nonChromeNotice']['warning'] . "</b>" . VF_LANGUAGE_LIBRARY['other']['nonChromeNotice']['thisPlugin']); ?>
                <a target="blank" href="https://speak2web.com/plugin/#plan">
                    <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['other']['nonChromeNotice']['goPro']); ?>
                </a>
                <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['other']['nonChromeNotice']['supportMoreBrowsers']); ?>
            </p>
        </div>
        <?php
    }

    /**
     * Initializes the plugin, registers textdomain, etc.
     * Most of WP is loaded at this stage, and the user is authenticated
     */
    public function init()
    {
        self::$vf_url = $this->get_url();
        self::$vf_admin_notice_logo = "<img style='margin-left: -7px;vertical-align:middle;width:110px; height: 36px;' src='" . self::$vf_url . "images/speak2web_logo.png'/>|<b> Voice Forms</b>";

        // Get plugin directory path and add trailing slash if needed (For browser compatibility)
        self::$plugin_directory_path = plugin_dir_path(__DIR__);
        $trailing_slash = substr(self::$plugin_directory_path, -1);

        if ($trailing_slash != '/') {
            self::$plugin_directory_path .= '/';
        }

        if (isset($GLOBALS['pagenow']) && $GLOBALS['pagenow'] == 'plugins.php') {
            add_filter('plugin_row_meta', array(&$this, 'custom_plugin_row_meta'), 10, 2);
        }

        $this->load_textdomain('voice-forms', '/languages');

        // To enable floating mic by default (only when 'vf_floating_mic' option is missing from DB)
        $is_vf_floating_mic_exist = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['floating_mic']);

        if ($is_vf_floating_mic_exist === false) {
            update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['floating_mic'], 'yes');
        }

        // Get floating mic position from DB
        self::$vf_floating_mic_position = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['floating_mic_position']);

        if (self::$vf_floating_mic_position === false) {
            update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['floating_mic_position'], 'Middle Right');
            self::$vf_floating_mic_position = 'Middle Right';
        }

        // load access keys of third party voice services from local DB
        self::vf_get_access_keys_from_db();

        // Obtain third party voice services token and keys from api
        self::vf_synch_voice_access_keys();
    }

    /**
     * Static method to get data related to file
     *
     * @param $intent - string : 'url' or 'timestamp'
     * @param $partial_file_path - string : Path of file (Partial and mostly relative path)
     * @param $file_extension - string : 'js' or 'css'
     *
     * $returns $vf_file_data - string : Time as a Unix timestamp or absolute url to the file
     */
    public static function vf_get_file_meta_data($intent = "", $partial_file_path = "", $file_extension = "")
    {
        $vf_file_data = "";

        try {
            if (empty($file_extension) || empty($partial_file_path) || empty($intent))
                throw new Exception("VDN: Error while getting file data.", 1);

            $intent = strtolower(trim($intent));
            $file_ext = '.' . str_replace(".", "", trim($file_extension));
            $partial_file_path = trim($partial_file_path);

            if ($intent == 'timestamp') {
                if (!empty(self::$vf_settings_updated_ts)) {
                    $vf_file_data = self::$vf_settings_updated_ts;
                } else {
                    $vf_file_data = filemtime(VF_PLUGIN['ABS_PATH'] . $partial_file_path . self::$vf_file_type . $file_ext);
                }
            } else if ($intent == 'url') {
                $vf_file_data = VF_PLUGIN['ABS_URL'] . $partial_file_path . self::$vf_file_type . $file_ext;
            }
        } catch (\Exception $ex) {
            $vf_file_data = "";
        }

        return $vf_file_data;
    }

    /**
     * Method to enqueue JS scripts and CSS of Admin for loading 
     */
    public function enqueue_admin_scripts()
    {
        //################################################################################
        //
        // Enqueue 'vf-settings' CSS file to load at front end
        //
        //################################################################################
        wp_enqueue_style(
            'vf_settings_css',
            self::vf_get_file_meta_data('url', 'css/settings/vf-settings', 'css'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'css/settings/vf-settings', 'css'),
            'screen'
        );

        //################################################################################
        //
        // Enqueue 'vf-settings' javasctipt file to load at front end
        //
        //################################################################################
        wp_enqueue_script(
            'vf-settings',
            self::vf_get_file_meta_data('url', 'js/settings/vf-settings', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/settings/vf-settings', 'js'),
            true
        );
    }

    /**
     * Method to enqueue JS scripts and CSS for loading at Front end
     */
    public function enqueue_frontend_scripts()
    {
        //################################################################################
        //
        // Enqueue 'voice-forms' CSS file to load at front end
        //
        //################################################################################
        wp_enqueue_style(
            'voice-forms',
            self::vf_get_file_meta_data('url', 'css/voice-forms', 'css'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'css/voice-forms', 'css'),
            'screen'
        );

        //################################################################################
        //
        // Enqueue 'vf.text-library' javasctipt file to load at front end
        //
        //################################################################################
        wp_enqueue_script(
            'vf.text-library',
            self::vf_get_file_meta_data('url', 'js/vf.text-library', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/vf.text-library', 'js'),
            true
        );

        //##################################################################################################################
        // Determine STT language context for plugin
        //##################################################################################################################
        $vf_stt_language_context = array(
            'gcp' => array(
                'stt' => 'N',
                'langCode' => null,
                'endPoint' => null,
                'key' => null,
                'qs' => array('key' => null)
            )
        );

        $vf_gcp_supported = VfLanguage::gcp_supported(self::$vf_selected_language);
        $vf_lang_not_supported_by_vendors = false;

        if (VF_CLIENT['chrome'] === true) {
            if ($vf_gcp_supported === true) {
                $vf_stt_language_context['gcp']['stt'] = 'Y';
            } else {
                $vf_stt_language_context['gcp']['stt'] = 'Y';
                $vf_lang_not_supported_by_vendors = true;
            }
        } else {
            if ($vf_gcp_supported === true) {
                $vf_stt_language_context['gcp']['stt'] = 'Y';
            }
        }

        if ($vf_lang_not_supported_by_vendors === true) {
            self::$vf_selected_language = 'en-US';
            update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], self::$vf_selected_language);
        }

        if ($vf_stt_language_context['gcp']['stt'] == 'Y') {
            $vf_gcp_lang_code = VfLanguage::$gcp_language_set[self::$vf_selected_language][VfLanguage::LANG_CODE];
            $vf_gcp_key = self::$vf_voice_services_access_keys['value']['g_stt_key'];

            $vf_stt_language_context['gcp']['endPoint'] = 'https://speech.googleapis.com/v1/speech:recognize';
            $vf_stt_language_context['gcp']['langCode'] = $vf_gcp_lang_code;
            $vf_stt_language_context['gcp']['key'] = $vf_gcp_key;
            $vf_stt_language_context['gcp']['qs']['key'] = '?key=';
        }

        wp_localize_script('vf.text-library', '_vfSttLanguageContext', $vf_stt_language_context);
        wp_localize_script('vf.text-library', '_vfTextPhrases', VfLanguage::$textual_phrases[self::$vf_selected_language]);


        // Make ajax obj available to 'vf.speech-handler.js'
        $count_nonce = wp_create_nonce('service_call_count');
        $vf_keys_refresh_nonce = wp_create_nonce('keys_refresh');

        wp_localize_script('vf.text-library', 'vfAjaxObj', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => $count_nonce,
            'keys_nonce' => $vf_keys_refresh_nonce
        )
        );

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
        $domainName = $_SERVER['SERVER_NAME'];

        wp_add_inline_script('vf.text-library', 'vfWorkerPath =' . json_encode($this->get_url() . 'js/recorderjs/vf.audio-recorder-worker' . self::$vf_file_type . '.js'));

        $vf_floating_mic = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['floating_mic'], null);
        $vf_floating_mic = self::vf_sanitize_variable_for_local_script($vf_floating_mic);



        wp_localize_script('vf.text-library', 'voice_forms', array(
            'button_message' => __('Speech Input', 'voice-forms'),
            'talk_message' => __('Start Talking…', 'voice-forms'),
        )
        );

        $vf_mic_listening_timeout = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout'], null);
        $vf_mic_listening_timeout = self::vf_sanitize_variable_for_local_script($vf_mic_listening_timeout);

        if (is_null($vf_mic_listening_timeout)) {
            update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout'], '8');
            $vf_mic_listening_timeout = '8';
        }


        $vf_current_value = get_option('vf_current_value', "0");
        $vf_last_value = get_option('vf_last_value', "0");
        $vf_last_value_updated_at = get_option('vf_last_value_updated_at', null);
        $vf_last_value_updated_at = self::vf_sanitize_variable_for_local_script($vf_last_value_updated_at);

        $vf_service_logs = array(
            'updatedAt' => $vf_last_value_updated_at,
            'currentValue' => $vf_current_value,
            'lastValue' => $vf_last_value,
        );
        wp_localize_script('vf.text-library', 'vfServiceLogs', $vf_service_logs);

        $vf_mute_audio_phrases = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['mute_audio_phrases'], null);
        $vf_mute_audio_phrases = self::vf_sanitize_variable_for_local_script($vf_mute_audio_phrases);

        $vf_single_click = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['single_click'], null);
        $vf_single_click = self::vf_sanitize_variable_for_local_script($vf_single_click);

        $vf_elementor = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['elementor'], null);
        $vf_elementor = self::vf_sanitize_variable_for_local_script($vf_elementor);

        $vf_input_field = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['input_field'], null);
        $vf_input_field = self::vf_sanitize_variable_for_local_script($vf_input_field);

        $vf_search_field = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['search_field'], null);
        $vf_search_field = self::vf_sanitize_variable_for_local_script($vf_search_field);

        // Localizes a registered script with JS variable for Keyboard Mic Switch
        $vf_keyboard_mic_switch = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['keyboard_mic_switch'], '');
        $vf_keyboard_mic_switch = self::vf_sanitize_variable_for_local_script($vf_keyboard_mic_switch);

        // Localizes a registered script with JS variable for Special keys Keyboard Mic Switch
        $vf_keyboard_special_key = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key'], 'OtherKey');
        $vf_keyboard_special_key = self::vf_sanitize_variable_for_local_script($vf_keyboard_special_key);

        $vf_array = array(
            "vfSelectedLanguage" => self::$vf_selected_language,
            "vfFloatingMic" => $vf_floating_mic,
            "vfSelectedMicPosition" => self::$vf_floating_mic_position,
            "vfMicListenTimeoutDuration" => $vf_mic_listening_timeout,
            "vfXApiKey" => self::$vf_api_access_key,
            "_vfMuteAudioPhrases" => $vf_mute_audio_phrases,
            "_vfElementor" => $vf_elementor,
            "_vfInputField" => $vf_input_field,
            "_vfSearchField" => $vf_search_field,
            "_vfSingleClick" => $vf_single_click,
            "vfImagesPath" => self::$vf_url . 'images/',
            "_vfPath" => VF_PLUGIN['ABS_URL'],
            "vfCurrentHostName" => $protocol . $domainName,
            'vfKeyboardMicSwitch' => $vf_keyboard_mic_switch,
            'vfKeyboardSpecialKey' => $vf_keyboard_special_key
        );
        wp_localize_script('vf.text-library', 'vf', $vf_array);
        //################################################################################
        //
        // Enqueue 'vf.speech-handler' javasctipt file to load at front end
        //
        //################################################################################        
        wp_enqueue_script(
            'vf.speech-handler',
            self::vf_get_file_meta_data('url', 'js/vf.speech-handler', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/vf.speech-handler', 'js'),
            true
        );

        //################################################################################
        //
        // Enqueue 'vf.audio-input-handler' javasctipt file to load at front end
        //
        //################################################################################
        wp_enqueue_script(
            'vf.audio-input-handler',
            self::vf_get_file_meta_data('url', 'js/vf.audio-input-handler', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/vf.audio-input-handler', 'js'),
            true
        );

        //################################################################################
        //
        // Enqueue 'vf.audio-recorder' javasctipt file to load at front end
        //
        //################################################################################
        wp_enqueue_script(
            'vf.audio-recorder',
            self::vf_get_file_meta_data('url', 'js/recorderjs/vf.audio-recorder', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/recorderjs/vf.audio-recorder', 'js'),
            true
        );

        //################################################################################
        //
        // Enqueue 'voice-forms' javasctipt file to load at front end
        //
        //################################################################################
        wp_enqueue_script(
            'voice-forms',
            self::vf_get_file_meta_data('url', 'js/voice-forms', 'js'),
            array(),
            self::vf_get_file_meta_data('timestamp', 'js/voice-forms', 'js'),
            true
        );
    }

    /**
     * Method to add additional link to settings page below plugin on the plugins page.
     */
    function custom_plugin_row_meta($links, $file)
    {
        if (strpos($file, 'voice-forms.php') !== false) {
            $new_links = array('settings' => '<a href="' . site_url() . '/wp-admin/admin.php?page=voice-forms-settings" title="Voice Forms">Settings</a>');
            $links = array_merge($links, $new_links);
        }

        return $links;
    }

    /**
     * Class method to get REST API access key ('x-api-key') against license key instate to avail plugin (Voice Forms) service
     *
     * @param $convertable_license_key - String : License key customer posses
     */
    public static function vf_get_api_key_from_license_key($convertable_license_key = null, $license_key_field_changed = false)
    {
        $result = array();

        try {
            // Throw exception when license key is blank or unavailable
            if (!(isset($convertable_license_key) && is_null($convertable_license_key) == false && trim($convertable_license_key) != '')) {
                update_option('vf_api_system_key', '');
                throw new Exception("Error: License key is unavailable or invalid.");
            }

            $vf_api_system_key = get_option('vf_api_system_key', null);
            $vf_api_system_key = isset($vf_api_system_key) ? trim($vf_api_system_key) : null;

            if (!empty($vf_api_system_key) && $license_key_field_changed === false) {
                self::$vf_api_access_key = $vf_api_system_key;
            } else {
                $body = array('license' => trim($convertable_license_key));
                $args = array(
                    'body' => json_encode($body),
                    'timeout' => '60',
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'x-api-key' => 'jEODHPKy2z7GEIuerFBWk7a0LqVRJ7ER3aDExmbK'
                    )
                );

                $response = wp_remote_post('https://1kosjp937k.execute-api.us-east-1.amazonaws.com/V1', $args);


                // Check the response code
                $response_code = wp_remote_retrieve_response_code($response);

                if ($response_code == 200) {
                    $response_body = wp_remote_retrieve_body($response);
                    $result = @json_decode($response_body, true);

                    if (!empty($result) && is_array($result)) {
                        if (array_key_exists('errorMessage', $result)) {
                            update_option('vf_api_system_key', '');
                        } else {
                            $conversion_status_code = !empty($result['statusCode']) ? trim($result['statusCode']) : null;
                            ;
                            $conversion_status = !empty($result['status']) ? trim($result['status']) : null;

                            if (!is_null($conversion_status_code) && !is_null($conversion_status) && (int) $conversion_status_code == 200 && strtolower(trim($conversion_status)) == 'success') {
                                self::$vf_api_access_key = !empty($result['key']) ? trim($result['key']) : null;

                                if (self::$vf_api_access_key !== null) {
                                    update_option('vf_api_system_key', self::$vf_api_access_key);
                                } else {
                                    update_option('vf_api_system_key', '');
                                }
                            } else {
                                update_option('vf_api_system_key', '');
                            }
                        }
                    }
                }
            }
        } catch (\Exception $ex) {
            self::$vf_api_access_key = null;
        }

        self::$vf_api_access_key = self::vf_sanitize_variable_for_local_script(self::$vf_api_access_key);
    }

    /**
     * Class method to sanitize empty variables
     *
     * @param $vf_var - String : Variable to sanitize
     * @return 
     */
    public static function vf_sanitize_variable_for_local_script($vf_var = null)
    {
        if (empty($vf_var)) {
            return null;
        } else {
            return $vf_var;
        }
    }

    /**
     * Method to log STT service call count to local DB and Cloud
     *
     * @return JSON response obj
     */
    public function vf_log_service_call()
    {
        check_ajax_referer('service_call_count');

        // Get values from database, HTTP request
        $vf_do_update_last_value = isset($_REQUEST['updateLastValue']) ? (int) $_REQUEST['updateLastValue'] : 0;
        $vf_current_value = (int) get_option('vf_current_value', 0);
        $vf_last_value = (int) get_option('vf_last_value', 0);
        $vf_last_value_updated_at = get_option('vf_last_value_updated_at', null);
        $vf_current_value_to_log = ($vf_do_update_last_value == 1) ? $vf_current_value : $vf_current_value + 1;
        $vf_temp_last_value = get_option('vf_last_value', null); // To check if we are making initial service log call
        $vf_log_result = array(
            'vfSttAccess' => 'allowed',
            'updatedAt' => $vf_last_value_updated_at,
            'currentValue' => $vf_current_value,
            'lastValue' => $vf_last_value
        );

        try {
            // We need to reset current value count to 0 if current count log exceeds 25000
            if ($vf_current_value_to_log > 25000) {
                update_option('vf_current_value', 0);
            }

            // Log service count by calling cloud API if last update was before 24 hours or current count is +50 of last count
            if (is_null($vf_temp_last_value) || $vf_do_update_last_value === 1 || ($vf_current_value_to_log > ($vf_last_value + 50))) {
                $vf_body = array(
                    'license' => trim(self::$vf_license_key),
                    'action' => "logCalls",
                    'currentValue' => $vf_current_value_to_log,
                    'lastValue' => $vf_last_value,
                );

                $vf_args = array(
                    'body' => json_encode($vf_body),
                    'timeout' => '60',
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'x-api-key' => 'jEODHPKy2z7GEIuerFBWk7a0LqVRJ7ER3aDExmbK'
                    )
                );

                $vf_response = wp_remote_post('https://1kosjp937k.execute-api.us-east-1.amazonaws.com/V2', $vf_args);

                // Check the response code
                $vf_response_code = wp_remote_retrieve_response_code($vf_response);


                if ($vf_response_code == 200) {
                    $vf_response_body = wp_remote_retrieve_body($vf_response);
                    $vf_result = @json_decode($vf_response_body, true);

                    if (!empty($vf_result) && is_array($vf_result)) {
                        $log_status = array_key_exists("status", $vf_result) ? strtolower($vf_result['status']) : 'failed';
                        $actual_current_value = array_key_exists("current Value", $vf_result) ? strtolower($vf_result['current Value']) : null;
                        $vf_error = array_key_exists("errorMessage", $vf_result) ? true : false;

                        if ($log_status == 'success' && is_null($actual_current_value) === false && $vf_error === false) {
                            // Store updated values to database
                            $vf_current_timestamp = time(); // epoc 
                            update_option('vf_current_value', $actual_current_value);
                            update_option('vf_last_value', $actual_current_value);
                            update_option('vf_last_value_updated_at', $vf_current_timestamp);

                            // Prepare response 
                            $vf_log_result['updatedAt'] = $vf_current_timestamp;
                            $vf_log_result['currentValue'] = $actual_current_value;
                            $vf_log_result['lastValue'] = $actual_current_value;
                            $vf_log_result['cloud'] = true;
                        }
                    }
                }
            } else {
                // Icrease current count
                update_option('vf_current_value', $vf_current_value_to_log);

                // Prepare response
                $vf_log_result['currentValue'] = $vf_current_value_to_log;
                $vf_log_result['local'] = true;
            }
        } catch (\Exception $ex) {
            // Prepare response 
            $vf_log_result['vfSttAccess'] = 'restricted';
        }

        wp_send_json($vf_log_result);
    }

    /**
     * Method to register plugin for the first time
     *
     */
    public static function vf_register_plugin()
    {
        try {
            // Get plugin first activation status and license key from DB 
            $vf_license_key = get_option('vf_license_key', null);
            $vf_first_activation = get_option('vf_first_activation', null);
            $vf_site_name = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : $_SERVER['SERVER_NAME'];

            if (empty($vf_first_activation) && empty(trim($vf_license_key))) {
                // Mark first activation activity flag in local DB 
                update_option('vf_first_activation', true); // Store first activation flag in DB

                // Detect site language and set the plugin language
                $vf_site_language_code = get_locale();
                $vf_site_language_code = str_replace('_', '-', $vf_site_language_code);

                if (!empty($vf_site_language_code) && array_key_exists($vf_site_language_code, VfLanguage::get_all_languages())) {
                    update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], $vf_site_language_code);
                }

                // Generate UUID and store in DB
                $vf_new_uuid = wp_generate_uuid4();
                update_option('vf_uuid', $vf_new_uuid);

                $vf_body = array(
                    'action' => 'regVF',
                    'url' => $vf_site_name . '_' . $vf_new_uuid,
                );

                $vf_args = array(
                    'body' => json_encode($vf_body),
                    'timeout' => '60',
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                        'x-api-key' => 'jEODHPKy2z7GEIuerFBWk7a0LqVRJ7ER3aDExmbK'
                    )
                );

                $vf_response = wp_remote_post('https://1kosjp937k.execute-api.us-east-1.amazonaws.com/V2', $vf_args);

                // Check the response body
                $vf_response_body = wp_remote_retrieve_body($vf_response);
                $vf_result = @json_decode($vf_response_body, true);

                if (!empty($vf_result) && is_array($vf_result)) {
                    $log_status = array_key_exists('status', $vf_result) ? strtolower(trim($vf_result['status'])) : null;

                    if ($log_status == '200 success') {
                        // Do nothing for now                               
                    }
                }
            }
        } catch (\Exception $ex) {
            // Do nothing for now               
        }
    }

    /**
     * Method as HTTP request handler to obtain refreshed voice services token and keys
     *
     * @return JSON $vf_refreshed_keys Containing IBM Watson STT token for now.
     *
     */
    public function vf_refresh_access_keys()
    {
        check_ajax_referer('keys_refresh');

        self::vf_synch_voice_access_keys(true);

        $vf_refreshed_keys = array(
            'gStt' => self::$vf_voice_services_access_keys['value']['g_stt_key']
        );

        wp_send_json($vf_refreshed_keys);
    }

    /**
     * Static method to obtain access keys for Google STT & TTS and IBN Watson token
     *
     * @param boolean $forced_synch To by-pass validation to obtain token and keys from API
     *
     */
    public static function vf_synch_voice_access_keys($forced_synch = false)
    {
        try {
            $vf_do_synch = false;

            $vf_g_stt_key = self::$vf_voice_services_access_keys['value']['g_stt_key'];
            $vf_g_tts_key = self::$vf_voice_services_access_keys['value']['g_tts_key'];
            $vf_synched_at = self::$vf_voice_services_access_keys['value']['synched_at'];

            if (
                empty($vf_g_stt_key) ||
                empty($vf_g_tts_key) ||
                empty($vf_synched_at) ||
                $forced_synch === true
            ) {
                $vf_do_synch = true;
            }

            if (!!$vf_synched_at && $vf_do_synch === false) {
                $vf_synched_at_threshold = $vf_synched_at + (60 * 60 * 6); //Add 6 hours (as epoc) to last synched at time
                $vf_current_time = time();

                if ($vf_current_time > $vf_synched_at_threshold) {
                    $vf_do_synch = true;
                }
            }

            if ($vf_do_synch === false)
                return;

            $vf_args = array(
                'timeout' => '90',
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'x-api-key' => self::$vf_api_access_key
                )
            );

            $vf_response = wp_remote_get(self::$vf_voice_services_access_keys['api_url'], $vf_args);

            // Check the response code
            $response_code = wp_remote_retrieve_response_code($vf_response);

            if ($response_code == 200) {
                $response_body = wp_remote_retrieve_body($vf_response);
                $vf_result = @json_decode($response_body, true);

                $vf_google_stt_key = array_key_exists('gSTT', $vf_result) ? $vf_result['gSTT'] : null;
                $vf_google_tts_key = array_key_exists('TTS', $vf_result) ? $vf_result['TTS'] : null;

                /**
                 * Deliberate separation of if blocks, do not merge them for optimization as 
                 * it would ruin the flexibility and independency of response values (none of them depend on each other anyway).
                 *
                 */
                $vf_synchable_local_keys = 0;

                if (!!$vf_google_stt_key) {
                    self::$vf_voice_services_access_keys['value']['g_stt_key'] = $vf_google_stt_key;
                    $vf_synchable_local_keys += 1;
                }

                if (!!$vf_google_tts_key) {
                    self::$vf_voice_services_access_keys['value']['g_tts_key'] = $vf_google_tts_key;
                    $vf_synchable_local_keys += 1;
                }

                // Update database
                if ($vf_synchable_local_keys > 0) {
                    self::$vf_voice_services_access_keys['value']['synched_at'] = time();
                    update_option(
                        self::$vf_voice_services_access_keys['db_col_name'],
                        self::$vf_voice_services_access_keys['value']
                    );
                }
            }
        } catch (\Exception $ex) {
            // Nullify keys
            self::$vf_voice_services_access_keys['value']['g_stt_key'] = null;
            self::$vf_voice_services_access_keys['value']['g_tts_key'] = null;
            self::$vf_voice_services_access_keys['value']['synched_at'] = null;
        }
    }
}