// Custom CodeMirror Editor Module
let editor = null;
let previewElement = null;
let previewContent = null;
let tablePickerElement = null;
let emojiPickerElement = null;

// Emoji data for picker
const emojiData = [
    { emoji: '😀', shortcode: ':grinning:' },
    { emoji: '😃', shortcode: ':smiley:' },
    { emoji: '😄', shortcode: ':smile:' },
    { emoji: '😁', shortcode: ':grin:' },
    { emoji: '😆', shortcode: ':laughing:' },
    { emoji: '😅', shortcode: ':sweat_smile:' },
    { emoji: '🤣', shortcode: ':rofl:' },
    { emoji: '😂', shortcode: ':joy:' },
    { emoji: '🙂', shortcode: ':slightly_smiling_face:' },
    { emoji: '🙃', shortcode: ':upside_down_face:' },
    { emoji: '😉', shortcode: ':wink:' },
    { emoji: '😊', shortcode: ':blush:' },
    { emoji: '😇', shortcode: ':innocent:' },
    { emoji: '🥰', shortcode: ':smiling_face_with_three_hearts:' },
    { emoji: '😍', shortcode: ':heart_eyes:' },
    { emoji: '🤩', shortcode: ':star_struck:' },
    { emoji: '😘', shortcode: ':kissing_heart:' },
    { emoji: '😗', shortcode: ':kissing:' },
    { emoji: '☺️', shortcode: ':relaxed:' },
    { emoji: '😚', shortcode: ':kissing_closed_eyes:' },
    { emoji: '😙', shortcode: ':kissing_smiling_eyes:' },
    { emoji: '😋', shortcode: ':yum:' },
    { emoji: '😛', shortcode: ':stuck_out_tongue:' },
    { emoji: '😜', shortcode: ':stuck_out_tongue_winking_eye:' },
    { emoji: '🤪', shortcode: ':zany_face:' },
    { emoji: '😝', shortcode: ':stuck_out_tongue_closed_eyes:' },
    { emoji: '🤑', shortcode: ':money_mouth_face:' },
    { emoji: '🤗', shortcode: ':hugs:' },
    { emoji: '🤭', shortcode: ':hand_over_mouth:' },
    { emoji: '🤫', shortcode: ':shushing_face:' },
    { emoji: '🤔', shortcode: ':thinking:' },
    { emoji: '🤐', shortcode: ':zipper_mouth_face:' },
    { emoji: '🤨', shortcode: ':raised_eyebrow:' },
    { emoji: '😐', shortcode: ':neutral_face:' },
    { emoji: '😑', shortcode: ':expressionless:' },
    { emoji: '😶', shortcode: ':no_mouth:' },
    { emoji: '😏', shortcode: ':smirk:' },
    { emoji: '😒', shortcode: ':unamused:' },
    { emoji: '🙄', shortcode: ':roll_eyes:' },
    { emoji: '😬', shortcode: ':grimacing:' },
    { emoji: '🤥', shortcode: ':lying_face:' },
    { emoji: '😌', shortcode: ':relieved:' },
    { emoji: '😔', shortcode: ':pensive:' },
    { emoji: '😪', shortcode: ':sleepy:' },
    { emoji: '🤤', shortcode: ':drooling_face:' },
    { emoji: '😴', shortcode: ':sleeping:' },
    { emoji: '😷', shortcode: ':mask:' },
    { emoji: '🤒', shortcode: ':face_with_thermometer:' },
    { emoji: '🤕', shortcode: ':face_with_head_bandage:' },
    { emoji: '🤢', shortcode: ':nauseated_face:' },
    { emoji: '🤮', shortcode: ':vomiting_face:' },
    { emoji: '🤧', shortcode: ':sneezing_face:' },
    { emoji: '🥵', shortcode: ':hot_face:' },
    { emoji: '🥶', shortcode: ':cold_face:' },
    { emoji: '🥴', shortcode: ':woozy_face:' },
    { emoji: '😵', shortcode: ':dizzy_face:' },
    { emoji: '🤯', shortcode: ':exploding_head:' },
    { emoji: '🤠', shortcode: ':cowboy_hat_face:' },
    { emoji: '🥳', shortcode: ':partying_face:' },
    { emoji: '😎', shortcode: ':sunglasses:' },
    { emoji: '🤓', shortcode: ':nerd_face:' },
    { emoji: '🧐', shortcode: ':monocle_face:' },
    { emoji: '😕', shortcode: ':confused:' },
    { emoji: '😟', shortcode: ':worried:' },
    { emoji: '🙁', shortcode: ':slightly_frowning_face:' },
    { emoji: '☹️', shortcode: ':frowning_face:' },
    { emoji: '😮', shortcode: ':open_mouth:' },
    { emoji: '😯', shortcode: ':hushed:' },
    { emoji: '😲', shortcode: ':astonished:' },
    { emoji: '😳', shortcode: ':flushed:' },
    { emoji: '🥺', shortcode: ':pleading_face:' },
    { emoji: '😦', shortcode: ':frowning:' },
    { emoji: '😧', shortcode: ':anguished:' },
    { emoji: '😨', shortcode: ':fearful:' },
    { emoji: '😰', shortcode: ':cold_sweat:' },
    { emoji: '😥', shortcode: ':disappointed_relieved:' },
    { emoji: '😢', shortcode: ':cry:' },
    { emoji: '😭', shortcode: ':sob:' },
    { emoji: '😱', shortcode: ':scream:' },
    { emoji: '😖', shortcode: ':confounded:' },
    { emoji: '😣', shortcode: ':persevere:' },
    { emoji: '😞', shortcode: ':disappointed:' },
    { emoji: '😓', shortcode: ':sweat:' },
    { emoji: '😩', shortcode: ':weary:' },
    { emoji: '😫', shortcode: ':tired_face:' },
    { emoji: '🥱', shortcode: ':yawning_face:' },
    { emoji: '😤', shortcode: ':triumph:' },
    { emoji: '😡', shortcode: ':rage:' },
    { emoji: '😠', shortcode: ':angry:' },
    { emoji: '🤬', shortcode: ':cursing_face:' },
    { emoji: '😈', shortcode: ':smiling_imp:' },
    { emoji: '👿', shortcode: ':imp:' },
    { emoji: '💀', shortcode: ':skull:' },
    { emoji: '☠️', shortcode: ':skull_and_crossbones:' },
    { emoji: '🤡', shortcode: ':clown_face:' },
    { emoji: '👻', shortcode: ':ghost:' },
    { emoji: '👽', shortcode: ':alien:' },
    { emoji: '💛', shortcode: ':yellow_heart:' },
    { emoji: '💙', shortcode: ':blue_heart:' },
    { emoji: '💜', shortcode: ':purple_heart:' },
    { emoji: '❤️', shortcode: ':heart:' },
    { emoji: '💚', shortcode: ':green_heart:' },
    { emoji: '💔', shortcode: ':broken_heart:' },
    { emoji: '💓', shortcode: ':heartbeat:' },
    { emoji: '💗', shortcode: ':heartpulse:' },
    { emoji: '💕', shortcode: ':two_hearts:' },
    { emoji: '💞', shortcode: ':revolving_hearts:' },
    { emoji: '💘', shortcode: ':cupid:' },
    { emoji: '💖', shortcode: ':sparkling_heart:' },
    { emoji: '✨', shortcode: ':sparkles:' },
    { emoji: '⭐', shortcode: ':star:' },
    { emoji: '🌟', shortcode: ':star2:' },
    { emoji: '💫', shortcode: ':dizzy:' },
    { emoji: '💥', shortcode: ':boom:' },
    { emoji: '💥', shortcode: ':collision:' },
    { emoji: '💢', shortcode: ':anger:' },
    { emoji: '❗', shortcode: ':exclamation:' },
    { emoji: '❓', shortcode: ':question:' },
    { emoji: '❕', shortcode: ':grey_exclamation:' },
    { emoji: '❔', shortcode: ':grey_question:' },
    { emoji: '💤', shortcode: ':zzz:' },
    { emoji: '💨', shortcode: ':dash:' },
    { emoji: '💦', shortcode: ':sweat_drops:' },
    { emoji: '🎶', shortcode: ':notes:' },
    { emoji: '🎵', shortcode: ':musical_note:' },
    { emoji: '🔥', shortcode: ':fire:' },
    { emoji: '💩', shortcode: ':poop:' },
    { emoji: '👍', shortcode: ':thumbsup:' },
    { emoji: '👎', shortcode: ':thumbsdown:' },
    { emoji: '👌', shortcode: ':ok_hand:' },
    { emoji: '👊', shortcode: ':punch:' },
    { emoji: '👊', shortcode: ':facepunch:' },
    { emoji: '✊', shortcode: ':fist:' },
    { emoji: '✌️', shortcode: ':v:' },
    { emoji: '👋', shortcode: ':wave:' },
    { emoji: '✋', shortcode: ':hand:' },
    { emoji: '✋', shortcode: ':raised_hand:' },
    { emoji: '👐', shortcode: ':open_hands:' },
    { emoji: '☝️', shortcode: ':point_up:' },
    { emoji: '👇', shortcode: ':point_down:' },
    { emoji: '👈', shortcode: ':point_left:' },
    { emoji: '👉', shortcode: ':point_right:' },
    { emoji: '🙌', shortcode: ':raised_hands:' },
    { emoji: '🙏', shortcode: ':pray:' },
    { emoji: '👆', shortcode: ':point_up_2:' },
    { emoji: '👏', shortcode: ':clap:' },
    { emoji: '💪', shortcode: ':muscle:' },
    { emoji: '🤘', shortcode: ':metal:' },
    { emoji: '🖕', shortcode: ':fu:' },
    { emoji: '😺', shortcode: ':smiley_cat:' },
    { emoji: '😸', shortcode: ':smile_cat:' },
    { emoji: '😻', shortcode: ':heart_eyes_cat:' },
    { emoji: '😽', shortcode: ':kissing_cat:' },
    { emoji: '😼', shortcode: ':smirk_cat:' },
    { emoji: '🙀', shortcode: ':scream_cat:' },
    { emoji: '😿', shortcode: ':crying_cat_face:' },
    { emoji: '😹', shortcode: ':joy_cat:' },
    { emoji: '😾', shortcode: ':pouting_cat:' },
    { emoji: '👣', shortcode: ':feet:' },
    { emoji: '👄', shortcode: ':lips:' },
    { emoji: '💋', shortcode: ':kiss:' },
    { emoji: '💧', shortcode: ':droplet:' },
    { emoji: '👂', shortcode: ':ear:' },
    { emoji: '👀', shortcode: ':eyes:' },
    { emoji: '👃', shortcode: ':nose:' },
    { emoji: '👅', shortcode: ':tongue:' },
    { emoji: '💌', shortcode: ':love_letter:' },
    { emoji: '👤', shortcode: ':bust_in_silhouette:' },
    { emoji: '👥', shortcode: ':busts_in_silhouette:' },
    { emoji: '💬', shortcode: ':speech_balloon:' },
    { emoji: '💭', shortcode: ':thought_balloon:' },
    { emoji: '🗯️', shortcode: ':anger_right:' },
    { emoji: '☀️', shortcode: ':sunny:' },
    { emoji: '☔', shortcode: ':umbrella:' },
    { emoji: '☁️', shortcode: ':cloud:' },
    { emoji: '❄️', shortcode: ':snowflake:' },
    { emoji: '⛄', shortcode: ':snowman:' },
    { emoji: '⚡', shortcode: ':zap:' },
    { emoji: '🌀', shortcode: ':cyclone:' },
    { emoji: '🌁', shortcode: ':foggy:' },
    { emoji: '🌊', shortcode: ':ocean:' },
    { emoji: '🐱', shortcode: ':cat:' },
    { emoji: '🐶', shortcode: ':dog:' },
    { emoji: '🐭', shortcode: ':mouse:' },
    { emoji: '🐹', shortcode: ':hamster:' },
    { emoji: '🐰', shortcode: ':rabbit:' },
    { emoji: '🐺', shortcode: ':wolf:' },
    { emoji: '🐸', shortcode: ':frog:' },
    { emoji: '🐯', shortcode: ':tiger:' },
    { emoji: '🐨', shortcode: ':koala:' },
    { emoji: '🐻', shortcode: ':bear:' },
    { emoji: '🐷', shortcode: ':pig:' },
    { emoji: '🐽', shortcode: ':pig_nose:' },
    { emoji: '🐮', shortcode: ':cow:' },
    { emoji: '🐗', shortcode: ':boar:' },
    { emoji: '🐵', shortcode: ':monkey_face:' },
    { emoji: '🐒', shortcode: ':monkey:' },
    { emoji: '🐴', shortcode: ':horse:' },
    { emoji: '🐎', shortcode: ':racehorse:' },
    { emoji: '🐫', shortcode: ':camel:' },
    { emoji: '🐑', shortcode: ':sheep:' },
    { emoji: '🐘', shortcode: ':elephant:' },
    { emoji: '🐼', shortcode: ':panda_face:' },
    { emoji: '🐍', shortcode: ':snake:' },
    { emoji: '🐦', shortcode: ':bird:' },
    { emoji: '🐤', shortcode: ':baby_chick:' },
    { emoji: '🐥', shortcode: ':hatched_chick:' },
    { emoji: '🐣', shortcode: ':hatching_chick:' },
    { emoji: '🐔', shortcode: ':chicken:' },
    { emoji: '🐧', shortcode: ':penguin:' },
    { emoji: '🐢', shortcode: ':turtle:' },
    { emoji: '🐛', shortcode: ':bug:' },
    { emoji: '🐝', shortcode: ':honeybee:' },
    { emoji: '🐞', shortcode: ':beetle:' },
    { emoji: '🐌', shortcode: ':snail:' },
    { emoji: '🐙', shortcode: ':octopus:' },
    { emoji: '🐠', shortcode: ':tropical_fish:' },
    { emoji: '🐟', shortcode: ':fish:' },
    { emoji: '🐳', shortcode: ':whale:' },
    { emoji: '🐋', shortcode: ':whale2:' },
    { emoji: '🐬', shortcode: ':dolphin:' },
    { emoji: '🐄', shortcode: ':cow2:' },
    { emoji: '🐏', shortcode: ':ram:' },
    { emoji: '🐀', shortcode: ':rat:' },
    { emoji: '🐃', shortcode: ':water_buffalo:' },
    { emoji: '🐅', shortcode: ':tiger2:' },
    { emoji: '🐇', shortcode: ':rabbit2:' },
    { emoji: '🐉', shortcode: ':dragon:' },
    { emoji: '🐐', shortcode: ':goat:' },
    { emoji: '🐓', shortcode: ':rooster:' },
    { emoji: '🐕', shortcode: ':dog2:' },
    { emoji: '🐖', shortcode: ':pig2:' },
    { emoji: '🐁', shortcode: ':mouse2:' },
    { emoji: '🐂', shortcode: ':ox:' },
    { emoji: '🐲', shortcode: ':dragon_face:' },
    { emoji: '🐡', shortcode: ':blowfish:' },
    { emoji: '🐊', shortcode: ':crocodile:' },
    { emoji: '🐪', shortcode: ':dromedary_camel:' },
    { emoji: '🐆', shortcode: ':leopard:' },
    { emoji: '🐈', shortcode: ':cat2:' },
    { emoji: '🐩', shortcode: ':poodle:' },
    { emoji: '🔨', shortcode: ':hammer:' },
    { emoji: '🪓', shortcode: ':axe:' },
    { emoji: '🛠️', shortcode: ':hammer_and_wrench:' },
    { emoji: '💣', shortcode: ':bomb:' },
    { emoji: '🛡️', shortcode: ':shield:' },
    { emoji: '🔧', shortcode: ':wrench:' },
    { emoji: '⚙️', shortcode: ':gear:' },
    { emoji: '💯', shortcode: ':100:' },
    { emoji: '🔢', shortcode: ':1234:' },
    { emoji: '🎱', shortcode: ':8ball:' },
    { emoji: '🅰️', shortcode: ':a:' },
    { emoji: '🆎', shortcode: ':ab:' },
    { emoji: '🔤', shortcode: ':abc:' },
    { emoji: '🔡', shortcode: ':abcd:' },
    { emoji: '🉑', shortcode: ':accept:' },
    { emoji: '🚡', shortcode: ':aerial_tramway:' },
    { emoji: '✈️', shortcode: ':airplane:' },
    { emoji: '⏰', shortcode: ':alarm_clock:' },
    { emoji: '🚑', shortcode: ':ambulance:' },
    { emoji: '⚓', shortcode: ':anchor:' },
    { emoji: '🍎', shortcode: ':apple:' },
    { emoji: '♒', shortcode: ':aquarius:' },
    { emoji: '♈', shortcode: ':aries:' },
    { emoji: '◀️', shortcode: ':arrow_backward:' },
    { emoji: '⏬', shortcode: ':arrow_double_down:' },
    { emoji: '⏫', shortcode: ':arrow_double_up:' },
    { emoji: '⬇️', shortcode: ':arrow_down:' },
    { emoji: '🔽', shortcode: ':arrow_down_small:' },
    { emoji: '▶️', shortcode: ':arrow_forward:' },
    { emoji: '⤵️', shortcode: ':arrow_heading_down:' },
    { emoji: '⤴️', shortcode: ':arrow_heading_up:' },
    { emoji: '⬅️', shortcode: ':arrow_left:' },
    { emoji: '↙️', shortcode: ':arrow_lower_left:' },
    { emoji: '↘️', shortcode: ':arrow_lower_right:' },
    { emoji: '➡️', shortcode: ':arrow_right:' },
    { emoji: '↪️', shortcode: ':arrow_right_hook:' },
    { emoji: '⬆️', shortcode: ':arrow_up:' },
    { emoji: '↕️', shortcode: ':arrow_up_down:' },
    { emoji: '🔼', shortcode: ':arrow_up_small:' },
    { emoji: '↖️', shortcode: ':arrow_upper_left:' },
    { emoji: '↗️', shortcode: ':arrow_upper_right:' },
    { emoji: '🔃', shortcode: ':arrows_clockwise:' },
    { emoji: '🔄', shortcode: ':arrows_counterclockwise:' },
    { emoji: '🎨', shortcode: ':art:' },
    { emoji: '🚛', shortcode: ':articulated_lorry:' },
    { emoji: '❌', shortcode: ':x:' },
    { emoji: '✔️', shortcode: ':heavy_check_mark:' },
    { emoji: '✖️', shortcode: ':heavy_multiplication_x:' },
    { emoji: '➕', shortcode: ':heavy_plus_sign:' },
    { emoji: '➖', shortcode: ':heavy_minus_sign:' },
    { emoji: '➗', shortcode: ':heavy_division_sign:' },
    { emoji: '💻', shortcode: ':computer:' },
    { emoji: '⌨️', shortcode: ':keyboard:' },
    { emoji: '🖱️', shortcode: ':mouse3:' },
    { emoji: '🖲️', shortcode: ':trackball:' },
    { emoji: '🕹️', shortcode: ':joystick:' },
    { emoji: '🎮', shortcode: ':gamepad:' },
    { emoji: '1️⃣', shortcode: ':one:' },
    { emoji: '2️⃣', shortcode: ':two:' },
    { emoji: '3️⃣', shortcode: ':three:' },
    { emoji: '4️⃣', shortcode: ':four:' },
    { emoji: '5️⃣', shortcode: ':five:' },
    { emoji: '6️⃣', shortcode: ':six:' },
    { emoji: '7️⃣', shortcode: ':seven:' },
    { emoji: '8️⃣', shortcode: ':eight:' },
    { emoji: '9️⃣', shortcode: ':nine:' },
    { emoji: '0️⃣', shortcode: ':zero:' },
    { emoji: '#️⃣', shortcode: ':hash:' },
    { emoji: '☑️', shortcode: ':ballot_box_with_check:' },
    { emoji: '✅', shortcode: ':white_check_mark:' },
    { emoji: '🟩', shortcode: ':green_square:' },
    { emoji: '🟦', shortcode: ':blue_square:' },
    { emoji: '🚢', shortcode: ':shipit:' }
];

