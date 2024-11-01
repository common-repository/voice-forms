<?php
if (!defined('ABSPATH'))
    exit;

class Voice_Forms_Settings_Page
{
    // Database field name map
    const BASIC_CONFIG_OPTION_NAMES = array(
        'license_key' => 'vf_license_key',
        'mic_listening_timeout' => 'vf_mic_listening_timeout',
        'selected_language' => 'vf_selected_language',
        'floating_mic' => 'vf_floating_mic',
        'floating_mic_position' => 'vf_floating_mic_position',
        'mute_audio_phrases' => 'vf_mute_audio_phrases',
        'single_click' => 'vf_single_click',
        'elementor' => 'vf_elementor',
        'input_field' => 'vf_input_field',
        'search_field' => 'vf_search_field',
        'keyboard_mic_switch' => 'vf_keyboard_mic_switch',
        'keyboard_special_key' => 'vf_keyboard_special_key'
    );

    private $vf_license_key = '';
    private $vf_mic_listening_timeout = null;
    private $vf_selected_language = 'en-US';
    private $vf_floating_mic = null;
    private $vf_floating_mic_position = 'Middle Right';
    private $vf_all_languages = array();
    private $vf_mute_audio_phrases = null;
    private $vf_single_click = null;
    private $vf_elementor = null;
    private $vf_input_field = null;
    private $vf_search_field = null;
    private $vf_keyboard_mic_switch = '';
    private $vf_keyboard_special_key = 'OtherKey';

    /**
     * Start up
     */
    public function __construct()
    {
        add_action('admin_menu', array($this, 'vf_add_plugin_page'));
        add_action('admin_init', array($this, 'vf_page_init'));

        //### THIS FILTERS HOOK INTO A PROCESS BEFORE OPTION GETTING STORED TO DB
        // Register filters for basic config options
        foreach (self::BASIC_CONFIG_OPTION_NAMES as $key => $option) {
            add_filter('pre_update_option_' . $option, array($this, 'vf_pre_update_basic_config'), 10, 3);
        }

        // Register callback to hook into post create and update (License key) option action
        add_action('add_option_' . self::BASIC_CONFIG_OPTION_NAMES['license_key'], array($this, 'vf_post_adding_license_key'), 10, 2);
        add_action('update_option_' . self::BASIC_CONFIG_OPTION_NAMES['license_key'], array($this, 'vf_post_update_license_key'), 10, 2);
    }

    /**
     * Static method to get timestamp from and set timestamp to DB (Timestamp of setting option update)
     *
     * @param $action - string : 'get' or 'set'
     * 
     * $returns $vf_modified_timestamp - string : Time as a Unix timestamp
     */
    public static function vf_settings_modified_timestamp($action = null)
    {
        $vf_modified_timestamp = null;

        try {
            if (empty($action))
                return $vf_modified_timestamp;

            if ($action == 'get') {
                $vf_modified_timestamp = get_option('vf_settings_updated_timestamp', null);
            } else if ($action == 'set') {
                $vf_timestamp = time();
                update_option('vf_settings_updated_timestamp', $vf_timestamp);
                $vf_modified_timestamp = $vf_timestamp;
            }
        } catch (\Exception $ex) {
            $vf_modified_timestamp = null;
        }

        return $vf_modified_timestamp;
    }

    /**
     * Method as callback to handle basic config options data before storing to DB
     *
     * @param $old_value - string : Existing Option value from database
     * @param $new_value - string : New Option value to be stored in database
     * @param $option_name - string : Name of the option
     */
    public function vf_pre_update_basic_config($new_value, $old_value, $option_name)
    {
        /**
         * Comparing two string values to check if option data modified.
         *
         * Preserve settings updated timestamp 
         */
        if ($old_value != $new_value) {
            $vf_setting_update_ts = self::vf_settings_modified_timestamp('set');
            unset($vf_setting_update_ts);
        }
        if ($option_name == self::BASIC_CONFIG_OPTION_NAMES['selected_language']) {
            self::vf_inject_short_audio_phrases(trim($new_value));
        }

        return $new_value;
    }

