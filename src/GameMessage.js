// GameMessage.lua: localised string table.
// Only the English locale ('en') was populated in the original; 'ch' was empty.

const en = {
    menu_play:          'Play',
    menu_options:       'Options',
    menu_credits:       'Credits',
    menu_share:         'Share Me',
    menu_full:          'Full Version',
    menu_music_on:      'Music On',
    menu_music_off:     'Music Off',
    menu_sound_on:      'Sound On',
    menu_sound_off:     'Sound Off',
    menu_twitter:       'Twitter',
    menu_facebook:      'Facebook',

    gamemenu_paused:    'Game Paused',
    gamemenu_failed:    'Level Failed',
    gamemenu_win:       'You win',
    play_next_pack:     'Play next level pack',

    help_1_1_1:  'You can stick to Blue and Red magnets!',
    help_1_1_2:  'Pick up every item available!',
    help_1_1_3:  'Collect every star that you can!',
    help_1_1_4:  'Touch,',
    help_1_1_5:  'Drag,',
    help_1_1_7:  'Release!',
    help_1_2_1:  'Dotted line shows next color of Magnet Boy',
    help_1_2_2:  'Same colored magnet will push Magnet Boy',
    help_1_6:    'Pull back on the elastic spring to jump higher or lower',
    help_1_8:    'Non-Circular magnets cannot give you direction, When you see them just \'Tap\' on the screen',
    help_1_10:   'Moving magnets will stop moving once Magnet Boy sticks to them',
    help_1_16:   'Be Careful, Some magnets change their magnetic poles from positive to negative!',
    help_2_2:    'You can jump through a PORTAL and use it as a short cut!',
    help_2_8:    'Beware of BLACK HOLES!',
    help_3_1:    'Beware of the Iron list! If he gets attracted to it Magnet Boy will be stuck forever!',
    help_3_5:    'Use your Deactivation Tool to pass past iron lists',
    help_4_11:   'Use the WIND tool to blow away from dangerous obstacles',
};

const ch = {};

export const messages = { en, ch };

let _locale = 'en';

export function setLocale(locale) { _locale = locale; }

export function msg(key) {
    return messages[_locale]?.[key] ?? messages.en[key] ?? key;
}