// Helper functions for editor toolbar actions
function addSubscript(cm) {
    var selection = cm.getSelection();
    if (selection) {
        cm.replaceSelection("~" + selection + "~");
    } else {
        var cursor = cm.getCursor();
        cm.replaceRange("~~", cursor);
        cm.setCursor(cursor.line, cursor.ch + 1);
    }
    // Ensure editor retains focus
    cm.focus();
}

// Function to add highlight markup
function addHighlight(cm) {
    var selection = cm.getSelection();
    if (selection) {
        cm.replaceSelection("==" + selection + "==");
    } else {
        var cursor = cm.getCursor();
        cm.replaceRange("====", cursor);
        cm.setCursor(cursor.line, cursor.ch + 2);
    }
    // Ensure editor retains focus
    cm.focus();
}

function addSuperscript(cm) {
    var selection = cm.getSelection();
    if (selection) {
        cm.replaceSelection("^" + selection + "^");
    } else {
        var cursor = cm.getCursor();
        cm.replaceRange("^^", cursor);
        cm.setCursor(cursor.line, cursor.ch + 1);
    }
    // Ensure editor retains focus
    cm.focus();
}

function addRecentEdits(cm) {
    var cursor = cm.getCursor();
    cm.replaceRange(":::stats recent=5:::\n", cursor);
    // Ensure editor retains focus
    cm.focus();
}