    /**
     * Static method to fetch short audio phrases from 'speak2web.com' and create local audio file for it.
     *
     * @param String  $vf_lang_code  Language code (eg: en-US)
     *
     */
    public static function vf_inject_short_audio_phrases($vf_lang_code)
    {

        $vf_lang_file_path = $vf_lang_code . '/' . $vf_lang_code;
        $vf_general = VF_PLUGIN['ABS_PATH'] . VF_PLUGIN['SHORT_PHRASES']['root'] . VF_PLUGIN['SHORT_PHRASES']['general'];
        $vf_random = VF_PLUGIN['ABS_PATH'] . VF_PLUGIN['SHORT_PHRASES']['root'] . VF_PLUGIN['SHORT_PHRASES']['random'];

        // Create 'general' folder
        if (!file_exists($vf_general . $vf_lang_code)) {
            $oldmask = umask(0);
            mkdir($vf_general . $vf_lang_code, 0777, true);
            umask($oldmask);
        }

        if (!file_exists($vf_general . $vf_lang_code . '/lang_mismatch.txt')) {
            touch($vf_general . $vf_lang_code . '/lang_mismatch.txt');
        }

        $vf_general_lang_mismatch = false;

        if (file_exists($vf_general . $vf_lang_code) && file_exists($vf_general . $vf_lang_code . '/lang_mismatch.txt')) {
            $vf_general_lang_mismatch = true;
        }

        // Check folder exist with language name in 'general' folder
        if ($vf_general_lang_mismatch === true) {

            $vf_general_file_names = array(
                '_basic',
                '_mic_connect',
                '_not_audible',
                '_unavailable'
            );

            $vf_lang_mismatch = false;

            for ($i = 0; $i < count($vf_general_file_names); $i++) {
                $vf_file_name = $vf_general_file_names[$i];
                $vf_file_exist = file_exists($vf_general . $vf_lang_file_path . $vf_file_name . '.mp3');
                if (!$vf_file_exist) {
                    $request = $vf_general_lang_mismatch === true || !$vf_file_exist ? wp_remote_get('https://speak2web.com/' . VF_PLUGIN['SHORT_PHRASES']['root'] . VF_PLUGIN['SHORT_PHRASES']['general'] . $vf_lang_file_path . $vf_file_name . '.mp3') : false;
                    if (is_wp_error($request)) {
                        continue;
                    }
                    $vf_file_data = wp_remote_retrieve_body($request);

                    if ($vf_file_data !== false) {
                        if ($vf_file_exist) {
                            unlink($vf_general . $vf_lang_file_path . $vf_file_name . '.mp3');
                        }

                        $vf_local_file = fopen($vf_general . $vf_lang_file_path . $vf_file_name . '.mp3', "w");

                        if ($vf_local_file) {
                            // Write contents to the file
                            fwrite($vf_local_file, $vf_file_data);

                            // Close the file
                            fclose($vf_local_file);
                        }
                    } else if (!$vf_file_exist) {
                        $vf_src_file = $vf_general . 'en-US/en-US' . $vf_file_name . '.mp3';
                        $vf_dest_file = $vf_general . $vf_lang_file_path . $vf_file_name . '.mp3';
                        copy($vf_src_file, $vf_dest_file);

                        if ($vf_lang_mismatch !== true) {
                            $vf_lang_mismatch = true;
                        }
                    } else {
                        if ($vf_lang_mismatch !== true) {
                            $vf_lang_mismatch = true;
                        }
                    }
                }
            }

            if ($vf_lang_mismatch === true) {
                $vf_lang_mismatch = false;

                if ($vf_general_lang_mismatch === false) {
                    touch($vf_general . $vf_lang_code . '/lang_mismatch.txt');
                }
            } else {
                if ($vf_general_lang_mismatch === true) {
                    unlink($vf_general . $vf_lang_code . '/lang_mismatch.txt');
                }
            }
        }

        // Create 'random' folder
        if (!file_exists($vf_random . $vf_lang_code)) {
            $oldmask = umask(0);
            mkdir($vf_random . $vf_lang_code, 0777, true);
            umask($oldmask);
        }

        if (!file_exists($vf_random . $vf_lang_code . '/lang_mismatch.txt')) {
            touch($vf_random . $vf_lang_code . '/lang_mismatch.txt');
        }

        $vf_random_lang_mismatch = false;

        if (file_exists($vf_random . $vf_lang_code) && file_exists($vf_random . $vf_lang_code . '/lang_mismatch.txt')) {
            $vf_random_lang_mismatch = true;
        }

        // Check folder exist with language name in 'random' folder
        if ($vf_random_lang_mismatch === true) {
            $vf_lang_mismatch = false;

            for ($j = 0; $j < 10; $j++) {
                $vf_file_name = '_' . $j;
                $vf_file_exist = file_exists($vf_random . $vf_lang_file_path . $vf_file_name . '.mp3');
                if (!$vf_file_exist) {
                    $request = $vf_random_lang_mismatch === true || !$vf_file_exist ? wp_remote_get('https://speak2web.com/' . VF_PLUGIN['SHORT_PHRASES']['root'] . VF_PLUGIN['SHORT_PHRASES']['random'] . $vf_lang_file_path . $vf_file_name . '.mp3') : false;
                    if (is_wp_error($request)) {
                        continue;
                    }
                    $vf_file_data = wp_remote_retrieve_body($request);
                    if ($vf_file_data !== false) {
                        if ($vf_file_exist) {
                            unlink($vf_random . $vf_lang_file_path . $vf_file_name . '.mp3');
                        }

                        $vf_local_file = fopen($vf_random . $vf_lang_file_path . $vf_file_name . '.mp3', "w");

                        if ($vf_local_file) {
                            // Write contents to the file
                            fwrite($vf_local_file, $vf_file_data);

                            // Close the file
                            fclose($vf_local_file);
                        }
                    } else if (!$vf_file_exist) {
                        $vf_src_file = $vf_random . 'en-US/en-US' . $vf_file_name . '.mp3';
                        $vf_dest_file = $vf_random . $vf_lang_file_path . $vf_file_name . '.mp3';
                        copy($vf_src_file, $vf_dest_file);

                        if ($vf_lang_mismatch !== true) {
                            $vf_lang_mismatch = true;
                        }
                    } else {
                        if ($vf_lang_mismatch !== true) {
                            $vf_lang_mismatch = true;
                        }
                    }
                }
            }

            if ($vf_lang_mismatch === true) {
                $vf_lang_mismatch = false;

                if ($vf_random_lang_mismatch === false) {
                    touch($vf_random . $vf_lang_code . '/lang_mismatch.txt');
                }
            } else {
                if ($vf_random_lang_mismatch === true) {
                    unlink($vf_random . $vf_lang_code . '/lang_mismatch.txt');
                }
            }
        }
    }

