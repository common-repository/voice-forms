<?php

/**
 * Plugin Name: Voice Forms
 * Description: Allows users to fill up forms using voice.
 * Version:     3.1.0
 * Author:      speak2web
 * Author URI:  https://speak2web.com/
 * Text Domain: voice-forms
 * Domain Path: /languages  
 */

/**
 * Copyright (c) 2019 speak2web
 *
 * Voice Forms is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * Voice Forms is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Voice Forms; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

defined('WPINC') or die;

include(dirname(__FILE__) . '/lib/requirements-check.php');

$voice_forms_requirements_check = new Voice_Forms_Requirements_Check(
	array(
		'title' => 'Voice Forms',
		'php' => '5.3',
		'wp' => '2.6',
		'file' => __FILE__,
	)
);
class Wp_Elementor_widget
{

	private static $instance = null;


	public static function instance()
	{
		if (is_null(self::$instance)) {
			self::$instance = new self();
		}

		return self::$instance;
	}


	private function include_widgets_files()
	{
		require_once(__DIR__ . '/widgets/oembed-widget.php');
	}

	public function register_widgets()
	{
		// It's now safe to include Widgets files.
		$this->include_widgets_files();

		// Register the plugin widget classes.
		\Elementor\Plugin::instance()->widgets_manager->register(new \Wp_Elementor_Floating_Mic_Widget());
	}

	public function register_categories($elements_manager)
	{
		// creating speak2web category
		$elements_manager->add_category(
			'speak2web',
			[
				'title' => __('Speak2web', 'myWidget'),
				'icon' => 'fa fa-plug'
			]
		);
	}

	public function __construct()
	{
		// Register the widgets.
		add_action('elementor/widgets/register', array($this, 'register_widgets'));
		add_action('elementor/elements/categories_registered', array($this, 'register_categories'));
	}
}
Wp_Elementor_widget::instance();

if ($voice_forms_requirements_check->passes()) {
	$vf_client_info = array(
		'chrome' => false,
		'firefox' => false,
		'edge' => false,
		'ie' => false,
		'macSafari' => false,
		'iosSafari' => false,
		'opera' => false
	);

	// Chrome
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'chrome') !== false) {
		$vf_client_info['chrome'] = true;
	}

	// Firefox
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'firefox') !== false) {
		$vf_client_info['firefox'] = true;
	}

	// Edge
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'edge') !== false || stripos($_SERVER['HTTP_USER_AGENT'], 'edg') !== false) {
		$vf_client_info['edge'] = true;
	}

	// IE
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'msie') !== false || stripos($_SERVER['HTTP_USER_AGENT'], 'trident') !== false) {
		$vf_client_info['ie'] = true;
	}

	// Mac Safari
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'macintosh') !== false && stripos($_SERVER['HTTP_USER_AGENT'], 'chrome') === false && stripos($_SERVER['HTTP_USER_AGENT'], 'safari') !== false) {
		$vf_client_info['macSafari'] = true;
	}

	// iOS
	if ((stripos($_SERVER['HTTP_USER_AGENT'], 'iphone') !== false || stripos($_SERVER['HTTP_USER_AGENT'], 'ipad') !== false || stripos($_SERVER['HTTP_USER_AGENT'], 'ipod') !== false) && stripos($_SERVER['HTTP_USER_AGENT'], 'safari') !== false) {
		$vf_client_info['iosSafari'] = true;
	}

	// Opera
	if (stripos($_SERVER['HTTP_USER_AGENT'], 'opera') !== false || stripos($_SERVER['HTTP_USER_AGENT'], 'opr') !== false) {
		$vf_client_info['opera'] = true;
	}

	if ($vf_client_info['chrome'] === true && ($vf_client_info['opera'] === true || $vf_client_info['edge'] === true)) {
		$vf_client_info['chrome'] = false;
	}

	define('VF_CLIENT', $vf_client_info);

	// To get all active plugins.
	$vf_all_active_plugins = (array) null;

	// Get selected language from DB and load local translation library
	$vf_selected_language = get_option('vf_selected_language', 'en-US');
	$vf_selected_language = empty($vf_selected_language) ? 'en-US' : trim($vf_selected_language);
	$vf_language_file_name = $vf_selected_language === 'de-DE' ? 'vf_de_DE' : 'vf_en_EN';
	include(dirname(__FILE__) . '/classes/plugin-languages/' . $vf_language_file_name . '.php');

	try {
		switch ($vf_selected_language) {
			case 'de-DE':
				define('VF_LANGUAGE_LIBRARY', vf_de_DE::VF_LANGUAGE_LIB);
				break;
			default:
				define('VF_LANGUAGE_LIBRARY', vf_en_EN::VF_LANGUAGE_LIB);
		}
	} catch (\Exception $e) {
		// Do nothing for now
	}

	define(
		'VF_PLUGIN',
		array(
			'ABS_PATH' => plugin_dir_path(__FILE__),
			'ABS_URL' => plugin_dir_url(__FILE__),
			'BASE_NAME' => plugin_basename(__FILE__),
			'SHORT_PHRASES' => array('root' => 'short_phrases/', 'general' => 'general/', 'random' => 'random/')
		)
	);

	// Pull in the plugin classes and initialize
	include(dirname(__FILE__) . '/lib/wp-stack-plugin.php');
	include(dirname(__FILE__) . '/classes/vf-admin-notices.php');
	include(dirname(__FILE__) . '/classes/languages/languages.php');
	include(dirname(__FILE__) . '/classes/plugin.php');
	include(dirname(__FILE__) . '/classes/settings-page.php');

	Voice_Forms_Plugin::start(__FILE__);

	// Inline plugin notices
	$path = plugin_basename(__FILE__);

	// Hook into plugin activation
	register_activation_hook(__FILE__, function () {
		$vf_setting_update_ts = Voice_Forms_Settings_Page::vf_settings_modified_timestamp('set');
		unset($vf_setting_update_ts);

		// Get active plugins
		$vf_all_active_plugins = get_option('active_plugins');

		// Get lower and higher version active plugins path
		$wcva_path = vf_get_active_plugin_path('voice-shopping-for-woocommerce', $vf_all_active_plugins);
		$vdn_path = vf_get_active_plugin_path('voice-dialog-navigation', $vf_all_active_plugins);
		$dvc_path = vf_get_active_plugin_path('dynamic-voice-command', $vf_all_active_plugins);
		$vswc_path = vf_get_active_plugin_path('voice-search-for-woocommerce', $vf_all_active_plugins);
		$uvs_path = vf_get_active_plugin_path('universal-voice-search', $vf_all_active_plugins);

		$vf_plugin_url = plugin_dir_url(__FILE__);

		// Deactivate 'Voice Search For WooCommerce' Plugin
		if (!empty($vswc_path) && is_plugin_active($vswc_path)) {
			deactivate_plugins($vswc_path);
		}

		// Deactivate 'Universal Voice Search' Plugin
		if (!empty($uvs_path) && is_plugin_active($uvs_path)) {
			deactivate_plugins($uvs_path);
		}

		// Display activation denied notice and stop activating this plugin
		if (
			(!empty($wcva_path) && is_plugin_active($wcva_path))
			|| (!empty($vdn_path) && is_plugin_active($vdn_path))
			|| (!empty($dvc_path) && is_plugin_active($dvc_path))
		) {
			wp_die(Vf_Admin_Notices::vf_denied_activation_notice($vf_plugin_url));
		}

		//###########################################################################################################################################
		// Transition code to preserve admin's language choice before upgrading/updating to additional 130 language support feature 
		// 
		// Here admin's language choice is check against fallback array which maps the old way of storing language name as value with language code
		//###########################################################################################################################################
		$vf_selected_language = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], 'en-US');
		$vf_selected_language = isset($vf_selected_language) && !empty($vf_selected_language) ? $vf_selected_language : 'en-US';
		$vf_lang_code = 'en-US';

		if (in_array($vf_selected_language, Voice_Forms_Plugin::$vf_fallback_lang_map)) {
			$vf_lang_code = array_search($vf_selected_language, Voice_Forms_Plugin::$vf_fallback_lang_map);
			update_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], $vf_lang_code);
		} else {
			$vf_lang_code = $vf_selected_language;
		}

		// Register plugin
		Voice_Forms_Plugin::vf_register_plugin();

		$vf_general = VF_PLUGIN['ABS_PATH'] . VF_PLUGIN['SHORT_PHRASES']['root'] . VF_PLUGIN['SHORT_PHRASES']['general'];

		// Get language from database as 'Voice_Forms_Plugin::vf_register_plugin()' could have set auto detected language
		$vf_lang_code = get_option(Voice_Forms_Settings_Page::BASIC_CONFIG_OPTION_NAMES['selected_language'], 'en-US');

		Voice_Forms_Settings_Page::vf_inject_short_audio_phrases($vf_lang_code);
	});

	/**
	 * Function to get path of active plugin
	 *
	 * @param $vf_plugin_file_name  String  Name of the plugin file (Without extension)
	 * @param $vf_active_plugins  Array  Array of active plugins path
	 *
	 * @return $vf_active_plugin_path  String  Path of active plugin otherwise NULL
	 *
	 */
	function vf_get_active_plugin_path($vf_plugin_file_name = "", $vf_active_plugins = array())
	{
		$vf_active_plugin_path = null;

		try {
			if (!!$vf_active_plugins && !!$vf_plugin_file_name) {
				$vf_plugin_file_name = trim($vf_plugin_file_name);

				foreach ($vf_active_plugins as $key => $active_plugin) {
					$plugin_name_pos = stripos($active_plugin, $vf_plugin_file_name . ".php");

					if ($plugin_name_pos !== false) {
						$vf_active_plugin_path = $active_plugin;
						break;
					}
				}
			}
		} catch (\Exception $ex) {
			$vf_active_plugin_path = null;
		}

		return $vf_active_plugin_path;
	}

	// Define the uninstall function
	function vf_remove_version_from_db()
	{
		delete_option('vf_version');
	}

	// Register the uninstall hook
	register_uninstall_hook(__FILE__, 'vf_remove_version_from_db');
}

unset($voice_forms_requirements_check);