function addTotal(cm) {
    var cursor = cm.getCursor();
    cm.replaceRange(":::stats count=*:::\n", cursor);
    // Ensure editor retains focus
    cm.focus();
}

// Function to insert emoji
function insertEmoji(emoji) {
    if (!editor) return;

    // Insert emoji shortcode at cursor position
    const cursor = editor.getCursor();
    editor.replaceRange(emoji.shortcode + ' ', cursor);

    // Focus the editor
    editor.focus();
}

// Create emoji picker
function createEmojiPicker() {
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.style.display = 'none';

    // Create buttons for each emoji
    emojiData.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'emoji-btn';
        button.title = emoji.shortcode;
        button.textContent = emoji.emoji;
        button.addEventListener('click', () => {
            insertEmoji(emoji);
            hideEmojiPicker();
        });
        picker.appendChild(button);
    });

    document.body.appendChild(picker);
    emojiPickerElement = picker;
    return picker;
}

// Function to show emoji picker
function showEmojiPicker(button) {
    if (!emojiPickerElement) {
        emojiPickerElement = createEmojiPicker();
    }

    // Toggle visibility
    if (emojiPickerElement.style.display === 'grid') {
        hideEmojiPicker();
        return;
    }

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Display the picker with initial position to calculate dimensions
    emojiPickerElement.style.display = 'grid';
    emojiPickerElement.style.left = '0px';  // Temporary position
    emojiPickerElement.style.top = '0px';   // Temporary position

    // Force layout calculation to get actual dimensions
    const pickerWidth = emojiPickerElement.offsetWidth;
    const pickerHeight = emojiPickerElement.offsetHeight;

    // Calculate initial position relative to the button
    let left = rect.left;
    let top = rect.bottom + window.scrollY;

    // Check if we're on a small screen (adjust threshold based on testing)
    const isSmallScreen = viewportWidth < 500;

    if (isSmallScreen) {
        // On very small screens, center horizontally and position below the toolbar
        left = Math.max(5, (viewportWidth - pickerWidth) / 2);

        // If button is in the bottom half of the screen, show picker above it
        if (rect.bottom > viewportHeight / 2) {
            top = (rect.top + window.scrollY) - pickerHeight - 5;
        }
    } else {
        // On larger screens, align with the button but ensure it stays in view
        // Adjust horizontal position if needed
        if (left + pickerWidth + 10 > viewportWidth) {
            // If it would go off the right edge, align to right side of viewport
            left = Math.max(5, viewportWidth - pickerWidth - 10);
        }

        // Adjust vertical position if needed
        if (top + pickerHeight + 10 > window.scrollY + viewportHeight) {
            // If it would go off the bottom, show above the button instead
            top = (rect.top + window.scrollY) - pickerHeight - 5;

            // If that would go off the top, just align to top of viewport
            if (top < window.scrollY) {
                top = window.scrollY + 5;
            }
        }
    }

    // Apply final position
    emojiPickerElement.style.left = `${left}px`;
    emojiPickerElement.style.top = `${top}px`;

    // Add a one-time event listener to close when clicking outside
    const closeHandler = function(e) {
        if (!emojiPickerElement.contains(e.target) &&
            !e.target.closest('.emoji-button')) {
            hideEmojiPicker();
            document.removeEventListener('click', closeHandler);
        }
    };

    // Use setTimeout to avoid the current click event from immediately closing
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 0);
}