    /**
     * Method for generate files when plugin update
     * 
     * @param string $language
     */
    public static function vf_generate_short_phrases_on_update($language)
    {
        $plugin_data = get_file_data(VF_PLUGIN['ABS_PATH'] . '/voice-forms.php', [
            'Version' => 'Version'
        ], 'plugin');
        $vf_version = get_option('vf_version');
        $vf_new_version = Voice_Forms_Plugin::VF_VERSION !== $plugin_data['Version'] ? $plugin_data['Version'] : Voice_Forms_Plugin::VF_VERSION;
        if ($vf_version !== $vf_new_version || $vf_version === null) {
            update_option('vf_version', Voice_Forms_Plugin::VF_VERSION);
            self::vf_inject_short_audio_phrases($language);
        }
    }

    /**
     * Method as callback post to license key option creation in DB
     *
     * @param $option_name - string : Option name
     * @param $option_value - string : Option value
     */
    public function vf_post_adding_license_key($option_name, $option_value)
    {
        try {
            Voice_Forms_Plugin::vf_get_api_key_from_license_key(trim($option_value), true);

            $vf_setting_update_ts = self::vf_settings_modified_timestamp('set');
            unset($vf_setting_update_ts);
        } catch (\Exception $ex) {
            // Do nothing for now
        }
    }

