const fs = require('fs');
const readline = require('readline');
const login = require('ws3-fca'); // рдирдИ API

// рдЙрдкрдпреЛрдЧрдХрд░реНрддрд╛ рд╕реЗ рдЗрдирдкреБрдЯ рд▓реЗрдиреЗ рдХрд╛ рдлрдВрдХреНрд╢рди
const getInput = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    }));
};

// рдореБрдЦреНрдп рдлрдВрдХреНрд╢рди
(async () => {
    console.log("\nЁЯЪА Termux Messenger Bot: Group Name & Nickname Lock Script\n");

    // рдЙрдкрдпреЛрдЧрдХрд░реНрддрд╛ рд╕реЗ рдЗрдирдкреБрдЯ рд▓реЗрдВ
    const appstatePath = await getInput('ЁЯФС рдЕрдкрдирд╛ appstate.json рдлрд╝рд╛рдЗрд▓ рдХрд╛ рдкрде рджрд░реНрдЬ рдХрд░реЗрдВ: ');
    const prefix = await getInput('тЬП рдХрдорд╛рдВрдб рдХреЗ рд▓рд┐рдП рдкреНрд░рд┐рдлрд┐рдХреНрд╕ рджрд░реНрдЬ рдХрд░реЗрдВ (рдЬреИрд╕реЗ, *): ');
    const adminID = await getInput('ЁЯСС рдЕрдкрдирд╛ рдПрдбрдорд┐рди рдЖрдИрдбреА рджрд░реНрдЬ рдХрд░реЗрдВ: ');

    // Appstate JSON рд▓реЛрдб рдХрд░реЗрдВ
    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
    } catch (err) {
        console.error('тЭМ Appstate JSON рдлрд╝рд╛рдЗрд▓ рдирд╣реАрдВ рдорд┐рд▓реА рдпрд╛ рдпрд╣ рдЕрдорд╛рдиреНрдп рд╣реИред');
        process.exit(1);
    }

    // ws3-fca рд╕реЗ рд▓реЙрдЧрд┐рди рдХрд░реЗрдВ
    login({ appState }, (err, api) => {
        if (err) return console.error('тЭМ рд▓реЙрдЧрд┐рди рд╡рд┐рдлрд▓:', err);

        console.log('\nтЬЕ рдмреЙрдЯ рдЪрд▓ рд░рд╣рд╛ рд╣реИ рдФрд░ рдХрдорд╛рдВрдб рд╕реБрди рд░рд╣рд╛ рд╣реИ...');
        api.setOptions({ listenEvents: true });

        const lockedGroups = {}; // рдЧреБрдк рдирд╛рдо рдЯреНрд░реИрдХ рдХрд░рдиреЗ рдХреЗ рд▓рд┐рдП
        const lockedNicknames = {}; // рдирд┐рдХрдиреЗрдо рдЯреНрд░реИрдХ рдХрд░рдиреЗ рдХреЗ рд▓рд┐рдП

        api.listenMqtt((err, event) => {
            if (err) return console.error('тЭМ рд╕реБрдирдиреЗ рдореЗрдВ рддреНрд░реБрдЯрд┐:', err);

            if (event.type === 'message' && event.body.startsWith(prefix)) {
                const senderID = event.senderID;
                const args = event.body.slice(prefix.length).trim().split(' ');
                const command = args[0].toLowerCase();
                const groupName = args.slice(2).join(' ');

                // рдХреЗрд╡рд▓ рдПрдбрдорд┐рди рд╣реА рдХрдорд╛рдВрдб рдЪрд▓рд╛ рд╕рдХрддрд╛ рд╣реИ
                if (senderID !== adminID) {
                    return api.sendMessage('тЭМ рдЖрдкрдХреЛ рдпрд╣ рдХрдорд╛рдВрдб рдЪрд▓рд╛рдиреЗ рдХреА рдЕрдиреБрдорддрд┐ рдирд╣реАрдВ рд╣реИред', event.threadID);
                }

                // рдЧреБрдк рдирд╛рдо рд▓реЙрдХ рдХрд░реЗрдВ
                if (command === 'grouplockname' && args[1] === 'on') {
                    lockedGroups[event.threadID] = groupName;
                    api.setTitle(groupName, event.threadID, (err) => {
                        if (err) return api.sendMessage('тЭМ рдЧреБрдк рдХрд╛ рдирд╛рдо рд▓реЙрдХ рдХрд░рдиреЗ рдореЗрдВ рд╡рд┐рдлрд▓ред', event.threadID);
                        api.sendMessage(`тЬЕ рдЧреБрдк рдХрд╛ рдирд╛рдо рд▓реЙрдХ рдХрд┐рдпрд╛ рдЧрдпрд╛: ${groupName}`, event.threadID);
                    });
                }

                // рдирд┐рдХрдиреЗрдо рд▓реЙрдХ рдХрд░реЗрдВ
                else if (command === 'nicknamelock' && args[1] === 'on') {
                    const nickname = groupName;

                    api.getThreadInfo(event.threadID, (err, info) => {
                        if (err) return console.error('тЭМ рдЧреБрдк рдЬрд╛рдирдХрд╛рд░реА рд▓рд╛рдиреЗ рдореЗрдВ рддреНрд░реБрдЯрд┐:', err);

                        const delay = 2000; // рд╣рд░ рдпреВрдЬрд╝рд░ рдкрд░ 2 рд╕реЗрдХрдВрдб рдХрд╛ рдбрд┐рд▓реЗ
                        info.participantIDs.forEach((userID, index) => {
                            setTimeout(() => {
                                api.changeNickname(nickname, event.threadID, userID, (err) => {
                                    if (err) console.error(`тЭМ рдпреВрдЬрд╝рд░ ${userID} рдХреЗ рд▓рд┐рдП рдирд┐рдХрдиреЗрдо рд╕реЗрдЯ рдХрд░рдиреЗ рдореЗрдВ рд╡рд┐рдлрд▓:`, err);
                                });
                            }, index * delay);
                        });

                        // рдирд┐рдХрдиреЗрдо рд▓реЙрдХ рдХрд░реЗрдВ
                        lockedNicknames[event.threadID] = nickname;
                        api.sendMessage(`тЬЕ рд╕рднреА рдирд┐рдХрдиреЗрдо рд▓реЙрдХ рдХрд┐рдП рдЧрдП: ${nickname}`, event.threadID);
                    });
                }

                // рд▓реЙрдХ рд╕реНрдЯреЗрдЯрд╕ рджреЗрдЦреЗрдВ
                else if (command === 'lockstatus') {
                    const lockStatus = `ЁЯФТ рд▓реЙрдХ рд╕реНрдЯреЗрдЯрд╕:\nрдЧреБрдк рдХрд╛ рдирд╛рдо: ${
                        lockedGroups[event.threadID] || 'рд▓реЙрдХ рдирд╣реАрдВ рд╣реИ'
                    }\nрдирд┐рдХрдиреЗрдо: ${lockedNicknames[event.threadID] || 'рд▓реЙрдХ рдирд╣реАрдВ рд╣реИ'}`;
                    api.sendMessage(lockStatus, event.threadID);
                }
            }

            // рдмрд╛рд╣рд░реА рдЧреБрдк рдирд╛рдо рдмрджрд▓рдиреЗ рд╕реЗ рд░реЛрдХреЗрдВ
            if (event.logMessageType === 'log:thread-name') {
                const lockedName = lockedGroups[event.threadID];
                if (lockedName) {
                    api.setTitle(lockedName, event.threadID, (err) => {
                        if (!err) api.sendMessage('тЭМ рдЧреБрдк рдХрд╛ рдирд╛рдо рдмрджрд▓рдирд╛ рд░рджреНрдж рдХрд┐рдпрд╛ рдЧрдпрд╛ред', event.threadID);
                    });
                }
            }

            // рдмрд╛рд╣рд░реА рдирд┐рдХрдиреЗрдо рдмрджрд▓рдиреЗ рд╕реЗ рд░реЛрдХреЗрдВ
            if (event.logMessageType === 'log:thread-nickname') {
                const lockedNickname = lockedNicknames[event.threadID];
                if (lockedNickname) {
                    const affectedUserID = event.logMessageData.participant_id;
                    api.changeNickname(lockedNickname, event.threadID, affectedUserID, (err) => {
                        if (!err) api.sendMessage('тЭМ рдирд┐рдХрдиреЗрдо рдмрджрд▓рдирд╛ рд░рджреНрдж рдХрд┐рдпрд╛ рдЧрдпрд╛ред', event.threadID);
                    });
                }
            }
        });
    });
})();