// Function to hide emoji picker
function hideEmojiPicker() {
    if (emojiPickerElement) {
        emojiPickerElement.style.display = 'none';
    }
}

// Table picker functionality
function createTablePicker() {
    const picker = document.createElement('div');
    picker.className = 'table-picker';
    picker.style.display = 'none';

    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i + 1;
            cell.dataset.col = j + 1;
            cell.addEventListener('mouseover', () => highlightCells(cell));
            cell.addEventListener('click', () => insertTable(i + 1, j + 1));
            picker.appendChild(cell);
        }
        picker.appendChild(document.createElement('br'));
    }

    document.body.appendChild(picker);
    tablePickerElement = picker;
    return picker;
}

function highlightCells(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const cells = document.querySelectorAll('.table-picker .cell');
    cells.forEach(c => {
        if (parseInt(c.dataset.row) <= row && parseInt(c.dataset.col) <= col) {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });
}

function insertTable(rows, cols) {
    if (!editor) return;

    let table = '\n';
    // Header
    table += '| ' + Array(cols).fill('Header').join(' | ') + ' |\n';
    // Separator
    table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
    // Rows
    for (let i = 0; i < rows; i++) {
        table += '| ' + Array(cols).fill('Cell').join(' | ') + ' |\n';
    }
    editor.replaceSelection(table);
    if (tablePickerElement) {
        tablePickerElement.style.display = 'none';
    }

    // Make sure editor gets focus after inserting table
    setTimeout(() => editor.focus(), 10);
}

function showTablePicker(button) {
    if (!tablePickerElement) {
        tablePickerElement = createTablePicker();
    }

    // Toggle visibility
    if (tablePickerElement.style.display === 'block') {
        tablePickerElement.style.display = 'none';
        return;
    }

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Display the picker with initial position to calculate dimensions
    tablePickerElement.style.display = 'block';
    tablePickerElement.style.left = '0px';  // Temporary position
    tablePickerElement.style.top = '0px';   // Temporary position

    // Force layout calculation to get actual dimensions
    const pickerWidth = tablePickerElement.offsetWidth;
    const pickerHeight = tablePickerElement.offsetHeight;

    // Calculate initial position relative to the button
    let left = rect.left;
    let top = rect.bottom + window.scrollY;

    // Check if we're on a small screen (adjust threshold based on testing)
    const isSmallScreen = viewportWidth < 500;

    if (isSmallScreen) {
        // On very small screens, center horizontally and position below the toolbar
        left = Math.max(5, (viewportWidth - pickerWidth) / 2);

        // If button is in the bottom half of the screen, show picker above it
        if (rect.bottom > viewportHeight / 2) {
            top = (rect.top + window.scrollY) - pickerHeight - 5;
        }
    } else {
        // On larger screens, align with the button but ensure it stays in view
        // Adjust horizontal position if needed
        if (left + pickerWidth + 10 > viewportWidth) {
            // If it would go off the right edge, align to right side of viewport
            left = Math.max(5, viewportWidth - pickerWidth - 10);
        }

        // Adjust vertical position if needed
        if (top + pickerHeight + 10 > window.scrollY + viewportHeight) {
            // If it would go off the bottom, show above the button instead
            top = (rect.top + window.scrollY) - pickerHeight - 5;

            // If that would go off the top, just align to top of viewport
            if (top < window.scrollY) {
                top = window.scrollY + 5;
            }
        }
    }

    // Apply final position
    tablePickerElement.style.left = `${left}px`;
    tablePickerElement.style.top = `${top}px`;

    // Add a one-time event listener to close when clicking outside
    const closeHandler = function(e) {
        if (!tablePickerElement.contains(e.target) &&
            !e.target.closest('.table-button') &&
            e.target.id !== 'insert-table') {
            tablePickerElement.style.display = 'none';
            document.removeEventListener('click', closeHandler);
        }
    };

    // Use setTimeout to avoid the current click event from immediately closing
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 0);
}