    /**
     * Method as callback post to license key option update in DB
     *
     * @param $old_value - string : Option value before update
     * @param $new_value - string : Updated Option value
     */
    public function vf_post_update_license_key($old_value, $new_value)
    {
        try {
            $option_value = strip_tags(stripslashes($new_value));

            if ($old_value != trim($option_value)) {
                Voice_Forms_Plugin::vf_get_api_key_from_license_key(trim($option_value), true);

                $vf_setting_update_ts = self::vf_settings_modified_timestamp('set');
                unset($vf_setting_update_ts);
            }
        } catch (\Exception $ex) {
            // Do nothing for now
        }
    }

    /**
     * Add options page
     */
    public function vf_add_plugin_page()
    {
        // This page will be under "Settings"
        add_submenu_page(
            'options-general.php',
            // Parent menu as 'settings'
            'Voice Forms',
            'Voice Forms',
            'manage_options',
            'voice-forms-settings',
            // Slug for page
            array($this, 'vf_settings_create_page') // View 
        );
    }

    /**
     * Options/Settings page callback to create view/html of settings page
     */
    public function vf_settings_create_page()
    {
        // For license key
        $this->vf_license_key = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['license_key'], '')));
        $this->vf_license_key = !empty($this->vf_license_key) ? $this->vf_license_key : '';

        if (empty($this->vf_license_key)) {
            update_option('vf_api_system_key', '');
        }

        // For Mic listening auto timeout
        $this->vf_mic_listening_timeout = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout'], null)));

        // if voice type is blank then always store voice type as male
        if (empty($this->vf_mic_listening_timeout) || $this->vf_mic_listening_timeout < 8) {
            update_option(self::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout'], 8);
            $this->vf_mic_listening_timeout = 8;
        } elseif ($this->vf_mic_listening_timeout > 20) {
            update_option(self::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout'], 20);
            $this->vf_mic_listening_timeout = 20;
        }

        // For language
        $this->vf_selected_language = strip_tags(
            stripslashes(
                get_option(
                    self::BASIC_CONFIG_OPTION_NAMES['selected_language'],
                    'en-US'
                )
            )
        );

        // For floating mic
        $this->vf_floating_mic = strip_tags(
            stripslashes(
                get_option(
                    self::BASIC_CONFIG_OPTION_NAMES['floating_mic'],
                    null
                )
            )
        );

        // For Keyboard Mic Switch
        $this->vf_keyboard_mic_switch = strip_tags(
            stripslashes(
                get_option(
                    self::BASIC_CONFIG_OPTION_NAMES['keyboard_mic_switch'],
                    ''
                )
            )
        );

        // For Special keys Keyboard Mic Switch
        $this->vf_keyboard_special_key = strip_tags(
            stripslashes(
                get_option(
                    self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key'],
                    'OtherKey'
                )
            )
        );

        // For Mic Position
        $this->vf_floating_mic_position = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['floating_mic_position'], 'Middle Right')));

        $this->vf_all_languages = VfLanguage::get_all_languages();
        $this->vf_all_languages = isset($this->vf_all_languages) ? $this->vf_all_languages : array('en-US' => array(VfLanguage::NAME => 'English (United States)', VfLanguage::LANG_CODE => 'en-US'));

        // For mute audio phrases
        $this->vf_mute_audio_phrases = strip_tags(
            stripslashes(
                get_option(
                    self::BASIC_CONFIG_OPTION_NAMES['mute_audio_phrases'],
                    null
                )
            )
        );
        // For single click
        $this->vf_single_click = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['single_click'], null)));
        // For Elementor
        $this->vf_elementor = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['elementor'], null)));
        // For Manual Voice Mic On Input Field 
        $this->vf_input_field = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['input_field'], null)));
        // For disable search mic
        $this->vf_search_field = strip_tags(stripslashes(get_option(self::BASIC_CONFIG_OPTION_NAMES['search_field'], null)));