// Create custom toolbar
function createToolbar(container) {
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar custom-toolbar';

    // Define toolbar buttons
    const buttons = [
        { icon: 'fa-header', action: 'heading', title: 'Heading' },
        { icon: 'fa-bold', action: 'bold', title: 'Bold' },
        { icon: 'fa-italic', action: 'italic', title: 'Italic' },
        { icon: 'fa-paint-brush', action: 'highlight', title: 'Highlight Text' },
        { icon: 'fa-strikethrough', action: 'strikethrough', title: 'Strikethrough' },
        { icon: 'fa-subscript', action: 'subscript', title: 'Add Subscript' },
        { icon: 'fa-superscript', action: 'superscript', title: 'Add Superscript' },
        { type: 'separator' },
        { icon: 'fa-code', action: 'code', title: 'Code' },
        { icon: 'fa-quote-left', action: 'quote', title: 'Quote' },
        { icon: 'fa-list-ul', action: 'unordered-list', title: 'Unordered List' },
        { icon: 'fa-list-ol', action: 'ordered-list', title: 'Ordered List' },
        { type: 'separator' },
        { icon: 'fa-link', action: 'link', title: 'Link' },
        { icon: 'fa-picture-o', action: 'image', title: 'Image' },
        { icon: 'fa-smile-o', action: 'emoji', title: 'Insert Emoji' },
        { type: 'separator' },
        { icon: 'fa-th', action: 'table', title: 'Insert Custom Table', id: 'insert-table' },
        { icon: 'fa-minus', action: 'horizontal-rule', title: 'Horizontal Rule' },
        { type: 'separator' },
        { icon: 'fa-clock-o', action: 'recent-edits', title: 'Insert Recent Edits' },
        { icon: 'fa-book', action: 'total', title: 'Insert Total Number of Documents' },
        { type: 'separator' },
        { icon: 'fa-undo', action: 'undo', title: 'Undo' },
        { icon: 'fa-repeat', action: 'redo', title: 'Redo' },
        { type: 'separator' },
        { icon: 'fa-eye', action: 'preview', title: 'Toggle Preview', id: 'toggle-preview' }
    ];

    buttons.forEach(button => {
        if (button.type === 'separator') {
            const separator = document.createElement('i');
            separator.className = 'separator';
            toolbar.appendChild(separator);
        } else {
            const btn = document.createElement('button');
            if (button.id) {
                btn.id = button.id;
            }
            btn.className = `toolbar-button ${button.action}-button`;
            btn.title = button.title;

            const icon = document.createElement('i');
            icon.className = `fa ${button.icon}`;
            btn.appendChild(icon);

            toolbar.appendChild(btn);
        }
    });

    container.appendChild(toolbar);
    return toolbar;
}

// Add event listeners to toolbar buttons
function setupToolbarActions(toolbar) {
    if (!editor || !toolbar) return;

    // Bold
    toolbar.querySelector('.bold-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            editor.replaceSelection(`**${selection}**`);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("****", cursor);
            editor.setCursor(cursor.line, cursor.ch + 2);
        }
        editor.focus();
    });

    // Italic
    toolbar.querySelector('.italic-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            editor.replaceSelection(`*${selection}*`);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("**", cursor);
            editor.setCursor(cursor.line, cursor.ch + 1);
        }
        editor.focus();
    });

    // Strikethrough
    toolbar.querySelector('.strikethrough-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            editor.replaceSelection(`~~${selection}~~`);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("~~~~", cursor);
            editor.setCursor(cursor.line, cursor.ch + 2);
        }
        editor.focus();
    });

    // Heading - improved to properly cycle through h1-h6
    toolbar.querySelector('.heading-button').addEventListener('click', () => {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const headingMatch = line.match(/^(#+)\s/);

        if (headingMatch) {
            const prefix = headingMatch[1];
            const contentStart = prefix.length + 1; // +1 for the space
            const content = line.substring(contentStart);

            if (prefix.length < 6) {
                // Increase heading level (add one #)
                editor.replaceRange('#' + prefix + ' ' + content,
                    { line: cursor.line, ch: 0 },
                    { line: cursor.line, ch: line.length });
            } else {
                // Reset to paragraph (remove all #)
                editor.replaceRange(content,
                    { line: cursor.line, ch: 0 },
                    { line: cursor.line, ch: line.length });
            }
        } else {
            // Add new h1
            editor.replaceRange('# ' + line,
                { line: cursor.line, ch: 0 },
                { line: cursor.line, ch: line.length });
        }
        editor.focus();
    });

    // Code
    toolbar.querySelector('.code-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            if (selection.indexOf('\n') !== -1) {
                // Multiline code block
                editor.replaceSelection("```\n" + selection + "\n```");
            } else {
                // Inline code
                editor.replaceSelection("`" + selection + "`");
            }
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("``", cursor);
            editor.setCursor(cursor.line, cursor.ch + 1);
        }
        editor.focus();
    });

    // Quote
    toolbar.querySelector('.quote-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            const lines = selection.split('\n');
            const quotedLines = lines.map(line => `> ${line}`).join('\n');
            editor.replaceSelection(quotedLines);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("> ", cursor);
        }
        editor.focus();
    });

    // Unordered List
    toolbar.querySelector('.unordered-list-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            const lines = selection.split('\n');
            const listItems = lines.map(line => `- ${line}`).join('\n');
            editor.replaceSelection(listItems);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("- ", cursor);
        }
        editor.focus();
    });

    // Ordered List
    toolbar.querySelector('.ordered-list-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            const lines = selection.split('\n');
            const listItems = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
            editor.replaceSelection(listItems);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("1. ", cursor);
        }
        editor.focus();
    });

    // Link
    toolbar.querySelector('.link-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            editor.replaceSelection(`[${selection}](url)`);
            // Position cursor on the url for easy editing
            const cursor = editor.getCursor();
            editor.setCursor(cursor.line, cursor.ch - 1);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("[text](url)", cursor);
            editor.setSelection(
                { line: cursor.line, ch: cursor.ch + 1 },
                { line: cursor.line, ch: cursor.ch + 5 }
            );
        }
        editor.focus();
    });

    // Image
    toolbar.querySelector('.image-button').addEventListener('click', () => {
        const selection = editor.getSelection();
        if (selection) {
            editor.replaceSelection(`![${selection}](url)`);
            // Position cursor on the url for easy editing
            const cursor = editor.getCursor();
            editor.setCursor(cursor.line, cursor.ch - 1);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange("![alt text](url)", cursor);
            editor.setSelection(
                { line: cursor.line, ch: cursor.ch + 2 },
                { line: cursor.line, ch: cursor.ch + 10 }
            );
        }
        editor.focus();
    });

    // Table
    toolbar.querySelector('.table-button').addEventListener('click', (e) => {
        showTablePicker(e.currentTarget);
        // Focus will be managed after table insertion
    });

    // Horizontal Rule
    toolbar.querySelector('.horizontal-rule-button').addEventListener('click', () => {
        const cursor = editor.getCursor();
        editor.replaceRange("\n---\n", cursor);
        editor.focus();
    });

    // Subscript
    toolbar.querySelector('.subscript-button').addEventListener('click', () => {
        addSubscript(editor);
        editor.focus();
    });

    // Superscript
    toolbar.querySelector('.superscript-button').addEventListener('click', () => {
        addSuperscript(editor);
        editor.focus();
    });

    // Recent Edits
    toolbar.querySelector('.recent-edits-button').addEventListener('click', () => {
        addRecentEdits(editor);
        editor.focus();
    });

    // Total
    toolbar.querySelector('.total-button').addEventListener('click', () => {
        addTotal(editor);
        editor.focus();
    });

    // Undo
    toolbar.querySelector('.undo-button').addEventListener('click', () => {
        editor.undo();
        editor.focus();
    });

    // Redo
    toolbar.querySelector('.redo-button').addEventListener('click', () => {
        editor.redo();
        editor.focus();
    });

    // Toggle Preview
    toolbar.querySelector('.preview-button').addEventListener('click', () => {
        togglePreview();
        // Focus is managed by the togglePreview function
    });

    // Highlight
    toolbar.querySelector('.highlight-button').addEventListener('click', () => {
        addHighlight(editor);
        editor.focus();
    });

    // Emoji button
    toolbar.querySelector('.emoji-button').addEventListener('click', (e) => {
        showEmojiPicker(e.currentTarget);
    });
}

// Function to create statusbar
function createStatusbar(container) {
    const statusbar = document.createElement('div');
    statusbar.className = 'editor-statusbar';

    // Add status elements (lines, words, cursor position)
    const linesStatus = document.createElement('span');
    linesStatus.className = 'lines';
    linesStatus.textContent = '0';

    const wordsStatus = document.createElement('span');
    wordsStatus.className = 'words';
    wordsStatus.textContent = '0';

    const cursorStatus = document.createElement('span');
    cursorStatus.className = 'cursor';
    cursorStatus.textContent = '0:0';

    statusbar.appendChild(linesStatus);
    statusbar.appendChild(wordsStatus);
    statusbar.appendChild(cursorStatus);

    container.appendChild(statusbar);
    return statusbar;
}

// Function to update statusbar
function updateStatusbar(statusbar) {
    if (!editor || !statusbar) return;

    const content = editor.getValue();
    const lines = content.split('\n').length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const cursor = editor.getCursor();

    statusbar.querySelector('.lines').textContent = lines;
    statusbar.querySelector('.words').textContent = words;
    statusbar.querySelector('.cursor').textContent = `${cursor.line + 1}:${cursor.ch}`;
}

// Function to create preview panel
function createPreview(container) {
    const preview = document.createElement('div');
    preview.className = 'editor-preview';
    container.appendChild(preview);
    return preview;
}

// Function to toggle preview
async function togglePreview() {
    if (!editor || !previewElement) return;

    const isPreviewActive = previewElement.classList.contains('editor-preview-active');
    const editorElement = document.querySelector('.CodeMirror');
    const toolbar = document.querySelector('.custom-toolbar');

    if (isPreviewActive) {
        // Switch back to edit mode
        previewElement.classList.remove('editor-preview-active');

        // Show editor again
        if (editorElement) {
            editorElement.style.display = 'block';
        }

        // Re-enable all toolbar buttons except preview
        if (toolbar) {
            const buttons = toolbar.querySelectorAll('button:not(.preview-button)');
            buttons.forEach(button => {
                button.disabled = false;
                button.classList.remove('disabled');
            });
        }

        // Change preview button icon to indicate function
        const previewButton = toolbar.querySelector('.preview-button i');
        if (previewButton) {
            previewButton.className = 'fa fa-eye';
            previewButton.parentElement.title = 'Toggle Preview';
        }

        // Make sure editor gets focus when returning from preview mode
        // Using a small timeout to ensure DOM is updated first
        setTimeout(() => {
            if (editor) {
                editor.refresh();
                editor.focus();
            }
        }, 50);
    } else {
        // Show preview
        const content = editor.getValue();
        await updatePreview(content);

        // Hide editor
        if (editorElement) {
            editorElement.style.display = 'none';
        }

        // Show preview
        previewElement.classList.add('editor-preview-active');

        // Disable all toolbar buttons except preview
        if (toolbar) {
            const buttons = toolbar.querySelectorAll('button:not(.preview-button)');
            buttons.forEach(button => {
                button.disabled = true;
                button.classList.add('disabled');
            });
        }

        // Change preview button icon to indicate function
        const previewButton = toolbar.querySelector('.preview-button i');
        if (previewButton) {
            previewButton.className = 'fa fa-edit';
            previewButton.parentElement.title = 'Back to Edit Mode';
        }
    }
}