?>
        <div class="wrap">
            <div id="vfavigationSettingsWrapper">
                <div id="vfavigationSettingsHeader" class="vf-row">
                    <div class="vf-setting-header-column-1"><br>
                        <span id="vfavigationSettingsPageHeading">Voice Forms Setup</span>
                    </div>
                    <div class="vf-setting-header-column-2">
                        <a title="Wordpress Plugin - speak2web" target="blank" href="https://speak2web.com/plugin/">
                            <img id="vfavigationSettingsPageHeaderLogo" src="<?php echo esc_url(dirname(plugin_dir_url(__FILE__)) . '/images/speak2web_logo.png') ?>">
                        </a>
                    </div>
                </div>

                <form id="vfavigationBasicConfigForm" method="post" action="options.php">
                    <?php
                    // This prints out all hidden setting fields
                    settings_fields('vf-basic-config-settings-group');
                    do_settings_sections('vf-settings');

                    // To display errors
                    settings_errors('vf-settings', true, true);
                    ?>
                    <div id="vfavigationBasicConfigSection" class='vf-row vf-card'>
                        <div id="vfBasicConfHeaderSection" class="vf-setting-basic-config-column-1 vf-basic-config-section-title">
                            <table id="vfavigationBasicConfHeaderTable">
                                <tr>
                                    <th>
                                        <h4><u>
                                                <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['basicConfig']['basicConfiguration']); ?>
                                            </u></h4>
                                    </th>
                                </tr>
                            </table>
                        </div>

                        <div class="vf-setting-basic-config-column-2">

                            <div class="vf-basic-config-sub-row">
                                <div>
                                    <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['basicConfig']['selectLanguage']); ?>
                                    <select id="vfLanguage" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['selected_language']); ?>">
                                        <?php
                                        foreach ($this->vf_all_languages as $langCode => $lang) {
                                        ?>
                                            <option <?php selected($langCode, $this->vf_selected_language); ?> value=<?php echo esc_attr($langCode); ?>><?php echo esc_attr($lang[VfLanguage::NAME]); ?>
                                            </option>
                                        <?php
                                        }
                                        ?>
                                    </select>
                                </div>
                            </div>

                            <div class="vf-basic-config-sub-row">
                                <div id='vfSubscribe'>
                                    <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['subscribe']); ?><a href="https://speak2web.com/voice-enabled-wordpress-forms-search" target="_blank">https://speak2web.com/voice-enabled-wordpress-forms-search</a>
                                </div>
                                <div class="vf-basic-config-attached-label-column">
                                    <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['licenseKey']); ?>
                                </div>
                                <div class="vf-basic-config-attached-input-column">
                                    <input type="text" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['license_key']); ?>" id="vfavigationLicenseKey" placeholder="<?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['copyYourLicenseKey']); ?>" value="<?php echo esc_attr($this->vf_license_key); ?>" />
                                </div>
                                <?php if (strlen($this->vf_license_key) == 32)
                                    echo "
                                    <script type=\"text/javascript\">
                                    var subscribe_bar = document.getElementById('vfSubscribe'); 
                                    subscribe_bar.style.display = 'none';
                                    </script>
                                ";
                                ?>
                            </div>
                            <div class="vf-basic-config-sub-row">
                                <span class="vf-autotimeout-label">
                                    <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['autoTimeoutDuration']); ?>
                                </span>
                                <input class="vf-autotimeout-mic" type='number' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout']); ?>" min="8" max="20" step="1" onKeyup="vfResetTimeoutDefaultValue(this, event)" onKeydown="vfValidateTimeoutValue(this, event)" value="<?php echo esc_attr($this->vf_mic_listening_timeout); ?>" />
                            </div>
                            <div class="vf-basic-config-sub-row">
                                <label for="vfSearchField">
                                    <input id="vfSearchField" type='checkbox' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['search_field']); ?>" value="yes" <?php checked('yes', $this->vf_search_field); ?>> Disable mic on search
                                    field
                                </label>
                            </div>
                            <div class="vf-basic-config-sub-row">
                                <label for="vfMuteAudioPhrases">
                                    <input id="vfMuteAudioPhrases" type='checkbox' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['mute_audio_phrases']); ?>" value="yes" <?php checked('yes', $this->vf_mute_audio_phrases); ?>> <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['muteAudioPhrases']); ?>
                                </label>
                            </div>
                            <!-- Floating Mic Position -->
                            <div class="vf-basic-config-sub-row">
                                <div class="vf-dotted-border">
                                    <b>
                                        <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['basicConfig']['floatingMicOptions']); ?>
                                    </b>
                                    <hr>
                                    <div class="vf-basic-config-sub-row">
                                        <label for="vfFloatingMicPosition">
                                            <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['selectFloatingMicPosition']); ?>
                                            <select id="vfFloatingMicPosition" name="<?php echo self::BASIC_CONFIG_OPTION_NAMES['floating_mic_position']; ?>">
                                                <option value="Middle Right" <?php selected('Middle Right', $this->vf_floating_mic_position); ?>>Middle Right</option>
                                                <option value="Middle Left" <?php selected('Middle Left', $this->vf_floating_mic_position); ?>>Middle Left</option>
                                                <option value="Top Right" <?php selected('Top Right', $this->vf_floating_mic_position); ?>>Top Right</option>
                                                <option value="Top Left" <?php selected('Top Left', $this->vf_floating_mic_position); ?>>Top Left</option>
                                                <option value="Bottom Right" <?php selected('Bottom Right', $this->vf_floating_mic_position); ?>>Bottom Right</option>
                                                <option value="Bottom Left" <?php selected('Bottom Left', $this->vf_floating_mic_position); ?>>Bottom Left</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div class="vf-basic-config-sub-row">
                                        <label for="vfFloatingMic">
                                            <input id="vfFloatingMic" type='checkbox' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['floating_mic']); ?>" value="yes" <?php checked('yes', $this->vf_floating_mic); ?>> <?php echo esc_attr(VF_LANGUAGE_LIBRARY['basicConfig']['floatingMic']); ?>
                                        </label>
                                    </div>
                                    <div class="vf-basic-config-sub-row">
                                        <label for="vfSingleClick">
                                            <input id="vfSingleClick" type='checkbox' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['single_click']); ?>" value="yes" <?php checked('yes', $this->vf_single_click); ?>> Enable single
                                            click transcription.
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <!-- END Floating Mic Position -->

                            <div class="vf-basic-config-sub-row">
                                <div class="vf-dotted-border">
                                    <strong>Trigger STT Mic Using Key</strong><br>
                                    <hr>
                                    <p style="color: gray;"><b style="color: blue;">&#x2139; </b>To trigger STT mic, press
                                        selected key two times.</p>
                                    <label for="vfSpecialKeyAlt" style="margin-right: 8px; margin-top: 5px;">
                                        <input type="radio" id="vfSpecialKeyAlt" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']); ?>" value="Alt" onclick="vftoggleInputFieldOtherKey('Alt')" <?php checked('Alt', $this->vf_keyboard_special_key); ?>>
                                        Alt
                                    </label>
                                    <label for="vfSpecialKeyCtrl" style="margin-right: 8px;">
                                        <input type="radio" id="vfSpecialKeyCtrl" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']); ?>" value="Control" onclick="vftoggleInputFieldOtherKey('Control')" <?php checked('Control', $this->vf_keyboard_special_key); ?>>
                                        Ctrl
                                    </label>
                                    <label for="vfSpecialKeyShift" style="margin-right: 8px;">
                                        <input type="radio" id="vfSpecialKeyShift" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']); ?>" value="Shift" onclick="vftoggleInputFieldOtherKey('Shift')" <?php checked('Shift', $this->vf_keyboard_special_key); ?>>
                                        Shift
                                    </label>
                                    <label for="vfSpecialKeySpace" style="margin-right: 8px;">
                                        <input type="radio" id="vfSpecialKeySpace" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']); ?>" value="Space" onclick="vftoggleInputFieldOtherKey('Space')" <?php checked('Space', $this->vf_keyboard_special_key); ?>>
                                        Space
                                    </label>
                                    <label for="vfSpecialKeyOtherKey">
                                        <input type="radio" id="vfSpecialKeyOtherKey" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']); ?>" value="OtherKey" onclick="vftoggleInputFieldOtherKey('OtherKey')" <?php checked('OtherKey', $this->vf_keyboard_special_key); ?>>
                                        OtherKey
                                    </label>
                                    <label for="vfKeyBoardSwitch" class="vfShowOtherInput vf-hide"><br><br>
                                        <b>Key<span class="vf-important">*</span> :</b>
                                        <input type="text" maxlength="1" placeholder="a - z" oninput="vfValidateValueForOtherKey(this, event)" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['keyboard_mic_switch']); ?>" id="vfKeyBoardSwitch" value="<?php echo esc_attr($this->vf_keyboard_mic_switch); ?>">
                                    </label>
                                    <div class="vfWarningInputKey"></div>
                                </div>
                            </div>

                            <div class="vf-basic-config-sub-row">
                                <div class="vf-dotted-border">
                                    <strong>Elementor Settings</strong>
                                    <hr>
                                    <div>
                                        <label for="vfElementor">
                                            <input id="vfElementor" type="checkbox" name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['elementor']); ?>" value="yes" <?php checked('yes', $this->vf_elementor); ?>> Enable Elementor
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="vf-basic-config-sub-row">
                                <div class="vf-dotted-border">
                                    <b>
                                        <?php echo wp_kses_post(VF_LANGUAGE_LIBRARY['basicConfig']['inputField']); ?>
                                    </b>
                                    <hr>
                                    <p style="color: gray;"><b style="color: blue;">&#x2139; </b>To enable STT mic, type
                                        "{allow_stt}" inside placeholder of selected input field.</p>
                                    <div class="vf-basic-config-sub-row">
                                        <label for="vfInputField">
                                            <input id="vfInputField" type='checkbox' name="<?php echo esc_attr(self::BASIC_CONFIG_OPTION_NAMES['input_field']); ?>" value="yes" <?php checked('yes', $this->vf_input_field); ?>> Enable mic on all
                                            input fields
                                        </label>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="vf-setting-basic-config-column-3 vf-basic-config-sub-row">
                            <?php
                            $other_attributes = array('id' => 'vfnavigationBasicConfigSettingsSave');
                            submit_button(
                                VF_LANGUAGE_LIBRARY['basicConfig']['saveSettings'],
                                'primary',
                                'vf-basic-config-settings-save',
                                false,
                                $other_attributes
                            );
                            ?>
                        </div>
                    </div>
                </form>
            </div>
        </div>
<?php
    }

    /**
     * Register and add settings
     */
    public function vf_page_init()
    {
        // Register settings for feilds of 'Basic Configuration' section
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['license_key']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['mic_listening_timeout']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['selected_language']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['floating_mic']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['floating_mic_position']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['mute_audio_phrases']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['single_click']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['elementor']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['input_field']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['search_field']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['keyboard_special_key']);
        register_setting('vf-basic-config-settings-group', self::BASIC_CONFIG_OPTION_NAMES['keyboard_mic_switch']);
    }
}

// check user capabilities and hook into 'init' to initialize 'Voice Forms' settings object
add_action('init', 'initialize_vf_settings_object');

/**
 * Initialize 'Voice Forms' settings object when 'pluggable' files are loaded from '/wp-includes/pluggable'
 * Which contains 'current_user_can' function.
 */
function initialize_vf_settings_object()
{
    if (!current_user_can('manage_options'))
        return;

    $voice_forms_settings_page = new Voice_Forms_Settings_Page();
}