// Function to update preview content
async function updatePreview(content) {
    if (!previewElement) return;

    try {
        // Show loading indicator
        previewElement.innerHTML = '<div class="preview-loading">Loading preview...</div>';

        // Get current path for handling relative links correctly
        const isHomepage = window.location.pathname === '/';
        const path = isHomepage ? '/' : window.location.pathname;

        // Call the server-side renderer
        const response = await fetch(`/api/render-markdown?path=${encodeURIComponent(path)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: content
        });

        if (!response.ok) {
            throw new Error('Failed to render markdown');
        }

        const html = await response.text();
        previewElement.innerHTML = html;

        // Initialize any client-side renderers (Prism, MathJax, etc)
        if (window.Prism) {
            Prism.highlightAllUnder(previewElement);
        }

        if (window.MathJax) {
            MathJax.typeset([previewElement]);
        }

        if (window.mermaid) {
            mermaid.init(undefined, previewElement.querySelectorAll('.mermaid'));
        }

    } catch (error) {
        console.error('Preview error:', error);
        previewElement.innerHTML = '<p>Error rendering preview</p>';
    }
}

// Main editor functions
async function loadEditor(mainContent, editorContainer, viewToolbar, editToolbar) {
    try {
        const isHomepage = window.location.pathname === '/';
        const apiPath = isHomepage ? '/api/source/' : `/api/source${window.location.pathname}`;

        const response = await fetch(apiPath);
        if (!response.ok) throw new Error('Failed to fetch content');

        const markdown = await response.text();

        // Show editor and switch toolbars
        mainContent.classList.add('editing');
        editorContainer.classList.add('active');
        viewToolbar.style.display = 'none';
        editToolbar.style.display = 'flex';

        // Clear the editor container
        editorContainer.innerHTML = '';

        // Create a container for our editor components (toolbar, editor, preview, statusbar)
        const editorLayout = document.createElement('div');
        editorLayout.className = 'editor-layout';
        editorContainer.appendChild(editorLayout);

        // 1. Create toolbar at the top
        const toolbar = createToolbar(editorLayout);

        // 2. Create an editor area container to hold both editor and preview
        const editorArea = document.createElement('div');
        editorArea.className = 'editor-area';
        editorLayout.appendChild(editorArea);

        // 3. Create editor wrapper inside the editor area
        const editorWrapper = document.createElement('div');
        editorWrapper.className = 'custom-editor-wrapper';
        editorArea.appendChild(editorWrapper);

        // 4. Create textarea for CodeMirror
        const textarea = document.createElement('textarea');
        textarea.id = 'markdown-editor';
        editorWrapper.appendChild(textarea);

        // 5. Create preview element inside the editor area
        previewElement = createPreview(editorArea);

        // 6. Create statusbar at the bottom
        const statusbar = createStatusbar(editorLayout);

        // Reset the preview mode
        previewElement.classList.remove('editor-preview-active');

        // Initialize CodeMirror
        if (!editor) {
            // Check if we're on mobile
            const isMobile = window.innerWidth <= 768;

            editor = CodeMirror.fromTextArea(textarea, {
                mode: 'markdown',
                theme: 'default', // Always use default theme and customize it
                lineNumbers: true,
                lineWrapping: true,
                autofocus: true,
                tabSize: 2,
                indentWithTabs: false,
                // Disable styleActiveLine completely on mobile to prevent the highlighting issue
                styleActiveLine: isMobile ? false : {
                    nonEmpty: true
                },
                extraKeys: {
                    "Enter": "newlineAndIndentContinueMarkdownList",
                    "Tab": (cm) => cm.execCommand("indentMore"),
                    "Shift-Tab": (cm) => cm.execCommand("indentLess"),
                    // Add keyboard shortcut for toggling preview
                    "Ctrl-P": togglePreview
                },
                placeholder: 'Write your markdown here...',
                spellcheck: true,
                gutters: ["CodeMirror-linenumbers"]
            });

            // Apply custom subtle styling to the editor
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

            // Apply custom styling to tone down the syntax highlighting colors
            const editorElement = document.querySelector('.CodeMirror');
            if (editorElement) {
                applyCustomColors();
            }

            // Set editor height
            editor.setSize(null, "calc(100vh - 380px)");

            // Set up events for toolbar interactions
            setupToolbarActions(toolbar);

            // Set up events for statusbar updates
            editor.on('cursorActivity', () => updateStatusbar(statusbar));
            editor.on('change', () => {
                updateStatusbar(statusbar);

                // Update preview if active
                if (previewElement.classList.contains('editor-preview-active')) {
                    updatePreview(editor.getValue());
                }
            });
        }

        // Set initial content
        editor.setValue(markdown);

        // Make sure editor is visible (not in preview mode)
        document.querySelector('.CodeMirror').style.display = 'block';

        // Force a refresh
        setTimeout(() => {
            if (editor) {
                editor.refresh();
                editor.focus();
                updateStatusbar(statusbar);
            }
        }, 0);

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load content for editing');
    }
}

function exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar) {
    mainContent.classList.remove('editing');
    editorContainer.classList.remove('active');
    viewToolbar.style.display = 'flex';
    editToolbar.style.display = 'none';

    // Completely destroy the editor instance
    if (editor) {
        editor.toTextArea();
        editor = null;
    }

    // Remove preview element
    if (previewElement) {
        previewElement.remove();
        previewElement = null;
    }

    // Remove table picker if it exists
    if (tablePickerElement) {
        tablePickerElement.remove();
        tablePickerElement = null;
    }

    // Remove emoji picker if it exists
    if (emojiPickerElement) {
        emojiPickerElement.remove();
        emojiPickerElement = null;
    }
}

function getEditorContent() {
    return editor ? editor.getValue() : '';
}

function insertIntoEditor(url, isImage, name) {
    // Check if editor exists and is initialized
    if (!editor) {
        return false;
    }

    // Check if it's an MP4 file
    const isVideo = name.toLowerCase().endsWith('.mp4');

    // Extract just the filename from the URL
    const filename = name;

    // Create markdown code based on file type
    let markdown = '';
    if (isVideo) {
        // For MP4 files, use code block syntax with just the filename
        markdown = "```mp4\n" + filename + "\n```\n\n";
    } else if (isImage) {
        // For images, use image markdown with just the filename
        markdown = `![${name}](${filename})\n\n`;
    } else {
        // For other files, use link markdown with just the filename
        markdown = `[${name}](${filename})\n\n`;
    }

    // Insert markdown at cursor position
    editor.replaceSelection(markdown);

    // Focus the editor
    editor.focus();

    return true;
}

// Function to insert raw content into the editor
function insertRawContent(content) {
    // Check if editor exists and is initialized
    if (!editor) {
        return false;
    }

    // Insert content at cursor position
    editor.replaceSelection(content);

    // Focus the editor
    editor.focus();

    return true;
}

// Function to check if editor is active
function isEditorActive() {
    return !!editor;
}

// Export the functions
window.WikiEditor = {
    loadEditor,
    exitEditMode,
    getEditorContent,
    insertIntoEditor,
    insertRawContent,
    isEditorActive,
    // Adding functions for edit button and save button functionality
    initializeEditControls
};

// Function to initialize edit controls
function initializeEditControls() {
    const editPageButton = document.querySelector('.edit-page');
    const saveButton = document.querySelector('.save-changes');
    const cancelButton = document.querySelector('.cancel-edit');
    const mainContent = document.querySelector('.content');
    const editorContainer = document.querySelector('.editor-container');
    const viewToolbar = document.querySelector('.view-toolbar');
    const editToolbar = document.querySelector('.edit-toolbar');
    const markdownContent = document.querySelector('.markdown-content');

    // Auto-enter edit mode if content is empty
    if (markdownContent && editPageButton) {
        const contentText = markdownContent.textContent.trim();
        const h1Only = markdownContent.children.length === 1 &&
                      markdownContent.children[0].tagName === 'H1';

        if (h1Only) {
            editPageButton.click();
        }
    }

    // Update edit button functionality
    if (editPageButton) {
        editPageButton.addEventListener('click', async function() {
            try {
                // Check if user is authenticated
                const authResponse = await fetch('/api/check-auth');
                if (authResponse.status === 401) {
                    // Show login dialog
                    window.Auth.showLoginDialog(() => {
                        // After login, check if admin
                        window.Auth.checkIfUserIsAdmin().then(isAdmin => {
                            if (isAdmin) {
                                loadEditor(mainContent, editorContainer, viewToolbar, editToolbar);
                                // Update toolbar buttons after login
                                window.Auth.updateToolbarButtons();
                            } else {
                                window.Auth.showAdminOnlyError();
                            }
                        });
                    });
                    return;
                }

                // User is authenticated, check if admin
                const isAdmin = await window.Auth.checkIfUserIsAdmin();
                if (isAdmin) {
                    loadEditor(mainContent, editorContainer, viewToolbar, editToolbar);
                } else {
                    window.Auth.showAdminOnlyError();
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to check authentication status');
            }
        });
    }

    // Save button functionality
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            try {
                const isHomepage = window.location.pathname === '/';
                const apiPath = isHomepage ? '/api/save/' : `/api/save${window.location.pathname}`;

                const content = getEditorContent();

                const response = await fetch(apiPath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: content
                });

                if (!response.ok) throw new Error('Failed to save content');

                window.location.reload();

            } catch (error) {
                console.error('Error:', error);
                alert('Failed to save changes');
            }
        });
    }

    // Cancel button functionality
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar);
        });
    }
}

// Function to apply custom colors based on current theme
function applyCustomColors() {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    // Remove existing custom colors if present
    const existingStyles = document.getElementById('custom-codemirror-colors');
    if (existingStyles) {
        existingStyles.remove();
    }

    // Create new style element
    const style = document.createElement('style');
    style.id = 'custom-codemirror-colors';

    if (isDarkMode) {
        // Dark mode - more subdued colors
        style.textContent = `
            .cm-s-default .cm-header { color: #81a2be; font-weight: 600; }
            .cm-s-default .cm-header-1 { color: #a1c2de; }
            .cm-s-default .cm-header-2 { color: #91b2ce; }
            .cm-s-default .cm-header-3 { color: #81a2be; }
            .cm-s-default .cm-header-4 { color: #7192ae; }
            .cm-s-default .cm-header-5 { color: #61829e; }
            .cm-s-default .cm-header-6 { color: #51728e; }
            .cm-s-default .cm-quote { color: #7c7c7c; }
            .cm-s-default .cm-keyword { color: #9a9a9a; }
            .cm-s-default .cm-atom { color: #9a9a9a; }
            .cm-s-default .cm-number { color: #9a9a9a; }
            .cm-s-default .cm-def { color: #9a9a9a; }
            .cm-s-default .cm-variable { color: #ccc; }
            .cm-s-default .cm-variable-2 { color: #b0b0b0; }
            .cm-s-default .cm-variable-3 { color: #b0b0b0; }
            .cm-s-default .cm-property { color: #ccc; }
            .cm-s-default .cm-operator { color: #ccc; }
            .cm-s-default .cm-comment { color: #707070; }
            .cm-s-default .cm-string { color: #999; }
            .cm-s-default .cm-string-2 { color: #999; }
            .cm-s-default .cm-meta { color: #9a9a9a; }
            .cm-s-default .cm-qualifier { color: #9a9a9a; }
            .cm-s-default .cm-builtin { color: #9a9a9a; }
            .cm-s-default .cm-bracket { color: #9a9a9a; }
            .cm-s-default .cm-tag { color: #9a9a9a; }
            .cm-s-default .cm-attribute { color: #9a9a9a; }
            .cm-s-default .cm-hr { color: #9a9a9a; }
            .cm-s-default .cm-link { color: #9a9a9a; }
            .cm-s-default .cm-error { color: #999; }
        `;
    } else {
        // Light mode - more subdued colors
        style.textContent = `
            .cm-s-default .cm-header { color: #555; font-weight: 600; }
            .cm-s-default .cm-header-1 { color: #333; }
            .cm-s-default .cm-header-2 { color: #383838; }
            .cm-s-default .cm-header-3 { color: #444; }
            .cm-s-default .cm-header-4 { color: #484848; }
            .cm-s-default .cm-header-5 { color: #505050; }
            .cm-s-default .cm-header-6 { color: #555; }
            .cm-s-default .cm-quote { color: #777; }
            .cm-s-default .cm-keyword { color: #666; }
            .cm-s-default .cm-atom { color: #666; }
            .cm-s-default .cm-number { color: #666; }
            .cm-s-default .cm-def { color: #666; }
            .cm-s-default .cm-variable { color: #444; }
            .cm-s-default .cm-variable-2 { color: #555; }
            .cm-s-default .cm-variable-3 { color: #555; }
            .cm-s-default .cm-property { color: #333; }
            .cm-s-default .cm-operator { color: #333; }
            .cm-s-default .cm-comment { color: #777; }
            .cm-s-default .cm-string { color: #666; }
            .cm-s-default .cm-string-2 { color: #666; }
            .cm-s-default .cm-meta { color: #555; }
            .cm-s-default .cm-qualifier { color: #555; }
            .cm-s-default .cm-builtin { color: #555; }
            .cm-s-default .cm-bracket { color: #555; }
            .cm-s-default .cm-tag { color: #555; }
            .cm-s-default .cm-attribute { color: #555; }
            .cm-s-default .cm-hr { color: #555; }
            .cm-s-default .cm-link { color: #555; }
            .cm-s-default .cm-error { color: #777; }
        `;
    }
    document.head.appendChild(style);
}

// Listen for theme changes and update the editor colors
const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
            applyCustomColors();
        }
    });
});

// Start observing theme changes
themeObserver.observe(document.documentElement, { attributes: true });

// Handle mobile sidebar state for editor
function setupMobileSidebarEffect() {
    // Only needed for mobile view
    if (window.innerWidth > 768) return;

    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');

    if (!hamburger || !sidebar) return;

    const handleSidebarToggle = () => {
        const isActive = sidebar.classList.contains('active');
        const editorContainer = document.querySelector('.editor-container');
        const editorLayout = document.querySelector('.editor-layout');
        const editorArea = document.querySelector('.editor-area');
        const previewElement = document.querySelector('.editor-preview');

        if (isActive && editorContainer) {
            // Ensure editor elements get sidebar-blur class when sidebar is open
            if (editor && document.body.classList.contains('sidebar-active')) {
                // Add sidebar-blur class to editor elements
                editorContainer.classList.add('sidebar-blur');
                if (editorLayout) editorLayout.classList.add('sidebar-blur');
                if (editorArea) editorArea.classList.add('sidebar-blur');
                if (previewElement) previewElement.classList.add('sidebar-blur');
            }
        } else {
            // Remove sidebar-blur class when sidebar is closed
            if (editorContainer) editorContainer.classList.remove('sidebar-blur');
            if (editorLayout) editorLayout.classList.remove('sidebar-blur');
            if (editorArea) editorArea.classList.remove('sidebar-blur');
            if (previewElement) previewElement.classList.remove('sidebar-blur');

            // Ensure editor gets focus back when needed
            if (editor && document.querySelector('.CodeMirror')) {
                setTimeout(() => {
                    editor.refresh();
                }, 300);
            }
        }
    };

    // Listen for sidebar toggle events
    hamburger.addEventListener('click', handleSidebarToggle);

    // Also observe body class changes to detect sidebar state
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                if (document.body.classList.contains('sidebar-active')) {
                    // Sidebar is open
                    handleSidebarToggle();
                } else {
                    // Sidebar is closed
                    handleSidebarToggle();
                }
            }
        });
    });

    bodyObserver.observe(document.body, { attributes: true });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', setupMobileSidebarEffect);

// Also call when window resizes between mobile and desktop views
window.addEventListener('resize', () => {
    setupMobileSidebarEffect();

    // Adjust active line styling based on viewport width
    if (editor) {
        const isMobile = window.innerWidth <= 768;
        // Get the current editor options
        const editorOptions = editor.getOption('styleActiveLine');

        // Only change the option if it's different from the current setting
        if ((isMobile && editorOptions !== false) ||
            (!isMobile && JSON.stringify(editorOptions) !== JSON.stringify({nonEmpty: true}))) {

            editor.setOption('styleActiveLine', isMobile ? false : { nonEmpty: true });

            // Force a refresh to apply changes
            setTimeout(() => editor.refresh(), 10);
        }
    }
});

// Add dedicated ESC key handler for exiting edit mode
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Only handle if we're in edit mode and no dialogs are open
        const mainContent = document.querySelector('.content');
        const editorContainer = document.querySelector('.editor-container');
        const viewToolbar = document.querySelector('.view-toolbar');
        const editToolbar = document.querySelector('.edit-toolbar');
        
        if (mainContent && mainContent.classList.contains('editing')) {
            // Check if any dialogs are open - we shouldn't exit edit mode if dialogs are open
            const hasOpenDialog = 
                document.querySelector('.version-history-dialog')?.classList.contains('active') ||
                document.querySelector('.file-upload-dialog')?.classList.contains('active') ||
                document.querySelector('.login-dialog')?.classList.contains('active') ||
                document.querySelector('.message-dialog')?.classList.contains('active') ||
                document.querySelector('.confirmation-dialog')?.classList.contains('active') ||
                document.querySelector('.user-confirmation-dialog')?.classList.contains('active') ||
                document.querySelector('.new-document-dialog')?.classList.contains('active') ||
                document.querySelector('.settings-dialog')?.classList.contains('active') ||
                document.querySelector('.move-document-dialog')?.classList.contains('active');
                
            if (!hasOpenDialog) {
                exitEditMode(mainContent, editorContainer, viewToolbar, editToolbar);
                e.preventDefault();
            }
        }
    }
});